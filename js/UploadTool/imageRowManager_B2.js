// imageRowManager.js (修正版)
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, setDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from './firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

// -------------------- 画像一覧読み込み --------------------
export async function loadRoomImages(previewArea, roomId) {
  if (!roomId) return;
  previewArea.innerHTML = "";
  try {
    const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
    if (snap.size === 0) {
      const p = document.createElement("div");
      p.textContent = "(画像はまだありません)";
      previewArea.appendChild(p);
      return;
    }

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const fileName = data.file;
      if (!fileName) continue;

      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      let downloadURL = "";
      try {
        downloadURL = await getDownloadURL(storageRef);
      } catch (e) {
        log(`❌ downloadURL取得失敗: ${storagePath} - ${e.message}`);
      }

      createImageRow(previewArea, roomId, docSnap.id, {...data, downloadURL, file: fileName}, true);
    }

    log(`✅ ${snap.size} 件の画像を読み込みました`);
  } catch (e) {
    log(`❌ 画像読み込みエラー: ${e.message}`);
  }
}

// -------------------- ファイル選択 -> プレビュー表示 --------------------
export function handleFileSelect(fileInput, previewArea) {
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
      }, false);
    }
  });
}

// -------------------- 画像行作成 --------------------
function createImageRow(previewArea, roomId, docId, data, isExisting = false) {
  const row = document.createElement("div");
  row.className = "file-row";
  row.style.display = "flex";
  row.style.gap = "12px";
  row.style.alignItems = "flex-start";
  row.style.marginBottom = "8px";

  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  img.alt = data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";
  img.style.background = "#f0f0f0";

  const meta = document.createElement("div");
  meta.className = "file-meta";
  meta.style.display = "flex";
  meta.style.flexDirection = "column";
  meta.style.gap = "6px";
  meta.innerHTML = `
    <input type="text" class="titleInput" placeholder="タイトル" value="${data.title || ''}">
    <input type="text" class="captionInput" placeholder="キャプション" value="${data.caption || ''}">
    <input type="text" class="authorInput" placeholder="作者" value="${data.author || ''}">
    <div style="display:flex;gap:6px;align-items:center;">
      <button class="updateBtn">更新</button>
      <button class="deleteBtn">削除</button>
      <div class="statusText small" style="margin-left:6px"></div>
    </div>
  `;

  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;

  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);
}

// -------------------- アップロード処理 --------------------
export async function uploadFiles(previewArea, roomId) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (!uploadRows.length) return log("アップロードするファイルがありません");

  for (const row of uploadRows) {
    const meta = row.querySelector(".file-meta");
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    const fileObj = row._fileObject;

    try {
      const blob = await resizeImageToWebp(fileObj, 1600, 0.9);
      const fileName = crypto.randomUUID() + ".webp";
      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytesResumable(storageRef, blob);
      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName,
        title, caption, author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      log(`✅ ${title || fileName} を保存しました`);
    } catch (e) {
      log(`❌ アップロード失敗: ${e.message}`);
    }
  }

  await loadRoomImages(previewArea, roomId);
}
