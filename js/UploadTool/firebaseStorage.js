// firebaseStorage.js
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebaseApp.js";

export async function uploadImage(storagePath, blob, onProgress) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on("state_changed",
            snapshot => {
                if (onProgress) {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(percent);
                }
            },
            err => reject(err),
            async () => {
                const url = await getDownloadURL(storageRef);
                resolve(url);
            }
        );
    });
}

export async function deleteImage(storagePath) {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
}
