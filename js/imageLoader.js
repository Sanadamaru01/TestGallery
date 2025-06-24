import * as THREE from 'three';

const THUMB_FOLDER = 'thumbs/'; // サムネイルフォルダ相対パス
const HIGHRES_DISTANCE_THRESHOLD = 5.0;

const preloadCache = new Map(); // 高解像度Textureのキャッシュ

export async function loadImages(scene, imageFiles, wallWidth, wallHeight, fixedLongSide = 3, imageBasePath) {
  const MIN_MARGIN = 1.0;
  const MIN_SPACING = 0.5;
  const imageSizes = await Promise.all(imageFiles.map(src => {
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
        resolve({ fw, fh });
      };
      img.src = imageBasePath + THUMB_FOLDER + src;
    });
  }));

  const layoutPlan = planWallLayouts(imageSizes, wallWidth, MIN_MARGIN, MIN_SPACING);
  applyWallLayouts(scene, layoutPlan, imageFiles, imageBasePath, wallHeight);
  startTextureUpdateLoop(scene);
}

function planWallLayouts(imageSizes, wallWidth, minMargin, minSpacing) {
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

    const totalSpacing = minSpacing * (count - 1);
    const extraSpace = availableWidth - totalImageWidth;
    let offset = minMargin + extraSpace / 2;

    const wallPlan = { wall: wallName, images: [] };
    for (let i = 0; i < count; i++) {
      const idx = imageIndex + i;
      const { fw, fh } = imageSizes[idx];
      wallPlan.images.push({
        index: idx,
        fw,
        fh,
        offset: offset + fw / 2
      });
      offset += fw + minSpacing;
    }

    plans.push(wallPlan);
    imageIndex += count;
  }

  return plans;
}

function applyWallLayouts(scene, layoutPlan, imageFiles, imageBasePath, wallHeight) {
  const GALLERY_HEIGHT = wallHeight / 2;
  const loader = new THREE.TextureLoader();
  scene.userData.clickablePanels = [];
  scene.userData.panelEntries = [];

  const wallData = {
    front: { axis: 'x', origin: -scene.userData.wallWidth / 2, z: scene.userData.wallWidth / 2 - 0.1, rotY: Math.PI },
    right: { axis: 'z', origin: scene.userData.wallWidth / 2, x: -scene.userData.wallWidth / 2 + 0.1, rotY: Math.PI / 2 },
    left: { axis: 'z', origin: scene.userData.wallWidth / 2, x: scene.userData.wallWidth / 2 - 0.1, rotY: -Math.PI / 2 }
  };

  layoutPlan.forEach(plan => {
    const wall = wallData[plan.wall];
    plan.images.forEach(img => {
      const thumbPath = imageBasePath + THUMB_FOLDER + imageFiles[img.index];
      const fullPath = imageBasePath + imageFiles[img.index];

      loader.load(thumbPath, (thumbTexture) => {
        const fx = wall.axis === 'x' ? wall.origin + img.offset : wall.x;
        const fz = wall.axis === 'z' ? wall.origin - img.offset : wall.z;
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
          new THREE.MeshBasicMaterial({ map: thumbTexture, side: THREE.DoubleSide })
        );
        panel.position.copy(frame.position);
        panel.rotation.y = wall.rotY;

        const offsetVec = new THREE.Vector3(0, 0, 0.03);
        offsetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), wall.rotY);
        panel.position.add(offsetVec);
        scene.add(panel);

        scene.userData.clickablePanels.push(panel);
        scene.userData.panelEntries.push({ panel, fullPath });
      });
    });
  });
}

function preloadHighResTexture(url) {
  return new Promise((resolve) => {
    if (preloadCache.has(url)) {
      resolve(preloadCache.get(url));
    } else {
      const loader = new THREE.TextureLoader();
      loader.load(url, (texture) => {
        preloadCache.set(url, texture);
        resolve(texture);
      });
    }
  });
}

function startTextureUpdateLoop(scene) {
  const camera = scene.userData.camera;

  function updateVisibleTextures() {
    if (!camera) return;

    for (const entry of scene.userData.panelEntries) {
      const dist = camera.position.distanceTo(entry.panel.position);
      if (dist < HIGHRES_DISTANCE_THRESHOLD && !entry.panel.userData.highResLoaded) {
        preloadHighResTexture(entry.fullPath).then((highResTexture) => {
          entry.panel.material.map = highResTexture;
          entry.panel.material.needsUpdate = true;
          entry.panel.userData.highResLoaded = true;
        });
      }
    }

    requestAnimationFrame(updateVisibleTextures);
  }

  requestAnimationFrame(updateVisibleTextures);
}
