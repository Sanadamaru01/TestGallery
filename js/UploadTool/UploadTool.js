// UploadTool.js
import { log } from './utils.js';
import { loadTextures } from './textureManager.js';
import { loadRoomImages, handleFileSelect, uploadFiles } from './imageRowManager.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from './firebaseInit.js';

// DOM
const roomSelect       = document.getElementById("roomSelect");
const roomTitleInput   = document.getElementById("roomTitleInput");
const updateRoomBtn    = document.getElementById("updateRoomBtn");

const wallTexture      = document.getElementById("wallTexture");
const floorTexture     = document.getElementById("floorTexture");
const ceilingTexture   = document.getElementById("ceilingTexture");
const doorTexture      = document.getElementById("doorTexture");
const updateTextureBtn = document.getElementById("updateTextureBtn");

const fileInput  = document.getElementById("fileInput");
const previewArea= document.getElementById("previewArea");
const uploadBtn  = document.getElementById("uploadBtn");

const logArea = document.getElementById("log");
const db = getFirestore(app);

// -------------------- 初期化 --------------------
window.addEventListener("DOMContentLoaded", async () => {
  try {
    // テクスチャ一覧取得
    await loadTextures({ wallTexture, floorTexture, ceilingTexture, doorTexture }, logArea);
  } catch (e) { log(`テクスチャ取得エラー: ${e.message}`, logArea); }

  // ルーム一覧読み込み
  await loadRooms();

  // ファイル選択のハンドリング
  handleFileSelect(fileInput, previewArea, logArea);

  // テクスチャ更新ボタン
  updateTextureBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) { log("ルームを選択してください", logArea); return; }
    try {
      const snap = await getDoc(doc(db, "rooms", roomId));
      if (!snap.exists()) { log(`ルーム ${roomId} が存在しません`, logArea); return; }
      await updateDoc(doc(db, "rooms", roomId), {
        texturePaths: {
          wall: wallTexture.value || "",
          floor: floorTexture.value || "",
          ceiling: ceilingTexture.value || "",
          door: doorTexture.value || ""
        },
        updatedAt: serverTimestamp()
      });
      log(`🎨 テクスチャ設定を更新しました`, logArea);
    } catch (e) {
      log(`❌ テクスチャ更新失敗: ${e.message}`, logArea);
    }
  });
});

// -------------------- ルーム読み込み --------------------
async function loadRooms() {
  try {
    const snap = await getDocs(collection(db, "rooms"));
    roomSelect.innerHTML = "";
    snap.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.id} : ${d.data().roomTitle ?? "(no title)"}`;
      roomSelect.appendChild(opt);
    });
    if (roomSelect.options.length > 0) {
      roomSelect.selectedIndex = 0;
      await onRoomChange();
    }
  } catch (e) { log(`ルーム読み込みエラー: ${e.message}`, logArea); }
}

roomSelect.addEventListener("change", onRoomChange);

async function onRoomChange() {
  const roomId = roomSelect.value;
  if (!roomId) return;
  try {
    const snap = await getDoc(doc(db, "rooms", roomId));
    if (!snap.exists()) return;
    const data = snap.data();
    roomTitleInput.value = data.roomTitle ?? "";
    wallTexture.value    = data.texturePaths?.wall    ?? "";
    floorTexture.value   = data.texturePaths?.floor   ?? "";
    ceilingTexture.value = data.texturePaths?.ceiling ?? "";
    doorTexture.value    = data.texturePaths?.door    ?? "";
    await loadRoomImages(previewArea, roomId, logArea);
  } catch (e) { log(`ルーム変更エラー: ${e.message}`, logArea); }
}

// -------------------- アップロード --------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { log("ルームを選択してください", logArea); return; }
  await uploadFiles(previewArea, roomId, logArea);
});

// -------------------- ルームタイトル更新 --------------------
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) return;
  try {
    await updateDoc(doc(db, "rooms", roomId), {
      roomTitle: roomTitleInput.value,
      updatedAt: serverTimestamp()
    });
    log(`ルームタイトルを更新しました: ${roomTitleInput.value}`, logArea);
  } catch (e) { log(`❌ タイトル更新エラー: ${e.message}`, logArea); }
});
