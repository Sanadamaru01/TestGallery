import { collection, addDoc, doc, updateDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebaseApp.js";

// 画像メタデータ保存
export async function saveImageMetadata(roomId, imageId, data) {
    await addDoc(collection(db, `rooms/${roomId}/images`), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    });
}

// ルーム一覧取得
export async function getAllRooms() {
    const snap = await getDocs(collection(db, "rooms"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ルームタイトル更新
export async function updateRoomTitle(roomId, newTitle) {
    await updateDoc(doc(db, "rooms", roomId), {
        roomTitle: newTitle,
        updatedAt: new Date()
    });
}

// 画像削除
export async function deleteImageMetadata(roomId, imageId) {
    const imagesRef = collection(db, `rooms/${roomId}/images`);
    const snap = await getDocs(imagesRef);
    const docToDelete = snap.docs.find(d => d.id === imageId);
    if (docToDelete) {
        await deleteDoc(doc(imagesRef, docToDelete.id));
    }
}
