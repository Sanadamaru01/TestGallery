// uploadTool.js (改訂版)
// TestGallery 用 UploadTool 実装（テクスチャ一覧取得の安定化・既存画像表示改善）

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
  console.log(msg);
}

// -------------------- テクスチャ取得 / populate --------------------
async function populateTextureSelect(storagePath, selectEl) {
  if (!selectEl) {
    console.warn(`[populateTextureSelect] selectEl が見つかりません: ${storagePath}`);
    return;
  }
  selectEl.innerHTML = ""; // いったんクリア
  // 空の選択肢
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    const names = res.items.map(i => i.fullPath || i.name);
    console.log(`[DEBUG] ${storagePath} items:`, names);

    for (const itemRef of res.items) {
      // option.value には Storage 上の相対パスを入れておく（例: Share/Wall/tex1.webp）
      const relativePath = `${storagePath}/${itemRef.name}`;
      const opt = document.createElement("option");
      opt.value = relativePath;
      opt.textContent = itemRef.name;
      selectEl.appendChild(opt);
    }

    // もし items が空なら注記
    if (res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
      log(`⚠️ ${storagePath} にファイルが見つかりませんでした`);
    } else {
      log(`✅ ${storagePath} から ${res.items.length} 件のテクスチャを取得しました`);
    }
  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
    console.error(err);
  }
}

async function loadTextures() {
  try {
    log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...");
    // 重要: Storage のフォルダ名は大文字小文字を区別します。実際のバケットに合わせてください。
    await populateTextureSelect("share/Wall", wallTexture);
    await populateTextureSelect("share/Floor", floorTexture);
    await populateTextureSelect("share/Ceiling", ceilingTexture);
    await populateTextureSelect("share/Door", doorTexture);
    log("✅ テクスチャ一覧取得完了");
  } catch (err) {
    log(`❌ テクスチャ読み込み失敗: ${err.message}`);
  }
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
  } catch(e){ log("❌ 部屋一覧取得エラー:"+e.message); console.error(e); }
}
roomSelect.addEventListener("change", onRoomChange);

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

    // ログに現在何が設定されているかを表示（要望2）
    log(`🎛️ 現在の texturePaths: ${JSON.stringify(tp)}`);
    // select に反映（存在すれば）
    if (tp.wall) selectOptionByValue(wallTexture, tp.wall);
    if (tp.floor) selectOptionByValue(floorTexture, tp.floor);
    if (tp.ceiling) selectOptionByValue(ceilingTexture, tp.ceiling);
    if (tp.Door) selectOptionByValue(doorTexture, tp.Door);

    log(`ℹ️ ルーム情報読み込み: ${roomId}`);
    await loadRoomImages(roomId); // 既存画像を表示（要望3）
  } catch(e){ log("❌ ルーム情報読み込みエラー:"+e.message); console.error(e); }
}

function selectOptionByValue(selectEl, value) {
  if (!selectEl || !value) return;
  const opts = Array.from(selectEl.options);
  const found = opts.find(o => o.value === value);
  if (found) {
    selectEl.value = value;
  } else {
    // 値が option に無い場合はログに出す（デバッグ）
    console.warn(`[selectOptionByValue] option に存在しません: ${value}`);
    log(`⚠️ 選択肢に存在しないテクスチャが設定されています: ${value}`);
  }
}

// -------------------- 既存画像管理 --------------------
async function loadRoomImages(roomId){
  previewArea.innerHTML="";
  log(`📂 ルーム ${roomId} の images を読み込みます...`);
  try {
    const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`ℹ️ images ドキュメント数: ${snap.size}`);
    if (snap.size === 0) {
      const p = document.createElement("div");
      p.textContent = "(画像はまだありません)";
      previewArea.appendChild(p);
      return;
    }
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      // downloadURL がなければ storage 上の file パスから URL を取得してみる（互換性対応）
      if (!data.downloadURL && data.file) {
        try {
          const url = await getDownloadURL(ref(storage, data.file));
          data.downloadURL = url;
          log(`ℹ️ downloadURL を取得（file を元に）: ${data.file}`);
        } catch (e) {
          console.warn("downloadURL 取得失敗:", e.message);
        }
      }
      createImageRow(roomId, docSnap.id, data, true);
    }
  } catch (err) {
    log(`❌ images 読み込みエラー: ${err.message}`);
    console.error(err);
  }
}

