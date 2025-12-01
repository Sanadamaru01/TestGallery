// imageRowManager.js
import { log, escapeHtml, resizeImageToWebp } from './utils.js';
import { app } from './firebaseInit.js';
import { 
  getFirestore, doc, collection, updateDoc, addDoc, serverTimestamp, getDocs, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- 画像行作成 --------------------
export function createImageRow(previewArea, roomId, docId, data, isExisting = false, logArea) {
  const row = document.createElement("div");
  row.className = "file-row";

  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  img.alt = data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";
  img.style.background = "#f0f0f0";

  const meta = document.createElement("div");
  meta.className = "file-meta";
  meta.innerHTML = `
    <input type="text" class="titleInput" placeholder="タイトル" value="${escapeHtml(data.title || '')}">
    <input type="text" class="captionInput" placeholder="キャプション" value="${escapeHtml(data.caption || '')}">
    <input type="text" class="authorInput" placeholder="作者" value="${escapeHtml(data.author || '')}">
    <div style="display:flex;gap:6px;align-items:center;">
      <button class="updateBtn">更新</button>
      <button class="deleteBtn">削除</button>
      <div class="statusText small" style="margin-left:6px"></div>
    </div>
  `;

  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;

  // 更新ボタン
  meta.querySelector(".updateBtn").addEventListener("click", async () => {
    if (!isExisting) {
      meta.querySelector(".statusText").textContent = "(未アップロードプレビュー)";
      return;
    }
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    try {
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), { title, caption, author, updatedAt: serverTimestamp() });
      meta.querySelector(".statusText").textContent = "更新済み";
      log(`📝 ${title || docId} を更新しました`, logArea);
    } catch (e) {
      log(`❌ 更新失敗: ${e.message}`, logArea);
    }
  });

  // 削除ボタン
  meta.querySelector(".deleteBtn").addEventListener("click", async () => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      if (isExisting) {
        await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
        if (data.file) {
          try {
            const storageRef = ref(storage, `rooms/${roomId}/${data.file}`);
            await deleteObject(storageRef);
            log(`🗑️ Storage: rooms/${roomId}/${data.file} を削除しました`, logArea);
          } catch (e) {
            log(`⚠️ Storage 削除でエラー: ${e.message}`, logArea);
          }
        }
      }
      row.remove();
      log(`❌ ${data.title || docId} を削除しました`, logArea);
    } catch (err) {
      log(`❌ 削除に失敗しました: ${err.message}`, logArea);
    }
  });

  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);
}

// -------------------- ルームの images 読み込み --------------------
export async function loadRoomImages(previewArea, roomId, logArea) {
  previewArea.innerHTML = "";
  try {
    const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`ℹ️ images ドキュメント数: ${snap.size}`, logArea);
    if (snap.size === 0) {
      const p = document.createElement("div");
      p.textContent = "(画像はまだありません)";
      previewArea.appendChild(p);
      return;
    }
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const fileName = data.file;
      if (!fileName) { 
        log(`⚠️ images ドキュメント ${docSnap.id} に file フィールドがありません`, logArea); 
        continue; 
      }
      const storageRef = ref(storage, `rooms/${roomId}/${fileName}`);
      let downloadURL = "";
      try { downloadURL = await getDownloadURL(storageRef); } 
      catch (err) { log(`⚠️ ${fileName} のダウンロードURL取得失敗: ${err.message}`, logArea); }
      createImageRow(previewArea, roomId, docSnap.id, {...data, downloadURL, file: fileName}, true, logArea);
    }
  } catch (err) {
    log(`❌ images 読み込みエラー: ${err.message}`, logArea);
  }
}

// -------------------- ファイル選択 → プレビュー --------------------
export function handleFileSelect(fileInput, previewArea, logArea) {
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      const previewURL = URL.createObjectURL(file);
      createImageRow(previewArea, null, crypto.randomUUID(), {
        title: file.name,
        caption: "",
        author: "",
        downloadURL: previewURL,
        _fileObject: file
      }, false, logArea);
    }
  });
}

// -------------------- アップロード処理 --------------------
export async function uploadFiles(previewArea, roomId, logArea) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) { alert("アップロードする新規ファイルがありません"); return; }

  let success = 0, fail = 0;
  for (const row of uploadRows) {
    const meta = row.querySelector(".file-meta");
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    const fileObj = row._fileObject;
    try {
      const blob = await resizeImageToWebp(fileObj, 1600, 0.9);
      const fileName = crypto.randomUUID() + ".webp";
      const storageRef = ref(storage, `rooms/${roomId}/${fileName}`);
      await uploadBytesResumable(storageRef, blob);

      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName,
        title, caption, author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      success++;
      log(`✅ ${title || fileName} を保存しました`, logArea);
    } catch (e) {
      fail++;
      log(`❌ アップロード失敗: ${e.message}`, logArea);
    }
  }
  log(`🎉 アップロード完了 — 成功: ${success}, 失敗: ${fail}`, logArea);
}
