// RoomConfigLoaderFirestore.js
// Firestore から room 設定と画像情報をまとめて取得する

import { db } from './firebase.js';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

/**
 * Firestore から部屋データ（設定 + 画像）を取得
 * JSON版 loadRoomConfig() と返り値の形式を統一
 *
 * @param {string} roomId - 'room1' のような roomId
 * @returns {Promise<{ config: Object, images: Array, raw: Object }>}
 */
export async function loadRoomDataFromFirestore(roomId) {
  // rooms/{roomId} のドキュメント取得
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const roomData = roomSnap.data();

  // -------- config 部分 --------
  const config = {
    wallWidth: roomData.wallWidth,
    wallHeight: roomData.wallHeight,
    fixedLongSide: roomData.fixedLongSide,
    backgroundColor: roomData.backgroundColor,
    texturePaths: roomData.texturePaths,
    roomTitle: roomData.roomTitle
  };

  // -------- images サブコレクション --------
  const imagesRef = collection(db, 'rooms', roomId, 'images');
  const imagesSnap = await getDocs(imagesRef);

  const images = imagesSnap.docs.map(docSnap => {
    const d = docSnap.data();
    return {
      file: d.file,      // Storage URL or file name
      title: d.title,
      caption: d.caption,
      author: d.author,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    };
  });

  // -------- JSON版と同じ返し方を維持 --------
  return {
    config,
    images,
    raw: roomData
  };
}
