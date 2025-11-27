import { loadRoomDataFromFirestore } from './RoomConfigLoaderFirestore.js';
import { checkAccessAndShowMessage } from './accessControl.js';
import { initGallery } from './gallery.js';
import { updateRoomLinksUI } from './roomLinks.js';

// URL から roomId を取得
function getCurrentRoomId() {
  const match = location.pathname.match(/\/(room\d+)\//);
  return match ? match[1] : null;
}

const roomId = getCurrentRoomId();
if (!roomId) {
  console.error("❌ roomId が取得できません");
} else {
  // Firestore から部屋情報取得
  loadRoomDataFromFirestore(roomId)
    .then(({ config, images, raw }) => {
      const allowed = checkAccessAndShowMessage(raw.startDate, raw.endDate);
      if (!allowed) return;

      const title = raw.roomTitle || 'Untitled Room';
      document.getElementById('titleText').textContent = title;
      document.title = title;

      initGallery(images, config, `./images/`);
      updateRoomLinksUI(roomId); // 前後リンク反映
    })
    .catch(err => {
      console.error('部屋情報の取得に失敗:', err);
      const msg = document.createElement('div');
      msg.className = 'message';
      msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
      document.body.appendChild(msg);
    });
}
