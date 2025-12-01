// textureManager.js
import { getStorage, ref, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from './firebaseInit.js';
import { log } from './utils.js';

const storage = getStorage(app);

async function tryListAllWithFallbacks(storagePath) {
  const tried = [];
  const parts = storagePath.split('/');
  const prefixes = [parts[0], parts[0].toLowerCase(), parts[0].toUpperCase()];
  for (const pre of prefixes) {
    const pathCandidate = [pre, ...parts.slice(1)].join('/');
    tried.push(pathCandidate);
    try {
      const listRef = ref(storage, pathCandidate);
      const res = await listAll(listRef);
      if (res.items && res.items.length > 0) {
        return { path: pathCandidate, res };
      }
    } catch (e) {
      // 次の候補へ
    }
  }
  // 最終候補
  const listRef = ref(storage, storagePath);
  const res = await listAll(listRef);
  return { path: storagePath, res };
}

// -------------------- select に反映 --------------------
async function populateTextureSelect(storagePath, selectEl, logArea = null) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  try {
    const { path: usedPath, res } = await tryListAllWithFallbacks(storagePath);
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

// -------------------- 全テクスチャ読み込み --------------------
export async function loadAllTextures(wallTexture, floorTexture, ceilingTexture, doorTexture, logArea = null) {
  log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...", logArea);
  await populateTextureSelect("share/Wall", wallTexture, logArea);
  await populateTextureSelect("share/Floor", floorTexture, logArea);
  await populateTextureSelect("share/Ceiling", ceilingTexture, logArea);
  await populateTextureSelect("share/Door", doorTexture, logArea);
  log("✅ テクスチャ一覧取得完了", logArea);
}
