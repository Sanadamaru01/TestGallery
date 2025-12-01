// imageRowManager.js
import { getStorage, ref, listAll, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from './firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

// -------------------- 画像一覧読み込み --------------------
export async function loadRoomImages(previewArea, roomId, logArea) {
  if (!roomId) return;
  previewArea.innerHTML = "";

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    for (const imgDoc of imagesSnap.docs) {
      const data = imgDoc.data();
      const imgEl = document.createElement("img");
      imgEl.src = data.file; // すでに Storage URL が保存されている想定
      imgEl.alt = data.title || "";
      previewArea.appendChild(imgEl);
    }
    log(`✅ ${imagesSnap.size} 件の画像を読み込みました`, logArea);
  } catch (e) {
    log(`❌ 画像読み込みエラー: ${e.message}`, logArea);
  }
}

// -------------------- ファイル選択ハンドラ --------------------
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    previewArea.innerHTML = "";
    Array.from(fileInput.files).forEach(file => {
      const imgEl = document.createElement("img");
      imgEl.src = URL.createObjectURL(file);
      previewArea.appendChild(imgEl);
    });
    log(`${fileInput.files.length} 件の画像を選択しました`, logArea);
  });
}

// -------------------- ファイルアップロード --------------------
export async function uploadFiles(previewArea, roomId, logArea) {
  const files = Array.from(document.getElementById("fileInput").files);
  if (!files.length) { log("アップロードするファイルがありません", logArea); return; }

  for (const file of files) {
    try {
      // 画像リサイズして WebP 変換
      const blob = await resizeImageToWebp(file, 1600);

      // Storage にアップロード
      const storageRef = ref(storage, `share/${roomId}/${file.name}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      // Firestore に登録
      const imgDocRef = doc(collection(db, `rooms/${roomId}/images`));
      await setDoc(imgDocRef, {
        file: url,
        title: file.name,
        caption: "",
        author: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      log(`✅ アップロード完了: ${file.name}`, logArea);
    } catch (e) {
      log(`❌ アップロード失敗: ${file.name} - ${e.message}`, logArea);
    }
  }

  // アップロード後に画像再読み込み
  await loadRoomImages(previewArea, roomId, logArea);
}
