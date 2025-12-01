// firebaseFirestore.js
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebaseApp.js";

// 画像メタデータ操作
export async function saveImageMetadata(roomId, imageId, data) {
    const docRef = doc(db, `rooms/${roomId}/images/${imageId}`);
    await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function getRoomImages(roomId) {
    const colRef = collection(db, `rooms/${roomId}/images`);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteImageMetadata(roomId, imageId) {
    const docRef = doc(db, `rooms/${roomId}/images/${imageId}`);
    await deleteDoc(docRef);
}

// ルーム情報操作
export async function getRoomData(roomId) {
    const docRef = doc(db, `rooms/${roomId}`);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
}

export async function updateRoomTitle(roomId, newTitle) {
    const docRef = doc(db, `rooms/${roomId}`);
    await updateDoc(docRef, { roomTitle: newTitle, updatedAt: serverTimestamp() });
}

export async function updateRoomTextures(roomId, textures) {
    const docRef = doc(db, `rooms/${roomId}`);
    await updateDoc(docRef, { texturePaths: textures, updatedAt: serverTimestamp() });
}
