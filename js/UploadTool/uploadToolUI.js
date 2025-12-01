// uploadToolUI.js
import { 
  loadRooms, loadTextures, onRoomChange, loadRoomImages,
  createImageRow, uploadFiles, updateRoomTitle, updateTexturePaths,
} from './UploadTool.js';

// -------------------- DOM 要素取得 --------------------
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
  try { 
    await loadTextures(wallTexture, floorTexture, ceilingTexture, doorTexture, logArea); 
  } catch(e){ console.warn("loadTextures error:", e); }

  await loadRooms(
    roomSelect,
    () => onRoomChange(roomSelect, roomTitleInput, wallTexture, floorTexture, ceilingTexture, doorTexture, logArea),
    logArea
  );
});

// -------------------- イベントバインド --------------------

// ルーム選択変更
roomSelect.addEventListener("change", () => {
  onRoomChange(roomSelect, roomTitleInput, wallTexture, floorTexture, ceilingTexture, doorTexture, logArea);
});

// ファイル選択
fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files || []);
  for (const file of files) {
    const previewURL = URL.createObjectURL(file);
    const row = await createImageRow(null, crypto.randomUUID(), {
      title: file.name,
      caption: "",
      author: "",
      downloadURL: previewURL,
      _fileObject: file
    }, false);
    previewArea.appendChild(row);
  }
});

// アップロードボタン
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }

  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) { alert("アップロードする新規ファイルがありません"); return; }

  uploadBtn.disabled = true;
  await uploadFiles(uploadRows, roomId, logArea);
  uploadBtn.disabled = false;

  // アップロード後に最新の images を読み込み表示
  const uploadedImages = await loadRoomImages(roomId, logArea);
  previewArea.innerHTML = "";
  for (const imgData of uploadedImages) {
    const row = await createImageRow(roomId, imgData.docId, imgData, true);
    previewArea.appendChild(row);
  }
});

// ルームタイトル更新
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }
  const newTitle = roomTitleInput.value.trim();
  if (!newTitle) { alert("空のタイトルは保存できません"); return; }
  await updateRoomTitle(roomId, newTitle, roomSelect, logArea);
});

// テクスチャ更新
updateTextureBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }
  const updates = {};
  if (wallTexture.value) updates.wall = wallTexture.value;
  if (floorTexture.value) updates.floor = floorTexture.value;
  if (ceilingTexture.value) updates.ceiling = ceilingTexture.value;
  if (doorTexture.value) updates.door = doorTexture.value;
  if (Object.keys(updates).length === 0) { alert("テクスチャが選択されていません"); return; }
  await updateTexturePaths(roomId, updates, logArea);
});
