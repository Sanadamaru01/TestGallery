// textureManager.js
import { log, selectOptionByValue } from './utils.js';
import { getStorage, ref, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const storage = getStorage();

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
      if (res.items && res.items.length > 0) return { path: pathCandidate, res };
    } catch {}
  }
  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    return { path: storagePath, res };
  } catch (e) {
    throw new Error(`listAll failed for candidates: ${tried.join(', ')} - ${e.message}`);
  }
}

export async function populateTextureSelect(storagePath, selectEl, logArea) {
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
      log(`⚠️ ${storagePath} にファイルが見つかりません（候補: ${usedPath}）`, logArea);
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

export async function loadAllTextures(wallEl, floorEl, ceilingEl, doorEl, logArea) {
  await populateTextureSelect("share/Wall", wallEl, logArea);
  await populateTextureSelect("share/Floor", floorEl, logArea);
  await populateTextureSelect("share/Ceiling", ceilingEl, logArea);
  await populateTextureSelect("share/Door", doorEl, logArea);
}
