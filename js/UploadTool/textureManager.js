export async function loadAllTextures(selectors, logArea, currentTexturePaths = {}) {
  log("[TRACE] loadAllTextures start", logArea);
  log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...", logArea);

  await populateTextureSelect("share/Wall", selectors.wallTexture, logArea, currentTexturePaths.wall || "");
  await populateTextureSelect("share/Floor", selectors.floorTexture, logArea, currentTexturePaths.floor || "");
  await populateTextureSelect("share/Ceiling", selectors.ceilingTexture, logArea, currentTexturePaths.ceiling || "");
  await populateTextureSelect("share/Door", selectors.doorTexture, logArea, currentTexturePaths.Door || "");

  log("✅ テクスチャ一覧取得完了", logArea);
  log("[TRACE] loadAllTextures end", logArea);
}
