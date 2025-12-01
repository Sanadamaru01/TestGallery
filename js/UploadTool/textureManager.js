// textureManager.js
import { getStorage, ref, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from './firebaseInit.js';
import { log } from './utils.js';

const storage = getStorage(app);

async function tryListAllWithFallbacks(storagePath, logArea) {
  const parts = storagePath.split('/');
  const prefixes = [parts[0], parts[0].toLowerCase(), parts[0].toUpperCase()];
  for (const pre of prefixes) {
    const pathCandidate = [pre, ...parts.slice(1)].join('/');
    try {
      const listRef = ref(storage, pathCandidate);
      const res = await listAll(listRef);
      if (res.items && res.items.length > 0) return { path: pathCandidate, res };
    } catch (e) {
      log(`⚠️ ${pathCandidate} listAll エラー: ${e.message}`, logArea);
    }
  }
  const listRef = ref(storage, storagePath);
  const res = await listAll(listRef);
  return { path: storagePath, res };
}

async function populateTextureSelect(storagePath, selectEl, logArea) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  try {
    const { path: usedPath, res } = await tryListAllWithFallbacks(storagePath, logArea);
    if (!res.items || res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
      log(`⚠️ ${storagePath} にファイルが見つかりませんでした（候補: ${usedPath}）`, logArea);
      return;
    }
    for (const itemRef of res.items) {
      const relativePath = `${usedPath}/${itemRef.name}`;
      const opt = document.createElement("option");
      opt.value = relativePath;
      opt.textContent = itemRef.name;
      selectEl.appendChild(opt);
    }
    log(`✅ ${usedPath} から ${res.items.length} 件のテクスチャを取得しました`, logArea);
  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`, logArea);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
  }
}

export async function loadAllTextures(selectors, logArea) {
  log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...", logArea);
  await populateTextureSelect("share/Wall", selectors.wallTexture, logArea);
  await populateTextureSelect("share/Floor", selectors.floorTexture, logArea);
  await populateTextureSelect("share/Ceiling", selectors.ceilingTexture, logArea);
  await populateTextureSelect("share/Door", selectors.doorTexture, logArea);
  log("✅ テクスチャ一覧取得完了", logArea);
}
