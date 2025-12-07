// UploadTool.js
// --------------------------------------------------
// Firestore / Storage 読み込み
// --------------------------------------------------
import { log } from './utils.js';
import { loadAllTextures } from './textureManager.js';
import { loadRoomImages, handleFileSelect, uploadFiles } from './imageRowManager.js';

import { app } from '../firebaseInit.js';

import {
  getFirestore, collection, getDocs, doc,
  getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --------------------------------------------------
// Firebase 初期化
// --------------------------------------------------
const db = getFirestore(app);
const storage = getStorage(app);


// --------------------------------------------------
// UI 要素取得
// --------------------------------------------------
const roomSelect = document.getElementById("roomSelect");
const previewArea = document.getElementById("previewArea");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const logArea = document.getElementById("logArea");

// ★サムネイル用
const thumbnailInput = document.getElementById("thumbnailInput");
const thumbnailPreview = document.getElementById("thumbnailPreview");
let selectedThumbnailFile = null;

// --------------------------------------------------
// 初期化処理
// --------------------------------------------------
async function init() {
  await loadRooms();
  setupEventHandlers();
}
init();

// --------------------------------------------------
// 部屋一覧を読み込む
// --------------------------------------------------
async function loadRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  roomSelect.innerHTML = "";

  snap.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().roomTitle || doc.id;
    roomSelect.appendChild(option);
  });
}

// --------------------------------------------------
// イベント登録
// --------------------------------------------------
function setupEventHandlers() {
  fileInput.addEventListener("change", () => {
    handleFileSelect(fileInput, previewArea, logArea);
  });

  uploadBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) {
      log("❌ 部屋が選択されていません", logArea);
      return;
    }

    // 通常画像のアップロード
    await uploadFiles(previewArea, roomId, logArea);

    // ★サムネイルのアップロード
    if (selectedThumbnailFile) {
      await uploadThumbnail(roomId, selectedThumbnailFile);
    }

    // 再読込
    await loadRoomImages(previewArea, roomId, logArea);
  });

  // ★サムネイル選択
  thumbnailInput.addEventListener("change", () => {
    const file = thumbnailInput.files[0];
    if (!file) return;

    selectedThumbnailFile = file;
    const url = URL.createObjectURL(file);
    thumbnailPreview.src = url;
    thumbnailPreview.style.display = "block";

    log("サムネイル画像を選択しました", logArea);
  });

  // 部屋変更時の画像読み込み
  roomSelect.addEventListener("change", async () => {
    const roomId = roomSelect.value;
    await loadRoomImages(previewArea, roomId, logArea);
  });
}

// --------------------------------------------------
// ★ サムネイルアップロード処理
// --------------------------------------------------
async function uploadThumbnail(roomId, fileObj) {
  try {
    log("サムネイルを処理中…", logArea);

    // サイズ変換（他の画像と同じ 1600px）
    const blob = await resizeImageToWebp(fileObj, 1600);

    // 固定ファイル名
    const fileName = "thumbnail.webp";
    const storagePath = `rooms/${roomId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // アップロード
    await uploadBytesResumable(storageRef, blob);

    log(`✅ サムネイルアップロード完了: ${fileName}`, logArea);
  } catch (e) {
    log(`❌ サムネイルアップロード失敗: ${e.message}`, logArea);
    console.error(e);
  }
}

// --------------------------------------------------
// ここまで UploadTool.js
// --------------------------------------------------
