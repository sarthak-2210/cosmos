import * as THREE from 'three';
import { createScene } from './scene/createScene';
import { createStarfield, createMilkyWayBand } from './scene/starfield';
import { createSolarSystem } from './scene/solarSystem';
import { SimulationTime } from './systems/time';
import { HUD } from './ui/hud';
import './style.css';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;

const { scene, camera, renderer, controls } = createScene(canvas);

// Deep space
scene.add(createStarfield(9000));
scene.add(createMilkyWayBand(2800));

// Solar system
const solarSystem = createSolarSystem(app);
scene.add(solarSystem.root);

// Simulation clock
const time = new SimulationTime();
time.daysPerSecond = 60;

// Smooth camera focus
const focusState = {
  active: false,
  target: new THREE.Vector3(),
  cameraGoal: new THREE.Vector3(),
  bodyId: 'sun',
};

function focusOnBody(id: string): void {
  const pos = solarSystem.focusTarget(id);
  if (!pos) return;

  focusState.bodyId = id;
  focusState.active = true;
  focusState.target.copy(pos);

  const body = solarSystem.bodies.find((b) => b.data.id === id);
  const radius = body?.data.radius ?? 2;
  const dist = Math.max(radius * 8, 18);

  // Offset camera relative to current view direction
  const dir = new THREE.Vector3()
    .subVectors(camera.position, controls.target)
    .normalize();
  if (dir.lengthSq() < 0.01) dir.set(0.4, 0.35, 0.85).normalize();

  focusState.cameraGoal.copy(pos).addScaledVector(dir, dist);
}

const hud = new HUD(time, {
  onSpeedChange: (days) => {
    time.setDaysPerSecond(days);
    if (days === 0) time.pause();
  },
  onPlayPause: () => time.togglePlay(),
  onReset: () => time.reset(),
  onToggleOrbits: (v) => solarSystem.setOrbitsVisible(v),
  onToggleLabels: (v) => solarSystem.setLabelsVisible(v),
  onToggleAsteroids: (v) => solarSystem.setAsteroidsVisible(v),
  onFocusBody: focusOnBody,
});

// Click-to-select on canvas (raycast)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener('pointerdown', (event) => {
  // Only primary button; ignore if user is dragging heavily
  if (event.button !== 0) return;

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const meshes = solarSystem.bodies.map((b) => b.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length > 0) {
    const mesh = hits[0].object;
    const body = solarSystem.bodies.find((b) => b.mesh === mesh);
    if (body) {
      hud.selectBody(body.data.id);
    }
  }
});

// Animation loop
const clock = new THREE.Clock();
const smoothTarget = new THREE.Vector3();
const smoothCam = new THREE.Vector3();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  time.tick(delta);

  solarSystem.update(time.elapsedDays, camera, canvas);

  // Keep focus locked to moving body
  if (focusState.active) {
    const pos = solarSystem.getBodyPosition(focusState.bodyId);
    if (pos) {
      focusState.target.copy(pos);
      // Soft follow: only ease target; leave user free after arrival
      smoothTarget.lerp(focusState.target, 1 - Math.pow(0.001, delta));
      controls.target.lerp(smoothTarget, 0.12);

      if (focusState.cameraGoal.lengthSq() > 0) {
        smoothCam.lerp(focusState.cameraGoal, 1 - Math.pow(0.002, delta));
        camera.position.lerp(smoothCam, 0.08);

        if (camera.position.distanceTo(focusState.cameraGoal) < 0.5) {
          focusState.cameraGoal.set(0, 0, 0);
        }
      }
    }
  }

  controls.update();
  renderer.render(scene, camera);

  hud.refreshTime();
  hud.tickFps();
}

// Initial gentle framing
controls.target.set(0, 0, 0);
smoothTarget.set(0, 0, 0);
smoothCam.copy(camera.position);

animate();
