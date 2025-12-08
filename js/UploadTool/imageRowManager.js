// imageRowManager.js
import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from '../firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

export async function loadRoomImages(previewArea, roomId, logArea) {
  if (!roomId) return;
  previewArea.innerHTML = "";

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`✅ ${imagesSnap.size} 件の画像を読み込みました`, logArea);

    if (imagesSnap.size === 0) {
      previewArea.textContent = "(画像はまだありません)";
      return;
    }

    for (const imgDoc of imagesSnap.docs) {
      const data = imgDoc.data();
      let downloadURL = data.downloadURL || "";
      if (!downloadURL && data.file) {
        try {
          const storagePath = data.file.includes('/') ? data.file : `rooms/${roomId}/${data.file}`;
          downloadURL = await getDownloadURL(ref(storage, storagePath));
        } catch (_) {}
      }
      createImageRow(previewArea, roomId, imgDoc.id, {...data, downloadURL}, true, logArea);
    }
  } catch (e) {
    log(`❌ 画像読み込みエラー: ${e.message}`, logArea);
    console.error(e);
  }
}

export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      const previewURL = URL.createObjectURL(file);
      createImageRow(previewArea, null, crypto.randomUUID(), {
        title: file.name, caption: "", author: "", downloadURL: previewURL, _fileObject: file
      }, false, logArea);
    }
    log(`${files.length} 件の画像を選択しました`, logArea);
  });
}

export async function uploadFiles(previewArea, roomId, logArea) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) { log("アップロードする新規ファイルがありません", logArea); return; }

  for (const row of uploadRows) {
    const meta = row.querySelector(".file-meta");
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    const fileObj = row._fileObject;

    try {
      const blob = await resizeImageToWebp(fileObj, 1600);
      const fileName = crypto.randomUUID() + ".webp";
      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytesResumable(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName, downloadURL, title, caption, author,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      log(`✅ アップロード完了: ${fileName}`, logArea);
    } catch (e) {
      log(`❌ アップロード失敗: ${fileObj.name} - ${e.message}`, logArea);
    }
  }
  await loadRoomImages(previewArea, roomId, logArea);
}

// -------------------- 画像行作成 --------------------
function createImageRow(previewArea, roomId, docId, data, isExisting = false, logArea) {
  const row = document.createElement("div");
  row.className = "file-row";
  row.style.display = "flex"; row.style.gap = "12px"; row.style.alignItems = "flex-start"; row.style.marginBottom = "8px";

  const img = document.createElement("img");
  img.src = data.downloadURL || ""; img.alt = data.title || "(no title)";
  img.style.width = "120px"; img.style.height = "120px"; img.style.objectFit = "cover"; img.style.background = "#f0f0f0";

  const meta = document.createElement("div");
  meta.className = "file-meta"; meta.style.display = "flex"; meta.style.flexDirection = "column"; meta.style.gap = "6px";

  const titleInput = document.createElement("input"); titleInput.className = "titleInput"; titleInput.placeholder = "タイトル"; titleInput.value = data.title || "";
  const captionInput = document.createElement("input"); captionInput.className = "captionInput"; captionInput.placeholder = "キャプション"; captionInput.value = data.caption || "";
  const authorInput = document.createElement("input"); authorInput.className = "authorInput"; authorInput.placeholder = "作者"; authorInput.value = data.author || "";

  const btnWrap = document.createElement("div"); btnWrap.style.display = "flex"; btnWrap.style.gap = "6px"; btnWrap.style.alignItems = "center";
  const updateBtn = document.createElement("button"); updateBtn.className = "updateBtn"; updateBtn.textContent = isExisting ? "更新" : "（プレビュー）";
  const deleteBtn = document.createElement("button"); deleteBtn.className = "deleteBtn"; deleteBtn.textContent = "削除";
  const statusText = document.createElement("div"); statusText.className = "statusText small"; statusText.style.marginLeft = "6px";

  btnWrap.appendChild(updateBtn); btnWrap.appendChild(deleteBtn); btnWrap.appendChild(statusText);
  meta.appendChild(titleInput); meta.appendChild(captionInput); meta.appendChild(authorInput); meta.appendChild(btnWrap);

  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;

  // 更新
  updateBtn.addEventListener("click", async () => {
    if (!isExisting) { statusText.textContent = "(未アップロードプレビュー)"; return; }
    try {
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {
        title: titleInput.value.trim(), caption: captionInput.value.trim(), author: authorInput.value.trim(),
        updatedAt: serverTimestamp()
      });
      statusText.textContent = "更新済み"; log(`📝 ${titleInput.value || docId} を更新`, logArea);
    } catch (e) { statusText.textContent = "更新失敗"; log(`❌ 更新失敗: ${e.message}`, logArea); }
  });

  // 削除
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      if (isExisting) {
        await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
        if (data.file) {
          try { await deleteObject(ref(storage, data.file.includes('/') ? data.file : `rooms/${roomId}/${data.file}`)); } catch (_) {}
        }
      }
      row.remove(); log(`❌ ${data.title || docId} を削除`, logArea);
    } catch (err) { log(`❌ 削除に失敗: ${err.message}`, logArea); }
  });

  row.appendChild(img); row.appendChild(meta);
  previewArea.appendChild(row);
}
