import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupCameraControls(camera, renderer, controlsTargetY, floor, scene) {
  console.log('[cameraControls] called');

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.mouseButtons.RIGHT = null;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = -0.1;
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, controlsTargetY, 0);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let moveStart = null;
  let moveFrom = new THREE.Vector3();
  let moveTo = new THREE.Vector3();
  const moveDuration = 0.6;
  let isClick = false;
  let clickStartTime = 0;

  // パネルの前後移動のための記録
  let lastPanel = null;
  let lastCameraPos = new THREE.Vector3();
  let lastCameraTarget = new THREE.Vector3();

  // カメラが移動中に向く方向（通常は移動前に見ていた方向）
  let currentLookAt = new THREE.Vector3();

  // 後退時に移動完了後に変更すべき注視点
  let pendingTarget = null;

  function moveCameraTo(lookAtPos, offsetDirection = null, distance = 0.5, isReturn = false) {
    const direction = offsetDirection
      ? offsetDirection.clone().normalize()
      : new THREE.Vector3().subVectors(camera.position, lookAtPos).normalize();

    const newCamPos = lookAtPos.clone().addScaledVector(direction, distance);
    newCamPos.y = camera.position.y;

    if (isReturn) {
      // 後退：今の向きを保って戻り、到着後に注視点変更
      currentLookAt.copy(controls.target);
      pendingTarget = lookAtPos.clone();
    } else {
      // 前進：先に注視点を設定し、その方向を向いて移動
      controls.target.copy(lookAtPos);
      currentLookAt.copy(lookAtPos);
      pendingTarget = null;
    }

    moveStart = performance.now() / 1000;
    moveFrom.copy(camera.position);
    moveTo.copy(newCamPos);
  }

  window.addEventListener('mousedown', () => {
    isClick = true;
    clickStartTime = performance.now();
  });

  window.addEventListener('mousemove', () => {
    if (performance.now() - clickStartTime > 200) isClick = false;
  });

  window.addEventListener('mouseup', (event) => {
    if (!isClick) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // パネルクリック処理
    const panels = scene.userData.clickablePanels || [];
    const hits = raycaster.intersectObjects(panels);
    if (hits.length > 0) {
      const panel = hits[0].object;

      if (lastPanel === panel) {
        // 同じパネルを再クリック → 後退
        moveCameraTo(lastCameraTarget, null, 0, true); // 第4引数 true → 後退
        moveTo.copy(lastCameraPos);
        lastPanel = null;
        return;
      }

      // 新しいパネルをクリック → 前進
      lastPanel = panel;
      lastCameraPos.copy(camera.position);
      lastCameraTarget.copy(controls.target);

      const panelCenter = new THREE.Vector3();
      panel.getWorldPosition(panelCenter);

      const panelNormal = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(panel.quaternion)
        .normalize();

      const lookAtPos = panelCenter.clone().addScaledVector(panelNormal, -1);
      moveCameraTo(lookAtPos, panelNormal, -0.5); // 第4引数省略 → 前進
      return;
    }

    // 床クリック処理
    const floorHits = raycaster.intersectObject(floor);
    if (floorHits.length > 0) {
      const clicked = floorHits[0].point;
      const wallLimit = scene.userData.wallWidth / 2 - 0.5;
      if (Math.abs(clicked.x) > wallLimit || Math.abs(clicked.z) > wallLimit) return;

      const lookAtPos = new THREE.Vector3(clicked.x, controls.target.y, clicked.z);
      const offsetDir = new THREE.Vector3().subVectors(lookAtPos, camera.position).normalize();
      moveCameraTo(lookAtPos, offsetDir, -0.5);
      lastPanel = null;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    controls,
    animateCamera: () => {
      if (moveStart !== null) {
        const now = performance.now() / 1000;
        const elapsed = now - moveStart;
        const t = Math.min(elapsed / moveDuration, 1);

        camera.position.lerpVectors(moveFrom, moveTo, t);
        camera.lookAt(currentLookAt); // 移動中は元の方向を見る

        if (t >= 1) {
          moveStart = null;

          if (pendingTarget) {
            controls.target.copy(pendingTarget);
            camera.lookAt(pendingTarget);
            pendingTarget = null;
          } else {
            camera.lookAt(controls.target);
          }
        }
      }
    },
  };
}
