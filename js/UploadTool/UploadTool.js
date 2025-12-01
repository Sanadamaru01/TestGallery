// UploadTool.js
import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage, deleteImage } from "./firebaseStorage.js";
import { saveImageMetadata, updateImageMetadata, deleteImageMetadata, getRooms, getRoomImages, updateRoomTitle, updateRoomTextures } from "./firebaseFirestore.js";
import { setupFileInput, createProgressBar, createImageRow } from "./uiHandlers.js";

// グローバル UI 要素
const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");

const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");
const updateTextureBtn = document.getElementById("updateTextureBtn");

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const previewArea = document.getElementById("previewArea");
const logEl = document.getElementById("log");

let currentRoomId = null;

// ログ出力
function log(msg) {
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
}

// ルームセレクト生成
async function loadRooms() {
    const rooms = await getRooms();
    roomSelect.innerHTML = "";
    rooms.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.roomTitle;
        roomSelect.appendChild(opt);
    });
    if (rooms[0]) {
        currentRoomId = rooms[0].id;
        roomTitleInput.value = rooms[0].roomTitle;
        loadRoomImages();
    }
}

roomSelect.addEventListener("change", () => {
    currentRoomId = roomSelect.value;
    loadRoomImages();
});

// ルームタイトル更新
updateRoomBtn.addEventListener("click", async () => {
    if (!currentRoomId) return;
    await updateRoomTitle(currentRoomId, roomTitleInput.value);
    log(`ルームタイトル更新: ${roomTitleInput.value}`);
});

// テクスチャ更新
updateTextureBtn.addEventListener("click", async () => {
    if (!currentRoomId) return;
    await updateRoomTextures(currentRoomId, {
        wall: wallTexture.value,
        floor: floorTexture.value,
        ceiling: ceilingTexture.value,
        door: doorTexture.value
    });
    log("テクスチャ更新完了");
});

// ファイルアップロード
let selectedFile = null;
setupFileInput(fileInput, previewArea, (file) => selectedFile = file);

uploadBtn.addEventListener("click", async () => {
    if (!currentRoomId || !selectedFile) return;

    const progressFill = createProgressBar(previewArea);

    try {
        const dataUrl = await loadImageFile(selectedFile);
        const imgEl = await loadImageElement(dataUrl);
        const blob = await resizeAndConvert(imgEl, 600, 0.85);

        const imageId = crypto.randomUUID();
        const storagePath = `rooms/${currentRoomId}/${imageId}.jpg`;
        const downloadUrl = await uploadImage(storagePath, blob, (percent) => {
            progressFill.style.width = percent + "%";
        });

        await saveImageMetadata(currentRoomId, imageId, {
            file: downloadUrl,
            title: selectedFile.name,
            caption: "",
            author: ""
        });

        log(`アップロード完了: ${selectedFile.name}`);
        loadRoomImages();
    } catch (e) {
        console.error(e);
        log(`アップロード失敗: ${e.message}`);
    }
});

// ルーム内画像一覧表示
async function loadRoomImages() {
    if (!currentRoomId) return;
    previewArea.innerHTML = "";
    const images = await getRoomImages(currentRoomId);
    images.forEach(img => {
        const row = createImageRow(img,
            async (id) => { // 削除
                await deleteImageMetadata(currentRoomId, id);
                await deleteImage(`rooms/${currentRoomId}/${id}.jpg`);
                log(`削除: ${id}`);
                loadRoomImages();
            },
            async (id, data) => { // 更新
                await updateImageMetadata(currentRoomId, id, data);
                log(`更新: ${id}`);
                loadRoomImages();
            }
        );
        previewArea.appendChild(row);
    });
}

// 初期ロード
loadRooms();
log("UploadTool モジュールロード完了");
