// textureManager.js
import { getStorage, ref, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// -------------------- DOM --------------------
const wallTexture = document.getElementById("wallTexture");
const floorTexture = document.getElementById("floorTexture");
const ceilingTexture = document.getElementById("ceilingTexture");
const doorTexture = document.getElementById("doorTexture");

// -------------------- ログ --------------------
function log(msg) {
  console.log("[textureManager] " + msg);
}

// -------------------- ユーティリティ --------------------
function selectOptionByValue(selectEl, value) {
  if (!selectEl || !value) return;
  const opts = Array.from(selectEl.options);
  const found = opts.find(o => o.value === value);
  if (found) {
    selectEl.value = value;
  } else {
    log(`⚠️ 選択肢に存在しないテクスチャが設定されています: ${value}`);
  }
}

// -------------------- Storage フォルダ一覧取得（大文字小文字耐性） --------------------
async function tryListAllWithFallbacks(storagePath, storage) {
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
    } catch (e) {}
  }
  // 最後にオリジナルパスを試す
  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    return { path: storagePath, res };
  } catch (e) {
    throw new Error(`listAll failed for candidates: ${tried.join(', ')} - ${e.message}`);
  }
}

// -------------------- セレクトボックスにテクスチャをセット --------------------
async function populateTextureSelect(storagePath, selectEl, storage) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  try {
    const { path: usedPath, res } = await tryListAllWithFallbacks(storagePath, storage);
    for (const itemRef of res.items) {
      const relativePath = `${usedPath}/${itemRef.name}`;
      const opt = document.createElement("option");
      opt.value = relativePath;
      opt.textContent = itemRef.name;
      selectEl.appendChild(opt);
    }
    log(`✅ ${usedPath} から ${res.items.length} 件のテクスチャ取得`);
  } catch (err) {
    log(`❌ ${storagePath} の取得エラー: ${err.message}`);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
  }
}

// -------------------- 初期化関数 --------------------
// currentTexturePaths: { wall, floor, ceiling, Door }
export async function initTextureManager(storage, currentTexturePaths = {}) {
  log("🖼️ テクスチャ一覧取得中...");
  await populateTextureSelect("share/Wall", wallTexture, storage);
  await populateTextureSelect("share/Floor", floorTexture, storage);
  await populateTextureSelect("share/Ceiling", ceilingTexture, storage);
  await populateTextureSelect("share/Door", doorTexture, storage);

  // 現在の設定値を選択
  if (currentTexturePaths.wall) selectOptionByValue(wallTexture, currentTexturePaths.wall);
  if (currentTexturePaths.floor) selectOptionByValue(floorTexture, currentTexturePaths.floor);
  if (currentTexturePaths.ceiling) selectOptionByValue(ceilingTexture, currentTexturePaths.ceiling);
  if (currentTexturePaths.Door) selectOptionByValue(doorTexture, currentTexturePaths.Door);

  log("✅ テクスチャ初期値セット完了");
}

// -------------------- エクスポート DOM --------------------
export const textureElements = {
  wallTexture, floorTexture, ceilingTexture, doorTexture
};
