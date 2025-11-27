// =====================================
// roomLinks.js (Firestore版)
// =====================================

// Firebase 初期化（main.js と同じ設定を使う想定）
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.appspot.com",
  messagingSenderId: "748123",
  appId: "1:748123:web:xxxx"
};

// Firebase setup
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -------------------------------------
// 現在の roomId を URL から取得
// 例: /rooms/room3/index.html → "room3"
// -------------------------------------
function getCurrentRoomId() {
  const match = location.pathname.match(/\/(room\d+)\//);
  return match ? match[1] : null;
}

// -------------------------------------
// 前後リンクを設定
// -------------------------------------
async function setupRoomLinks() {
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

  // Firestore から rooms を取得
  const snapshot = await getDocs(collection(db, "rooms"));
  const roomIds = [];

  snapshot.forEach((doc) => roomIds.push(doc.id));

  // room1, room2, room10 があっても正しく並ぶように数値でソート
  roomIds.sort((a, b) => {
    const ai = parseInt(a.replace("room", ""), 10);
    const bi = parseInt(b.replace("room", ""), 10);
    return ai - bi;
  });

  const currentIndex = roomIds.indexOf(currentRoomId);
  if (currentIndex === -1) {
    console.warn("❌ Firestore 内に現在の roomId が存在しません:", currentRoomId);
    return;
  }

  // 前の部屋
  if (currentIndex > 0) {
    const prevId = roomIds[currentIndex - 1];
    prevLink.href = `../${prevId}/index.html`;
    prevLink.style.opacity = "1";
    prevLink.style.pointerEvents = "auto";
  } else {
    // 先頭 → 無効化
    prevLink.href = "javascript:void(0)";
    prevLink.style.opacity = "0.3";
    prevLink.style.pointerEvents = "none";
  }

  // 次の部屋
  if (currentIndex < roomIds.length - 1) {
    const nextId = roomIds[currentIndex + 1];
    nextLink.href = `../${nextId}/index.html`;
    nextLink.style.opacity = "1";
    nextLink.style.pointerEvents = "auto";
  } else {
    // 最後尾 → 無効化
    nextLink.href = "javascript:void(0)";
    nextLink.style.opacity = "0.3";
    nextLink.style.pointerEvents = "none";
  }

  console.log("✅ roomLinks.js: 前後リンクを更新しました:", {
    prev: prevLink.href,
    next: nextLink.href,
  });
}

// -------------------------------------
setupRoomLinks();
// -------------------------------------
