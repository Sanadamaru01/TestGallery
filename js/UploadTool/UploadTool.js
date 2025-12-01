// UploadTool.js
import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage, deleteImage } from "./firebaseStorage.js";
import { 
    saveImageMetadata, getRoomImages, deleteImageMetadata,
    getRoomData, updateRoomTitle, updateRoomTextures 
} from "./firebaseFirestore.js";
import { handleFileSelect } from "./uiHandlers.js";

console.log("=== UploadTool.js ロード開始 ===");

const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const logArea = document.getElementById("log");

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

// ログ出力
function log(msg) {
    console.log(msg);
    logArea.textContent += msg + "\n";
    logArea.scrollTop = logArea.scrollHeight;
}

// ファイル選択・プレビュー
handleFileSelect(fileInput, previewArea, file => selectedFiles.push(file));

// ルーム選択後に画像プレビュー更新
roomSelect.addEventListener("change", async () => {
    previewArea.innerHTML = "";
    const roomId = roomSelect.value;
    if (!roomId) return;
    const images = await getRoomImages(roomId);
    images.forEach(img => {
        const el = document.createElement("div");
        el.innerHTML = `
            <img src="${img.file}" style="width:100px;height:100px;object-fit:cover;">
            <button data-id="${img.id}" class="deleteBtn">削除</button>
        `;
        previewArea.appendChild(el);
    });

    // 削除ボタン
    previewArea.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const imageId = btn.dataset.id;
            const storagePath = `rooms/${roomId}/${imageId}.jpg`;
            await deleteImage(storagePath);
            await deleteImageMetadata(roomId, imageId);
            log(`画像削除: ${imageId}`);
            btn.parentElement.remove();
        });
    });

    // ルーム情報表示
    const roomData = await getRoomData(roomId);
    if (roomData) roomTitleInput.value = roomData.roomTitle || "";
});

// ルームタイトル更新
updateRoomBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) return;
    await updateRoomTitle(roomId, roomTitleInput.value);
    log(`ルームタイトル更新: ${roomTitleInput.value}`);
});

// テクスチャ更新
updateTextureBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) return;
    const textures = {
        wall: wallTexture.value,
        floor: floorTexture.value,
        ceiling: ceilingTexture.value,
        door: doorTexture.value
    };
    await updateRoomTextures(roomId, textures);
    log(`テクスチャ更新: ${JSON.stringify(textures)}`);
});

// アップロード処理
uploadBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) { alert("ルームを選択してください"); return; }

    for (const file of selectedFiles) {
        log(`📤 アップロード開始: ${file.name}`);
        try {
            const dataUrl = await loadImageFile(file);
            const img = await loadImageElement(dataUrl);
            const blob = await resizeAndConvert(img, 1600, 0.9);
            const imageId = crypto.randomUUID();
            const storagePath = `rooms/${roomId}/${imageId}.jpg`;
            const downloadUrl = await uploadImage(storagePath, blob, percent => {
                log(`${file.name}: ${percent.toFixed(1)}%`);
            });
            await saveImageMetadata(roomId, imageId, { file: downloadUrl, title: file.name, caption: "", author: "" });
            log(`✅ アップロード完了: ${file.name}`);
        } catch (err) {
            log(`❌ アップロード失敗: ${file.name} - ${err.message}`);
        }
    }
    selectedFiles = [];
    previewArea.innerHTML = "";
});

console.log("=== UploadTool.js ロード完了 ===");
