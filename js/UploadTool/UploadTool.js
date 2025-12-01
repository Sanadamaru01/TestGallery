// UploadTool.js
// 画像変換 → Storageアップロード → Firestore登録 の制御
import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage, deleteImage } from "./firebaseStorage.js";
import { saveImageMetadata, updateImageMetadata, deleteImageMetadata, getRoomImages, getRooms, updateRoom } from "./firebaseFirestore.js";
import { handleFileSelect, updateProgressBar } from "./uiHandlers.js";

/**
 * メインアップロード処理
 */
export async function uploadArtwork({ file, roomId, title, caption, author, onProgress }) {
    const dataUrl = await loadImageFile(file);
    const img = await loadImageElement(dataUrl);
    const resizedBlob = await resizeAndConvert(img, 600, 0.85);

    const imageId = crypto.randomUUID();
    const storagePath = `rooms/${roomId}/${imageId}.jpg`;

    const downloadUrl = await uploadImage(storagePath, resizedBlob, onProgress);

    await saveImageMetadata(roomId, imageId, { file: downloadUrl, title, caption, author });

    return { imageId, downloadUrl };
}

/**
 * 画像削除
 */
export async function removeArtwork(roomId, imageId, fileUrl) {
    await deleteImage(fileUrl);
    await deleteImageMetadata(roomId, imageId);
}

/**
 * ルーム一覧取得
 */
export async function loadRoomList(selectElement) {
    const rooms = await getRooms();
    selectElement.innerHTML = rooms.map(r => `<option value="${r.id}">${r.roomTitle || r.id}</option>`).join("");
    return rooms;
}

/**
 * ルーム画像一覧表示
 */
export async function displayRoomImages(roomId, container) {
    const images = await getRoomImages(roomId);
    container.innerHTML = "";
    images.forEach(img => {
        const div = document.createElement("div");
        div.style.border = "1px solid #ccc";
        div.style.padding = "0.5rem";
        div.style.margin = "0.5rem 0";

        div.innerHTML = `
            <img src="${img.file}" style="width:100px; height:auto;">
            <div>タイトル: ${img.title}</div>
            <div>作者: ${img.author}</div>
            <div>説明: ${img.caption}</div>
            <button data-id="${img.id}" data-url="${img.file}">削除</button>
        `;

        const btn = div.querySelector("button");
        btn.addEventListener("click", async () => {
            if (confirm("本当に削除しますか？")) {
                await removeArtwork(roomId, img.id, img.file);
                div.remove();
            }
        });

        container.appendChild(div);
    });
}
