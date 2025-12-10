import * as THREE from 'three';
import { createCaptionPanel } from './captionHelper.js';
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from './firebaseInit.js';

/**
 * ギャラリー用画像をロードして配置（Storage対応・ベースURL使用）
 * @param {THREE.Scene} scene
 * @param {Array} imageFiles - Firestoreから取得した画像情報配列 { file, title, caption, author }
 * @param {number} wallWidth
 * @param {number} wallHeight
 * @param {number} fixedLongSide
 * @param {string} roomId
 */
export async function loadImages(scene, imageFiles, wallWidth, wallHeight, fixedLongSide = 3, roomId) {
  const MIN_MARGIN = 1.0;
  const MIN_SPACING = 0.5;
  const loader = new THREE.TextureLoader();
  const storage = getStorage(app);
  const imageBasePath = `rooms/${roomId}/`;

  let baseURL = null;

  // --- 1つ目のファイルからベースURLを取得 ---
  if (imageFiles.length > 0) {
    try {
      const firstFile = imageFiles[0].file;
      const firstURL = await getDownloadURL(storageRef(storage, imageBasePath + firstFile));
      // URL の最後のファイル名部分を削除してベースURLを作る
      baseURL = firstURL.replace(encodeURIComponent(firstFile), '');
    } catch (e) {
      console.warn(`[WARN] Failed to get base URL for ${roomId}: ${e.message}`);
    }
  }

  // --- 各ファイルのURLを生成 ---
  const imagesWithURL = imageFiles.map(img => {
    let url = null;
    if (baseURL) {
      url = baseURL + encodeURIComponent(img.file);
    }
    return { ...img, downloadURL: url };
  });

  // 画像情報プリロードとサイズ計算
  const imageMetaList = await Promise.all(imagesWithURL.map(imgObj => {
    if (!imgObj.downloadURL) return null;
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const iw = img.width;
        const ih = img.height;
        let fw, fh;
        if (iw >= ih) {
          fw = fixedLongSide;
          fh = fixedLongSide * (ih / iw);
        } else {
          fh = fixedLongSide;
          fw = fixedLongSide * (iw / ih);
        }

        loader.load(imgObj.downloadURL, texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          resolve({ fw, fh, texture, src: imgObj.file, title: imgObj.title, caption: imgObj.caption });
        });
      };
      img.src = imgObj.downloadURL;
    });
  }));

  const validImageMetaList = imageMetaList.filter(x => x !== null);
  const imageSizes = validImageMetaList.map(item => ({ fw: item.fw, fh: item.fh }));
  const layoutPlan = planWallLayouts(imageSizes, wallWidth, MIN_MARGIN, MIN_SPACING);

  return applyWallLayouts(scene, layoutPlan, validImageMetaList, wallWidth, wallHeight);
}

// 以下 applyWallLayouts と planWallLayouts は元のコードと同じ
export function applyWallLayouts(scene, layoutPlan, imageMetaList, wallWidth, wallHeight) {
  const GALLERY_HEIGHT = wallHeight / 2;
  scene.userData.clickablePanels = scene.userData.clickablePanels || [];

  const wallData = {
    front: { axis: 'x', origin: 0, z: wallWidth / 2 - 0.1, rotY: Math.PI },
    right: { axis: 'z', origin: wallWidth / 2, x: -wallWidth / 2 + 0.1, rotY: Math.PI / 2 },
    left:  { axis: 'z', origin: wallWidth / 2, x:  wallWidth / 2 - 0.1, rotY: -Math.PI / 2 }
  };

  const meshes = [];

  layoutPlan.forEach(plan => {
    const wall = wallData[plan.wall];
    plan.images.forEach(img => {
      const meta = imageMetaList[img.index];
      const texture = meta.texture;

      const fx = wall.axis === 'x' ? img.offset : wall.x;
      const fz = wall.axis === 'z' ? img.offset : wall.z;
      const fy = GALLERY_HEIGHT;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(img.fw, img.fh, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      frame.position.set(fx || 0, fy, fz || 0);
      frame.rotation.y = wall.rotY;
      scene.add(frame);

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(img.fw * 0.95, img.fh * 0.95),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
      );
      panel.position.copy(frame.position);
      panel.rotation.y = wall.rotY;

      const offsetVec = new THREE.Vector3(0, 0, 0.03);
      offsetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), wall.rotY);
      panel.position.add(offsetVec);
      scene.add(panel);

      // クリック対象に追加
      panel.userData.size = { width: img.fw, height: img.fh };
      scene.userData.clickablePanels.push(panel);

      // キャプションパネル生成
      if (meta.title && meta.caption) {
        const aspect = img.fw / img.fh;
        const captionPanel = createCaptionPanel(panel, meta.title, meta.caption, aspect);
        panel.userData.captionPanel = captionPanel;
      }

      meshes.push(panel);
    });
  });

  return meshes;
}

export function planWallLayouts(imageSizes, wallWidth, minMargin, minSpacing) {
  const wallNames = ['front', 'right', 'left'];
  const plans = [];
  let imageIndex = 0;

  for (const wallName of wallNames) {
    const availableWidth = wallWidth - 2 * minMargin;
    let count = 0;
    let totalImageWidth = 0;

    while (imageIndex + count < imageSizes.length) {
      const w = imageSizes[imageIndex + count].fw;
      const spacing = count > 0 ? minSpacing : 0;
      if (totalImageWidth + spacing + w > availableWidth) break;
      totalImageWidth += spacing + w;
      count++;
    }

    if (count === 0) continue;

    const wallPlan = { wall: wallName, images: [] };
    let centerOffset = -totalImageWidth / 2;

    for (let i = 0; i < count; i++) {
      const idx = imageIndex + i;
      const { fw, fh } = imageSizes[idx];

      const offset = centerOffset + fw / 2;
      centerOffset += fw + minSpacing;

      wallPlan.images.push({ index: idx, fw, fh, offset });
    }

    plans.push(wallPlan);
    imageIndex += count;
  }

  return plans;
}
