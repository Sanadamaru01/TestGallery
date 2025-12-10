// imageRowManager.js
import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from '../firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

// -------------------- 画像一覧読み込み --------------------
export async function loadRoomImages(roomId, previewArea, logArea) {
  if (!roomId) return;

  // ★ 追加：previewArea をクローンしてイベントリスナーを全削除
  const newArea = previewArea.cloneNode(false);
  previewArea.parentNode.replaceChild(newArea, previewArea);
  previewArea = newArea;
  
  previewArea.innerHTML = "";

  // コントロールバー（順序保存ボタン）を作る（既にあれば使う）
  let controlBar = document.getElementById("imageOrderControlBar");
  if (!controlBar) {
    controlBar = document.createElement("div");
    controlBar.id = "imageOrderControlBar";
    controlBar.style.margin = "8px 0";
    controlBar.style.display = "flex";
    controlBar.style.gap = "8px";
    const saveOrderBtn = document.createElement("button");
    saveOrderBtn.textContent = "順序保存";
    saveOrderBtn.addEventListener("click", async () => {
      await saveCurrentOrderToFirestore(previewArea, roomId, logArea);
    });
    controlBar.appendChild(saveOrderBtn);
    previewArea.parentElement.insertBefore(controlBar, previewArea);
  }

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`✅ ${imagesSnap.size} 件の画像を読み込みました`, logArea);

    // map docs
    const docs = imagesSnap.docs.map(d => ({ id: d.id, data: d.data() }));

    // sort: order asc if present, else createdAt asc (fallback)
    docs.sort((a, b) => {
      const ao = (a.data.order !== undefined && a.data.order !== null) ? a.data.order : null;
      const bo = (b.data.order !== undefined && b.data.order !== null) ? b.data.order : null;
      if (ao !== null && bo !== null) return ao - bo;
      if (ao !== null && bo === null) return -1;
      if (ao === null && bo !== null) return 1;
      // both null -> fallback to createdAt (if present)
      const at = a.data.createdAt ? a.data.createdAt.toMillis?.() ?? a.data.createdAt : 0;
      const bt = b.data.createdAt ? b.data.createdAt.toMillis?.() ?? b.data.createdAt : 0;
      return at - bt;
    });

    // If some docs had missing order, assign sequential orders and save (initialization)
    const needOrderAssign = docs.some((d, idx) => d.data.order === undefined || d.data.order === null);
    if (needOrderAssign) {
      const updates = [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        // set order to index if missing
        if (d.data.order === undefined || d.data.order === null) {
          updates.push(updateDoc(doc(db, `rooms/${roomId}/images/${d.id}`), {
            order: i,
            updatedAt: serverTimestamp()
          }).catch(e => {
            log(`❌ order 初期値保存失敗: ${d.id} - ${e.message}`, logArea);
          }));
          // also update local copy so createImageRow receives order
          d.data.order = i;
        }
      }
      if (updates.length > 0) {
        await Promise.all(updates);
        log(`🔧 order が無かった画像に初期値を付与しました`, logArea);
      }
    }

    // create rows in sorted order
    for (const d of docs) {
      const data = d.data;
      if (data.file === "thumbnail.webp") continue; // サムネイルは除外
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
      createImageRow(previewArea, roomId, d.id, { ...data, downloadURL }, true, logArea);
    }
  } catch (e) {
    log(`❌ 画像読み込みエラー: ${e.message}`, logArea);
    console.error(e);
  }
  return previewArea; // ← ★ newArea を返す！
}

