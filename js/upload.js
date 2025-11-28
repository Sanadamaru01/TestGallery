// js/upload.js
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


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

  roomSelect.innerHTML = ""; // reset

  roomsSnap.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = `${doc.id} : ${doc.data().roomTitle}`;
    roomSelect.appendChild(opt);
  });

  log("✅ 部屋一覧を読み込みました！");
}


// ----------------------------------------------------
// 5) 選択画像プレビュー表示
// ----------------------------------------------------
fileInput.addEventListener("change", () => {
  previewArea.innerHTML = "";
  Array.from(fileInput.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const div = document.createElement("div");
      div.innerHTML = `
        <img src="${reader.result}" />
        <div>${file.name}</div>
      `;
      previewArea.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
});


// ----------------------------------------------------
// 6) アップロード実行
// ----------------------------------------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  const files = fileInput.files;

  if (!roomId) {
    alert("部屋が選択されていません");
    return;
  }
  if (files.length === 0) {
    alert("ファイルが選択されていません");
    return;
  }

  log(`🚀 アップロード開始：${files.length}件`);

  for (const file of files) {
    log(`📤 ${file.name} をアップロード中…`);

    const fileId = crypto.randomUUID();          // Firestore の document ID と一致する形にして良い
    const storagePath = `rooms/${roomId}/${fileId}.webp`;

    const storageRef = ref(storage, storagePath);

    // ---- Storage へアップロード ----
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    log(`📁 Storage 保存完了 → ${storagePath}`);

    // ---- Firestoreへメタ情報保存 ----
    const data = {
      file: `${fileId}.webp`,
      title: file.name,
      caption: "",
      author: "author",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, `rooms/${roomId}/images`), data);

    log(`📝 Firestore 保存完了 → rooms/${roomId}/images`);
  }

  log("🎉 全てのアップロードが完了しました！");
});


// 起動時に rooms を読み込む
loadRooms();
