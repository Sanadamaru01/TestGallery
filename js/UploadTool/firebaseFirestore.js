// firebaseFirestore.js
// Firestore の画像メタデータ登録

import { getFirestore, collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

export async function saveImageMetadata(roomId, imageId, data) {
    const ref = doc(collection(db, `rooms/${roomId}/images`), imageId);

    const payload = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload, { merge: true });
}
