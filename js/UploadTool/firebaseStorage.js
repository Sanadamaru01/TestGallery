// firebaseStorage.js
// Firebase Storage へのアップロード・削除を担当
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";
import { getFirebaseStorage } from "./firebaseApp.js";

const storage = getFirebaseStorage();

/**
 * 画像を Storage にアップロード
 * @param {string} path - Storage のパス
 * @param {Blob} blob - アップロードするファイル
 * @param {function} onProgress - プログレスコールバック(0~100)
 * @returns {Promise<string>} - ダウンロードURL
 */
export function uploadImage(path, blob, onProgress) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on("state_changed",
            (snapshot) => {
                if (onProgress) {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                }
            },
            (error) => reject(error),
            async () => {
                try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
}

/**
 * 画像を Storage から削除
 * @param {string} path - Storage のパス
 * @returns {Promise<void>}
 */
export async function deleteImage(path) {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log(`[firebaseStorage] Deleted: ${path}`);
}
