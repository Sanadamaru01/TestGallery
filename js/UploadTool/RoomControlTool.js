// RoomControlTool.js
import { app } from '../firebaseInit.js';
import {
  getFirestore, collection, getDocs, doc, getDoc,
  setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage, ref as storageRef, listAll, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);

// UI elements
const roomListEl = document.getElementById('roomList');
const refreshBtn = document.getElementById('refreshBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const newRoomIdInput = document.getElementById('newRoomId');
const newRoomTitleInput = document.getElementById('newRoomTitle');

const detailArea = document.getElementById('detailArea');
const actionArea = document.getElementById('actionArea');
const selectedRoomIdInput = document.getElementById('selectedRoomId');
const selectedThumbnail = document.getElementById('selectedThumbnail');
const editTitle = document.getElementById('editTitle');
const startDateInput = document.getElementById('startDate');
const openDateInput = document.getElementById('openDate');
const endDateInput = document.getElementById('endDate');
const saveMetaBtn = document.getElementById('saveMetaBtn');
const initRoomBtn = document.getElementById('initRoomBtn');
const reloadRoomBtn = document.getElementById('reloadRoomBtn');

const logArea = document.getElementById('logArea');

let roomsCache = []; // [{id, data}]
let selectedRoom = null;

// initial
refreshBtn.addEventListener('click', refreshRoomList);
createRoomBtn.addEventListener('click', onCreateRoom);
saveMetaBtn.addEventListener('click', onSaveMeta);
initRoomBtn.addEventListener('click', onInitRoom);
reloadRoomBtn.addEventListener('click', onReloadRoom);

// load on start
refreshRoomList();

// ------------- helpers -------------
function log(msg) {
  const t = new Date().toLocaleString();
  logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
  console.log(msg);
}
function fmtDtToInput(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  // to local datetime-local format yyyy-MM-ddTHH:mm
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}
function inputToDateValue(val) {
  if (!val) return null;
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

// ------------- main functions -------------
export async function refreshRoomList() {
  roomListEl.textContent = '読み込み中...';
  try {
    const snap = await getDocs(collection(db, 'rooms'));
    roomsCache = [];
    roomListEl.innerHTML = '';
    for (const d of snap.docs) {
      const id = d.id;
      const data = d.data();
      roomsCache.push({ id, data });
      const card = await createRoomCard(id, data);
      roomListEl.appendChild(card);
    }
    if (roomsCache.length === 0) roomListEl.textContent = '(ルームなし)';
    log(`rooms loaded: ${roomsCache.length}`);
  } catch (e) {
    roomListEl.textContent = '読み込みエラー';
    log(`rooms load error: ${e.message}`);
    console.error(e);
  }
}

// create card element
async function createRoomCard(roomId, data) {
  const div = document.createElement('div');
  div.className = 'room-card';
  // thumbnail: try storage rooms/{roomId}/thumbnail.webp
  const img = document.createElement('img');
  img.className = 'thumb';
  try {
    const thumbRef = storageRef(storage, `rooms/${roomId}/thumbnail.webp`);
    const url = await getDownloadURL(thumbRef);
    img.src = url;
  } catch (_) {
    img.src = '/noimage.jpg'; // your existing noimage
  }

  const meta = document.createElement('div');
  meta.className = 'room-meta';
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = `${roomId} : ${data.roomTitle ?? '(no title)'}`;
  const dates = document.createElement('div');
  const start = data.startDate ? new Date(data.startDate).toLocaleDateString() : '-';
  const open = data.openDate ? new Date(data.openDate).toLocaleDateString() : '-';
  const end = data.endDate ? new Date(data.endDate).toLocaleDateString() : '-';
  dates.textContent = `公開: ${open} - ${end}`;

  // images count (try to get number; non-blocking)
  const countSpan = document.createElement('div');
  countSpan.textContent = '画像: ...';
  (async () => {
    try {
      const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
      countSpan.textContent = `画像: ${snap.size}`;
    } catch (e) {
      countSpan.textContent = '画像: ?';
    }
  })();

  meta.appendChild(title);
  meta.appendChild(dates);
  meta.appendChild(countSpan);

  div.appendChild(img);
  div.appendChild(meta);

  div.addEventListener('click', () => {
    onSelectRoom(roomId);
  });

  return div;
}

async function onSelectRoom(roomId) {
  selectedRoom = roomsCache.find(r => r.id === roomId) || null;
  if (!selectedRoom) {
    try {
      const snap = await getDoc(doc(db, 'rooms', roomId));
      if (snap.exists()) selectedRoom = { id: roomId, data: snap.data() };
    } catch (e) { log('selectRoom fetch error: ' + e.message); }
  }
  if (!selectedRoom) {
    log('選択ルーム読み込みに失敗しました');
    return;
  }
  // populate detail
  selectedRoomIdInput.value = selectedRoom.id;
  editTitle.value = selectedRoom.data.roomTitle ?? '';
  startDateInput.value = fmtDtToInput(selectedRoom.data.startDate ?? null);
  openDateInput.value = fmtDtToInput(selectedRoom.data.openDate ?? null);
  endDateInput.value = fmtDtToInput(selectedRoom.data.endDate ?? null);
  actionArea.style.display = 'block';

  // thumbnail preview (storage only)
  try {
    const thumbRef = storageRef(storage, `rooms/${selectedRoom.id}/thumbnail.webp`);
    const url = await getDownloadURL(thumbRef);
    selectedThumbnail.src = url;
  } catch (_) {
    selectedThumbnail.src = '/noimage.jpg';
  }

  log(`選択: ${selectedRoom.id}`);
}

async function onCreateRoom() {
  const customId = (newRoomIdInput.value || '').trim();
  const title = (newRoomTitleInput.value || '').trim() || 'New Room';
  let roomId = customId;
  if (!roomId) {
    roomId = 'room' + Date.now().toString(36);
  }
  try {
    // check exists
    const refDoc = doc(db, 'rooms', roomId);
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      if (!confirm(`room ${roomId} は既に存在します。上書きしますか？`)) return;
    }
    // default initial values
    const init = {
      roomTitle: title,
      wallWidth: 10,
      wallHeight: 5,
      fixedLongSide: 3,
      backgroundColor: "#fdf6e3",
      texturePaths: {},
      startDate: null,
      openDate: null,
      endDate: null,
      updatedAt: serverTimestamp()
    };
    await setDoc(refDoc, init, { merge: true });
    log(`作成/初期化: ${roomId}`);
    await refreshRoomList();
    // auto select
    onSelectRoom(roomId);
  } catch (e) {
    log('createRoom error: ' + e.message);
    console.error(e);
  }
}

async function onSaveMeta() {
  if (!selectedRoom) return;
  const rid = selectedRoom.id;
  const title = (editTitle.value || '').trim();
  const s = inputToDateValue(startDateInput.value);
  const o = inputToDateValue(openDateInput.value);
  const e = inputToDateValue(endDateInput.value);

  try {
    const refDoc = doc(db, 'rooms', rid);
    const payload = { roomTitle: title, updatedAt: serverTimestamp() };
    if (s) payload.startDate = s;
    else payload.startDate = null;
    if (o) payload.openDate = o;
    else payload.openDate = null;
    if (e) payload.endDate = e;
    else payload.endDate = null;

    await updateDoc(refDoc, payload);
    log(`メタ保存: ${rid}`);
    // refresh cache & UI
    await refreshRoomList();
    onSelectRoom(rid);
  } catch (err) {
    log('saveMeta error: ' + err.message);
    console.error(err);
  }
}

async function onReloadRoom() {
  if (!selectedRoom) return;
  await refreshRoomList();
  onSelectRoom(selectedRoom.id);
}

// --------------- Initialization (delete images & storage) ---------------
async function onInitRoom() {
  if (!selectedRoom) return;
  const rid = selectedRoom.id;
  if (!confirm(`ルーム ${rid} を初期化します。\nFirestore images サブコレクションと Storage 内画像（thumbnail を含む）を削除します。よろしいですか？`)) return;

  try {
    log(`初期化開始: ${rid}`);

    // 1) delete images subcollection documents
    const imagesCol = collection(db, `rooms/${rid}/images`);
    const imgSnap = await getDocs(imagesCol);
    for (const docSnap of imgSnap.docs) {
      await deleteDoc(doc(db, `rooms/${rid}/images/${docSnap.id}`));
      log(`Firestore images doc deleted: ${docSnap.id}`);
    }

    // 2) delete storage under rooms/{rid}/ (recursive)
    await deleteStoragePath(`rooms/${rid}`);

    // 3) reset certain fields on room doc (but keep texturePaths)
    const roomRef = doc(db, 'rooms', rid);
    const keep = selectedRoom.data.texturePaths || {};
    const reset = {
      roomTitle: selectedRoom.data.roomTitle ?? '',
      wallWidth: 10,
      wallHeight: 5,
      fixedLongSide: 3,
      backgroundColor: "#fdf6e3",
      texturePaths: keep,
      startDate: null,
      openDate: null,
      endDate: null,
      updatedAt: serverTimestamp()
    };
    await updateDoc(roomRef, reset);
    log(`Firestore room ${rid} reset done.`);

    // refresh
    await refreshRoomList();
    onSelectRoom(rid);
    log(`初期化完了: ${rid}`);
  } catch (e) {
    log('initRoom error: ' + e.message);
    console.error(e);
  }
}

// delete all items under a storage path recursively (using listAll)
async function deleteStoragePath(path) {
  try {
    const rootRef = storageRef(storage, path);
    const listing = await listAll(rootRef);
    // delete files
    for (const itemRef of listing.items) {
      const fullRef = storageRef(storage, itemRef.fullPath);
      try {
        await deleteObject(fullRef);
        log(`Storage deleted: ${itemRef.fullPath}`);
      } catch (e) {
        log(`Storage delete error: ${itemRef.fullPath} - ${e.message}`);
      }
    }
    // prefixes (subfolders) recursion
    for (const pref of listing.prefixes) {
      await deleteStoragePath(pref.fullPath);
    }
  } catch (e) {
    // if listAll fails because folder doesn't exist, ignore
    log(`listAll on ${path} error (may be empty): ${e.message}`);
  }
}

// expose refreshRoomList for button
async function refreshRoomListClick() { await refreshRoomList(); }
window.refreshRoomList = refreshRoomList;
