// firebaseFirestore.js
import { app } from "./firebaseApp.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);

/** 画像メタデータの保存 */
export async function saveImageMetadata(roomId, imageId, { file, title, caption, author }) {
  const docRef = doc(db, "rooms", roomId, "images", imageId);

  await setDoc(docRef, {
    file,
    title,
    caption,
    author,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 画像メタデータの取得 */
export async function getAllImages(roomId) {
  const colRef = collection(db, "rooms", roomId, "images");
  const snap = await getDocs(colRef);

  const result = [];
  snap.forEach((d) => {
    result.push({ id: d.id, ...d.data() });
  });
  return result;
}

/** メタデータ更新 */
export async function updateImageMetadata(roomId, imageId, data) {
  const docRef = doc(db, "rooms", roomId, "images", imageId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** 画像メタデータ削除 */
export async function deleteImageMetadata(roomId, imageId) {
  const docRef = doc(db, "rooms", roomId, "images", imageId);
  await deleteDoc(docRef);
}

/** ルーム一覧取得 */
export async function getRooms() {
  const colRef = collection(db, "rooms");
  const snap = await getDocs(colRef);

  const rooms = [];
  snap.forEach((d) => rooms.push({ id: d.id, ...d.data() }));
  return rooms;
}

/** ルームタイトル更新 */
export async function updateRoom(roomId, data) {
  const docRef = doc(db, "rooms", roomId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
