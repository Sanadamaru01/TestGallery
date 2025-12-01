// firebaseFirestore.js
import { firestore } from "./firebaseApp.js";
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 画像メタデータ保存・更新
export async function saveImageMetadata(roomId, imageId, data) {
    const docRef = doc(firestore, `rooms/${roomId}/images/${imageId}`);
    await setDoc(docRef, { ...data, createdAt: new Date(), updatedAt: new Date() });
}

export async function updateImageMetadata(roomId, imageId, data) {
    const docRef = doc(firestore, `rooms/${roomId}/images/${imageId}`);
    await updateDoc(docRef, { ...data, updatedAt: new Date() });
}

export async function deleteImageMetadata(roomId, imageId) {
    const docRef = doc(firestore, `rooms/${roomId}/images/${imageId}`);
    await deleteDoc(docRef);
}

// ルーム一覧取得
export async function getRooms() {
    const snapshot = await getDocs(collection(firestore, "rooms"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ルームタイトル更新
export async function updateRoomTitle(roomId, title) {
    const docRef = doc(firestore, `rooms/${roomId}`);
    await updateDoc(docRef, { roomTitle: title, updatedAt: new Date() });
}

// テクスチャ設定更新
export async function updateRoomTextures(roomId, textures) {
    const docRef = doc(firestore, `rooms/${roomId}`);
    await updateDoc(docRef, { texturePaths: textures, updatedAt: new Date() });
}

// ルーム内画像一覧取得
export async function getRoomImages(roomId) {
    const snapshot = await getDocs(collection(firestore, `rooms/${roomId}/images`));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
