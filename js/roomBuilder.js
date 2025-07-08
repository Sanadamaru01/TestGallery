import * as THREE from 'three';

export function buildRoom(scene, config) {
  const {
    wallWidth: WALL_WIDTH,
    wallHeight: WALL_HEIGHT,
    backgroundColor,
    texturePaths
  } = config;

  const textureLoader = new THREE.TextureLoader();

  // --- マテリアル作成ユーティリティ ---
  const makeMaterial = (texPath, fallbackColor, repeatX = 1, repeatY = 1) => {
    if (texPath) {
      const tex = textureLoader.load(texPath);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      return new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    }
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(fallbackColor), side: THREE.DoubleSide });
  };

  const wallMat  = makeMaterial(texturePaths?.wall, backgroundColor, 2, 1);
  const floorMat = makeMaterial(texturePaths?.floor, backgroundColor, 1, 1);
  const ceilMat  = makeMaterial(texturePaths?.ceiling, backgroundColor, 2, 2);

  // --- 床 ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // --- 天井 ---
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH),
    ceilMat
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  // --- 壁 ---
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);
  const h = WALL_HEIGHT / 2;
  const w = WALL_WIDTH / 2;

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

  // --- ドア（BoxGeometryで厚み付き） ---
  const doorWidth = 2;
  const doorHeight = 3;
  const doorDepth = 0.05;
  const doorY = doorHeight / 2;
  const doorZ = -w + doorDepth / 2 + 0.01;

  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const doorTex = texturePaths?.Door ? textureLoader.load(texturePaths.Door) : null;
  const doorMat = doorTex
    ? new THREE.MeshStandardMaterial({ map: doorTex })
    : new THREE.MeshStandardMaterial({ color: 0xCD853F });

  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, doorY, doorZ);
  scene.add(door);

  // ドアノブ（見た目用）
  const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.position.set(-doorWidth / 2 + 0.3, doorY, doorZ + doorDepth / 2 + 0.02);
  scene.add(knob);

  // 戻り値として floor と door を返す
  return { floor, door };
}
