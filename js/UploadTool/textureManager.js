async function populateTextureSelect(storagePath, selectEl, logArea, currentValue = "") {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  log(`[TRACE] populateTextureSelect start: ${storagePath}`, logArea);

  try {
    const { path: usedPath, res } = await tryListAllWithFallbacks(storagePath);
    log(`[TRACE] Using path: ${usedPath}, items=${res.items.length}`, logArea);

    if (!res.items || res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
      log(`⚠️ ${storagePath} にファイルが見つかりませんでした（候補: ${usedPath}）`, logArea);
    } else {
      for (const itemRef of res.items) {
        const relativePath = `${usedPath}/${itemRef.name}`;
        const opt = document.createElement("option");
        opt.value = relativePath;
        opt.textContent = itemRef.name;
        if (relativePath === currentValue) opt.selected = true; // ← ここで現在値を選択
        selectEl.appendChild(opt);
        log(`[TRACE] item added: ${relativePath}`, logArea);
      }
    }

    log(`✅ ${usedPath} から ${res.items.length} 件のテクスチャを取得しました`, logArea);

  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`, logArea);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
  }

  log(`[TRACE] populateTextureSelect end: ${storagePath}`, logArea);
}
