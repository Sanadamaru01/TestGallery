import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from '../firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

// -------------------- 画像一覧読み込み --------------------
export async function loadRoomImages(roomId, previewArea, logArea) {
  if (!roomId) return;
  previewArea.innerHTML = "";

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`✅ ${imagesSnap.size} 件の画像を読み込みました`, logArea);

    if (imagesSnap.size === 0) {
      previewArea.innerHTML = "(画像はまだありません)";
      return;
    }

    for (const imgDoc of imagesSnap.docs) {
      const data = imgDoc.data();
      let downloadURL = data.downloadURL || "";
      if (!downloadURL && data.file) {
        try {
          const storagePath = data.file.includes('/') ? data.file : `rooms/${roomId}/${data.file}`;
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

// -------------------- サムネイル専用アップロード --------------------
export async function handleThumbnailSelect(file, roomId, logArea) {
  if (!file) return;
  const renamedFile = new File([file], "thumbnail.webp", { type: file.type });
  log(`🖼️ サムネイルアップロード開始: thumbnail.webp`, logArea);

  // blob変換
  const blob = await resizeImageToWebp(renamedFile, 1600);
  const storagePath = `rooms/${roomId}/thumbnail.webp`;
  const storageRef = ref(storage, storagePath);

  try {
    // 既存を上書き
    await deleteObject(storageRef).catch(()=>{});
    await uploadBytesResumable(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // Firestore の images コレクションに追加 or 更新
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    let docId = null;
    imagesSnap.forEach(d => { if(d.data().file === "thumbnail.webp") docId = d.id; });

    if(docId){
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {
        downloadURL,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: "thumbnail.webp",
        downloadURL,
        title: "サムネイル",
        caption: "",
        author: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    log("✅ サムネイルアップロード完了", logArea);
  } catch(e){
    log(`❌ サムネイルアップロード失敗: ${e.message}`, logArea);
    console.error(e);
  }

  await loadRoomImages(roomId, previewArea, logArea);
}

// -------------------- 通常ファイルアップロード --------------------
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    for(const file of files){
      const previewURL = URL.createObjectURL(file);
      createImageRow(previewArea, null, crypto.randomUUID(), {
        title: file.name,
        caption: "",
        author: "",
        downloadURL: previewURL,
        _fileObject: file
      }, false, logArea);
    }
    log(`${files.length} 件の画像を選択しました`, logArea);
  });
}

export async function uploadFiles(previewArea, roomId, logArea){
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if(uploadRows.length === 0){
    log("アップロードする新規ファイルがありません", logArea);
    return;
  }

  for(const row of uploadRows){
    const meta = row.querySelector(".file-meta");
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    const fileObj = row._fileObject;

    try{
      const blob = await resizeImageToWebp(fileObj, 1600);
      const fileName = crypto.randomUUID() + ".webp";
      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytesResumable(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName,
        downloadURL,
        title, caption, author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      log(`✅ アップロード完了: ${fileName}`, logArea);
    } catch(e){
      log(`❌ アップロード失敗: ${fileObj.name} - ${e.message}`, logArea);
      console.error(e);
    }
  }

  await loadRoomImages(roomId, previewArea, logArea);
}

// -------------------- 画像行作成 --------------------
function createImageRow(previewArea, roomId, docId, data, isExisting = false, logArea){
  const row = document.createElement("div");
  row.className = "file-row";
  row.style.display = "flex";
  row.style.gap = "12px";
  row.style.alignItems = "flex-start";
  row.style.marginBottom = "8px";

  // 画像
  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  img.alt = data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";
  img.style.background = "#f0f0f0";

  // meta
  const meta = document.createElement("div");
  meta.className = "file-meta";
  meta.style.display = "flex";
  meta.style.flexDirection = "column";
  meta.style.gap = "6px";

  const titleInput = document.createElement("input");
  titleInput.type = "text"; titleInput.className = "titleInput"; titleInput.placeholder = "タイトル"; titleInput.value = data.title || "";

  const captionInput = document.createElement("input");
  captionInput.type = "text"; captionInput.className = "captionInput"; captionInput.placeholder = "キャプション"; captionInput.value = data.caption || "";

  const authorInput = document.createElement("input");
  authorInput.type = "text"; authorInput.className = "authorInput"; authorInput.placeholder = "作者"; authorInput.value = data.author || "";

  // ボタン
  const btnWrap = document.createElement("div");
  btnWrap.style.display = "flex"; btnWrap.style.gap = "6px"; btnWrap.style.alignItems = "center";

  const updateBtn = document.createElement("button");
  updateBtn.textContent = isExisting ? "更新" : "（プレビュー）";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "削除";

  const statusText = document.createElement("div");
  statusText.className = "statusText small"; statusText.style.marginLeft = "6px";

  btnWrap.appendChild(updateBtn);
  btnWrap.appendChild(deleteBtn);
  btnWrap.appendChild(statusText);

  meta.appendChild(titleInput);
  meta.appendChild(captionInput);
  meta.appendChild(authorInput);
  meta.appendChild(btnWrap);

  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);

  // --- 更新 ---
  updateBtn.addEventListener("click", async () => {
    if(!isExisting){ statusText.textContent="(未アップロード)"; return; }
    try{
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {
        title: titleInput.value.trim(),
        caption: captionInput.value.trim(),
        author: authorInput.value.trim(),
        updatedAt: serverTimestamp()
      });
      statusText.textContent="更新済み";
      log(`📝 ${titleInput.value || docId} を更新しました`, logArea);
    }catch(e){
      statusText.textContent="更新失敗";
      log(`❌ 更新失敗: ${e.message}`, logArea);
      console.error(e);
    }
  });

  // --- 削除 ---
  deleteBtn.addEventListener("click", async () => {
    if(!confirm("本当に削除しますか？")) return;
    try{
      if(isExisting){
        await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
        if(data.file){
          try{
            const storagePath = data.file.includes('/') ? data.file : `rooms/${roomId}/${data.file}`;
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            log(`🗑️ Storage: ${storagePath} を削除しました`, logArea);
          }catch(e){ log(`⚠️ Storage 削除でエラー: ${e.message}`, logArea); }
        }
      }
      row.remove();
      log(`❌ ${data.title || docId} を削除しました`, logArea);
    }catch(err){ log(`❌ 削除に失敗しました: ${err.message}`, logArea); console.error(err); }
  });
}
