// imageRowManager.js
import { log } from './utils.js';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as storageRef, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * ルームの画像をロードして previewArea に表示
 * @param {string} roomId 
 * @param {HTMLElement} previewArea 
 * @param {HTMLElement} logArea 
 * @returns {HTMLElement} previewArea
 */
export async function loadRoomImages(roomId, previewArea, logArea) {
  previewArea.innerHTML = "";

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    const images = [];

    imagesSnap.forEach(d => {
      const data = d.data();
      images.push({
        id: d.id,
        title: data.title ?? "",
        caption: data.caption ?? "",
        author: data.author ?? "",
        file: data.file
      });
    });

    for (const d of images) {
      const img = document.createElement("img");
      img.className = "preview-img";

      try {
        // ルームIDを含めた Storage パス
        const filePath = `rooms/${roomId}/${d.file}`;
        const url = await getDownloadURL(storageRef(storage, filePath));
        img.src = url;
      } catch (e) {
        console.warn("[WARN] 画像取得失敗:", d.file, e);
        img.src = "/noimage.jpg";  // ローカルに noimage.jpg を配置
      }

      img.title = d.title || d.file;
      previewArea.appendChild(img);
    }

    log(`[INFO] ルーム画像読み込み完了: ${images.length} 枚`, logArea);
  } catch (e) {
    console.error("[ERROR] loadRoomImages", e);
  }

  return previewArea;
}

/**
 * ファイル選択ハンドラ
 * @param {HTMLInputElement} fileInput 
 * @param {HTMLElement} previewArea 
 * @param {HTMLElement} logArea 
 */
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = fileInput.files;
    if (!files.length) return;

    previewArea.innerHTML = "";

    Array.from(files).forEach(file => {
      const img = document.createElement("img");
      img.className = "preview-img";
      img.src = URL.createObjectURL(file);
      img.title = file.name;
      previewArea.appendChild(img);
    });

    log(`[INFO] ${files.length} ファイル選択`, logArea);
  });
}

/**
 * ファイルアップロード
 * @param {HTMLElement} previewArea 
 * @param {string} roomId 
 * @param {HTMLElement} logArea 
 */
export async function uploadFiles(previewArea, roomId, logArea) {
  const files = previewArea.querySelectorAll("img");
  if (!files.length) return;

  for (const img of files) {
    const file = img.fileObj;  // img.fileObj に File を保持しておくこと
    if (!file) continue;

    const path = `rooms/${roomId}/${file.name}`;
    const storageReference = storageRef(storage, path);

    try {
      await uploadBytes(storageReference, file);
      log(`[INFO] アップロード成功: ${file.name}`, logArea);
    } catch (e) {
      console.error(`[ERROR] アップロード失敗: ${file.name}`, e);
      log(`[ERROR] アップロード失敗: ${file.name}`, logArea);
    }
  }
}

/**
 * サムネイルファイル選択処理
 * @param {File} file 
 * @param {string} roomId 
 * @param {HTMLElement} logArea 
 */
export async function handleThumbnailSelect(file, roomId, logArea) {
  const path = `rooms/${roomId}/thumbnail.webp`;
  const storageReference = storageRef(storage, path);

  try {
    await uploadBytes(storageReference, file);
    log(`[INFO] サムネイルアップロード成功: ${file.name}`, logArea);
  } catch (e) {
    console.error(`[ERROR] サムネイルアップロード失敗: ${file.name}`, e);
    log(`[ERROR] サムネイルアップロード失敗: ${file.name}`, logArea);
  }
}
