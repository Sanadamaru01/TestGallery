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

  // 壁テクスチャ
  const wallTex = texturePaths?.wall ? textureLoader.load(texturePaths.wall) : null;
  if (wallTex) {
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(2, 1);
  }
  const wallMat = wallTex
    ? new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(backgroundColor), side: THREE.DoubleSide });

  // 床テクスチャ
  const floorTex = texturePaths?.floor ? textureLoader.load(texturePaths.floor) : null;
  if (floorTex) {
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(1, 1);
  }
  const floorMat = floorTex
    ? new THREE.MeshStandardMaterial({ map: floorTex })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(backgroundColor) });

  // 天井テクスチャ
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

  // 壁共通
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);

  // 各壁の追加
  const h = WALL_HEIGHT / 2, w = WALL_WIDTH / 2;
  const addWall = (x, y, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    scene.add(wall);
  };

  addWall(0, h, -w, 0);          // back
  addWall(0, h, w, Math.PI);     // front
  addWall(-w, h, 0, Math.PI / 2); // right
  addWall(w, h, 0, -Math.PI / 2); // left

  // ===== 出口ドアを追加（back 壁中央） =====
  const doorWidth = 2;
  const doorHeight = 3;
  const doorTexPath = texturePaths?.Door;
  const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
  let doorMaterial;
  
  if (doorTexPath) {
    // テクスチャあり：ロード完了後にドア追加
    textureLoader.load(
      doorTexPath,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.encoding = THREE.sRGBEncoding;
  
        doorMaterial = new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide
        });
  
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, doorHeight / 2, -w + 0.05);
        door.rotation.y = Math.PI;
        door.userData.onClick = () => {
          window.location.href = '../../index.html';
        };
        scene.add(door);
  
        if (!scene.userData.clickablePanels) scene.userData.clickablePanels = [];
        scene.userData.clickablePanels.push(door);
      },
      undefined,
      // ロード失敗時：白で作る
      () => {
        const fallbackMat = new THREE.MeshBasicMaterial({
          color: 0xCD853F,
          side: THREE.DoubleSide
        });
        const door = new THREE.Mesh(doorGeometry, fallbackMat);
        door.position.set(0, doorHeight / 2, -w + 0.05);
        door.rotation.y = Math.PI;
        door.userData.onClick = () => {
          window.location.href = '../../index.html';
        };
        scene.add(door);
  
        if (!scene.userData.clickablePanels) scene.userData.clickablePanels = [];
        scene.userData.clickablePanels.push(door);
      }
    );
  } else {
    // テクスチャ指定が無い：すぐに白で作る
    doorMaterial = new THREE.MeshBasicMaterial({
      color: 0xCD853F,
      side: THREE.DoubleSide
    });
  
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, doorHeight / 2, -w + 0.05);
    door.rotation.y = Math.PI;
    door.userData.onClick = () => {
      window.location.href = '../../index.html';
    };
    scene.add(door);
  
    if (!scene.userData.clickablePanels) scene.userData.clickablePanels = [];
    scene.userData.clickablePanels.push(door);
  }
  // ============================================

  return floor;
}
