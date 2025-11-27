import { loadRoomDataFromFirestore } from './RoomConfigLoaderFirestore.js';
import { getPrevNextRoom } from './roomLinks.js';
import { checkAccessAndShowMessage } from './accessControl.js';
import { initGallery } from './gallery.js';

// 現在の部屋ID（URLや設定から取得）
const currentRoomId = window.location.pathname.match(/room\d+/)?.[0];

if (!currentRoomId) {
  console.error('roomId が URL から取得できません');
  const msg = document.createElement('div');
  msg.className = 'message';
  msg.textContent = '部屋情報が取得できません';
  document.body.appendChild(msg);
} else {
  // Firestore から部屋情報取得
  loadRoomDataFromFirestore(currentRoomId)
    .then(async ({ config, images, raw }) => {
      // アクセス制御
      const allowed = checkAccessAndShowMessage(raw.startDate, raw.endDate);
      if (!allowed) return;

      // タイトル表示
      const title = raw.roomTitle || 'Untitled Room';
      document.getElementById('titleText').textContent = title;
      document.title = title;

      // 前後の部屋リンク取得
      const { prevRoom, nextRoom } = await getPrevNextRoom(currentRoomId);

      // ボタンに反映
      const prevEl = document.getElementById('prevRoom');
      const nextEl = document.getElementById('nextRoom');

      if (prevRoom?.id && prevRoom.available) {
        prevEl.href = `../${prevRoom.id}/index.html`;
        prevEl.textContent = `< ${prevRoom.title}`;
      } else {
        prevEl.removeAttribute('href');
        prevEl.textContent = `< ${prevRoom?.title || 'なし'}`;
      }

      if (nextRoom?.id && nextRoom.available) {
        nextEl.href = `../${nextRoom.id}/index.html`;
        nextEl.textContent = `${nextRoom.title} >`;
      } else {
        nextEl.removeAttribute('href');
        nextEl.textContent = `${nextRoom?.title || 'なし'} >`;
      }

      // ギャラリー初期化
      initGallery(images, config, `./images/`);
    })
    .catch(err => {
      console.error('設定ファイルの読み込みに失敗:', err);
      const msg = document.createElement('div');
      msg.className = 'message';
      msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
      document.body.appendChild(msg);
    });
}
