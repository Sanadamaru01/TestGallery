import * as THREE from 'three';

/**
 * 画像をロードして平面に貼り付け
 * @param {THREE.Scene} scene
 * @param {Array} imageFiles - { downloadURL, title, caption, author }
 * @param {number} wallWidth
 * @param {number} wallHeight
 * @param {number} fixedLongSide
 */
export async function loadImages(scene, imageFiles, wallWidth, wallHeight, fixedLongSide) {
  const loader = new THREE.TextureLoader();
  const meshes = [];

  for (const img of imageFiles) {
    if (!img.downloadURL) continue;

    const texture = await new Promise(resolve => {
      loader.load(img.downloadURL, resolve, undefined, err => {
        console.error(`Failed to load texture: ${img.downloadURL}`, err);
        resolve(null);
      });
    });
    if (!texture) continue;

    const aspect = texture.image.width / texture.image.height;
    const height = fixedLongSide;
    const width = height * aspect;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);

    // 適当な配置（例：ランダム位置）
    mesh.position.set(
      (Math.random() - 0.5) * wallWidth,
      height / 2,
      (Math.random() - 0.5) * wallWidth
    );

    mesh.userData = { imgData: img };
    scene.add(mesh);
    scene.userData.clickablePanels?.push(mesh);
    meshes.push(mesh);
  }

  return meshes;
}
