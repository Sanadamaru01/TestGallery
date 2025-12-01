// firebaseStorage.js
import { app } from "./firebaseApp.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const storage = getStorage(app);

/** 画像アップロード（UploadTool.js が使用） */
export function uploadImage(storagePath, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob);

    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) {
          const ratio = snap.bytesTransferred / snap.totalBytes;
          onProgress(ratio);
        }
      },
      (err) => reject(err),
      async () => {
        const downloadUrl = await getDownloadURL(task.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}

/** フォルダ一覧取得（テクスチャ用） */
export async function listFolder(path) {
  const listRef = ref(storage, path);
  return await listAll(listRef);
}

/** Storage のファイル削除（管理機能で使用） */
export async function deleteStorageFile(path) {
  const fileRef = ref(storage, path);
  await deleteObject(fileRef);
}
