// UploadTool.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc,
  updateDoc, addDoc, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";

// -------------------- Firebase 設定 --------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <- 置き換え
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- ユーティリティ --------------------
export function log(msg, logArea) {
  const t = new Date().toLocaleString();
  if (logArea) logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
  console.log(msg);
}
export function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function selectOptionByValue(selectEl, value) {
  if (!selectEl || !value) return;
  const opts = Array.from(selectEl.options);
  const found = opts.find(o => o.value === value);
  if (found) selectEl.value = value;
}

// -------------------- テクスチャ取得 --------------------
export async function tryListAllWithFallbacks(storagePath) {
  const tried = [];
  const parts = storagePath.split('/');
  const prefixes = [parts[0], parts[0].toLowerCase(), parts[0].toUpperCase()];
  for (const pre of prefixes) {
    const pathCandidate = [pre, ...parts.slice(1)].join('/');
    tried.push(pathCandidate);
    try {
      const listRef = ref(storage, pathCandidate);
      const res = await listAll(listRef);
      if (res.items && res.items.length > 0) return { path: pathCandidate, res };
    } catch (e) {}
  }
  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    return { path: storagePath, res };
  } catch (e) {
    throw new Error(`listAll failed for candidates: ${tried.join(', ')} - ${e.message}`);
  }
}

export async function populateTextureSelect(storagePath, selectEl, logArea) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  try {
    const { path: usedPath, res } = await tryListAllWithFallbacks(storagePath);
    if (!res.items || res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
      log(`⚠️ ${storagePath} にファイルが見つかりませんでした（候補: ${usedPath}）`, logArea);
      return;
    }
    for (const itemRef of res.items) {
      const relativePath = `${usedPath}/${itemRef.name}`;
      const opt = document.createElement("option");
      opt.value = relativePath;
      opt.textContent = itemRef.name;
      selectEl.appendChild(opt);
    }
    log(`✅ ${usedPath} から ${res.items.length} 件のテクスチャを取得しました`, logArea);
  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`, logArea);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
  }
}

export async function loadTextures(wallEl, floorEl, ceilingEl, doorEl, logArea) {
  log("🖼️ テクスチャ一覧を Storage から取得...", logArea);
  await populateTextureSelect("share/Wall", wallEl, logArea);
  await populateTextureSelect("share/Floor", floorEl, logArea);
  await populateTextureSelect("share/Ceiling", ceilingEl, logArea);
  await populateTextureSelect("share/Door", doorEl, logArea);
  log("✅ テクスチャ一覧取得完了", logArea);
}

// -------------------- ルーム操作 --------------------
export async function loadRooms(roomSelect, onRoomChangeCallback, logArea) {
  log("🚪 部屋一覧読み込み開始...", logArea);
  try {
    const snap = await getDocs(collection(db, "rooms"));
    roomSelect.innerHTML = "";
    snap.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.id} : ${d.data().roomTitle ?? "(no title)"}`;
      roomSelect.appendChild(opt);
    });
    if (roomSelect.options.length > 0) {
      roomSelect.selectedIndex = 0;
      await onRoomChangeCallback();
    }
    log("✅ 部屋一覧を読み込みました", logArea);
  } catch (e) {
    log("❌ 部屋一覧取得エラー:" + e.message, logArea);
  }
}

export async function onRoomChange(roomSelect, roomTitleInput, wallEl, floorEl, ceilingEl, doorEl, logArea) {
  const roomId = roomSelect.value;
  if (!roomId) return;
  try {
    const snap = await getDoc(doc(db, "rooms", roomId));
    if (!snap.exists()) {
      roomTitleInput.value = "";
      log(`⚠️ ルーム ${roomId} が存在しません`, logArea);
      return;
    }
    const data = snap.data();
    roomTitleInput.value = data.roomTitle ?? "";
    const tp = data.texturePaths ?? {};
    if (tp.wall) selectOptionByValue(wallEl, tp.wall);
    if (tp.floor) selectOptionByValue(floorEl, tp.floor);
    if (tp.ceiling) selectOptionByValue(ceilingEl, tp.ceiling);
    if (tp.Door) selectOptionByValue(doorEl, tp.Door);
    log(`ℹ️ ルーム情報読み込み: ${roomId}`, logArea);
    await loadRoomImages(roomId, logArea);
  } catch (e) {
    log("❌ ルーム情報読み込みエラー:" + e.message, logArea);
  }
}

