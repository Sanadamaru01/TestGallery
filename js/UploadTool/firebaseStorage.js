// firebaseStorage.js
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { storage } from "./firebaseApp.js";

export function uploadImage(path, blob, onProgress) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on("state_changed",
            (snapshot) => {
                const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(percent);
            },
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            }
        );
    });
}

export async function deleteImage(path) {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
}
