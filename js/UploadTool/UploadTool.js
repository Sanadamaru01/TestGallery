import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage, deleteImage } from "./firebaseStorage.js";
import { saveImageMetadata, getAllRooms, updateRoomTitle, deleteImageMetadata } from "./firebaseFirestore.js";
import { handleFileSelect } from "./uiHandlers.js";

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
const logArea = document.getElementById("log");

// ログ表示
function log(msg) {
    console.log(msg);
    if (logArea) logArea.textContent += msg + "\n";
}

// ファイル選択 → プレビュー
handleFileSelect(fileInput, previewArea, file => log(`選択: ${file.name}`));

// ルーム取得
async function loadRooms() {
    const rooms = await getAllRooms();
    roomSelect.innerHTML = "";
    rooms.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.roomTitle || r.id;
        roomSelect.appendChild(opt);
    });
    if (rooms.length) roomSelect.value = rooms[0].id;
}
loadRooms();

// ルームタイトル更新
updateRoomBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    const title = roomTitleInput.value.trim();
    if (!roomId || !title) return alert("ルームIDまたはタイトル未入力");
    await updateRoomTitle(roomId, title);
    log(`ルームタイトル更新: ${title}`);
});

// アップロード処理
document.getElementById("uploadBtn").addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) return alert("ルームを選択してください");

    const files = Array.from(fileInput.files || []);
    if (!files.length) return alert("ファイルを選択してください");

    for (const file of files) {
        const dataUrl = await loadImageFile(file);
        const img = await loadImageElement(dataUrl);
        const blob = await resizeAndConvert(img, 600, 0.85);
        const imageId = crypto.randomUUID();
        const storagePath = `rooms/${roomId}/${imageId}.jpg`;
        const downloadUrl = await uploadImage(storagePath, blob, p => log(`進捗: ${p.toFixed(0)}%`));
        await saveImageMetadata(roomId, imageId, { file: downloadUrl, title: file.name, caption: "", author: "" });
        log(`アップロード完了: ${file.name}`);
    }
    alert("アップロード完了");
});

// 画像削除（サンプルボタン用）
async function deleteImageById(roomId, imageId) {
    await deleteImageMetadata(roomId, imageId);
    await deleteImage(`rooms/${roomId}/${imageId}.jpg`);
    log(`削除完了: ${imageId}`);
}
