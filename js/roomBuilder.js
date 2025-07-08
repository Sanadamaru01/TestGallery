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

  // --- マテリアル設定 ---
  const createMat = (texPath, fallbackColor, repeatX = 1, repeatY = 1) => {
    if (texPath) {
      const tex = textureLoader.load(texPath);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      return new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    } else {
      return new THREE.MeshStandardMaterial({ color: new THREE.Color(fallbackColor), side: THREE.DoubleSide });
    }
  };

  const wallMat = createMat(texturePaths?.wall, backgroundColor, 2, 1);
  const floorMat = createMat(texturePaths?.floor, backgroundColor, 1, 1);
  const ceilMat  = createMat(texturePaths?.ceiling, backgroundColor, 2, 2);

  // --- 床・天井 ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  // --- 壁 ---
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);
  const h = WALL_HEIGHT / 2, w = WALL_WIDTH / 2;
  const addWall = (x, y, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    scene.add(wall);
  };

  addWall(0, h, -w, 0);            // back
  addWall(0, h, w, Math.PI);       // front
  addWall(-w, h, 0, Math.PI / 2);  // right
  addWall(w, h, 0, -Math.PI / 2);  // left

  // --- ドア本体 ---
  const doorWidth = 2;
  const doorHeight = 3;
  const doorDepth = 0.1;
  const doorY = doorHeight / 2;
  const doorZ = -w + doorDepth / 2;
  const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);

  const addDoor = (material) => {
    const door = new THREE.Mesh(doorGeometry, material);
    door.position.set(0, doorY, doorZ);
    door.rotation.y = Math.PI;

    door.userData.onClick = () => {
      console.log('[door] clicked!');
      window.location.href = '../../index.html';
    };

    scene.add(door);
    if (!scene.userData.clickablePanels) {
      scene.userData.clickablePanels = [];
    }
    scene.userData.clickablePanels.push(door);
  };

  // ドアテクスチャのロード処理
  const doorTexPath = texturePaths?.Door;
  if (doorTexPath) {
    textureLoader.load(
      doorTexPath,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.encoding = THREE.sRGBEncoding;
        const mat = new THREE.MeshStandardMaterial({ map: tex });
        addDoor(mat);
      },
      undefined,
      () => {
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xCD853F });
        addDoor(fallbackMat);
      }
    );
  } else {
    const defaultMat = new THREE.MeshStandardMaterial({ color: 0xCD853F });
    addDoor(defaultMat);
  }

  return floor;
}
