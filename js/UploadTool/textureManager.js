import { getStorage, ref, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from './firebaseInit.js';
import { log } from './utils.js';

const storage = getStorage(app);

/**
 * 指定パスの Storage ファイルを select 要素に反映
 */
async function populateTextureSelect(storagePath, selectEl, logArea) {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  // 「設定なし」オプション
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  log(`[TRACE] populateTextureSelect start: ${storagePath}`, logArea);

  try {
    const listRef = ref(storage, storagePath);
    log(`[TRACE] listRef created: ${listRef.fullPath}`, logArea);

    const res = await listAll(listRef);
    log(`[TRACE] listAll resolved: items=${res.items.length}, prefixes=${res.prefixes.length}`, logArea);

    if (!res.items || res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
      log(`⚠️ ${storagePath} にファイルが見つかりませんでした`, logArea);
      return;
    }

    // ファイルを select に追加
    for (const itemRef of res.items) {
      const relativePath = `${storagePath}/${itemRef.name}`;
      const opt = document.createElement("option");
      opt.value = relativePath;
      opt.textContent = itemRef.name;
      selectEl.appendChild(opt);
      log(`[TRACE] item added: ${relativePath}`, logArea);
    }

    log(`✅ ${storagePath} から ${res.items.length} 件のテクスチャを取得しました`, logArea);

  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`, logArea);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
    log(`[TRACE] populateTextureSelect catch end for ${storagePath}`, logArea);
  }

  log(`[TRACE] populateTextureSelect end: ${storagePath}`, logArea);
}

/**
 * 各テクスチャ select をロード
 */
export async function loadAllTextures(selectors, logArea) {
  log("[TRACE] loadAllTextures start", logArea);
  log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...", logArea);

  await populateTextureSelect("share/Wall", selectors.wallTexture, logArea);
  await populateTextureSelect("share/Floor", selectors.floorTexture, logArea);
  await populateTextureSelect("share/Ceiling", selectors.ceilingTexture, logArea);
  await populateTextureSelect("share/Door", selectors.doorTexture, logArea);

  log("✅ テクスチャ一覧取得完了", logArea);
  log("[TRACE] loadAllTextures end", logArea);
}
