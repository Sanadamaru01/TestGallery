// imageRowManager.js
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as storageRef, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from "../firebaseInit.js";
import { log } from './utils.js';

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * ルームの画像を読み込み、プレビューエリアに表示
 * @param {string} roomId 
 * @param {HTMLElement} previewArea 
 * @param {HTMLElement} logArea 
 */
export async function loadRoomImages(roomId, previewArea, logArea) {
  if (!roomId) return previewArea;

  // previewArea をリセット
  const newArea = previewArea.cloneNode(false);
  previewArea.parentNode.replaceChild(newArea, previewArea);
  previewArea = newArea;
  previewArea.innerHTML = "";

  // images サブコレクション取得
  const imagesSnap = await getDocs(collection(db, "rooms", roomId, "images"));

  for (const docSnap of imagesSnap.docs) {
    const d = docSnap.data();

    const row = document.createElement("div");
    row.className = "image-row";

    // サムネイル img
    const img = document.createElement("img");
    img.className = "preview-thumb";

    try {
      const url = await getDownloadURL(storageRef(storage, d.file));
      img.src = url;
    } catch (e) {
      console.warn("[WARN] 画像取得失敗:", d.file, e);
      img.src = "/noimage.webp";
    }

    row.appendChild(img);

    // タイトル
    const title = document.createElement("input");
    title.type = "text";
    title.value = d.title ?? "";
    title.placeholder = "タイトル";
    row.appendChild(title);

    // キャプション
    const caption = document.createElement("input");
    caption.type = "text";
    caption.value = d.caption ?? "";
    caption.placeholder = "キャプション";
    row.appendChild(caption);

    // 作者
    const author = document.createElement("input");
    author.type = "text";
    author.value = d.author ?? "";
    author.placeholder = "作者";
    row.appendChild(author);

    // 並び替え・削除ボタンは既存の CSS/JS に任せる
    previewArea.appendChild(row);
  }

  log(`[INFO] ルーム画像読み込み完了: ${imagesSnap.docs.length} 枚`, logArea);
  return previewArea;
}

/**
 * ファイル選択時の処理
 */
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = fileInput.files;
    for (const file of files) {
      const row = document.createElement("div");
      row.className = "image-row";

      const img = document.createElement("img");
      img.className = "preview-thumb";
      img.src = URL.createObjectURL(file);

      row.appendChild(img);
      previewArea.appendChild(row);
    }
    log(`[INFO] ファイル選択: ${files.length} 枚`, logArea);
  });
}

/**
 * 画像アップロード
 */
export async function uploadFiles(previewArea, roomId, logArea) {
  const rows = previewArea.querySelectorAll(".image-row");
  for (const row of rows) {
    const img = row.querySelector("img");
    if (!img.src.startsWith("blob:")) continue; // Storage からの既存画像はスキップ

    const file = row.querySelector("input[type=file]")?.files[0];
    if (!file) continue;

    const path = `rooms/${roomId}/${file.name}`;
    const storageReference = storageRef(storage, path);
    await uploadBytes(storageReference, file);

    // Firestore に追加
    await updateDoc(doc(db, "rooms", roomId, "images", file.name), {
      file: path,
      title: row.querySelector("input[placeholder='タイトル']")?.value ?? "",
      caption: row.querySelector("input[placeholder='キャプション']")?.value ?? "",
      author: row.querySelector("input[placeholder='作者']")?.value ?? "",
      updatedAt: serverTimestamp()
    });
  }
  log(`[INFO] 画像アップロード完了`, logArea);
}

/**
 * サムネイル選択時の処理
 */
export async function handleThumbnailSelect(file, roomId, logArea) {
  const path = `rooms/${roomId}/thumbnail.webp`;
  const storageReference = storageRef(storage, path);
  await uploadBytes(storageReference, file);
  log(`[INFO] サムネイルアップロード完了: ${file.name}`, logArea);
}
