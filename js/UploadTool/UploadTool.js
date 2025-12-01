//------------------------------------------------------
// UploadTool.js（firebaseFirestore.js と完全整合版）
//------------------------------------------------------

import * as fs from "./firebaseFirestore.js";
import * as st from "./firebaseStorage.js";

console.log("📢 UploadTool.js 読み込み完了");

//------------------------------------------------------
// DOM 取得
//------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOMContentLoaded 発火 - UploadTool 初期化開始");

  const roomSelect = document.getElementById("roomSelect");
  const roomTitleInput = document.getElementById("roomTitleInput");
  const updateRoomBtn = document.getElementById("updateRoomBtn");

  const wallTexture = document.getElementById("wallTexture");
  const floorTexture = document.getElementById("floorTexture");
  const ceilingTexture = document.getElementById("ceilingTexture");
  const doorTexture = document.getElementById("doorTexture");
  const updateTextureBtn = document.getElementById("updateTextureBtn");

  const fileInput = document.getElementById("fileInput");
  const previewArea = document.getElementById("previewArea");
  const uploadBtn = document.getElementById("uploadBtn");

  const logArea = document.getElementById("log");

  //------------------------------------------------------
  // ログ
  //------------------------------------------------------
  function log(msg) {
    const t = new Date().toLocaleString();
    logArea.textContent = `[${t}] ${msg}\n` + logArea.textContent;
    console.log("📝", msg);
  }

  //------------------------------------------------------
  // 1. 部屋一覧の読込
  //------------------------------------------------------
  async function loadRooms() {
    log("📂 Firestore から部屋リストを取得中...");

    const rooms = await fs.getRooms(); // ← 重要： {id, data} 形式

    roomSelect.innerHTML = "";

    rooms.forEach(room => {
      const opt = document.createElement("option");
      opt.value = room.id;
      opt.textContent = room.data.roomTitle || room.id; // ← doc.data.roomTitle
      roomSelect.appendChild(opt);
    });

    log(`📌 部屋一覧読込完了（${rooms.length} 件）`);

    if (rooms.length > 0) {
      await loadRoomInfo(rooms[0].id);
    }
  }

  //------------------------------------------------------
  // 2. 選択された部屋情報をロード
  //------------------------------------------------------
  async function loadRoomInfo(roomId) {
    log(`📥 ルーム情報取得中: ${roomId}`);

    const room = await fs.getRoom(roomId);

    if (!room) {
      log(`⚠️ ${roomId} のデータが存在しません`);
      return;
    }

    // ★ 普通のオブジェクト
    roomTitleInput.value = room.roomTitle || "";
    wallTexture.value = room.texturePaths?.wall || "";
    floorTexture.value = room.texturePaths?.floor || "";
    ceilingTexture.value = room.texturePaths?.ceiling || "";
    doorTexture.value = room.texturePaths?.door || "";

    log(`🏠 ルーム情報をフォームへ反映しました`);
  }

  //------------------------------------------------------
  // 3. 部屋タイトル更新
  //------------------------------------------------------
  updateRoomBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;
    const newTitle = roomTitleInput.value.trim();

    if (!roomId) return log("⚠️ 部屋が選択されていません");

    await fs.updateRoomTitle(roomId, newTitle);
    log(`✏️ タイトル更新: ${newTitle}`);

    // UI更新
    roomSelect.selectedOptions[0].textContent = newTitle;
  });

  //------------------------------------------------------
  // 4. テクスチャ更新
  //------------------------------------------------------
  updateTextureBtn.addEventListener("click", async () => {
    const roomId = roomSelect.value;

    const updates = {
      "texturePaths.wall": wallTexture.value,
      "texturePaths.floor": floorTexture.value,
      "texturePaths.ceiling": ceilingTexture.value,
      "texturePaths.door": doorTexture.value
    };

    await fs.updateRoomTextures(roomId, updates);

    log("🧱 テクスチャ設定を保存しました");
  });

  //------------------------------------------------------
  // 5. 画像選択 → プレビュー
  //------------------------------------------------------
  fileInput.addEventListener("change", () => {
    previewArea.innerHTML = "";

    const file = fileInput.files[0];
    if (!file) return;

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "200px";
    img.style.margin = "5px";
    previewArea.appendChild(img);

    log(`🖼️ プレビュー表示: ${file.name}`);
  });

  //------------------------------------------------------
  // 6. 画像アップロード
  //------------------------------------------------------
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return log("⚠️ ファイルが選択されていません");

    const roomId = roomSelect.value;
    log(`🚀 画像アップロード開始: ${file.name}`);

    const uploadResult = await st.uploadImage(roomId, file);

    if (!uploadResult) {
      log("❌ アップロード失敗");
      return;
    }

    const { fileName, downloadURL } = uploadResult;

    log(`📤 Storage へアップロード完了: ${fileName}`);

    // Firestore にメタ情報追加
    await fs.addRoomImageMeta(roomId, {
      file: fileName,
      title: file.name,
      caption: "",
      author: "",
      url: downloadURL
    });

    log("📄 Firestore に画像メタデータ保存完了");
  });

  //------------------------------------------------------
  // イベント：部屋選択変更
  //------------------------------------------------------
  roomSelect.addEventListener("change", () => {
    loadRoomInfo(roomSelect.value);
  });

  //------------------------------------------------------
  // 初期ロード
  //------------------------------------------------------
  (async () => {
    await loadRooms();
    await st.loadTextures(); // storage からテクスチャ名リスト取得
  })();
});
