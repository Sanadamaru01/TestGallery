import { loadRoomDataFromFirestore } from './RoomConfigLoaderFirestore.js';
import { checkAccessAndShowMessage } from './accessControl.js';
import { initGallery } from './gallery.js';
import { updateRoomLinksUI } from './roomLinks.js';

// URL から roomId を取得
function getCurrentRoomId() {
  // トップ直下に room.html がある場合でも、roomId は URL パラメータやクエリで取得する方が安全です
  // ここでは仮に ?room=room1 の形式を想定
  const params = new URLSearchParams(location.search);
  return params.get('room');
}

const roomId = getCurrentRoomId();
if (!roomId) {
  console.error("❌ roomId が取得できません");
} else {
  loadRoomDataFromFirestore(roomId)
    .then(({ config, images, raw }) => {
      const allowed = checkAccessAndShowMessage(raw.startDate, raw.endDate);
      if (!allowed) return;

      const title = raw.roomTitle || 'Untitled Room';
      document.getElementById('titleText').textContent = title;
      document.title = title;

      // ★ 画像パスをトップ直下に合わせて修正
      // images フォルダもトップ直下に配置すると仮定
      initGallery(images, config, `./rooms/${roomId}/images/`);

      // ★ 前後リンクも room.html を参照するように変更
      updateRoomLinksUI(roomId, 'room.html');
    })
    .catch(err => {
      console.error('部屋情報の取得に失敗:', err);
      const msg = document.createElement('div');
      msg.className = 'message';
      msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
      document.body.appendChild(msg);
    });
