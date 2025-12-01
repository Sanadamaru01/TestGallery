import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebaseApp.js";

export async function uploadImage(storagePath, blob, onProgress) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, blob);
        uploadTask.on("state_changed",
            snapshot => {
                if (onProgress) {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                }
            },
            error => reject(error),
            async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
            }
        );
    });
}

export async function deleteImage(storagePath) {
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        return true;
    } catch (e) {
        console.warn("Storage 削除失敗:", e);
        return false;
    }
}
