import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";
import { v4 as uuidv4 } from "https://cdn.skypack.dev/uuid";

// ✅ Firebase設定（あなたのFirebase設定に置き換えてください）
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

uploadBtn.onclick = async () => {
  const files = fileInput.files;
  if (!files.length) {
    log.textContent = "⚠️ ファイルが選択されていません。";
    return;
  }

  const roomName = "room1";
  const imageList = [];

  log.textContent = "🔄 アップロード処理を開始...\n";

  for (const file of files) {
    const id = uuidv4();
    const resizedBlob = await resizeImage(file, 600);

    const imageRef = ref(storage, `rooms/${roomName}/${id}.webp`);
    await uploadBytes(imageRef, resizedBlob);

    const url = await getDownloadURL(imageRef);
    imageList.push({
      id: id,
      title: file.name,
      url: url
    });

    log.textContent += `✔️ ${file.name} アップロード完了\n`;
  }

  const roomConfig = {
    title: "My Gallery Room",
    wallWidth: 10,
    wallHeight: 3,
    backgroundColor: "#ffffff",
    images: imageList
  };

  const jsonBlob = new Blob([JSON.stringify(roomConfig, null, 2)], { type: "application/json" });
  const configRef = ref(storage, `rooms/${roomName}/RoomConfig.json`);
  await uploadBytes(configRef, jsonBlob);

  log.textContent += "✅ RoomConfig.json を作成・アップロードしました。\n";
};

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
  const sourceCtx = sourceCanvas.getContext("2d");
  sourceCtx.drawImage(img, 0, 0);

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;

  await pica().resize(sourceCanvas, targetCanvas);
  const blob = await pica().toBlob(targetCanvas, "image/webp", 1.0);
  return blob;
}
