// =====================================
// roomLinks.js (Firestore版・サーキュラーリンク / room.html対応)
// =====================================

// Firebase CDN から import（UploadTool.js と同じバージョンで統一）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase 初期化（main.js と同じ app を使う場合は import { app } from './firebaseInit.js'; に置き換え）
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.appspot.com",
  messagingSenderId: "748123",
  appId: "1:748123:web:xxxx"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -------------------------------------
// 現在の roomId を URL クエリから取得
// 例: room.html?roomId=room3 → "room3"
// -------------------------------------
function getCurrentRoomId() {
  const params = new URLSearchParams(location.search);
  return params.get('roomId');
}

// -------------------------------------
// 前後リンクを設定（サーキュラーリンク）
// -------------------------------------
export async function setupRoomLinks() {
  const currentRoomId = getCurrentRoomId();
  if (!currentRoomId) {
    console.warn("❌ roomLinks.js: 現在の roomId を URL から取得できませんでした");
    return;
  }

  const prevLink = document.getElementById("prevRoom");
  const nextLink = document.getElementById("nextRoom");
  if (!prevLink || !nextLink) {
    console.warn("❌ prevRoom / nextRoom が HTML にありません");
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, "rooms"));
    const roomIds = [];
    snapshot.forEach(doc => roomIds.push(doc.id));

    // room1, room2,... を数値で正しくソート
    roomIds.sort((a, b) => parseInt(a.replace("room","")) - parseInt(b.replace("room","")));

    const currentIndex = roomIds.indexOf(currentRoomId);
    if (currentIndex === -1) {
      console.warn("❌ Firestore 内に現在の roomId が存在しません:", currentRoomId);
      return;
    }

    const prevId = roomIds[(currentIndex - 1 + roomIds.length) % roomIds.length];
    const nextId = roomIds[(currentIndex + 1) % roomIds.length];

    // room.html 用リンクに変更
    prevLink.href = `room.html?roomId=${prevId}`;
    nextLink.href = `room.html?roomId=${nextId}`;

    prevLink.style.opacity = "1";
    prevLink.style.pointerEvents = "auto";
    nextLink.style.opacity = "1";
    nextLink.style.pointerEvents = "auto";

    console.log("✅ roomLinks.js: 前後リンクを更新しました（サーキュラー）", {
      prev: prevLink.href,
      next: nextLink.href
    });

  } catch (err) {
    console.error("❌ Firestore ルーム取得エラー:", err);
  }
}

// -------------------------------------
setupRoomLinks();
