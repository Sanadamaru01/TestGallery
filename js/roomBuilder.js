import * as THREE from 'three';

export async function buildRoom(scene, config) {
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
  addWall(0, h, -w, 0);           // back
  addWall(0, h, w, Math.PI);      // front
  addWall(-w, h, 0, Math.PI / 2); // right
  addWall(w, h, 0, -Math.PI / 2); // left

  // --- ドア ---
  const doorWidth = 2;
  const doorHeight = 3;
  const doorDepth = 0.1;
  const doorY = doorHeight / 2;
  const doorZ = -w + doorDepth / 2 + 0.01;
  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);

  const createDoor = (material) => {
    const door = new THREE.Mesh(doorGeo, material);
    door.name = 'Door';
    door.position.set(0, doorY, doorZ);
    scene.add(door);

    if (!Array.isArray(scene.userData.clickablePanels)) {
      scene.userData.clickablePanels = [];
    }
    scene.userData.clickablePanels.push(door);

    // エッジ表示
    const edgeGeo = new THREE.EdgesGeometry(doorGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.copy(door.position);
    edges.rotation.copy(door.rotation);
    scene.add(edges);

    // --- ドアノブ（筒状） ---
    const knobGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 32);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(-doorWidth / 2 + 0.25, doorY, doorZ + doorDepth / 2 + 0.06);
    scene.add(knob);

    // --- 上下の装飾バンド ---
    const bandHeight = 0.1;
    const bandDepth = 0.02;
    const bandColor = 0x000000;

    const topBand = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth * 0.9, bandHeight, bandDepth),
      new THREE.MeshStandardMaterial({ color: bandColor })
    );
    topBand.position.set(0, doorHeight / 2 - bandHeight / 2, doorDepth / 2 + 0.011);
    door.add(topBand);

    const bottomBand = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth * 0.9, bandHeight, bandDepth),
      new THREE.MeshStandardMaterial({ color: bandColor })
    );
    bottomBand.position.set(0, -doorHeight / 2 + bandHeight / 2, doorDepth / 2 + 0.011);
    door.add(bottomBand);

    // --- EXIT 看板（CanvasTexture） ---
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', canvas.width / 2, canvas.height / 2);

    const textTex = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), textMat);
    sign.position.set(0, 0, doorDepth / 2 + 0.012);
    door.add(sign);

    return door;
  };

  let door;
  const fallbackMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    opacity: 0.7,
    transparent: true,
    side: THREE.DoubleSide
  });

  if (texturePaths?.Door) {
    try {
      const tex = await new Promise((resolve, reject) => {
        textureLoader.load(texturePaths.Door, resolve, undefined, reject);
      });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.encoding = THREE.sRGBEncoding;
      const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
      door = createDoor(mat);
    } catch {
      door = createDoor(fallbackMat);
    }
  } else {
    door = createDoor(fallbackMat);
  }

  return { floor, door };
}
