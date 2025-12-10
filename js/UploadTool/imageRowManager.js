// imageRowManager.js
import { log } from './utils.js';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as storageRef, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * ルーム画像をロードして previewArea に表示
 * @param {string} roomId
 * @param {HTMLElement} previewArea
 * @param {HTMLElement} logArea
 * @returns {HTMLElement} 新しい previewArea
 */
export async function loadRoomImages(roomId, previewArea, logArea) {
  if (!roomId) return previewArea;

  // previewArea をクローンして古いイベントリスナーを削除
  const newArea = previewArea.cloneNode(false);
  previewArea.parentNode.replaceChild(newArea, previewArea);
  previewArea = newArea;

  previewArea.innerHTML = "";

  // Firestore images サブコレクション取得
  const imagesRef = collection(db, `rooms/${roomId}/images`);
  const snap = await getDocs(imagesRef);

  for (const docSnap of snap.docs) {
    const d = docSnap.data();

    const row = document.createElement("div");
    row.className = "image-row";
    row.dataset.imageId = docSnap.id;

    // 画像サムネイル
    const img = document.createElement("img");
    img.src = d.file;
    img.className = "preview-thumb";
    row.appendChild(img);

    // タイトル入力
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = d.title ?? "";
    titleInput.placeholder = "タイトル";
    row.appendChild(titleInput);

    // キャプション入力
    const captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.value = d.caption ?? "";
    captionInput.placeholder = "キャプション";
    row.appendChild(captionInput);

    previewArea.appendChild(row);
  }

  log(`[INFO] ルーム画像読み込み完了: ${snap.docs.length} 枚`, logArea);
  return previewArea;
}

/**
 * ファイル選択時の処理
 */
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    for (const file of fileInput.files) {
      const row = document.createElement("div");
      row.className = "image-row";

      const img = document.createElement("img");
      img.className = "preview-thumb";
      img.src = URL.createObjectURL(file);
      row.appendChild(img);

      previewArea.appendChild(row);
    }

    log(`[INFO] ファイル選択: ${fileInput.files.length} 件`, logArea);
  });
}

/**
 * 画像アップロード処理
 */
export async function uploadFiles(previewArea, roomId, logArea) {
  const rows = previewArea.querySelectorAll(".image-row");

  for (const row of rows) {
    let file;
    // 新規画像の場合は <img> の src が Blob URL
    const img = row.querySelector("img");
    if (img.src.startsWith("blob:")) {
      const response = await fetch(img.src);
      const blob = await response.blob();
      file = new File([blob], "image_" + Date.now() + ".webp", { type: blob.type });
    } else {
      // 既存画像はスキップ
      continue;
    }

    // Storage にアップロード
    const storagePath = `rooms/${roomId}/${file.name}`;
    const storageRefObj = storageRef(storage, storagePath);
    await uploadBytes(storageRefObj, file);

    // Firestore に保存
    const imagesRef = collection(db, `rooms/${roomId}/images`);
    await setDoc(doc(imagesRef), {
      file: storagePath,
      title: row.querySelector("input[type=text]").value ?? "",
      caption: row.querySelectorAll("input[type=text]")[1]?.value ?? ""
    });
  }

  log(`[INFO] 画像アップロード完了: ${rows.length} 件`, logArea);
}

/**
 * サムネイルアップロード処理
 */
export async function handleThumbnailSelect(file, roomId, logArea) {
  const storagePath = `rooms/${roomId}/thumbnail.webp`;
  const storageRefObj = storageRef(storage, storagePath);
  await uploadBytes(storageRefObj, file);
  log(`[INFO] サムネイルアップロード: ${file.name}`, logArea);
}