// -------------------- 画像操作 --------------------
export async function loadRoomImages(roomId, logArea) {
  // UI非依存: データ取得だけ
  try {
    const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`📂 images ドキュメント数: ${snap.size}`, logArea);
    const result = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const fileName = data.file;
      if (!fileName) continue;
      const storageRef = ref(storage, `rooms/${roomId}/${fileName}`);
      let downloadURL = "";
      try { downloadURL = await getDownloadURL(storageRef); } catch {}
      result.push({...data, docId: docSnap.id, downloadURL});
    }
    return result;
  } catch (err) {
    log(`❌ images 読み込みエラー: ${err.message}`, logArea);
    return [];
  }
}

export async function createImageRow(roomId, docId, data, isExisting = false) {
  // UI操作用のrow生成も返す形にしてUI側でappendする
  const row = document.createElement("div");
  row.className = "file-row";
  row._fileObject = data._fileObject || null;
  row.innerHTML = `
    <img src="${data.downloadURL || ''}" alt="${escapeHtml(data.title || '(no title)')}" width="120" height="120">
    <div class="file-meta">
      <input type="text" class="titleInput" placeholder="タイトル" value="${escapeHtml(data.title || '')}">
      <input type="text" class="captionInput" placeholder="キャプション" value="${escapeHtml(data.caption || '')}">
      <input type="text" class="authorInput" placeholder="作者" value="${escapeHtml(data.author || '')}">
      <div style="display:flex;gap:6px;align-items:center;">
        <button class="updateBtn">更新</button>
        <button class="deleteBtn">削除</button>
        <div class="statusText small" style="margin-left:6px"></div>
      </div>
    </div>
  `;
  return row;
}

// -------------------- アップロード --------------------
export async function resizeImageToWebp(file, maxLongSide = 1600, quality = 0.9) {
  const img = new Image();
  const objectURL = URL.createObjectURL(file);
  img.src = objectURL;
  await img.decode();

  const long = Math.max(img.width, img.height);
  const scale = long > maxLongSide ? (maxLongSide / long) : 1;
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  sourceCanvas.getContext("2d").drawImage(img, 0, 0);

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;

  await pica().resize(sourceCanvas, targetCanvas);
  const blob = await new Promise(resolve => targetCanvas.toBlob(resolve, "image/webp", quality));
  URL.revokeObjectURL(objectURL);
  return blob;
}

export async function uploadFiles(rows, roomId, logArea) {
  let success = 0, fail = 0;
  for (const row of rows) {
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
        file: fileName, title, caption, author,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
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

// -------------------- ルーム更新 --------------------
export async function updateRoomTitle(roomId, newTitle, roomSelect, logArea) {
  try {
    await updateDoc(doc(db, "rooms", roomId), { roomTitle: newTitle, updatedAt: serverTimestamp() });
    const opt = Array.from(roomSelect.options).find(o => o.value === roomId);
    if (opt) opt.textContent = `${roomId} : ${newTitle}`;
    log(`📝 ルームタイトル更新: ${newTitle}`, logArea);
  } catch (e) { log(`❌ ルーム更新失敗: ${e.message}`, logArea); }
}

export async function updateTexturePaths(roomId, updates, logArea) {
  try {
    const updateData = {};
    if (updates.wall) updateData["texturePaths.wall"] = updates.wall;
    if (updates.floor) updateData["texturePaths.floor"] = updates.floor;
    if (updates.ceiling) updateData["texturePaths.ceiling"] = updates.ceiling;
    if (updates.door) updateData["texturePaths.Door"] = updates.door;
    updateData.updatedAt = serverTimestamp();
    await updateDoc(doc(db, "rooms", roomId), updateData);
    log(`📝 テクスチャ更新完了: ${JSON.stringify(updateData)}`, logArea);
  } catch(e) { log(`❌ テクスチャ更新失敗: ${e.message}`, logArea); }
}
