// main.js（Firestore + Storage 対応版・firebaseInit.js 統一・ログ追加版） 

console.log("[DEBUG] main.js load start");

// まず firebaseInit.js 以外のモジュールは先にインポート
import * as roomLoader from './RoomConfigLoaderFirestore.js';
console.log("[DEBUG] RoomConfigLoaderFirestore imported");

import * as accessControl from './accessControl.js';
console.log("[DEBUG] accessControl imported");

import * as galleryModule from './gallery.js';
console.log("[DEBUG] gallery imported");

import * as roomLinksModule from './roomLinks.js';
console.log("[DEBUG] roomLinks imported");

// firebaseInit.js を最後にインポート（ここで Firebase が初期化される）
import { db, storage } from './firebaseInit.js';
console.log("[DEBUG] firebaseInit imported, db & storage ready");

/**
 * 指定した roomId でギャラリーを初期化
 */
export async function initGalleryFromRoomId(roomId) {
  console.log("[DEBUG] initGalleryFromRoomId called with roomId:", roomId);

  if (!roomId) {
    console.warn("[WARN] roomId が未指定です");
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = '❌ roomId が指定されていません。URL に ?roomId=XXX を付加してください。';
    document.body.appendChild(msg);
    return;
  }

  try {
    console.log("[DEBUG] loading room data from Firestore...");
    const { config, images, raw } = await roomLoader.loadRoomDataFromFirestore(roomId, db, storage);
    console.log("[DEBUG] room data loaded:", { config, images, raw });

    const allowed = accessControl.checkAccessAndShowMessage(raw.startDate, raw.endDate);
    console.log("[DEBUG] access check result:", allowed);
    if (!allowed) return;

    const title = raw.roomTitle || 'Untitled Room';
    document.getElementById('titleText').textContent = title;
    document.title = title;
    console.log("[DEBUG] room title set:", title);

    console.log("[DEBUG] initializing gallery...");
    galleryModule.initGallery(images, config, `./rooms/${roomId}/images/`, storage);

    console.log("[DEBUG] setting up room links...");
    await roomLinksModule.setupRoomLinks();
    console.log("[DEBUG] setupRoomLinks finished");

  } catch (err) {
    console.error("[ERROR] 部屋情報の取得に失敗:", err);
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
    document.body.appendChild(msg);
  }
}
