// firebaseFirestore.js
import { db } from "./firebaseApp.js";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ルーム一覧取得
export async function getRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map(d => ({ id: d.id, data: d.data() }));
}

// ルーム情報取得
export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, "rooms", roomId));
  return snap.exists() ? snap.data() : null;
}

// ルームタイトル更新
export async function updateRoomTitle(roomId, newTitle) {
  await updateDoc(doc(db, "rooms", roomId), { roomTitle: newTitle, updatedAt: serverTimestamp() });
}

// テクスチャ更新
export async function updateRoomTextures(roomId, updates) {
  updates.updatedAt = serverTimestamp();
  await updateDoc(doc(db, "rooms", roomId), updates);
}

// images コレクション取得
export async function getRoomImages(roomId) {
  const snap = await getDocs(collection(db, `rooms/${roomId}/images`));
  return snap.docs.map(d => ({ id: d.id, data: d.data() }));
}

// 画像メタデータ追加
export async function addRoomImageMeta(roomId, meta) {
  meta.createdAt = serverTimestamp();
  meta.updatedAt = serverTimestamp();
  const docRef = await addDoc(collection(db, `rooms/${roomId}/images`), meta);
  return docRef.id;
}

// 画像メタデータ更新
export async function updateRoomImageMeta(roomId, imageId, updates) {
  updates.updatedAt = serverTimestamp();
  await updateDoc(doc(db, `rooms/${roomId}/images/${imageId}`), updates);
}

// 画像メタデータ削除
export async function deleteRoomImageMeta(roomId, imageId) {
  await deleteDoc(doc(db, `rooms/${roomId}/images/${imageId}`));
}
