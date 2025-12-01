// uploadTool.js
import pica from "https://cdn.skypack.dev/pica";
import * as fs from "./firebaseFirestore.js";
import * as st from "./firebaseStorage.js";

// -------------------- DOM 要素 --------------------
const roomSelect = document.getElementById("roomSelect");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");
const logArea = document.getElementById("log");

// -------------------- ログ関数 --------------------
function log(msg) {
  const t = new Date().toLocaleString();
  logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
  console.log(msg); // コンソールにも出力
}

// -------------------- 初期化確認 --------------------
log("📢 UploadTool.js 読み込み完了");

// -------------------- ファイル選択 -> プレビュー --------------------
if (fileInput) {
  fileInput.addEventListener("change", () => {
    log("📂 fileInput change イベント発火");
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
} else {
  log("⚠️ fileInput が見つかりません");
}

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
if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    log("🚀 uploadBtn click イベント発火");
    const roomId = roomSelect.value;
    if (!roomId) { 
      alert("ルームを選択してください"); 
      log("⚠️ roomId が未選択");
      return; 
    }

    const rows = Array.from(previewArea.querySelectorAll(".file-row"));
    const uploadRows = rows.filter(r => r._fileObject);
    if (uploadRows.length === 0) { 
      alert("アップロードする新規ファイルがありません"); 
      log("⚠️ アップロード対象なし");
      return; 
    }

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
        log(`✅ ${fileObj.name} を保存 (${storagePath})`);
      } catch(e) {
        fail++;
        log(`❌ アップロード失敗: ${fileObj.name} / ${e.message}`);
        console.error(e);
      }
    }
    uploadBtn.disabled = false;
    log(`🎉 アップロード完了 — 成功: ${success}, 失敗: ${fail}`);
  });
} else {
  log("⚠️ uploadBtn が見つかりません");
}

// -------------------- 画像リサイズ --------------------
async function resizeImageToWebp(file, maxLongSide = 1600, quality = 0.9) {
  log(`🖌️ resizeImageToWebp called: ${file.name}`);
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
window.addEventListener("DOMContentLoaded", () => {
  log("📄 DOMContentLoaded 発火 - UploadTool 初期化完了");
});
