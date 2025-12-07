// ---------------------------------------------
// portal.js  （Firebase 接続を UploadTool.js と同じ方式に統一）
// ---------------------------------------------

console.log("[TRACE] portal.js loaded");

// -------------------- Firebase 接続 --------------------
import { app } from './firebaseInit.js';
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);

console.log("[TRACE] Firebase Firestore & Storage obtained:", db, storage);

// -------------------- DOM 取得 --------------------
const roomList = document.getElementById("roomList");

// 現行の noimage.png（ユーザー指定の位置）
const noImagePath = "./noimage.png";   

// -------------------- 初期化 --------------------
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[TRACE] portal DOMContentLoaded");
  await loadRoomThumbnails();
});

// -------------------- ルーム一覧読み込み --------------------
async function loadRoomThumbnails() {
  console.log("[TRACE] loadRoomThumbnails start");

  roomList.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "rooms"));
    console.log(`[TRACE] rooms count: ${snap.size}`);

    snap.forEach(roomDoc => {
      const roomId = roomDoc.id;
      const data = roomDoc.data();

      const title = data.roomTitle ?? "(no title)";
      const thumb = data.thumbnail ?? "";  // サムネイルパス（Storage 内）

      createRoomCard(roomId, title, thumb);
    });

  } catch (e) {
    console.error("[ERROR] loadRoomThumbnails:", e);
  }

  console.log("[TRACE] loadRoomThumbnails end");
}

// -------------------- サムネイル付きルームカード作成 --------------------
async function createRoomCard(roomId, title, thumbnailPath) {

  const card = document.createElement("div");
  card.classList.add("room-card");

  // --- サムネイル画像取得 ---
  let imgURL = noImagePath;

  if (thumbnailPath) {
    try {
      const storageRef = ref(storage, thumbnailPath);
      imgURL = await getDownloadURL(storageRef);
    } catch (e) {
      console.warn(`[WARN] サムネイル取得失敗 (${roomId}) → noimage`, e);
    }
  }

  // --- カード HTML ---
  card.innerHTML = `
    <div class="room-thumb-wrapper">
      <img class="room-thumb" src="${imgURL}" alt="thumbnail">
    </div>

    <div class="room-title">${title}</div>

    <button class="enter-room" data-room="${roomId}">
      Enter
    </button>
  `;

  roomList.appendChild(card);

  // --- クリックでギャラリーへ入場 ---
  const btn = card.querySelector(".enter-room");
  btn.addEventListener("click", () => {
    console.log(`[TRACE] Entering room: ${roomId}`);
    window.location.href = `./gallery.html?room=${roomId}`;
  });
}
