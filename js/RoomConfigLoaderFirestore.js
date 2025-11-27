// RoomConfigLoaderFirestore.js
import { db } from './firebase.js';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';

/**
 * Firestore から部屋データ（設定 + 画像）を取得
 */
export async function loadRoomDataFromFirestore(roomId) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error(`Room not found: ${roomId}`);
  const roomData = roomSnap.data();

  const config = {
    wallWidth: roomData.wallWidth,
    wallHeight: roomData.wallHeight,
    fixedLongSide: roomData.fixedLongSide,
    backgroundColor: roomData.backgroundColor,
    roomTitle: roomData.roomTitle,
    texturePaths: roomData.texturePaths
  };

  const imagesRef = collection(db, 'rooms', roomId, 'images');
  const imagesSnap = await getDocs(imagesRef);
  const images = imagesSnap.docs.map(docSnap => {
    const d = docSnap.data();
    return {
      file: d.file,
      title: d.title,
      caption: d.caption,
      author: d.author,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    };
  });

  return { config, images, raw: roomData };
}
