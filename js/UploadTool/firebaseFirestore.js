// firebaseFirestore.js
import { collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebaseApp.js";

export async function saveImageMetadata(roomId, imageId, data) {
    const docRef = doc(db, `rooms/${roomId}/images/${imageId}`);
    await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
