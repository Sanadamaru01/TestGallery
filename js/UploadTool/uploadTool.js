import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc,
  updateDoc, addDoc, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";

// -------------------- Firebase 設定 --------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- DOM --------------------
const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");
const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");
const updateTextureBtn = document.getElementById("updateTextureBtn");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");
const logArea = document.getElementById("log");

// -------------------- ログ関数 --------------------
function log(msg){
  const t = new Date().toLocaleString();
  logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
}

// -------------------- ルーム読み込み --------------------
async function loadRooms(){
  log("🚪 部屋一覧読み込み開始...");
  try {
    const snap = await getDocs(collection(db,"rooms"));
    roomSelect.innerHTML = "";
    snap.forEach(d=>{
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.id} : ${d.data().roomTitle ?? "(no title)"}`;
      roomSelect.appendChild(opt);
    });
    if(roomSelect.options.length>0){
      roomSelect.selectedIndex=0;
      await onRoomChange();
    }
    log("✅ 部屋一覧を読み込みました");
  } catch(e){ log("❌ 部屋一覧取得エラー:"+e.message); }
}
roomSelect.addEventListener("change", onRoomChange);
loadRooms();

// -------------------- ルーム変更時処理 --------------------
async function onRoomChange(){
  const roomId = roomSelect.value;
  if(!roomId) return;
  try{
    const snap = await getDoc(doc(db,"rooms",roomId));
    if(!snap.exists()){ roomTitleInput.value=""; log(`⚠️ ルーム ${roomId} が存在しません`); return; }
    const data = snap.data();
    roomTitleInput.value = data.roomTitle ?? "";
    const tp = data.texturePaths ?? {};
    if(tp.wall) wallTexture.value=tp.wall;
    if(tp.floor) floorTexture.value=tp.floor;
    if(tp.ceiling) ceilingTexture.value=tp.ceiling;
    if(tp.Door) doorTexture.value=tp.Door;

    log(`ℹ️ ルーム情報読み込み: ${roomId}`);
    await loadRoomImages(roomId);
  } catch(e){ log("❌ ルーム情報読み込みエラー:"+e.message); }
}

// -------------------- 既存画像管理 --------------------
async function loadRoomImages(roomId){
  previewArea.innerHTML="";
  const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    createImageRow(roomId, docSnap.id, data, true);
  });
}

// -------------------- 画像行作成 --------------------
function createImageRow(roomId, docId, data, isExisting=false){
  const row = document.createElement("div"); row.className="file-row";
  const img = document.createElement("img");
  img.src = data.downloadURL; img.alt=data.title;
  const meta = document.createElement("div"); meta.className="file-meta";

  meta.innerHTML=`
    <input type="text" class="titleInput" value="${escapeHtml(data.title)}">
    <input type="text" class="captionInput" value="${escapeHtml(data.caption)}">
    <input type="text" class="authorInput" value="${escapeHtml(data.author)}">
    <div style="display:flex;gap:0.3rem;">
      <button class="updateBtn">更新</button>
      <button class="deleteBtn">削除</button>
      <div class="statusText"></div>
    </div>
  `;

  // 更新
  meta.querySelector(".updateBtn").addEventListener("click", async ()=>{
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {title, caption, author, updatedAt: serverTimestamp()});
    meta.querySelector(".statusText").textContent="更新済み";
    log(`📝 ${title} を更新しました`);
  });

  // 削除
  meta.querySelector(".deleteBtn").addEventListener("click", async ()=>{
    if(!confirm("本当に削除しますか？")) return;
    await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
    const storageRef = ref(storage, data.file);
    await deleteObject(storageRef);
    row.remove();
    log(`❌ ${data.title} を削除しました`);
  });

  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);
}

// -------------------- ファイル選択 → プレビュー --------------------
fileInput.addEventListener("change", ()=>{
  const files = Array.from(fileInput.files||[]);
  files.forEach(file=>{
    createImageRow(null, crypto.randomUUID(), {
      title:file.name, caption:"", author:"", downloadURL:URL.createObjectURL(file)
    }, false);
  });
});

// -------------------- HTML エスケープ --------------------
function escapeHtml(s){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// -------------------- アップロード処理 --------------------
uploadBtn.addEventListener("click", async ()=>{
  const roomId = roomSelect.value;
  if(!roomId){ alert("ルームを選択してください"); return; }
  const files = Array.from(fileInput.files||[]);
  if(files.length===0){ alert("アップロードするファイルを選択"); return; }

  uploadBtn.disabled=fileInput.disabled=updateRoomBtn.disabled=updateTextureBtn.disabled=true;
  log(`🚀 アップロード開始 (${files.length}件)`);

  let success=0, fail=0;
  for(let i=0;i<files.length;i++){
    const file = files[i];
    const row = previewArea.children[i];
    const titleInput=row.querySelector(".titleInput");
    const captionInput=row.querySelector(".captionInput");
    const authorInput=row.querySelector(".authorInput");
    const progressFill=row.querySelector(".progress-fill");
    const statusText=row.querySelector(".statusText")||{textContent:""};

    try{
      statusText.textContent="リサイズ中...";
      const resizedBlob = await resizeImageToWebp(file, 600,0.9);
      const fileId = crypto.randomUUID();
      const storagePath=`rooms/${roomId}/${fileId}.webp`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, resizedBlob);

      await new Promise((resolve,reject)=>{
        uploadTask.on("state_changed",
          s=>{ const p=(s.bytesTransferred/s.totalBytes)*100; if(progressFill) progressFill.style.width=`${Math.round(p)}%`; statusText.textContent=`アップロード ${Math.round(p)}%`; },
          err=>reject(err),
          async ()=>{
            const downloadURL = await getDownloadURL(storageRef);
            await addDoc(collection(db, `rooms/${roomId}/images`), {
              file:storagePath, downloadURL, title:titleInput.value.trim(), caption:captionInput.value.trim(),
              author:authorInput.value.trim(), createdAt:serverTimestamp(), updatedAt:serverTimestamp()
            });
            resolve();
          }
        );
      });
      statusText.textContent="完了"; success++;
      log(`✅ ${file.name} を保存しました (${storagePath})`);
    }catch(e){ fail++; statusText.textContent="失敗"; log(`❌ ${file.name} エラー: ${e.message}`);}
  }

  log(`🎉 アップロード終了 — 成功:${success}, 失敗:${fail}`);
  uploadBtn.disabled=fileInput.disabled=updateRoomBtn.disabled=updateTextureBtn.disabled=false;
});

// -------------------- 画像リサイズ --------------------
async function resizeImageToWebp(file,maxLongSide=600,quality=0.9){
  const img=new Image();
  const objectURL = URL.createObjectURL(file);
  img.src=objectURL; await img.decode();
  const long = Math.max(img.width,img.height);
  const scale = long>maxLongSide? maxLongSide/long:1;
  const width=Math.round(img.width*scale);
  const height=Math.round(img.height*scale);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width=img.width; sourceCanvas.height=img.height;
  sourceCanvas.getContext("2d").drawImage(img,0,0);
  const targetCanvas=document.createElement("canvas");
  targetCanvas.width=width; targetCanvas.height=height;
  await pica().resize(sourceCanvas,targetCanvas);
  const blob = await pica().toBlob(targetCanvas,"image/webp",quality);
  URL.revokeObjectURL(objectURL);
  return blob;
}
