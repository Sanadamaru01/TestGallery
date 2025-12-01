// UploadTool.js (DEBUG版)
// 画像変換 → Storageアップロード → Firestore登録 の制御

console.log("=== UploadTool.js 読み込み開始 ===");

console.log("step0: imageUtils.js 読み込み開始");
import { loadImageFile, loadImageElement, resizeAndConvert } from "./imageUtils.js";
console.log("step1: imageUtils.js 読み込み完了");

console.log("step2: firebaseStorage.js 読み込み開始");
import { uploadImage } from "./firebaseStorage.js";
console.log("step3: firebaseStorage.js 読み込み完了");

console.log("step4: firebaseFirestore.js 読み込み開始");
import { saveImageMetadata } from "./firebaseFirestore.js";
console.log("step5: firebaseFirestore.js 読み込み完了");

console.log("=== UploadTool.js import 完了 ===");


// main upload function
export async function uploadArtwork({ file, roomId, title, caption, author, onProgress }) {
    console.log("uploadArtwork() START", { roomId, title, caption, author });

    try {
        console.log("stepA: File → DataURL");
        const dataUrl = await loadImageFile(file);
        console.log("stepA DONE");

        console.log("stepB: DataURL → Image element");
        const img = await loadImageElement(dataUrl);
        console.log("stepB DONE");

        console.log("stepC: リサイズ＆JPEG変換開始");
        const resizedBlob = await resizeAndConvert(img, 2000, 0.85);
        console.log("stepC DONE (resizedBlob size:", resizedBlob.size, ")");

        console.log("stepD: ストレージアップロード開始");
        const imageId = crypto.randomUUID();
        const storagePath = `rooms/${roomId}/${imageId}.jpg`;
        console.log("→ storagePath:", storagePath);

        const downloadUrl = await uploadImage(storagePath, resizedBlob, onProgress);
        console.log("stepD DONE → downloadUrl:", downloadUrl);

        console.log("stepE: Firestore メタデータ登録開始");
        await saveImageMetadata(roomId, imageId, {
            file: downloadUrl,
            title,
            caption,
            author
        });
        console.log("stepE DONE");

        console.log("uploadArtwork() COMPLETE");
        return { imageId, downloadUrl };
    } catch (err) {
        console.error("❌ uploadArtwork() ERROR:", err);
        throw err;
    }
}

console.log("=== UploadTool.js 全体ロード完了 ===");
