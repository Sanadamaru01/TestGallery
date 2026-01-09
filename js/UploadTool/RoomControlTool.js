import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  deleteObject,
  listAll
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { app } from "../firebaseInit.js";

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// -----------------------------
// DOM
// -----------------------------
const roomList = document.getElementById("roomList");
const editArea = document.getElementById("editArea");

const titleInput = document.getElementById("roomTitleInput");
const startDateInput = document.getElementById("startDateInput");
const openDateInput = document.getElementById("openDateInput");
const endDateInput = document.getElementById("endDateInput");

const saveRoomBtn = document.getElementById("saveRoomBtn");
const resetRoomBtn = document.getElementById("resetRoomBtn");

// ログインボタン
const loginBtn = document.createElement("button");
loginBtn.textContent = "Googleでログイン";
loginBtn.className = "btn";
loginBtn.style.marginBottom = "20px";

let selectedRoomId = null;
let currentUserUid = null;

// -----------------------------
// 初期化（admin 判定付き）
// -----------------------------
window.addEventListener("DOMContentLoaded", () => {
  editArea.style.display = "none";
  roomList.innerHTML = "";

  onAuthStateChanged(auth, async (user) => {
    roomList.innerHTML = "";
    editArea.style.display = "none";

    if (!user) {
      currentUserUid = null;
      showLoginButton();
      return;
    }

    if (user.uid === currentUserUid) return;
    currentUserUid = user.uid;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      alert("管理者権限がありません");
      showLoginButton();
      return;
    }

    removeLoginButton();
    await loadRoomList();
  });
});

// -----------------------------
// Google ログイン
// -----------------------------
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    alert(e.message);
  }
});

function showLoginButton() {
  if (!roomList.contains(loginBtn)) {
    roomList.appendChild(loginBtn);
  }
}

function removeLoginButton() {
  if (roomList.contains(loginBtn)) {
    roomList.removeChild(loginBtn);
  }
}

// -----------------------------
// ルーム一覧の読み込み
// -----------------------------
async function loadRoomList() {
  roomList.innerHTML = "";

  const snap = await getDocs(collection(db, "rooms"));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const roomId = docSnap.id;

    const card = document.createElement("div");
    card.className = "room-card";
    card.dataset.roomId = roomId;

    const img = document.createElement("img");
    img.className = "thumb";

    // ★ Storage SDK を使わず、直接 URL で取得（portal.js と同じ）
    const encodedPath = encodeURIComponent(`rooms/${roomId}/thumbnail.webp`);
    img.src =
      `https://firebasestorage.googleapis.com/v0/b/gallery-us-ebe6e.appspot.com/o/${encodedPath}?alt=media`;

    img.onerror = () => {
      img.src = "./noimage.jpg";
    };

    const info = document.createElement("div");
    info.className = "room-info";
    info.innerHTML = `
      <strong>${roomId}</strong><br>
      ${data.roomTitle ?? "(タイトルなし)"}
    `;

    card.appendChild(img);
    card.appendChild(info);
    card.addEventListener("click", () => selectRoom(roomId, card));

    roomList.appendChild(card);
  });
}

// -----------------------------
// ルーム選択
// -----------------------------
async function selectRoom(roomId, cardElement) {
  selectedRoomId = roomId;

  [...roomList.children].forEach(c => c.classList.remove("selected"));
  cardElement.classList.add("selected");

  editArea.style.display = "block";

  const snap = await getDoc(doc(db, "rooms", roomId));
  const data = snap.data();

  titleInput.value = data.roomTitle ?? "";
  startDateInput.value = data.startDate ? toDateInputValue(data.startDate.toDate()) : "";
  openDateInput.value = data.openDate ? toDateInputValue(data.openDate.toDate()) : "";
  endDateInput.value = data.endDate ? toDateInputValue(data.endDate.toDate()) : "";
}

function toDateInputValue(dateObj) {
  return dateObj.toISOString().split("T")[0];
}

function parseLocalDate(yyyyMMdd) {
  const [y, m, d] = yyyyMMdd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0);
}

// -----------------------------
// 設定保存
// -----------------------------
saveRoomBtn.addEventListener("click", async () => {
  if (!selectedRoomId) return;

  await updateDoc(doc(db, "rooms", selectedRoomId), {
    roomTitle: titleInput.value,
    startDate: startDateInput.value ? parseLocalDate(startDateInput.value) : null,
    openDate: openDateInput.value ? parseLocalDate(openDateInput.value) : null,
    endDate: endDateInput.value ? parseLocalDate(endDateInput.value) : null
  });

  alert("保存しました");
  await loadRoomList();
});

// -----------------------------
// ルーム初期化
// -----------------------------
resetRoomBtn.addEventListener("click", async () => {
  if (!selectedRoomId) return;

  if (!confirm("本当にこのルームを初期化しますか？\n画像データは全削除されます。")) return;

  const roomId = selectedRoomId;

  const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
  for (const d of imagesSnap.docs) {
    await deleteDoc(d.ref);
  }

  try {
    const list = await listAll(ref(storage, `rooms/${roomId}`));
    for (const f of list.items) {
      await deleteObject(f);
    }
  } catch {}

  await updateDoc(doc(db, "rooms", roomId), {
    wallWidth: 10,
    wallHeight: 5,
    fixedLongSide: 3,
    backgroundColor: "#fdf6e3",
    roomTitle: "",
    startDate: null,
    openDate: null,
    endDate: null
  });

  alert("初期化が完了しました");
  await loadRoomList();
});
