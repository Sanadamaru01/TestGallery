// roomLinks.js
// 目的：全 roomId を Firestore から取得し、前後の room を判定して返すユーティリティ

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js"; // あなたの Firebase 初期化ファイル

/**
 * Firestore の rooms コレクションから全 roomId を昇順で取得
 */
export async function getAllRoomIds() {
    const roomsRef = collection(db, "rooms");
    const snapshot = await getDocs(roomsRef);

    const roomIds = snapshot.docs.map(doc => doc.id);

    // room1, room2, room10 のような文字列を自然順ソート
    roomIds.sort((a, b) => {
        const numA = parseInt(a.replace("room", ""), 10);
        const numB = parseInt(b.replace("room", ""), 10);
        return numA - numB;
    });

    return roomIds;
}

/**
 * 現在の roomId を渡すと { prev, next } を返す
 */
export async function getRoomLinks(currentRoomId) {
    const roomIds = await getAllRoomIds();

    const index = roomIds.indexOf(currentRoomId);

    if (index === -1) {
        console.warn(`Room ${currentRoomId} is not found in Firestore.`);
        return { prev: null, next: null };
    }

    const prev = index > 0 ? roomIds[index - 1] : null;
    const next = index < roomIds.length - 1 ? roomIds[index + 1] : null;

    return { prev, next };
}