// -------------------- サムネイルアップロード --------------------
export async function handleThumbnailSelect(file, roomId, logArea) {
  if (!file) return;
  const renamedFile = new File([file], "thumbnail.webp", { type: file.type });
  log(`🖼️ サムネイルアップロード開始: thumbnail.webp`, logArea);

  const blob = await resizeImageToWebp(renamedFile, 1600);
  const storagePath = `rooms/${roomId}/thumbnail.webp`;
  const storageRef = ref(storage, storagePath);

  try {
    await deleteObject(storageRef).catch(()=>{}); // 既存削除
    await uploadBytesResumable(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // Firestore に追加 or 更新
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    let docId = null;
    imagesSnap.forEach(d => { if(d.data().file === "thumbnail.webp") docId = d.id; });

    if(docId){
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), { downloadURL, updatedAt: serverTimestamp() });
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
    document.getElementById("thumbnailImg").src = downloadURL;
  } catch(e){
    log(`❌ サムネイルアップロード失敗: ${e.message}`, logArea);
    console.error(e);
  }
}

// -------------------- 通常ファイル選択 --------------------
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      const previewURL = URL.createObjectURL(file);
      // use a temporary id for the preview row (will be replaced by Firestore id after upload+reload)
      const tempId = crypto.randomUUID();
      createImageRow(previewArea, null, tempId, {
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

// -------------------- 通常アップロード --------------------
export async function uploadFiles(previewArea, roomId, logArea) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) {
    log("アップロードする新規ファイルがありません", logArea);
    return;
  }

  // get current max order from Firestore
  let currentMaxOrder = -1;
  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    imagesSnap.forEach(d => {
      const od = d.data().order;
      if (typeof od === "number" && od > currentMaxOrder) currentMaxOrder = od;
    });
  } catch (e) {
    log(`❌ 現行画像の order 取得失敗: ${e.message}`, logArea);
  }

  // We'll assign orders to the new uploads in the order they appear in the previewArea,
  // placing them after the currentMaxOrder
  // Determine the previewArea order index for each upload row
  const allRows = Array.from(previewArea.querySelectorAll(".file-row"));
  let nextOrder = currentMaxOrder + 1;

  for (const row of allRows) {
    if (!row._fileObject) continue;
    // only process new files (those with _fileObject)
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
        file: fileName,
        downloadURL,
        title, caption, author,
        order: nextOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      log(`✅ アップロード完了: ${fileName} (order=${nextOrder})`, logArea);
      nextOrder++;
    } catch (e) {
      log(`❌ アップロード失敗: ${fileObj.name} - ${e.message}`, logArea);
      console.error(e);
    }
  }

  // reload images after upload
  await loadRoomImages(roomId, previewArea, logArea);
}

// -------------------- 順序保存（UI の並び順 -> Firestore） --------------------
async function saveCurrentOrderToFirestore(previewArea, roomId, logArea) {
  if (!roomId) {
    log("ルームが選択されていません。", logArea);
    return;
  }
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  // Build list of {docId, order} for existing docs only
  const updates = [];
  rows.forEach((r, idx) => {
    const docId = r.dataset.docId;
    if (!docId) return; // 新規アップロード前の行は無視（uploadFilesで処理される）
    // set dataset order too
    r.dataset.order = idx;
    updates.push({ docId, order: idx });
  });

  if (updates.length === 0) {
    log("保存する画像がありません。", logArea);
    return;
  }

  // perform updates (parallel)
  try {
    const promises = updates.map(item =>
      updateDoc(doc(db, `rooms/${roomId}/images/${item.docId}`), {
        order: item.order,
        updatedAt: serverTimestamp()
      }).catch(e => {
        log(`❌ order 更新失敗: ${item.docId} - ${e.message}`, logArea);
      })
    );
    await Promise.all(promises);
    log("✅ 並び順を保存しました", logArea);
    // reload to ensure consistent ordering
    await loadRoomImages(roomId, previewArea, logArea);
  } catch (e) {
    log(`❌ 並び順保存エラー: ${e.message}`, logArea);
  }
}

