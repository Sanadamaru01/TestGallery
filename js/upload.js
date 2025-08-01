import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";
import { v4 as uuidv4 } from "https://cdn.skypack.dev/uuid";

// ✅ Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyAIhkMNJI2ld9PXD7SO8H0hQ7kKGg9wWnw",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
  messagingSenderId: "783129386319",
  appId: "1:783129386319:web:b11f5182b082c7032af93a"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const log = document.getElementById("log");
const previewArea = document.getElementById("previewArea");
const roomSelect = document.getElementById("roomSelect");

// ✅ portalConfig.json を読み込んで select を初期化
async function populateRoomSelect() {
  const response = await fetch("./portalConfig.json");
  const config = await response.json();

  roomSelect.innerHTML = "";
  for (const room of config.rooms) {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  }
}

populateRoomSelect();

uploadBtn.onclick = async () => {
  const files = Array.from(fileInput.files);
  const roomName = roomSelect.value;

  if (!files.length) {
    log.textContent = "⚠️ ファイルが選択されていません。";
    return;
  }

  if (!roomName) {
    log.textContent = "⚠️ 部屋が選択されていません。";
    return;
  }

  const imageList = [];
  log.textContent = "🔄 アップロード処理を開始...\n";
  previewArea.innerHTML = "";

  const uploadTasks = files.map(async (file) => {
    const id = uuidv4();
    const thumbURL = URL.createObjectURL(file);

    const container = document.createElement("div");

    const img = document.createElement("img");
    img.src = thumbURL;
    container.appendChild(img);

    const progressBar = document.createElement("progress");
    progressBar.max = 100;
    progressBar.value = 0;
    container.appendChild(progressBar);

    const status = document.createElement("span");
    status.textContent = `🟡 ${file.name}`;
    container.appendChild(status);

    previewArea.appendChild(container);

    const resizedBlob = await resizeImage(file, 600);
    const imageRef = ref(storage, `rooms/${roomName}/${id}.webp`);
    const uploadTask = uploadBytesResumable(imageRef, resizedBlob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          progressBar.value = percent;
        },
        (error) => {
          status.textContent = `❌ ${file.name} アップロード失敗`;
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(imageRef);
          imageList.push({ id, title: file.name, url });
          status.textContent = `✅ ${file.name} 完了`;
          resolve();
        }
      );
    });
  });

  try {
    await Promise.all(uploadTasks);
  } catch (e) {
    log.textContent += "⚠️ アップロード中にエラーが発生しました。\n";
    return;
  }

  // ✅ RoomConfig.json の生成とアップロード
  const roomConfig = {
    title: `${roomName} のギャラリー`,
    wallWidth: 10,
    wallHeight: 3,
    backgroundColor: "#ffffff",
    images: imageList
  };

  const jsonBlob = new Blob([JSON.stringify(roomConfig, null, 2)], { type: "application/json" });
  const configRef = ref(storage, `rooms/${roomName}/RoomConfig.json`);
  await uploadBytesResumable(configRef, jsonBlob);

  log.textContent += "✅ RoomConfig.json を作成・アップロードしました。\n";
};

// ✅ 画像のリサイズ関数
async function resizeImage(file, maxLongSide) {
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
