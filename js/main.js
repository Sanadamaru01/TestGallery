// main.js (Firestore 版)
import { loadRoomDataFromFirestore } from './RoomConfigLoaderFirestore.js';
import { checkAccessAndShowMessage } from './accessControl.js';
import { initGallery } from './gallery.js';
import { getPrevNextRoomInfo } from './roomLinks.js';

// -------------------------------
// 現在の roomId を決定
// -------------------------------
// 例: /rooms/room3/index.html → room3 を抽出
function detectCurrentRoomId() {
  const path = window.location.pathname;
  const match = path.match(/\/(room[0-9A-Za-z_-]+)\//);
  return match ? match[1] : null;
}

const currentRoomId = detectCurrentRoomId();
if (!currentRoomId) {
  console.error('roomId を URL から判定できませんでした');
}

// -------------------------------
// Firestore から部屋データ取得開始
// -------------------------------
loadRoomDataFromFirestore(currentRoomId)
  .then(async ({ config, images, raw }) => {

    // アクセス可能か？
    const allowed = checkAccessAndShowMessage(raw.startDate, raw.endDate);
    if (!allowed) return;

    // タイトル設定
    const title = raw.roomTitle || 'Untitled Room';
    document.getElementById('titleText').textContent = title;
    document.title = title;

    // -------------------------------
    // 前後の部屋リンク（roomLinks.js）
    // -------------------------------
    const linkInfo = await getPrevNextRoomInfo(currentRoomId);

    const prevEl = document.getElementById('prevRoom');
    const nextEl = document.getElementById('nextRoom');

    // 前の部屋
    if (linkInfo.prevRoom && linkInfo.prevRoom.id) {
      if (linkInfo.prevRoom.available) {
        prevEl.href = `../${linkInfo.prevRoom.id}/index.html`;
        prevEl.textContent = '〈 前の部屋';
      } else {
        prevEl.removeAttribute('href');
        prevEl.textContent = '〈 開いていない部屋';
        prevEl.style.opacity = 0.5;
      }
    } else {
      prevEl.removeAttribute('href');
      prevEl.textContent = '〈 なし';
      prevEl.style.opacity = 0.5;
    }

    // 次の部屋
    if (linkInfo.nextRoom && linkInfo.nextRoom.id) {
      if (linkInfo.nextRoom.available) {
        nextEl.href = `../${linkInfo.nextRoom.id}/index.html`;
        nextEl.textContent = '次の部屋 〉';
      } else {
        nextEl.removeAttribute('href');
        nextEl.textContent = '開いていない部屋 〉';
        nextEl.style.opacity = 0.5;
      }
    } else {
      nextEl.removeAttribute('href');
      nextEl.textContent = 'なし 〉';
      nextEl.style.opacity = 0.5;
    }

    // -------------------------------
    // ギャラリー初期化
    // -------------------------------
    initGallery(images, config, null); // Storage URL で完結するため path は null
  })
  .catch(err => {
    console.error('Firestore 情報の読み込みに失敗:', err);
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
    document.body.appendChild(msg);
  });
