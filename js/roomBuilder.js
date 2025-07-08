import * as THREE from 'three';

export function buildRoom(scene, config) {
  const {
    wallWidth: WALL_WIDTH,
    wallHeight: WALL_HEIGHT,
    backgroundColor,
    texturePaths
  } = config;

  const textureLoader = new THREE.TextureLoader();

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
  const floorMat = makeMaterial(texturePaths?.floor, backgroundColor);
  const ceilMat  = makeMaterial(texturePaths?.ceiling, backgroundColor, 2, 2);

  // 床
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 天井
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  scene.add(ceiling);

  // 壁
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, wallHeight);
  const h = wallHeight / 2, w = WALL_WIDTH / 2;
  const addWall = (x, y, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    scene.add(wall);
  };
  addWall(0, h, -w, 0);
  addWall(0, h, w, Math.PI);
  addWall(-w, h, 0, Math.PI / 2);
  addWall(w, h, 0, -Math.PI / 2);

  // ドア（表示のみ）
  const doorWidth = 2;
  const doorHeight = 3;
  const doorY = doorHeight / 2;
  const doorZ = -w + 0.05;

  const doorGeo = new THREE.PlaneGeometry(doorWidth, doorHeight);
  const doorMat = texturePaths?.Door
    ? new THREE.MeshStandardMaterial({
        map: textureLoader.load(texturePaths.Door),
        side: THREE.DoubleSide
      })
    : new THREE.MeshStandardMaterial({ color: 0xCD853F, side: THREE.DoubleSide });

  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, doorY, doorZ);
  door.rotation.y = 0; // 正面向き
  scene.add(door);

  // ノブだけ表示
  const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.position.set(-doorWidth / 2 + 0.3, doorY, doorZ + 0.05);
  scene.add(knob);

  return { floor, door };
}
