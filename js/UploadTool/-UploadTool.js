// UploadTool.js
import pica from "https://cdn.skypack.dev/pica";
import * as fs from "./firebaseFirestore.js";
import * as st from "./firebaseStorage.js";

// -------------------- DOM 要素 --------------------
const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");
const updateRoomBtn = document.getElementById("updateRoomBtn");
const updateTextureBtn = document.getElementById("updateTextureBtn");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");
const logArea = document.getElementById("log");

// -------------------- ログ関数 --------------------
function log(msg) {
  const t = new Date().toLocaleString();
  logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
  console.log(msg);
}

// -------------------- 初期化 --------------------
log("📢 UploadTool.js 読み込み完了");

// -------------------- 部屋データ管理 --------------------
let roomsData = {};

async function loadRooms() {
  log("📂 Firestore から部屋リストを取得中...");
  const rooms = await fs.getRooms(); // Firestore から rooms コレクションを取得する関数
  roomSelect.innerHTML = "";
  rooms.forEach(doc => {
    const roomId = doc.id;
    const data = doc.data();
    roomsData[roomId] = data;
    const opt = document.createElement("option");
    opt.value = roomId;
    opt.textContent = roomId;
    roomSelect.appendChild(opt);
  });
  log(`✅ 部屋リスト取得完了: ${Object.keys(roomsData).join(", ")}`);
}

// -------------------- フォーム反映 --------------------
function reflectRoomForm(roomId) {
  const data = roomsData[roomId];
  if (!data) {
    log(`⚠️ roomId=${roomId} のデータがありません`);
    return;
  }
  roomTitleInput.value = data.roomTitle || "";
  wallTexture.value = data.texturePaths?.wall || "";
  floorTexture.value = data.texturePaths?.floor || "";
  ceilingTexture.value = data.texturePaths?.ceiling || "";
  doorTexture.value = data.texturePaths?.door || "";
  log(`✏️ roomId=${roomId} の情報をフォームに反映`);
}

// -------------------- 部屋選択変更 --------------------
roomSelect.addEventListener("change", () => {
  const roomId = roomSelect.value;
  reflectRoomForm(roomId);
});

// -------------------- ルームタイトル更新 --------------------
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) return alert("ルームを選択してください");
  const newTitle = roomTitleInput.value;
  try {
    await fs.updateRoom(roomId, { roomTitle: newTitle });
    roomsData[roomId].roomTitle = newTitle;
    log(`✅ roomId=${roomId} タイトルを更新: ${newTitle}`);
  } catch (e) {
    log(`❌ タイトル更新失敗: ${e.message}`);
  }
});

// -------------------- テクスチャ更新 --------------------
updateTextureBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) return alert("ルームを選択してください");
  const newTextures = {
    wall: wallTexture.value,
    floor: floorTexture.value,
    ceiling: ceilingTexture.value,
    door: doorTexture.value,
  };
  try {
    await fs.updateRoom(roomId, { texturePaths: newTextures });
    roomsData[roomId].texturePaths = newTextures;
    log(`✅ roomId=${roomId} テクスチャ更新`);
  } catch (e) {
    log(`❌ テクスチャ更新失敗: ${e.message}`);
  }
});

// -------------------- ファイル選択 -> プレビュー --------------------
fileInput.addEventListener("change", () => {
  log("📂 fileInput change 発火");
  const files = Array.from(fileInput.files || []);
  for (const file of files) {
    const previewURL = URL.createObjectURL(file);
    log(`🖼️ 選択されたファイル: ${file.name}`);
    createImageRow(null, crypto.randomUUID(), {
      title: file.name,
      downloadURL: previewURL,
      _fileObject: file
    }, false);
  }
});

// -------------------- プレビュー行作成 --------------------
function createImageRow(roomId, docId, data, isExisting) {
  log(`✏️ createImageRow called: ${data.title || docId}`);
  const row = document.createElement("div");
  row.className = "file-row";
  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  row.appendChild(img);
  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;
  previewArea.appendChild(row);
  log("✅ プレビュー行追加完了");
}

// -------------------- アップロード処理 --------------------
uploadBtn.addEventListener("click", async () => {
  log("🚀 uploadBtn click 発火");
  const roomId = roomSelect.value;
  if (!roomId) return alert("ルームを選択してください");

  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) return alert("アップロード対象なし");

  uploadBtn.disabled = true;
  let success = 0, fail = 0;

  for (const row of uploadRows) {
    const fileObj = row._fileObject;
    try {
      log(`📤 アップロード処理開始: ${fileObj.name}`);
      const blob = await resizeImageToWebp(fileObj);
      const fileName = crypto.randomUUID() + ".webp";
      const storagePath = `rooms/${roomId}/${fileName}`;
      await st.uploadFile(storagePath, blob);
      await fs.addRoomImageMeta(roomId, { file: fileName, title: fileObj.name });
      success++;
      log(`✅ ${fileObj.name} 保存完了 (${storagePath})`);
    } catch(e) {
      fail++;
      log(`❌ アップロード失敗: ${fileObj.name} / ${e.message}`);
      console.error(e);
    }
  }
  uploadBtn.disabled = false;
  log(`🎉 アップロード完了 — 成功: ${success}, 失敗: ${fail}`);
});

// -------------------- 画像リサイズ --------------------
async function resizeImageToWebp(file, maxLongSide = 1600, quality = 0.9) {
  log(`🖌️ resizeImageToWebp: ${file.name}`);
  const img = new Image();
  const objectURL = URL.createObjectURL(file);
  img.src = objectURL;
  await img.decode();

  const long = Math.max(img.width, img.height);
  const scale = long > maxLongSide ? (maxLongSide / long) : 1;
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
  const blob = await new Promise(resolve => targetCanvas.toBlob(resolve, "image/webp", quality));
  URL.revokeObjectURL(objectURL);
  log(`✅ resizeImageToWebp 完了: ${file.name} -> ${width}x${height}`);
  return blob;
}

// -------------------- DOMContentLoaded --------------------
window.addEventListener("DOMContentLoaded", async () => {
  log("📄 DOMContentLoaded 発火 - UploadTool 初期化開始");
  await loadRooms();
  if (roomSelect.options.length > 0) {
    roomSelect.selectedIndex = 0;
    roomSelect.dispatchEvent(new Event("change"));
  }
  log("📄 UploadTool 初期化完了");
});
