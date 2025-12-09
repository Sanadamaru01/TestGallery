// main.js（Firestore + Storage 対応版・firebaseInit.js 統一）

import { loadRoomDataFromFirestore } from './RoomConfigLoaderFirestore.js';
import { checkAccessAndShowMessage } from './accessControl.js';
import { initGallery } from './gallery.js';
import { updateRoomLinksUI } from './roomLinks.js';

// firebaseInit.js から統一して import
import { db, storage } from './firebaseInit.js';

/**
 * 指定した roomId でギャラリーを初期化
 * HTML 側から呼び出す用
 */
export async function initGalleryFromRoomId(roomId) {
  if (!roomId) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = '❌ roomId が指定されていません。URL に ?roomId=XXX を付加してください。';
    document.body.appendChild(msg);
    return;
  }

  try {
    const { config, images, raw } = await loadRoomDataFromFirestore(roomId, db, storage);

    const allowed = checkAccessAndShowMessage(raw.startDate, raw.endDate);
    if (!allowed) return;

    const title = raw.roomTitle || 'Untitled Room';
    document.getElementById('titleText').textContent = title;
    document.title = title;

    // 画像パスは各ルーム直下
    initGallery(images, config, `./rooms/${roomId}/images/`, storage);

    // 前後リンクも更新
    updateRoomLinksUI(roomId, 'room.html');

  } catch (err) {
    console.error('部屋情報の取得に失敗:', err);
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
    document.body.appendChild(msg);
  }
}
