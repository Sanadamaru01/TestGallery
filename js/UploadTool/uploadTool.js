import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";

// ---------------------
// 1) Firebase 初期化
// ---------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ---------------------
// 2) DOM 要素
// ---------------------
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

// ---------------------
// 3) ログ関数
// ---------------------
function log(msg) {
  logArea.textContent += msg + "\n";
  logArea.scrollTop = logArea.scrollHeight;
}

// ---------------------
// 4) ルーム一覧取得
// ---------------------
async function loadRooms() {
  log("🚪 部屋一覧を読み込み中…");
  try {
    const roomsSnap = await getDocs(collection(db, "rooms"));
    roomSelect.innerHTML = "";
    roomsSnap.forEach(docSnap => {
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = `${docSnap.id} : ${docSnap.data().roomTitle}`;
      roomSelect.appendChild(opt);
    });
    log("✅ 部屋一覧を読み込みました！");
  } catch (err) {
    log("❌ 部屋一覧読み込み失敗：" + err.message);
  }
}
loadRooms();

// ---------------------
// 5) テクスチャ選択肢（例として固定リスト）
// ---------------------
const textureOptions = ["tex1.webp","tex2.webp","tex3.webp"];
[wallTexture, floorTexture, ceilingTexture, doorTexture].forEach(sel => {
  sel.innerHTML = "";
  textureOptions.forEach(tex => {
    const opt = document.createElement("option");
    opt.value = tex;
    opt.textContent = tex;
    sel.appendChild(opt);
  });
});

// ---------------------
// 6) ルーム更新（タイトル）
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("部屋を選択してください"); return; }
  try {
    await updateDoc(doc(db,"rooms",roomId), { roomTitle: roomTitleInput.value, updatedAt: serverTimestamp() });
    log(`📝 ルームタイトル更新完了: ${roomTitleInput.value}`);
  } catch(err) {
    log("❌ ルーム更新失敗：" + err.message);
  }
});

// ---------------------
// 7) テクスチャ更新（DB書き換えのみ）
updateTextureBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("部屋を選択してください"); return; }
  const data = {
    texturePaths: {
      wall: wallTexture.value,
      floor: floorTexture.value,
      ceiling: ceilingTexture.value,
      Door: doorTexture.value
    },
    updatedAt: serverTimestamp()
  };
  try {
    await updateDoc(doc(db,"rooms",roomId), data);
    log(`📝 テクスチャ更新完了: ${JSON.stringify(data.texturePaths)}`);
  } catch(err) {
    log("❌ テクスチャ更新失敗：" + err.message);
  }
});

// ---------------------
// 8) ファイルプレビュー
// ---------------------
fileInput.addEventListener("change", () => {
  previewArea.innerHTML = "";
  Array.from(fileInput.files).forEach(file => {
    const div = document.createElement("div");

    const reader = new FileReader();
    reader.onload = () => {
      div.innerHTML = `
        <img src="${reader.result}" />
        <input type="text" class="titleInput" placeholder="Title" value="${file.name}">
        <input type="text" class="captionInput" placeholder="Caption">
        <input type="text" class="authorInput" placeholder="Author" value="author">
        <div class="progress-bar"><div class="progress-fill"></div></div>
      `;
      previewArea.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
});

// ---------------------
// 9) 画像リサイズ
// ---------------------
async function resizeImage(file, maxLongSide=600) {
  const img = new Image();
  const objectURL = URL.createObjectURL(file);
  img.src = objectURL;
  await img.decode();

  const scale = maxLongSide / Math.max(img.width, img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  sourceCanvas.getContext("2d").drawImage(img, 0, 0);

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;

  await pica().resize(sourceCanvas, targetCanvas);
  const blob = await pica().toBlob(targetCanvas, "image/webp", 1.0);
  URL.revokeObjectURL(objectURL);
  return blob;
}

// ---------------------
// 10) アップロード
// ---------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  const files = fileInput.files;
  if (!roomId || files.length===0) { alert("部屋未選択またはファイルなし"); return; }

  uploadBtn.disabled = true;
  log(`🚀 アップロード開始: ${files.length}件`);
  let successCount = 0, failCount = 0;

  for (let i=0;i<files.length;i++) {
    const file = files[i];
    const div = previewArea.children[i];
    const title = div.querySelector(".titleInput").value || file.name;
    const caption = div.querySelector(".captionInput").value || "";
    const author = div.querySelector(".authorInput").value || "author";
    const progressFill = div.querySelector(".progress-fill");

    try {
      const resizedBlob = await resizeImage(file);
      const fileId = crypto.randomUUID();
      const storagePath = `rooms/${roomId}/${fileId}.webp`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, resizedBlob);
      await new Promise((resolve,reject)=>{
        uploadTask.on("state_changed",
          snap=>{
            const percent = (snap.bytesTransferred / snap.totalBytes)*100;
            progressFill.style.width = `${percent}%`;
          },
          err=>reject(err),
          async ()=>{
            const downloadURL = await getDownloadURL(storageRef);
            await addDoc(collection(db,`rooms/${roomId}/images`),{
              file: `${fileId}.webp`,
              title,
              caption,
              author,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            resolve();
          }
        );
      });
      successCount++;
      log(`✅ ${file.name} 完了`);
    } catch(err) {
      failCount++;
      log(`❌ ${file.name} 失敗: ${err.message}`);
    }
  }
  log(`🎉 アップロード完了: 成功 ${successCount}, 失敗 ${failCount}`);
  uploadBtn.disabled = false;
});
