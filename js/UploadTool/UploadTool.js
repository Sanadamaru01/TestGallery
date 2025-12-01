// UploadTool.js
import { log } from './utils.js';
import { loadAllTextures } from './textureManager.js';
import { loadRoomImages, handleFileSelect, uploadFiles } from './imageRowManager.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from './firebaseInit.js';

console.log("[TRACE] UploadTool.js loaded");

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
const db = getFirestore(app);

console.log("[TRACE] Firebase Firestore obtained:", db);

// -------------------- 初期化 --------------------
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[TRACE] DOMContentLoaded event fired");

  try { 
    console.log("[TRACE] loadAllTextures start");
    await loadAllTextures({ wallTexture, floorTexture, ceilingTexture, doorTexture }, logArea); 
    console.log("[TRACE] loadAllTextures done");
  } catch (e) { 
    log(`[ERROR] loadAllTextures: ${e.message}`, logArea); 
    console.error(e);
  }

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

roomSelect.addEventListener("change", async () => {
  console.log("[TRACE] roomSelect change event");
  await onRoomChange();
});

// -------------------- select オプション反映 --------------------
function selectOptionByValue(selectEl, value) {
  if (!selectEl || !value) return;
  const opts = Array.from(selectEl.options);
  const found = opts.find(o => o.value === value);
  if (found) selectEl.value = value;
  else {
    log(`⚠️ 選択肢に存在しないテクスチャが設定されています: ${value}`, logArea);
    console.warn(`[selectOptionByValue] not found: ${value}`);
  }
}

// -------------------- ルーム変更 --------------------
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
    console.log(`[TRACE] room data loaded: ${JSON.stringify(data)}`);

    // -------------------- テクスチャ初期値反映 --------------------
    const tp = data.texturePaths ?? {};
    if (tp.wall) selectOptionByValue(wallTexture, tp.wall);
    if (tp.floor) selectOptionByValue(floorTexture, tp.floor);
    if (tp.ceiling) selectOptionByValue(ceilingTexture, tp.ceiling);
    if (tp.Door) selectOptionByValue(doorTexture, tp.Door);

    console.log("[TRACE] loadRoomImages start");
    await loadRoomImages(previewArea, roomId, logArea);
    console.log("[TRACE] loadRoomImages done");
  } catch (e) { 
    log(`[ERROR] onRoomChange: ${e.message}`, logArea); 
    console.error(e);
  }
}

// -------------------- アップロードボタン --------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { log("[WARN] ルームを選択してください", logArea); return; }

  console.log(`[TRACE] uploadFiles start for room: ${roomId}`);
  await uploadFiles(previewArea, roomId, logArea);
  console.log(`[TRACE] uploadFiles done for room: ${roomId}`);
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

  const newPaths = {
    wall: wallTexture.value || "",
    floor: floorTexture.value || "",
    ceiling: ceilingTexture.value || "",
    Door: doorTexture.value || ""
  };

  try {
    console.log(`[TRACE] updateDoc(texturePaths: ${roomId}) start`);
    await updateDoc(doc(db, "rooms", roomId), {
      texturePaths: newPaths,
      updatedAt: serverTimestamp()
    });
    log(`[INFO] テクスチャ設定を更新しました`, logArea);
    console.log(`[TRACE] updateDoc done`);
  } catch (e) {
    log(`[ERROR] updateTextureBtn: ${e.message}`, logArea);
    console.error(e);
  }
});
