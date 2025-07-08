import * as THREE from 'three';

export function buildRoom(scene, config) {
  console.log('[roomBuilder] called');

  const {
    wallWidth: WALL_WIDTH,
    wallHeight: WALL_HEIGHT,
    backgroundColor,
    texturePaths
  } = config;

  const textureLoader = new THREE.TextureLoader();

  // 壁マテリアル
  const wallTex = texturePaths?.wall ? textureLoader.load(texturePaths.wall) : null;
  if (wallTex) {
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(2, 1);
  }
  const wallMat = wallTex
    ? new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(backgroundColor), side: THREE.DoubleSide });

  // 床マテリアル
  const floorTex = texturePaths?.floor ? textureLoader.load(texturePaths.floor) : null;
  if (floorTex) {
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(1, 1);
  }
  const floorMat = floorTex
    ? new THREE.MeshStandardMaterial({ map: floorTex })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(backgroundColor) });

  // 天井マテリアル
  const ceilTex = texturePaths?.ceiling ? textureLoader.load(texturePaths.ceiling) : null;
  if (ceilTex) {
    ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
    ceilTex.repeat.set(2, 2);
  }
  const ceilMat = ceilTex
    ? new THREE.MeshStandardMaterial({ map: ceilTex })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(backgroundColor) });

  // 床
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 天井
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH),
    ceilMat
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  // 壁共通ジオメトリ
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);
  const h = WALL_HEIGHT / 2, w = WALL_WIDTH / 2;

  const addWall = (x, y, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    scene.add(wall);
  };

  // 各壁を追加
  addWall(0, h, -w, 0);            // back
  addWall(0, h, w, Math.PI);       // front
  addWall(-w, h, 0, Math.PI / 2);  // right
  addWall(w, h, 0, -Math.PI / 2);  // left

  // --- ドア追加 ---
  const doorWidth = 2;
  const doorHeight = 3;
  const doorDepth = 0.1;
  const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const doorZ = -w + doorDepth / 2;
  const doorY = doorHeight / 2;
  const doorTexPath = texturePaths?.Door;
  
  const addDoor = (material) => {
    const door = new THREE.Mesh(doorGeometry, material);
    door.position.set(0, doorY, doorZ);
    door.rotation.y = Math.PI;
    door.userData.onClick = () => {
      window.location.href = '../../index.html';
    };
    scene.add(door);
  
    if (!scene.userData.clickablePanels) {
      scene.userData.clickablePanels = [];
    }
    scene.userData.clickablePanels.push(door);
  
    addDoorFrame(scene, doorWidth, doorHeight, doorZ);
    addDoorKnob(scene, doorWidth, doorHeight, doorZ);
  };
  
  // --- ドア枠 ---
  function addDoorFrame(scene, width, height, z) {
    const frameColor = 0x3b2f2f;
    const frameMat = new THREE.MeshStandardMaterial({ color: frameColor });
    const t = 0.08;
    const d = 0.1;
  
    // 左柱
    const left = new THREE.Mesh(new THREE.BoxGeometry(t, height + t * 2, d), frameMat);
    left.position.set(-width / 2 - t / 2, height / 2, z);
    scene.add(left);
  
    // 右柱
    const right = new THREE.Mesh(new THREE.BoxGeometry(t, height + t * 2, d), frameMat);
    right.position.set(width / 2 + t / 2, height / 2, z);
    scene.add(right);
  
    // 上枠
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + t * 2, t, d), frameMat);
    top.position.set(0, height + t / 2, z);
    scene.add(top);
  }
  
  // --- ドアノブ ---
  function addDoorKnob(scene, width, height, z) {
    const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.set(-width / 2 + 0.3, height / 2, z + 0.05);
    scene.add(knob);
  }
