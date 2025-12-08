import { log } from './utils.js';
import { loadRoomImages, handleFileSelect, uploadFiles, handleThumbnailSelect } from './imageRowManager.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';

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

const uploadThumbnailBtn = document.getElementById("uploadThumbnailBtn");
const thumbnailFileInput = document.getElementById("thumbnailFileInput");

const logArea = document.getElementById("log");

// --- 初期化 ---
window.addEventListener("DOMContentLoaded", async ()=>{
  await loadRooms();
  handleFileSelect(fileInput, previewArea, logArea);
});

// --- ルーム読み込み ---
async function loadRooms(){
  const snap = await getDocs(collection(db,"rooms"));
  roomSelect.innerHTML="";
  snap.forEach(d=>{
    const opt=document.createElement("option");
    opt.value=d.id;
    opt.textContent=d.id + " : " + (d.data().roomTitle ?? "(no title)");
    roomSelect.appendChild(opt);
  });
  if(roomSelect.options.length>0){ roomSelect.selectedIndex=0; await onRoomChange(); }
}

roomSelect.addEventListener("change", onRoomChange);

async function onRoomChange(){
  const roomId = roomSelect.value;
  if(!roomId) return;
  const snap = await getDoc(doc(db,"rooms",roomId));
  if(!snap.exists()) return;
  const data = snap.data();
  roomTitleInput.value = data.roomTitle ?? "";
  await loadRoomImages(roomId, previewArea, logArea);
}

// --- 通常アップロード ---
uploadBtn.addEventListener("click", async ()=>{
  const roomId = roomSelect.value;
  if(!roomId) { log("[WARN] ルームを選択してください", logArea); return; }
  await uploadFiles(previewArea, roomId, logArea);
});

// --- サムネイルアップロード ---
uploadThumbnailBtn.addEventListener("click", ()=>thumbnailFileInput.click());
thumbnailFileInput.addEventListener("change", async ()=>{
  const file = thumbnailFileInput.files[0];
  if(file) await handleThumbnailSelect(file, roomSelect.value, logArea);
});

// --- ルームタイトル更新 ---
updateRoomBtn.addEventListener("click", async ()=>{
  const roomId = roomSelect.value;
  if(!roomId) return;
  await updateDoc(doc(db,"rooms",roomId), { roomTitle: roomTitleInput.value, updatedAt: serverTimestamp() });
  log(`[INFO] ルームタイトルを更新しました: ${roomTitleInput.value}`, logArea);
});
