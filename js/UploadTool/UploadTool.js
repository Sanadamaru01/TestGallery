import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage, deleteImage } from "./firebaseStorage.js";
import { saveImageMetadata, getAllRooms, updateRoomTitle } from "./firebaseFirestore.js";
import { handleFileSelect } from "./uiHandlers.js";

const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");

// ファイル選択 → プレビュー
handleFileSelect(fileInput, previewArea, file => {
    console.log("選択されたファイル:", file.name);
});

// ルーム一覧取得
async function loadRoomList() {
    const rooms = await getAllRooms();
    roomSelect.innerHTML = "";
    rooms.forEach(room => {
        const opt = document.createElement("option");
        opt.value = room.id;
        opt.textContent = room.roomTitle || room.id;
        roomSelect.appendChild(opt);
    });
    if (rooms.length > 0) {
        roomSelect.value = rooms[0].id;
    }
}
loadRoomList();

// ルームタイトル更新
updateRoomBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    const newTitle = roomTitleInput.value.trim();
    if (!roomId || !newTitle) return alert("入力してください");
    await updateRoomTitle(roomId, newTitle);
    alert("更新しました");
});

// アップロード処理
document.getElementById("uploadBtn").addEventListener("click", async () => {
    const roomId = roomSelect.value;
    if (!roomId) return alert("ルームを選択してください");

    const files = Array.from(fileInput.files || []);
    if (files.length === 0) return alert("ファイルを選択してください");

    for (const file of files) {
        const dataUrl = await loadImageFile(file);
        const img = await loadImageElement(dataUrl);
        const blob = await resizeAndConvert(img, 2000, 0.85);
        const imageId = crypto.randomUUID();
        const storagePath = `rooms/${roomId}/${imageId}.jpg`;
        const downloadUrl = await uploadImage(storagePath, blob, p => console.log(`進捗: ${p.toFixed(0)}%`));
        await saveImageMetadata(roomId, imageId, {
            file: downloadUrl,
            title: file.name,
            caption: "",
            author: ""
        });
        console.log("アップロード完了:", file.name);
    }
    alert("アップロード完了");
});
