// firebaseStorage.js
// Firebase Storage へのアップロード処理

import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

export function uploadImage(path, fileBlob, onProgress = null) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, fileBlob);

        uploadTask.on('state_changed',
            (snapshot) => {
                if (onProgress) {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(percent);
                }
            },
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            }
        );
    });
}
