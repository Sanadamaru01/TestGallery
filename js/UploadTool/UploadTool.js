// UploadTool.js
// Upload + 管理ツール（Firebase + pica + utils.js 利用版）

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc,
  updateDoc, addDoc, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { log, escapeHtml, selectOptionByValue, resizeImageToWebp } from './utils.js';

// -------------------- Firebase 設定 --------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- DOM --------------------
const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");

const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");
const updateTextureBtn = document.getElementById("updateTextureBtn");

const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");

const logArea = document.getElementById("log");

// -------------------- テクスチャ取得補助 --------------------
async function tryListAllWithFallbacks(storagePath) {
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
    } catch {}
  }
  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    return { path: storagePath, res };
  } catch (e) {
    throw new Error(`listAll failed for candidates: ${tried.join(', ')} - ${e.message}`);
  }
}

async function populateTextureSelect(storagePath, selectEl) {
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
      log(`⚠️ ${storagePath} にファイルが見つかりません（候補: ${usedPath}）`, logArea);
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

async function loadTextures() {
  log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...", logArea);
  await populateTextureSelect("share/Wall", wallTexture);
  await populateTextureSelect("share/Floor", floorTexture);
  await populateTextureSelect("share/Ceiling", ceilingTexture);
  await populateTextureSelect("share/Door", doorTexture);
  log("✅ テクスチャ一覧取得完了", logArea);
}

// -------------------- ルーム一覧 --------------------
async function loadRooms() {
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
      await onRoomChange();
    }
    log("✅ 部屋一覧を読み込みました", logArea);
  } catch (e) {
    log("❌ 部屋一覧取得エラー:" + e.message, logArea);
  }
}

roomSelect.addEventListener("change", onRoomChange);

// -------------------- ルーム変更処理 --------------------
async function onRoomChange() {
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
    if (tp.wall) selectOptionByValue(wallTexture, tp.wall, msg => log(msg, logArea));
    if (tp.floor) selectOptionByValue(floorTexture, tp.floor, msg => log(msg, logArea));
    if (tp.ceiling) selectOptionByValue(ceilingTexture, tp.ceiling, msg => log(msg, logArea));
    if (tp.Door) selectOptionByValue(doorTexture, tp.Door, msg => log(msg, logArea));

    log(`ℹ️ ルーム情報読み込み: ${roomId}`, logArea);
    await loadRoomImages(roomId);
  } catch (e) {
    log("❌ ルーム情報読み込みエラー:" + e.message, logArea);
  }
}

// -------------------- 既存画像読み込み --------------------
async function loadRoomImages(roomId) {
  previewArea.innerHTML = "";
  log(`📂 ルーム ${roomId} の images を読み込みます...`, logArea);
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
      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      try {
        const downloadURL = await getDownloadURL(storageRef);
        createImageRow(roomId, docSnap.id, {...data, downloadURL, file: fileName}, true);
      } catch {
        createImageRow(roomId, docSnap.id, {...data, downloadURL: "", file: fileName}, true);
      }
    }
  } catch (err) {
    log(`❌ images 読み込みエラー: ${err.message}`, logArea);
  }
}

// -------------------- 画像行作成 --------------------
function createImageRow(roomId, docId, data, isExisting = false) {
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

  // 更新
  meta.querySelector(".updateBtn").addEventListener("click", async () => {
    if (!isExisting) {
      meta.querySelector(".statusText").textContent = "(未アップロードプレビュー)";
      return;
    }
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    try {
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {title, caption, author, updatedAt: serverTimestamp()});
      meta.querySelector(".statusText").textContent = "更新済み";
      log(`📝 ${title || docId} を更新しました`, logArea);
    } catch (e) {
      log(`❌ 更新失敗: ${e.message}`, logArea);
    }
  });

  // 削除
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

// -------------------- ファイル選択 → プレビュー表示 --------------------
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  for (const file of files) {
    const previewURL = URL.createObjectURL(file);
    createImageRow(null, crypto.randomUUID(), {
      title: file.name,
      caption: "",
      author: "",
      downloadURL: previewURL,
      _fileObject: file
    }, false);
  }
});

// -------------------- アップロード --------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }

  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) { alert("アップロードする新規ファイルがありません"); return; }

  uploadBtn.disabled = true;
  log(`🚀 アップロード開始 (${uploadRows.length}件)`, logArea);

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
      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytesResumable(storageRef, blob);

      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName,
        title, caption, author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      success++;
      log(`✅ ${title || fileName} を保存しました (${storagePath})`, logArea);
    } catch (e) {
      fail++;
      log(`❌ アップロード失敗: ${e.message}`, logArea);
    }
  }

  log(`🎉 アップロード完了 — 成功: ${success}, 失敗: ${fail}`, logArea);
  uploadBtn.disabled = false;
  await loadRoomImages(roomId);
});

// -------------------- ルームタイトル更新 --------------------
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }
  const newTitle = roomTitleInput.value.trim();
  if (!newTitle) { alert("空のタイトルは保存できません"); return; }
  try {
    await updateDoc(doc(db, "rooms", roomId), { roomTitle: newTitle, updatedAt: serverTimestamp() });
    const opt = Array.from(roomSelect.options).find(o => o.value === roomId);
    if (opt) opt.textContent = `${roomId} : ${newTitle}`;
    log(`📝 ルームタイトル更新: ${newTitle}`, logArea);
  } catch (e) {
    log(`❌ ルーム更新失敗: ${e.message}`, logArea);
  }
});

// -------------------- テクスチャ更新 --------------------
updateTextureBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }
  const updates = {};
  if (wallTexture.value) updates["texturePaths.wall"] = wallTexture.value;
  if (floorTexture.value) updates["texturePaths.floor"] = floorTexture.value;
  if (ceilingTexture.value) updates["texturePaths.ceiling"] = ceilingTexture.value;
  if (doorTexture.value) updates["texturePaths.Door"] = doorTexture.value;
  if (Object.keys(updates).length === 0) { alert("テクスチャが選択されていません"); return; }
  updates.updatedAt = serverTimestamp();
  try {
    await updateDoc(doc(db, "rooms", roomId), updates);
    log(`📝 テクスチャ更新完了: ${JSON.stringify(updates)}`, logArea);
  } catch (e) {
    log(`❌ テクスチャ更新失敗: ${e.message}`, logArea);
  }
});

// -------------------- 初期化 --------------------
window.addEventListener("DOMContentLoaded", async () => {
  try { await loadTextures(); } catch (e) { console.warn("loadTextures error:", e); }
  await loadRooms();
});
