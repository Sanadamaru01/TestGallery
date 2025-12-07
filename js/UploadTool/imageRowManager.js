// imageRowManager.js
import { getStorage, ref, listAll, getDownloadURL, uploadBytesResumable, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from '../firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

// =========================================================
// 画像一覧読み込み
// =========================================================
export async function loadRoomImages(previewArea, roomId, logArea) {
  if (!roomId) return;
  previewArea.innerHTML = "";

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`✅ ${imagesSnap.size} 件の画像を読み込みました`, logArea);

    if (imagesSnap.size === 0) {
      const p = document.createElement("div");
      p.textContent = "(画像はまだありません)";
      previewArea.appendChild(p);
      return;
    }

    for (const imgDoc of imagesSnap.docs) {
      const data = imgDoc.data();

      let downloadURL = data.downloadURL || "";
      if (!downloadURL && data.file) {
        try {
          const storagePath = data.file.includes('/')
            ? data.file
            : `rooms/${roomId}/${data.file}`;
          const storageRef = ref(storage, storagePath);
          downloadURL = await getDownloadURL(storageRef);
        } catch (e) {
          log(`❌ 画像 URL 取得失敗: ${data.file} - ${e.message}`, logArea);
        }
      }

      createImageRow(previewArea, roomId, imgDoc.id, { ...data, downloadURL }, true, logArea);
    }
  } catch (e) {
    log(`❌ 画像読み込みエラー: ${e.message}`, logArea);
    console.error(e);
  }
}


// =========================================================
// ファイル選択（サムネイル判定付き）
// =========================================================
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);

    for (const file of files) {
      // ▼ サムネイル判定（thumb / thumbnail）
      const isThumbnail =
        file.name.toLowerCase().includes("thumb") ||
        file.name.toLowerCase().includes("thumbnail");

      const previewURL = URL.createObjectURL(file);

      createImageRow(previewArea, null, crypto.randomUUID(), {
        title: file.name,
        caption: "",
        author: "",
        downloadURL: previewURL,
        _fileObject: file,
        fileNameFixed: isThumbnail ? "thumbnail.webp" : null
      }, false, logArea);
    }

    log(`${files.length} 件の画像を選択しました`, logArea);
  });
}


// =========================================================
// ファイルアップロード本体
// =========================================================
export async function uploadFiles(previewArea, roomId, logArea) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);

  if (uploadRows.length === 0) {
    log("アップロードする新規ファイルがありません", logArea);
    return;
  }

  for (const row of uploadRows) {
    const meta = row.querySelector(".file-meta");
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    const fileObj = row._fileObject;

    try {
      const blob = await resizeImageToWebp(fileObj, 1600);

      // ▼ サムネイルならファイル名固定
      const fileName = row._fileNameFixed
        ? row._fileNameFixed
        : crypto.randomUUID() + ".webp";

      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // ▼ サムネイルは既存を削除して上書き
      if (row._fileNameFixed) {
        try {
          await deleteObject(storageRef);
          log(`サムネイル既存削除: ${storagePath}`, logArea);
        } catch (_) {
          // なければ無視
        }
      }

      await uploadBytesResumable(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName,
        downloadURL,
        title,
        caption,
        author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      log(`✅ アップロード完了: ${fileName}`, logArea);
    } catch (e) {
      log(`❌ アップロード失敗: ${fileObj.name} - ${e.message}`, logArea);
      console.error(e);
    }
  }

  await loadRoomImages(previewArea, roomId, logArea);
}


// =========================================================
// UI：画像行作成
// =========================================================
function createImageRow(previewArea, roomId, docId, data, isExisting = false, logArea) {
  const row = document.createElement("div");
  row.className = "file-row";
  row.style.display = "flex";
  row.style.gap = "12px";
  row.style.alignItems = "flex-start";
  row.style.marginBottom = "8px";

  // ▼ サムネイル名固定フラグを保持（uploadFiles で参照）
  row._fileNameFixed = data.fileNameFixed || null;

  // ▼ 新規の時のみ FileObject を保持
  if (data._fileObject) {
    row._fileObject = data._fileObject;
  }

  // ----- 画像 -----
  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  img.alt = data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";
  img.style.background = "#f0f0f0";
  row.appendChild(img);

  // ----- メタ情報入力 -----
  const meta = document.createElement("div");
  meta.className = "file-meta";
  meta.style.flex = "1";

  // タイトル
  const titleInput = document.createElement("input");
  titleInput.placeholder = "タイトル";
  titleInput.value = data.title || "";
  titleInput.className = "titleInput";
  titleInput.style.width = "100%";

  // キャプション
  const captionInput = document.createElement("textarea");
  captionInput.placeholder = "キャプション";
  captionInput.value = data.caption || "";
  captionInput.className = "captionInput";
  captionInput.style.width = "100%";

  // 作者
  const authorInput = document.createElement("input");
  authorInput.placeholder = "作者";
  authorInput.value = data.author || "";
  authorInput.className = "authorInput";
  authorInput.style.width = "100%";

  meta.appendChild(titleInput);
  meta.appendChild(captionInput);
  meta.appendChild(authorInput);

  row.appendChild(meta);

  previewArea.appendChild(row);
}
