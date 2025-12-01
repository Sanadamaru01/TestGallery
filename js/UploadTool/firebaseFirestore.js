// firebaseFirestore.js
// Firestore の操作（メタデータ保存・取得・更新・削除）を担当
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getFirestoreInstance } from "./firebaseApp.js";

const db = getFirestoreInstance();

/**
 * 画像メタデータを保存
 * @param {string} roomId
 * @param {string} imageId
 * @param {object} data - { file, title, caption, author }
 */
export async function saveImageMetadata(roomId, imageId, data) {
    const docRef = doc(db, `rooms/${roomId}/images`, imageId);
    await setDoc(docRef, { ...data, createdAt: new Date(), updatedAt: new Date() });
    console.log(`[firebaseFirestore] Saved metadata for ${imageId}`);
}

/**
 * 画像メタデータを更新
 * @param {string} roomId
 * @param {string} imageId
 * @param {object} data - 更新するデータ
 */
export async function updateImageMetadata(roomId, imageId, data) {
    const docRef = doc(db, `rooms/${roomId}/images`, imageId);
    await updateDoc(docRef, { ...data, updatedAt: new Date() });
    console.log(`[firebaseFirestore] Updated metadata for ${imageId}`);
}

/**
 * 画像メタデータを削除
 * @param {string} roomId
 * @param {string} imageId
 */
export async function deleteImageMetadata(roomId, imageId) {
    const docRef = doc(db, `rooms/${roomId}/images`, imageId);
    await deleteDoc(docRef);
    console.log(`[firebaseFirestore] Deleted metadata for ${imageId}`);
}

/**
 * ルームの画像一覧を取得
 * @param {string} roomId
 * @returns {Promise<Array>} - メタデータ配列
 */
export async function getRoomImages(roomId) {
    const imagesCol = collection(db, `rooms/${roomId}/images`);
    const q = query(imagesCol, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * ルーム一覧を取得
 * @returns {Promise<Array>} - ルームドキュメント配列
 */
export async function getRooms() {
    const roomsCol = collection(db, "rooms");
    const snapshot = await getDocs(roomsCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * ルーム情報を更新
 * @param {string} roomId
 * @param {object} data - 更新内容
 */
export async function updateRoom(roomId, data) {
    const docRef = doc(db, "rooms", roomId);
    await updateDoc(docRef, { ...data, updatedAt: new Date() });
    console.log(`[firebaseFirestore] Updated room ${roomId}`);
}
