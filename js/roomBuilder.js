import * as THREE from 'three';

export function buildRoom(scene, config) {
  const {
    wallWidth: WALL_WIDTH,
    wallHeight: WALL_HEIGHT,
    backgroundColor,
    texturePaths
  } = config;

  const textureLoader = new THREE.TextureLoader();

  // マテリアル共通関数
  const makeMaterial = (texPath, fallbackColor, repeatX = 1, repeatY = 1) => {
    if (texPath) {
      const tex = textureLoader.load(texPath);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      return new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    }
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(fallbackColor), side: THREE.DoubleSide });
  };

  const wallMat = makeMaterial(texturePaths?.wall, backgroundColor, 2, 1);
  const floorMat = makeMaterial(texturePaths?.floor, backgroundColor, 1, 1);
  const ceilMat  = makeMaterial(texturePaths?.ceiling, backgroundColor, 2, 2);

  // --- 床 ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // --- 天井 ---
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  scene.add(ceiling);

  // --- 壁 ---
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, wallHeight);
  const h = wallHeight / 2, w = WALL_WIDTH / 2;
  const addWall = (x, y, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    scene.add(wall);
  };
  addWall(0, h, -w, 0);           // back
  addWall(0, h, w, Math.PI);      // front
  addWall(-w, h, 0, Math.PI / 2); // right
  addWall(w, h, 0, -Math.PI / 2); // left

  // --- ドア（Box） ---
  const doorWidth = 2;
  const doorHeight = 3;
  const doorDepth = 0.1;
  const doorY = doorHeight / 2;
  const doorZ = -w + doorDepth / 2 + 0.01; // 壁より少し前に出す

  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    opacity: 0.7,
    transparent: true
  });

  const door = new THREE.Mesh(doorGeo, doorMat);
  door.name = 'Door';
  door.position.set(0, doorY, doorZ);
  scene.add(door);

  // --- テスト用クリック確認ボックス ---
  const testGeo = new THREE.BoxGeometry(1.5, 1.5, 0.1);
  const testMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    opacity: 0.5,
    transparent: true
  });
  const testBox = new THREE.Mesh(testGeo, testMat);
  testBox.position.set(2, 1.5, -1); // 右側に配置
  testBox.name = 'TestBox';
  scene.add(testBox);

  // return 複数オブジェクト
  return {
    floor,
    door,
    testBox
  };
}
