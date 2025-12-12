// ./js/UploadTool/UploadTool.js
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject,
  listAll
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { app } from "../../firebaseInit.js"; // HTML の <script> からの相対を想定

const db = getFirestore(app);
const storage = getStorage(app);

// --- DOM ---
const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const roomAnnouncementInput = document.getElementById("roomAnnouncementInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");

const thumbnailPreview = document.getElementById("thumbnailPreview");
const thumbnailImg = document.getElementById("thumbnailImg");
const uploadThumbnailBtn = document.getElementById("uploadThumbnailBtn");
const thumbnailFileInput = document.getElementById("thumbnailFileInput");

const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");
const updateTextureBtn = document.getElementById("updateTextureBtn");

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

const previewArea = document.getElementById("previewArea");
const logArea = document.getElementById("log");

// --- State ---
let currentRoomId = null;

// --- Utility: log ---
function log(msg) {
  const time = new Date().toISOString();
  logArea.textContent += `[${time}] ${msg}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

// --- Load room list into select ---
async function loadRoomList() {
  roomSelect.innerHTML = "";
  try {
    const q = query(collection(db, "rooms"), orderBy("__name__"));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = `${docSnap.id} ${docSnap.data().roomTitle ?? ""}`;
      roomSelect.appendChild(opt);
    });
    if (roomSelect.options.length > 0) {
      roomSelect.selectedIndex = 0;
      await selectRoom(roomSelect.value);
    } else {
      log("ルームが見つかりません");
    }
  } catch (e) {
    console.error(e);
    log("ルーム一覧の取得に失敗しました");
  }
}

// --- Select room ---
async function selectRoom(roomId) {
  currentRoomId = roomId;
  previewArea.innerHTML = "";
  thumbnailImg.src = "./noimage.jpg";

  try {
    const snap = await getDoc(doc(db, "rooms", roomId));
    const data = snap.exists() ? snap.data() : {};

    roomTitleInput.value = data.roomTitle ?? "";
    roomAnnouncementInput.value = data.announcement ?? "";

    // textures: assume stored as texturePaths map
    const tp = data.texturePaths ?? {};
    setSelectValueIfExists(wallTexture, tp.wall ?? "");
    setSelectValueIfExists(floorTexture, tp.floor ?? "");
    setSelectValueIfExists(ceilingTexture, tp.ceiling ?? "");
    setSelectValueIfExists(doorTexture, tp.door ?? "");

    // サムネイル読み込み
    const thumbRef = ref(storage, `roomThumbnails/${roomId}.webp`);
    try {
      const url = await getDownloadURL(thumbRef);
      thumbnailImg.src = url;
    } catch (e) {
      // no thumbnail
      thumbnailImg.src = "./noimage.jpg";
    }

    // load images under rooms/{roomId}/ if any
    await loadRoomImages(roomId);
    log(`ルーム ${roomId} を選択しました`);
  } catch (e) {
    console.error(e);
    log("ルーム情報の読み込みに失敗しました");
  }
}

function setSelectValueIfExists(selectEl, val) {
  if (!selectEl) return;
  // try to set if option exists; otherwise set value and let dev decide
  const opt = Array.from(selectEl.options).find(o => o.value === val);
  if (opt) selectEl.value = val;
  else selectEl.value = val || "";
}

// --- Load images in storage for room (preview) ---
async function loadRoomImages(roomId) {
  previewArea.innerHTML = "";
  try {
    const dirRef = ref(storage, `rooms/${roomId}`);
    const list = await listAll(dirRef);
    for (const itemRef of list.items) {
      try {
        const url = await getDownloadURL(itemRef);
        const row = document.createElement("div");
        row.className = "file-row";

        const img = document.createElement("img");
        img.src = url;

        const meta = document.createElement("div");
        meta.className = "file-meta small";
        meta.innerHTML = `<div>${itemRef.name}</div>`;

        row.appendChild(img);
        row.appendChild(meta);
        previewArea.appendChild(row);
      } catch (e) {
        // skip
      }
    }
  } catch (e) {
    // no files or not found
  }
}

// --- Update room info (title + announcement) ---
updateRoomBtn.addEventListener("click", async () => {
  if (!currentRoomId) {
    alert("部屋が選択されていません");
    return;
  }
  const refRoom = doc(db, "rooms", currentRoomId);
  try {
    await updateDoc(refRoom, {
      roomTitle: roomTitleInput.value,
      announcement: roomAnnouncementInput.value
    });
    log("ルーム情報を更新しました（タイトル・アナウンスメント）");
    // refresh room list display text
    await loadRoomList();
    // re-select same room to refresh fields if necessary
    selectRoom(currentRoomId);
  } catch (e) {
    console.error(e);
    log("ルーム情報の更新に失敗しました");
    alert("更新に失敗しました");
  }
});

// --- Thumbnail upload ---
uploadThumbnailBtn.addEventListener("click", () => thumbnailFileInput.click());
thumbnailFileInput.addEventListener("change", async (ev) => {
  if (!currentRoomId) {
    alert("先にルームを選択してください");
    return;
  }
  const file = ev.target.files[0];
  if (!file) return;
  const destRef = ref(storage, `roomThumbnails/${currentRoomId}.webp`);
  try {
    const uploadTask = uploadBytesResumable(destRef, file);
    uploadTask.on('state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        log(`サムネイルアップロード: ${pct}%`);
      },
      (err) => {
        console.error(err);
        log("サムネイルアップロード失敗");
      },
      async () => {
        const url = await getDownloadURL(destRef);
        thumbnailImg.src = url;
        log("サムネイルをアップロードしました");
      }
    );
  } catch (e) {
    console.error(e);
    log("サムネイルアップロードに失敗しました");
  } finally {
    thumbnailFileInput.value = "";
  }
});

// --- Texture update (stores under rooms/{roomId}.texturePaths) ---
updateTextureBtn.addEventListener("click", async () => {
  if (!currentRoomId) { alert("部屋が選択されていません"); return; }
  const refRoom = doc(db, "rooms", currentRoomId);
  const texturePaths = {
    wall: wallTexture.value || null,
    floor: floorTexture.value || null,
    ceiling: ceilingTexture.value || null,
    door: doorTexture.value || null
  };
  try {
    await updateDoc(refRoom, { texturePaths });
    log("テクスチャ設定を更新しました");
  } catch (e) {
    console.error(e);
    log("テクスチャ更新に失敗しました");
  }
});

// --- File upload (multiple) ---
uploadBtn.addEventListener("click", async () => {
  if (!currentRoomId) { alert("部屋が選択されていません"); return; }
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) { alert("ファイルを選択してください"); return; }

  for (const file of files) {
    await uploadRoomFile(currentRoomId, file);
  }
  // reload preview
  await loadRoomImages(currentRoomId);
});

async function uploadRoomFile(roomId, file) {
  const storagePath = `rooms/${roomId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, storagePath);
  try {
    const task = uploadBytesResumable(fileRef, file);
    return new Promise((resolve, reject) => {
      task.on('state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          log(`アップロード ${file.name}: ${pct}%`);
        },
        (err) => {
          console.error(err);
          log(`アップロード失敗: ${file.name}`);
          reject(err);
        },
        async () => {
          log(`アップロード完了: ${file.name}`);
          resolve();
        });
    });
  } catch (e) {
    console.error(e);
    log(`アップロードエラー: ${file.name}`);
  }
}

// --- roomSelect change handler ---
roomSelect.addEventListener("change", async (ev) => {
  if (!ev.target.value) return;
  await selectRoom(ev.target.value);
});

// --- init ---
(async function init() {
  // optional: populate texture selects with example options
  const exampleTextures = ["", "concrete.jpg", "wood.jpg", "white.jpg"];
  [wallTexture, floorTexture, ceilingTexture, doorTexture].forEach(sel => {
    sel.innerHTML = "";
    exampleTextures.forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t || "(なし)";
      sel.appendChild(o);
    });
  });

  await loadRoomList();
})();
