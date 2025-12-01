// firebaseStorage.js
import { storage } from "./firebaseApp.js";
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// アップロード
export async function uploadFile(storagePath, blob) {
  const storageRef = ref(storage, storagePath);
  await uploadBytesResumable(storageRef, blob);
}

// ダウンロード URL 取得
export async function getFileURL(storagePath) {
  const storageRef = ref(storage, storagePath);
  return await getDownloadURL(storageRef);
}

// ファイル削除
export async function deleteFile(storagePath) {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

// listAll 取得（大文字小文字フォールバック付き）
export async function listAllWithFallbacks(storagePath) {
  const tried = [];
  const parts = storagePath.split('/');
  const prefixes = [parts[0], parts[0].toLowerCase(), parts[0].toUpperCase()];
  for (const pre of prefixes) {
    const candidate = [pre, ...parts.slice(1)].join('/');
    tried.push(candidate);
    try {
      const res = await listAll(ref(storage, candidate));
      if (res.items.length > 0) return { path: candidate, res };
    } catch(e) {}
  }
  try {
    const res = await listAll(ref(storage, storagePath));
    return { path: storagePath, res };
  } catch(e) {
    throw new Error(`listAll failed for candidates: ${tried.join(', ')} - ${e.message}`);
  }
}
