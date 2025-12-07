// UploadTool.js
// --------------------------------------------------
// Firestore / Storage 版 Upload Tool
// --------------------------------------------------
import { log } from './utils.js';
import { loadAllTextures } from './textureManager.js';
import { loadRoomImages, handleFileSelect, uploadFiles } from './imageRowManager.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';

console.log("[TRACE] UploadTool.js loaded");

// -------------------- Firebase --------------------
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

// -------------------- 初期化 --------------------
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[TRACE] DOMContentLoaded event fired");

  console.log("[TRACE] loadRooms start");
  await loadRooms();
  console.log("[TRACE] loadRooms done");

  console.log("[TRACE] handleFileSelect start");
  handleFileSelect(fileInput, previewArea, logArea);
  console.log("[TRACE] handleFileSelect done");
});

// -------------------- ルーム一覧読み込み --------------------
async function loadRooms() {
  try {
    console.log("[TRACE] getDocs(rooms) start");
    const snap = await getDocs(collection(db, "rooms"));
    roomSelect.innerHTML = "";

    snap.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.id} : ${d.data().roomTitle ?? "(no title)"}`;
      roomSelect.appendChild(opt);
    });

    console.log(`[TRACE] getDocs(rooms) done, count: ${snap.size}`);

    if (roomSelect.options.length > 0) {
      roomSelect.selectedIndex = 0;
      console.log("[TRACE] onRoomChange start");
      await onRoomChange();
      console.log("[TRACE] onRoomChange done");
    }
  } catch (e) {
    log(`[ERROR] loadRooms: ${e.message}`, logArea);
    console.error(e);
  }
}

// -------------------- ルーム変更 --------------------
roomSelect.addEventListener("change", async () => {
  console.log("[TRACE] roomSelect change event");
  await onRoomChange();
});

async function onRoomChange() {
  const roomId = roomSelect.value;
  if (!roomId) return;

  try {
    console.log(`[TRACE] getDoc(room: ${roomId}) start`);
    const snap = await getDoc(doc(db, "rooms", roomId));
    if (!snap.exists()) {
      console.log(`[TRACE] room ${roomId} does not exist`);
      return;
    }

    const data = snap.data();
    roomTitleInput.value = data.roomTitle ?? "";
    const tp = data.texturePaths ?? {};

    console.log(`[TRACE] loadAllTextures start with currentValues`);
    await loadAllTextures(
      { wallTexture, floorTexture, ceilingTexture, doorTexture },
      logArea,
      { wall: tp.wall ?? "", floor: tp.floor ?? "", ceiling: tp.ceiling ?? "", door: tp.door ?? "" }
    );
    console.log("[TRACE] loadAllTextures done");

    console.log("[TRACE] loadRoomImages start");
    await loadRoomImages(roomId, previewArea, logArea); // 引数順序は imageRowManager.js に合わせる
    console.log("[TRACE] loadRoomImages done");

  } catch (e) {
    log(`[ERROR] onRoomChange: ${e.message}`, logArea);
    console.error(e);
  }
}

// -------------------- ファイルアップロード --------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { log("[WARN] ルームを選択してください", logArea); return; }

  console.log(`[TRACE] uploadFiles start for room: ${roomId}`);
  await uploadFiles(roomId, previewArea, logArea); // 引数を元のシグネチャに合わせる
  console.log(`[TRACE] uploadFiles done for room: ${roomId}`);

  // 再読み込み
  await loadRoomImages(roomId, previewArea, logArea);
});

// -------------------- ルームタイトル更新 --------------------
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) return;

  try {
    console.log(`[TRACE] updateDoc(room: ${roomId}) start`);
    await updateDoc(doc(db, "rooms", roomId), {
      roomTitle: roomTitleInput.value,
      updatedAt: serverTimestamp()
    });
    log(`[INFO] ルームタイトルを更新しました: ${roomTitleInput.value}`, logArea);
    console.log(`[TRACE] updateDoc done`);
  } catch (e) {
    log(`[ERROR] updateRoomBtn: ${e.message}`, logArea);
    console.error(e);
  }
});

// -------------------- テクスチャ更新 --------------------
updateTextureBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { log("[WARN] ルームを選択してください", logArea); return; }

  try {
    console.log(`[TRACE] updateTextureBtn(room: ${roomId}) start`);
    await updateDoc(doc(db, "rooms", roomId), {
      texturePaths: {
        wall: wallTexture.value,
        floor: floorTexture.value,
        ceiling: ceilingTexture.value,
        door: doorTexture.value
      },
      updatedAt: serverTimestamp()
    });
    log("[INFO] テクスチャ設定を更新しました", logArea);
    console.log(`[TRACE] updateTextureBtn done`);
  } catch (e) {
    log(`[ERROR] updateTextureBtn: ${e.message}`, logArea);
    console.error(e);
  }
});
