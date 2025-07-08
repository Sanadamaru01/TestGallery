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

  // 壁
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);
  const h = WALL_HEIGHT / 2, w = WALL_WIDTH / 2;
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

  // ドア
  const doorWidth = 2;
  const doorHeight = 3;
  const doorZ = -w + 0.01;
  const doorY = doorHeight / 2;
  const doorTexPath = texturePaths?.Door;
  const doorGeo = new THREE.PlaneGeometry(doorWidth, doorHeight);

  const addDoor = (material) => {
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(doorWidth, doorHeight),
      material
    );
    door.position.set(0, doorY, doorZ);
    door.rotation.y = Math.PI;
    scene.add(door);
  
    // 🔽 クリック専用の透明パネルを追加（Raycasterのターゲット）
    const clickPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(doorWidth, doorHeight),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    clickPanel.position.set(0, doorY, doorZ + 0.05); // ドアより手前
    clickPanel.rotation.y = Math.PI;
    clickPanel.userData.onClick = () => {
      window.location.href = '../../index.html';
    };
    scene.add(clickPanel);
  
    if (!scene.userData.clickablePanels) {
      scene.userData.clickablePanels = [];
    }
    scene.userData.clickablePanels.push(clickPanel);
  
    addDoorFrame(scene, doorWidth, doorHeight, doorZ);
    addDoorKnob(scene, doorWidth, doorHeight, doorZ);
  };

  if (doorTexPath) {
    textureLoader.load(
      doorTexPath,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.encoding = THREE.sRGBEncoding;
        const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        addDoor(mat);
      },
      undefined,
      () => {
        const fallbackMat = new THREE.MeshBasicMaterial({ color: 0xCD853F, side: THREE.DoubleSide });
        addDoor(fallbackMat);
      }
    );
  } else {
    const fallbackMat = new THREE.MeshBasicMaterial({ color: 0xCD853F, side: THREE.DoubleSide });
    addDoor(fallbackMat);
  }

  return floor;
}

// ドア枠
function addDoorFrame(scene, width, height, z) {
  const frameColor = 0x3b2f2f;
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor });
  const t = 0.08;
  const d = 0.02;

  const left = new THREE.Mesh(new THREE.BoxGeometry(t, height + t * 2, d), frameMat);
  left.position.set(-width / 2 - t / 2, height / 2, z);
  scene.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(t, height + t * 2, d), frameMat);
  right.position.set(width / 2 + t / 2, height / 2, z);
  scene.add(right);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width + t * 2, t, d), frameMat);
  top.position.set(0, height + t / 2, z);
  scene.add(top);
}

// ドアノブ
function addDoorKnob(scene, width, height, z) {
  const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.position.set(-width / 2 + 0.3, height / 2, z + 0.05); // 左側に配置
  scene.add(knob);
}
