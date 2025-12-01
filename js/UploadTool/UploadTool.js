// UploadTool.js
import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage } from "./firebaseStorage.js";
import { saveImageMetadata } from "./firebaseFirestore.js";
import { handleFileSelect } from "./uiHandlers.js";

console.log("=== UploadTool.js ロード開始 ===");

const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");

const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");

const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");
const updateTextureBtn = document.getElementById("updateTextureBtn");

const uploadBtn = document.getElementById("uploadBtn");

let selectedFiles = [];

handleFileSelect(fileInput, previewArea, (file) => selectedFiles.push(file));

uploadBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) { alert("ルームを選択してください"); return; }

    for (const file of selectedFiles) {
        console.log(`📤 アップロード開始: ${file.name}`);
        try {
            const dataUrl = await loadImageFile(file);
            const img = await loadImageElement(dataUrl);
            const blob = await resizeAndConvert(img, 1600, 0.9);
            const imageId = crypto.randomUUID();
            const storagePath = `rooms/${roomId}/${imageId}.jpg`;
            const downloadUrl = await uploadImage(storagePath, blob, percent => {
                console.log(`${file.name}: ${percent.toFixed(1)}%`);
            });
            await saveImageMetadata(roomId, imageId, { file: downloadUrl, title: file.name, caption: "", author: "" });
            console.log(`✅ アップロード完了: ${file.name}`);
        } catch (err) {
            console.error(`❌ アップロード失敗: ${file.name}`, err);
        }
    }
    selectedFiles = [];
    previewArea.innerHTML = "";
});

console.log("=== UploadTool.js ロード完了 ===");
