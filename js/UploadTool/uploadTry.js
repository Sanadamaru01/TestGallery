// js/upload.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";

// ----------------------------------------------------
// 1) Firebase 初期化
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ----------------------------------------------------
// 2) DOM 要素
// ----------------------------------------------------
const roomSelect = document.getElementById("roomSelect");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");
const logArea = document.getElementById("log");

// ----------------------------------------------------
// 3) ログ出力
// ----------------------------------------------------
function log(msg) {
  logArea.textContent += msg + "\n";
}

// ----------------------------------------------------
// 4) Firestore から rooms 一覧を取得
// ----------------------------------------------------
async function loadRooms() {
  log("🚪 部屋一覧を読み込み中…");
  const roomsSnap = await getDocs(collection(db, "rooms"));
  roomSelect.innerHTML = "";
  roomsSnap.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = `${doc.id} : ${doc.data().roomTitle}`;
    roomSelect.appendChild(opt);
  });
  log("✅ 部屋一覧を読み込みました！");
}
loadRooms();

// ----------------------------------------------------
// 5) 選択画像プレビュー表示
// ----------------------------------------------------
fileInput.addEventListener("change", () => {
  previewArea.innerHTML = "";
  Array.from(fileInput.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const div = document.createElement("div");
      div.innerHTML = `<img src="${reader.result}" /><div>${file.name}</div>`;
      previewArea.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
});

// ----------------------------------------------------
// 6) 画像リサイズ関数
// ----------------------------------------------------
async function resizeImage(file, maxLongSide = 600) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
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
  return await pica().toBlob(targetCanvas, "image/webp", 1.0);
}

// ----------------------------------------------------
// 7) アップロード実行
// ----------------------------------------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  const files = fileInput.files;
  if (!roomId || files.length === 0) {
    alert("部屋が選択されていないか、ファイルがありません");
    return;
  }

  log(`🚀 アップロード開始：${files.length}件`);

  for (const file of files) {
    log(`📤 ${file.name} をアップロード中…`);
    const fileId = crypto.randomUUID();
    const resizedBlob = await resizeImage(file);
    const storagePath = `rooms/${roomId}/${fileId}.webp`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, resizedBlob);
    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        snapshot => {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          log(`   ⏳ ${file.name} ${Math.round(percent)}%`);
        },
        err => reject(err),
        async () => {
          const downloadURL = await getDownloadURL(storageRef);
          log(`📁 Storage 保存完了 → ${storagePath}`);

          const data = {
            file: `${fileId}.webp`,
            title: file.name,
            caption: "",
            author: "author",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await addDoc(collection(db, `rooms/${roomId}/images`), data);
          log(`📝 Firestore 保存完了 → rooms/${roomId}/images`);
          resolve();
        }
      );
    });
  }

  log("🎉 全てのアップロードが完了しました！");
});