// -------------------- 画像行作成 --------------------
function createImageRow(previewArea, roomId, docId, data, isExisting = false, logArea) {
  const row = document.createElement("div");
  row.className = "file-row";
  row.style.display = "flex";
  row.style.gap = "12px";
  row.style.alignItems = "flex-start";
  row.style.marginBottom = "8px";

  // attach docId & order if available
  if (docId) row.dataset.docId = docId;
  if (typeof data.order === "number") row.dataset.order = data.order;

  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  img.alt = data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";
  img.style.background = "#f0f0f0";

  // --- order control (up/down) ---
  const orderCtrl = document.createElement("div");
  orderCtrl.style.display = "flex";
  orderCtrl.style.flexDirection = "column";
  orderCtrl.style.gap = "4px";
  orderCtrl.style.marginRight = "6px";

  const upBtn = document.createElement("button");
  upBtn.textContent = "↑";
  upBtn.title = "上へ移動";
  const downBtn = document.createElement("button");
  downBtn.textContent = "↓";
  downBtn.title = "下へ移動";

  orderCtrl.appendChild(upBtn);
  orderCtrl.appendChild(downBtn);

  const meta = document.createElement("div");
  meta.className = "file-meta";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "titleInput";
  titleInput.placeholder = "タイトル";
  titleInput.value = data.title || "";

  const captionInput = document.createElement("input");
  captionInput.type = "text";
  captionInput.className = "captionInput";
  captionInput.placeholder = "キャプション";
  captionInput.value = data.caption || "";

  const authorInput = document.createElement("input");
  authorInput.type = "text";
  authorInput.className = "authorInput";
  authorInput.placeholder = "作者";
  authorInput.value = data.author || "";

  const btnWrap = document.createElement("div");
  btnWrap.style.display = "flex";
  btnWrap.style.gap = "6px";
  btnWrap.style.alignItems = "center";

  const updateBtn = document.createElement("button");
  updateBtn.textContent = isExisting ? "更新" : "（プレビュー）";
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "削除";

  const statusText = document.createElement("div");
  statusText.className = "statusText small";

  btnWrap.appendChild(updateBtn);
  btnWrap.appendChild(deleteBtn);
  btnWrap.appendChild(statusText);

  meta.appendChild(titleInput);
  meta.appendChild(captionInput);
  meta.appendChild(authorInput);
  meta.appendChild(btnWrap);

  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;

  // --- up / down handlers ---
  upBtn.addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (!prev) return;
    // If previous sibling is the control bar (or non-file-row), skip until a file-row
    // but in this layout controlBar is separate, so simply swap adjacent .file-row
    row.parentElement.insertBefore(row, prev);
    // renumber dataset
    renumberPreviewRows(previewArea);
  });

  downBtn.addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (!next) return;
    row.parentElement.insertBefore(next, row);
    renumberPreviewRows(previewArea);
  });

  // 更新
  updateBtn.addEventListener("click", async ()=>{
    if(!isExisting){ statusText.textContent="(未アップロード)"; return; }
    try{
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {
        title:titleInput.value.trim(),
        caption:captionInput.value.trim(),
        author:authorInput.value.trim(),
        updatedAt: serverTimestamp()
      });
      statusText.textContent = "更新済み";
      log(`📝 ${titleInput.value || docId} 更新`, logArea);
    }catch(e){ statusText.textContent="更新失敗"; log(`❌ 更新失敗: ${e.message}`, logArea); }
  });

  // 削除
  deleteBtn.addEventListener("click", async ()=>{
    if(!confirm("本当に削除しますか？")) return;
    try{
      if(isExisting){
        await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
        if(data.file){
          const storagePath = data.file.includes('/')?data.file:`rooms/${roomId}/${data.file}`;
          await deleteObject(ref(storage, storagePath)).catch(()=>{});
          log(`🗑️ ${storagePath} 削除`, logArea);
        }
      }
      row.remove();
      log(`❌ ${data.title || docId} 削除`, logArea);
    }catch(e){ log(`❌ 削除失敗: ${e.message}`, logArea); }
  });

  // assemble row: orderCtrl, thumbnail, meta
  row.appendChild(orderCtrl);
  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);
}

// -------------------- 補助: previewArea の行を dataset.order に再番号付与 --------------------
function renumberPreviewRows(previewArea) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  rows.forEach((r, idx) => {
    r.dataset.order = idx;
  });
}