// -------------------- 画像行作成 --------------------
function createImageRow(roomId, docId, data, isExisting=false){
  const row = document.createElement("div"); row.className="file-row";
  const img = document.createElement("img");
  img.src = data.downloadURL || ""; img.alt=data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";

  const meta = document.createElement("div"); meta.className="file-meta";
  meta.innerHTML=`
    <input type="text" class="titleInput" value="${escapeHtml(data.title || '')}">
    <input type="text" class="captionInput" value="${escapeHtml(data.caption || '')}">
    <input type="text" class="authorInput" value="${escapeHtml(data.author || '')}">
    <div style="display:flex;gap:0.3rem;margin-top:6px;">
      <button class="updateBtn">更新</button>
      <button class="deleteBtn">削除</button>
      <div class="statusText small" style="margin-left:6px"></div>
    </div>
  `;

  // 更新
  meta.querySelector(".updateBtn").addEventListener("click", async ()=>{
    if (!isExisting) {
      meta.querySelector(".statusText").textContent = "（未アップロードのプレビュー）";
      return;
    }
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    try {
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {title, caption, author, updatedAt: serverTimestamp()});
      meta.querySelector(".statusText").textContent="更新済み";
      log(`📝 ${title || docId} を更新しました`);
    } catch (e) {
      log(`❌ 更新失敗: ${e.message}`);
      meta.querySelector(".statusText").textContent="更新失敗";
    }
  });

  // 削除
  meta.querySelector(".deleteBtn").addEventListener("click", async ()=>{
    if(!confirm("本当に削除しますか？")) return;
    try {
      if (isExisting) {
        // Firestore 側ドキュメント削除
        await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
        // Storage 側ファイル削除（file フィールドが Storage パスであることを想定）
        if (data.file) {
          try {
            const storageRef = ref(storage, data.file);
            await deleteObject(storageRef);
            log(`🗑️ Storage 上のファイルを削除しました: ${data.file}`);
          } catch (e) {
            log(`⚠️ Storage 削除でエラー: ${e.message}`);
          }
        }
      }
      row.remove();
      log(`❌ ${data.title || docId} を削除しました`);
    } catch (err) {
      log(`❌ 削除に失敗しました: ${err.message}`);
    }
  });

  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);
}

// -------------------- ファイル選択 → プレビュー --------------------
fileInput.addEventListener("change", ()=>{
  previewArea.innerHTML = ""; // 新規アップロード時は既存リストを消してプレビューだけにする場合はここを変更
  const files = Array.from(fileInput.files||[]);
  files.forEach(file=>{
    createImageRow(null, crypto.randomUUID(), {
      title:file.name, caption:"", author:"", downloadURL:URL.createObjectURL(file)
    }, false);
  });
});

// -------------------- HTML エスケープ --------------------
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

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
    const titleInput = row.querySelector(".titleInput");
    const captionInput = row.querySelector(".captionInput");
    const authorInput = row.querySelector(".authorInput");
    const progressFill = row.querySelector(".progress-fill");
    const statusText = row.querySelector(".statusText") || {textContent:""};

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
            try {
              const downloadURL = await getDownloadURL(storageRef);
              await addDoc(collection(db, `rooms/${roomId}/images`), {
                file:storagePath, downloadURL, title:titleInput.value.trim(), caption:captionInput.value.trim(),
                author:authorInput.value.trim(), createdAt:serverTimestamp(), updatedAt:serverTimestamp()
              });
              resolve();
            } catch(e) { reject(e); }
          }
        );
      });
      statusText.textContent="完了"; success++;
      log(`✅ ${file.name} を保存しました (${storagePath})`);
    }catch(e){ fail++; statusText.textContent="失敗"; log(`❌ ${file.name} エラー: ${e.message}`); }
  }

  log(`🎉 アップロード終了 — 成功:${success}, 失敗:${fail}`);
  uploadBtn.disabled=fileInput.disabled=updateRoomBtn.disabled=updateTextureBtn.disabled=false;
  // アップロード後は再ロードして一覧を反映
  await loadRoomImages(roomSelect.value);
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

// -------------------- 初期化順序: DOMLoaded で先にテクスチャ取得 → ルーム取得 --------------------
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadTextures();
  } catch(e) {
    console.warn("loadTextures error:", e);
  }
  await loadRooms();
});
