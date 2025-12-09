import * as THREE from 'three';
import { buildRoom } from './roomBuilder.js';
import { setupCameraControls } from './cameraControls.js';
import { loadImages } from './imageLoader.js';
import { createCaptionPanel } from './captionHelper.js';
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';

/**
 * ギャラリー初期化
 * @param {string} roomId - 部屋ID
 * @param {Array} imageFiles - Firestoreから取得した画像情報配列 (file, title, caption, author)
 * @param {Object} config - 部屋設定（wallWidth, wallHeight, fixedLongSide, backgroundColor など）
 */
export async function initGallery(roomId, imageFiles, config) {
  const { wallWidth: WALL_WIDTH, wallHeight: WALL_HEIGHT, fixedLongSide, backgroundColor } = config;

  const titleBar = document.getElementById('titleBar');
  const HEADER_HEIGHT = titleBar ? parseInt(titleBar.dataset.height || '60', 10) : 60;
  const GALLERY_HEIGHT = WALL_HEIGHT / 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.userData.wallWidth = WALL_WIDTH;
  scene.userData.clickablePanels = [];

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / (window.innerHeight - HEADER_HEIGHT),
    0.1,
    1000
  );
  camera.position.set(0, GALLERY_HEIGHT, -0.5);
  camera.lookAt(0, GALLERY_HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight - HEADER_HEIGHT);
  renderer.colorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  const { floor, door } = await buildRoom(scene, config);

  // ドアクリックでポータル index.html に戻る
  door.userData.onClick = () => window.location.href = '../../index.html';
  door.traverse(child => { if (child !== door) child.userData.onClick = door.userData.onClick; });

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  const ambientLight = new THREE.AmbientLight(0x888888, 0.5);
  scene.add(light, light.target, ambientLight);
  const lightOffset = new THREE.Vector3(0, 10, 7.5);

  const { controls, animateCamera } = setupCameraControls(camera, renderer, GALLERY_HEIGHT, floor, scene);

  // -----------------------------
  // 画像読み込み・配置
  // -----------------------------
  const storage = getStorage(app);
  const imageBasePath = `rooms/${roomId}/`;

  // Firestore に保存されている file 名から downloadURL を取得
  const imagesWithURL = await Promise.all(imageFiles.map(async img => {
    try {
      const url = await getDownloadURL(storageRef(storage, imageBasePath + img.file));
      return { ...img, downloadURL: url };
    } catch (e) {
      console.warn(`Failed to load ${img.file}: ${e.message}`);
      return { ...img, downloadURL: null };
    }
  }));

  const loadedMeshes = await loadImages(
    scene,
    imagesWithURL,
    WALL_WIDTH,
    WALL_HEIGHT,
    fixedLongSide
  );

  // キャプション作成
  loadedMeshes.forEach((mesh, idx) => {
    const imgData = imagesWithURL[idx];
    if (imgData.title && imgData.caption) {
      const aspect = mesh.geometry.parameters.width / mesh.geometry.parameters.height;
      mesh.userData.captionPanel = createCaptionPanel(mesh, imgData.title, imgData.caption, aspect);
    }
  });

  // ウィンドウリサイズ対応
  function onWindowResize() {
    camera.aspect = window.innerWidth / (window.innerHeight - HEADER_HEIGHT);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight - HEADER_HEIGHT);
  }
  window.addEventListener('resize', () => setTimeout(onWindowResize, 100));
  onWindowResize();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    animateCamera();

    loadedMeshes.forEach(mesh => {
      if (mesh.userData.captionPanel) {
        mesh.userData.captionPanel.visible = camera.position.distanceTo(mesh.position) < 3;
      }
    });

    const lightPos = lightOffset.clone();
    camera.localToWorld(lightPos);
    light.position.copy(lightPos);
    light.target.position.copy(controls.target);

    renderer.render(scene, camera);
  }

  // クリック処理
  window.addEventListener('click', event => {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / (window.innerHeight - HEADER_HEIGHT)) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.userData.clickablePanels || [], true);
    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      clicked.userData?.onClick?.();
    }
  });

  animate();
}
