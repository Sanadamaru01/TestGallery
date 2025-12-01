// UploadTool.js
// 画像変換 → Storageアップロード → Firestore登録 の制御
import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
import { uploadImage } from "./firebaseStorage.js";
import { saveImageMetadata } from "./firebaseFirestore.js";

// main upload function
export async function uploadArtwork({ file, roomId, title, caption, author, onProgress }) {
    // 1) File → DataURL
    const dataUrl = await loadImageFile(file);

    // 2) DataURL → Image element
    const img = await loadImageElement(dataUrl);

    // 3) リサイズ＆JPEG変換
    const resizedBlob = await resizeAndConvert(img, 2000, 0.85);

    // 4) ストレージへアップロード
    const imageId = crypto.randomUUID();
    const storagePath = `rooms/${roomId}/${imageId}.jpg`;

    const downloadUrl = await uploadImage(storagePath, resizedBlob, onProgress);

    // 5) Firestoreへ登録
    await saveImageMetadata(roomId, imageId, {
        file: downloadUrl,
        title,
        caption,
        author
    });

    return { imageId, downloadUrl };
}
