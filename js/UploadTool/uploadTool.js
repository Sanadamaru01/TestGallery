import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc,
  updateDoc, addDoc, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import pica from "https://cdn.skypack.dev/pica";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

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

function log(msg) {
  const t = new Date().toLocaleString();
  logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
}

async function loadRooms() {
  log("🚪 部屋一覧読み込みを開始します…");
  try {
    const snap = await getDocs(collection(db, "rooms"));
    roomSelect.innerHTML = "";
    snap.forEach(docSnap => {
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      const title = docSnap.data().roomTitle ?? "(no title)";
      opt.textContent = `${docSnap.id} : ${title}`;
      roomSelect.appendChild(opt);
    });
    if (roomSelect.options.length > 0) {
      roomSelect.selectedIndex = 0;
      await onRoomChange();
    }
    log("✅ 部屋一覧を読み込みました。");
  } catch (err) {
    log(`❌ 部屋一覧取得エラー: ${err.message}`);
  }
}
roomSelect.addEventListener("change", onRoomChange);
loadRooms();

async function onRoomChange() {
  const roomId = roomSelect.value;
  if (!roomId) return;
  try {
    const roomDocRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomDocRef);
    if (!snap.exists()) {
      roomTitleInput.value = "";
      log(`⚠️ ルーム ${roomId} が見つかりません`);
      return;
    }
    const data = snap.data();
    roomTitleInput.value = data.roomTitle ?? "";
    const tp = data.texturePaths ?? {};
    if (tp.wall) selectOptionByValue(wallTexture, tp.wall);
    if (tp.floor) selectOptionByValue(floorTexture, tp.floor);
    if (tp.ceiling) selectOptionByValue(ceilingTexture, tp.ceiling);
    if (tp.Door) selectOptionByValue(doorTexture, tp.Door);

    log(`ℹ️ ルーム情報読み込み: ${roomId}`);
    await loadRoomImages(roomId);
  } catch (err) {
    log(`❌ ルーム情報読み込みエラー: ${err.message}`);
  }
}

function selectOptionByValue(selectEl, value) {
  if (!value) return;
  const opts = Array.from(selectEl.options);
  const found = opts.find(o => o.value === value);
  if (found) selectEl.value = value;
}

async function loadTextures() {
  try {
    log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...");
    await populateTextureSelect("share/Wall", wallTexture);
    await populateTextureSelect("share/Floor", floorTexture);
    await populateTextureSelect("share/Ceiling", ceilingTexture);
    await populateTextureSelect("share/Door", doorTexture);
    log("✅ テクスチャ一覧取得完了");
    await onRoomChange();
  } catch (err) {
    log(`❌ テクスチャ読み込み失敗: ${err.message}`);
  }
}

async function populateTextureSelect(storagePath, selectEl) {
  selectEl.innerHTML = "";
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    for (const itemRef of res.items) {
      const opt = document.createElement("option");
      opt.value = `${storagePath}/${itemRef.name}`;
      opt.textContent = itemRef.name;
      selectEl.appendChild(opt);
    }
    if (res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
    }
  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
  }
}
window.addEventListener("DOMContentLoaded", loadTextures);

updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) { alert("ルームを選択してください"); return; }
  const newTitle = roomTitleInput.value.trim();
  if (newTitle.length === 0) { alert("空のタイトルは保存できません"); return; }
  try {
    await updateDoc(doc(db, "rooms", roomId), { roomTitle: newTitle, updatedAt: serverTimestamp() });
    log(`📝 ルームタイトルを更新しました: ${newTitle}`);
    const opt = Array.from(roomSelect.options).find(o => o.value === roomId);
    if (opt) opt.textContent = `${roomId} : ${newTitle}`;
  } catch (err) {
    log(`❌ ルーム更新失敗: ${err.message}`);
  }
});

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
    log(`📝 テクスチャを更新しました: ${JSON.stringify(updates)}`);
  } catch (err) {
    log(`❌ テクスチャ更新失敗: ${err.message}`);
  }
});

