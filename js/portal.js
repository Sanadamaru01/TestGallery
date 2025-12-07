/* ----------------------------------------------------
   Firebase 初期化
---------------------------------------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

/* あなたの Firebase 設定に置き換えてください */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const now = new Date();

/* ----------------------------------------------------
   公開期間チェック
---------------------------------------------------- */
function isWithinPeriod(startDate, endDate) {
  return now >= startDate && now <= endDate;
}

/* ----------------------------------------------------
   ルームカード生成（HTML）
---------------------------------------------------- */
function createRoomCard(roomId, roomData, thumbnailUrl, isOpen) {
  const container = document.createElement('div');
  container.className = 'room-card';

  const link = document.createElement('a');
  link.href = `./rooms/${roomId}/index.html`;
  if (!isOpen) link.classList.add('closed');

  const thumb = document.createElement('img');
  thumb.src = thumbnailUrl;
  thumb.alt = roomData.roomTitle || "No Title";

  // ← 元コードと同じ fallback（画像読み込み失敗時）
  thumb.onerror = () => { thumb.src = 'noimage.jpg'; };

  const info = document.createElement('div');
  info.className = 'room-info';

  const title = document.createElement('h3');
  title.textContent = roomData.roomTitle || "タイトル未設定";

  const dates = document.createElement('p');
  const startStr = roomData.startDate ? roomData.startDate.toLocaleString() : "未設定";
  const endStr = roomData.endDate ? roomData.endDate.toLocaleString() : "未設定";
  dates.textContent = `${startStr} ～ ${endStr}`;

  const status = document.createElement('p');
  status.textContent = isOpen ? '🔓 公開中' : '🔒 非公開';

  info.append(title, dates, status);
  link.append(thumb, info);
  container.appendChild(link);

  return container;
}

/* ----------------------------------------------------
   Firestore rooms コレクションを読み込み、表示
---------------------------------------------------- */
async function renderAllRooms() {
  const container = document.getElementById('roomList');
  container.textContent = '読み込み中...';

  try {
    const snapshot = await getDocs(collection(db, "rooms"));

    container.textContent = '';

    for (const doc of snapshot.docs) {
      const roomId = doc.id;
      const data = doc.data();

      // Timestamp → Date
      const startDate = data.startDate ? data.startDate.toDate() : null;
      const endDate = data.endDate ? data.endDate.toDate() : null;

      const isOpen = (startDate && endDate) ? isWithinPeriod(startDate, endDate) : false;

      // ----------------------------------------------------
      // サムネイル取得（元コードと同じく fallback あり）
      // ----------------------------------------------------
      let thumbUrl = "noimage.jpg"; // ① getDownloadURL 失敗時の fallback
      try {
        const thumbRef = ref(storage, `rooms/${roomId}/thumbnail.jpg`);
        thumbUrl = await getDownloadURL(thumbRef);
      } catch (e) {
        console.warn(`サムネイル未設定: rooms/${roomId}/thumbnail.jpg`);
      }

      // カード生成
      const card = createRoomCard(
        roomId,
        {
          roomTitle: data.roomTitle,
          startDate: startDate,
          endDate: endDate
        },
        thumbUrl,
        isOpen
      );

      container.appendChild(card);
    }

  } catch (e) {
    console.error(e);
    container.textContent = 'ルーム一覧の読み込みに失敗しました。';
  }
}

renderAllRooms();
