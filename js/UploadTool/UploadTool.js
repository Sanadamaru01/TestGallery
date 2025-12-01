// uploadTool.js
import pica from "https://cdn.skypack.dev/pica";
import * as fs from "./firebaseFirestore.js";
import * as st from "./firebaseStorage.js";

// DOM 要素取得
const roomSelect = document.getElementById("roomSelect");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");
const logArea = document.getElementById("log");

// ログ出力
function log(msg) {
  const t = new Date().toLocaleString();
  logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
}

// ファイル選択 -> プレビュー
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  for (const file of files) {
    const previewURL = URL.createObjectURL(file);
    createImageRow(null, crypto.randomUUID(), {
      title: file.name,
      downloadURL: previewURL,
      _fileObject: file
    }, false);
  }
});

// プレビュー行作成（簡略版）
function createImageRow(roomId, docId, data, isExisting) {
  const row = document.createElement("div");
  row.className = "file-row";
  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  row.appendChild(img);
  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;
  previewArea.appendChild(row);
}

// アップロード処理
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }

  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) { alert("アップロードする新規ファイルがありません"); return; }

  uploadBtn.disabled = true;
  let success = 0, fail = 0;
  for (const row of uploadRows) {
    const fileObj = row._fileObject;
    try {
      const blob = await resizeImageToWebp(fileObj);
      const fileName = crypto.randomUUID() + ".webp";
      const storagePath = `rooms/${roomId}/${fileName}`;
      await st.uploadFile(storagePath, blob);
      await fs.addRoomImageMeta(roomId, { file: fileName, title: fileObj.name });
      success++;
      log(`✅ ${fileObj.name} を保存 (${storagePath})`);
    } catch(e) {
      fail++;
      log(`❌ アップロード失敗: ${e.message}`);
    }
  }
  uploadBtn.disabled = false;
  log(`🎉 完了 — 成功: ${success}, 失敗: ${fail}`);
});

// 画像リサイズ
async function resizeImageToWebp(file, maxLongSide = 1600, quality = 0.9) {
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
  return blob;
}