// ---------------------
// 既存画像管理
// ---------------------
async function loadRoomImages(roomId) {
  previewArea.innerHTML = "";
  const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const row = document.createElement("div");
    row.className = "file-row";

    const img = document.createElement("img");
    img.src = data.downloadURL;
    img.alt = data.title;

    const meta = document.createElement("div");
    meta.className = "file-meta";
    meta.innerHTML = `
      <input type="text" class="titleInput" value="${escapeHtml(data.title)}">
      <input type="text" class="captionInput" value="${escapeHtml(data.caption)}">
      <input type="text" class="authorInput" value="${escapeHtml(data.author)}">
      <button class="updateBtn">更新</button>
      <button class="deleteBtn">削除</button>
      <div class="small statusText"></div>
    `;

    meta.querySelector(".updateBtn").addEventListener("click", async () => {
      const title = meta.querySelector(".titleInput").value.trim();
      const caption = meta.querySelector(".captionInput").value.trim();
      const author = meta.querySelector(".authorInput").value.trim();
      await updateDoc(doc(db, `rooms/${roomId}/images/${docSnap.id}`), {
        title, caption, author, updatedAt: serverTimestamp()
      });
      log(`📝 ${title} を更新しました`);
    });

    meta.querySelector(".deleteBtn").addEventListener("click", async () => {
      if (!confirm("本当に削除しますか？")) return;
      await deleteDoc(doc(db, `rooms/${roomId}/images/${docSnap.id}`));
      const storageRef = ref(storage, data.file);
      await deleteObject(storageRef);
      row.remove();
      log(`❌ ${data.title} を削除しました`);
    });

    row.appendChild(img);
    row.appendChild(meta);
    previewArea.appendChild(row);
  });
}

// ---------------------
// 新規アップロード
// ---------------------
fileInput.addEventListener("change", () => {
  // 新規ファイルのプレビューだけは別で管理
  previewArea.innerHTML = ""; // 既存画像は loadRoomImages() で表示されるのでクリア不要の場合も
  const files = Array.from(fileInput.files || []);
  files.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-row";

    const img = document.createElement("img");
    img.alt = file.name;
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.readAsDataURL(file);

    const meta = document.createElement("div");
    meta.className = "file-meta";
    meta.innerHTML = `
      <input type="text" class="titleInput" placeholder="タイトル (省略可)" value="${escapeHtml(file.name)}">
      <input type="text" class="captionInput" placeholder="キャプション (省略可)">
      <input type="text" class="authorInput" placeholder="作者 (省略可)" value="">
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="small statusText">待機</div>
      </div>
    `;

    row.appendChild(img);
    row.appendChild(meta);
    previewArea.appendChild(row);
  });
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function resizeImageToWebp(file, maxLongSide = 600, quality = 0.9) {
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
  const blob = await pica().toBlob(targetCanvas, "image/webp", quality);
  URL.revokeObjectURL(objectURL);
  return blob;
}

uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  const files = Array.from(fileInput.files || []);
  if (!roomId) { alert("ルームを選択してください"); return; }
  if (files.length === 0) { alert("アップロードするファイルを選択してください"); return; }

  uploadBtn.disabled = true;
  fileInput.disabled = true;
  updateRoomBtn.disabled = true;
  updateTextureBtn.disabled = true;

  log(`🚀 アップロードを開始します（${files.length}件）`);
  let success = 0, fail = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const row = previewArea.children[i];
    if (!row) continue;
    const title = row.querySelector(".titleInput").value.trim() || file.name;
    const caption = row.querySelector(".captionInput").value.trim() || "";
    const author = row.querySelector(".authorInput").value.trim() || "";
    const progressFill = row.querySelector(".progress-fill");
    const statusText = row.querySelector(".statusText");

    try {
      statusText.textContent = "リサイズ中...";
      const resizedBlob = await resizeImageToWebp(file, 600, 0.9);
      const fileId = crypto.randomUUID();
      const storagePath = `rooms/${roomId}/${fileId}.webp`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, resizedBlob);

      await new Promise((resolve, reject) => {
        uploadTask.on("state_changed",
          snapshot => {
            const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progressFill) progressFill.style.width = `${Math.round(p)}%`;
            statusText.textContent = `アップロード ${Math.round(p)}%`;
          },
          err => { reject(err); },
          async () => {
            try {
              const downloadURL = await getDownloadURL(storageRef);
              const data = { file: storagePath, downloadURL, title, caption, author, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
              await addDoc(collection(db, `rooms/${roomId}/images`), data);
              resolve();
            } catch (e) { reject(e); }
          }
        );
      });

      statusText.textContent = "完了";
      success++;
      log(`✅ ${file.name} を保存しました（${storagePath}）`);
    } catch (err) {
      fail++;
      if (row) row.querySelector(".statusText").textContent = "失敗";
      log(`❌ ${file.name} のアップロードでエラー: ${err.message}`);
    }
  }

  log(`🎉 アップロード処理 終了 — 成功: ${success}, 失敗: ${fail}`);
  uploadBtn.disabled = false
