import './style.css';
import * as THREE from 'three';
import { createIsland, createSky } from './island';
import { Player } from './player';
import { Zombie } from './zombie';
import { BloodBursts, BulletTracers, MuzzleFlash, WeaponView } from './effects';
import { GameAudio } from './audio';

// ——— DOM ———
const canvas = document.getElementById('game') as HTMLCanvasElement;
const menu = document.getElementById('menu')!;
const gameover = document.getElementById('gameover')!;
const hud = document.getElementById('hud')!;
const startBtn = document.getElementById('start-btn')!;
const retryBtn = document.getElementById('retry-btn')!;
const waveVal = document.getElementById('wave-val')!;
const killsVal = document.getElementById('kills-val')!;
const aliveVal = document.getElementById('alive-val')!;
const healthFill = document.getElementById('health-fill')!;
const healthVal = document.getElementById('health-val')!;
const ammoVal = document.getElementById('ammo-val')!;
const reloadHint = document.getElementById('reload-hint')!;
const waveBanner = document.getElementById('wave-banner')!;
const hitMarker = document.getElementById('hit-marker')!;
const damageVignette = document.getElementById('damage-vignette')!;
const killFeed = document.getElementById('kill-feed')!;
const finalStats = document.getElementById('final-stats')!;

// ——— Renderer ———
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
createSky(scene);
const island = createIsland(scene);

const player = new Player(window.innerWidth / window.innerHeight);
player.bindInput(canvas);

const audio = new GameAudio();
const muzzle = new MuzzleFlash(scene);
const tracers = new BulletTracers(scene);
const blood = new BloodBursts(scene);
const weapon = new WeaponView(player.camera);

// Campfire flicker target
const campfire = scene.getObjectByName('campfire') as THREE.Mesh | undefined;

// ——— Game state ———
let running = false;
let wave = 0;
let kills = 0;
let zombies: Zombie[] = [];
let pendingSpawns = 0;
let spawnTimer = 0;
let betweenWaves = false;
let wavePause = 0;
let hitMarkerTimer = 0;
let damageFlash = 0;
let clock = new THREE.Clock();
let bannerTimer = 0;

function showBanner(text: string, ms = 2200) {
  waveBanner.textContent = text;
  waveBanner.classList.remove('hidden');
  bannerTimer = ms / 1000;
}

function addFeed(text: string) {
  const el = document.createElement('div');
  el.className = 'feed-item';
  el.textContent = text;
  killFeed.prepend(el);
  setTimeout(() => el.remove(), 2800);
  while (killFeed.children.length > 5) killFeed.lastChild?.remove();
}

function clearZombies() {
  for (const z of zombies) {
    scene.remove(z.mesh);
    z.dispose();
  }
  zombies = [];
}

function startWave(n: number) {
  wave = n;
  betweenWaves = false;
  pendingSpawns = 4 + n * 3;
  spawnTimer = 0.4;
  audio.wave();
  showBanner(n === 1 ? 'WAVE 1 — THEY RISE' : `WAVE ${n}`);
  addFeed(`Wave ${n} inbound`);
  updateHud();
}

function spawnZombie() {
  const pts = island.spawnPoints;
  // Prefer spawns away from player
  let best = pts[0];
  let bestScore = -1;
  for (let i = 0; i < 6; i++) {
    const p = pts[Math.floor(Math.random() * pts.length)];
    const d = p.distanceTo(player.position);
    if (d > bestScore) {
      bestScore = d;
      best = p;
    }
  }
  const z = new Zombie(best, wave);
  scene.add(z.mesh);
  zombies.push(z);
}

function beginGame() {
  menu.classList.add('hidden');
  gameover.classList.add('hidden');
  hud.classList.remove('hidden');
  audio.resume();
  clearZombies();
  kills = 0;
  wave = 0;
  player.reset(0, island.getHeight(0, 0), 4);
  running = true;
  clock.start();
  canvas.requestPointerLock();
  startWave(1);
}

function endGame() {
  running = false;
  document.exitPointerLock();
  audio.death();
  hud.classList.add('hidden');
  gameover.classList.remove('hidden');
  finalStats.innerHTML = `Reached <strong>Wave ${wave}</strong> · <strong>${kills}</strong> kills<br/>The island claims another soul.`;
}

function updateHud() {
  waveVal.textContent = String(wave);
  killsVal.textContent = String(kills);
  aliveVal.textContent = String(zombies.filter((z) => z.isAlive).length + pendingSpawns);
  healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
  healthVal.textContent = String(Math.ceil(player.health));
  ammoVal.textContent = String(player.ammo);
  ammoVal.classList.toggle('low', player.ammo <= 8);
  reloadHint.textContent = player.reloading
    ? 'RELOADING…'
    : player.ammo === 0
      ? 'PRESS R'
      : '';
}

function shoot() {
  if (!running || !player.alive || !player.isPointerLocked) return;

  if (player.ammo <= 0 && !player.reloading) {
    audio.empty();
    return;
  }

  if (!player.tryShoot()) {
    if (player.reloading) return;
    return;
  }

  audio.shoot();
  weapon.recoil();

  const origin = player.getShootOrigin();
  const dir = player.getShootDirection();
  muzzle.trigger(origin, dir);

  // Hitscan
  const ray = new THREE.Raycaster(origin, dir, 0, 80);
  let hitSomething = false;
  let hitPoint = origin.clone().add(dir.clone().multiplyScalar(60));

  let closest: { z: Zombie; dist: number; point: THREE.Vector3 } | null = null;

  for (const z of zombies) {
    if (!z.isAlive) continue;
    const box = z.getHitBox();
    const target = new THREE.Vector3();
    if (ray.ray.intersectBox(box, target)) {
      const dist = origin.distanceTo(target);
      if (!closest || dist < closest.dist) {
        closest = { z, dist, point: target.clone() };
      }
    }
  }

  // Headshot check: higher Y = more damage
  if (closest) {
    hitSomething = true;
    hitPoint = closest.point;
    const headshot = closest.point.y > closest.z.position.y + 1.65;
    const dmg = headshot ? 55 : 28;
    const result = closest.z.takeDamage(dmg);
    blood.spawn(closest.point, headshot ? 14 : 8);
    hitMarkerTimer = 0.12;
    hitMarker.classList.add('active');

    if (result === 'kill') {
      kills += 1;
      audio.kill();
      addFeed(headshot ? 'HEADSHOT ☠' : 'Zombie down');
    } else if (result === 'hit') {
      audio.hit();
    }
  }

  tracers.add(origin.clone().add(dir.clone().multiplyScalar(0.5)), hitPoint);
  updateHud();
  void hitSomething;
}

// Input: shoot / reload hooks
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) shoot();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && running) {
    if (player.startReload()) audio.reload();
  }
});

startBtn.addEventListener('click', () => beginGame());
retryBtn.addEventListener('click', () => beginGame());

window.addEventListener('resize', () => {
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ——— Loop ———
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Idle scene animation even on menu
  if (campfire) {
    const s = 0.9 + Math.sin(performance.now() * 0.012) * 0.15;
    campfire.scale.set(s, 1 + Math.sin(performance.now() * 0.02) * 0.2, s);
    (campfire.material as THREE.MeshBasicMaterial).opacity =
      0.7 + Math.sin(performance.now() * 0.025) * 0.2;
  }

  muzzle.update(dt);
  tracers.update(dt);
  blood.update(dt);

  if (bannerTimer > 0) {
    bannerTimer -= dt;
    if (bannerTimer <= 0) waveBanner.classList.add('hidden');
  }

  if (hitMarkerTimer > 0) {
    hitMarkerTimer -= dt;
    if (hitMarkerTimer <= 0) hitMarker.classList.remove('active');
  }

  if (damageFlash > 0) {
    damageFlash -= dt;
    damageVignette.classList.toggle('active', damageFlash > 0);
  }

  if (!running) {
    // Gentle orbit on menu
    const t = performance.now() * 0.00015;
    player.camera.position.set(Math.sin(t) * 28, 12, Math.cos(t) * 28);
    player.camera.lookAt(0, 1, 0);
    renderer.render(scene, player.camera);
    return;
  }

  player.update(dt, island.getHeight, island.isOnIsland);

  const moving = player.velocity.lengthSq() > 1 && player.onGround;
  weapon.update(dt, moving, false);

  // Spawning
  if (pendingSpawns > 0) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnZombie();
      pendingSpawns -= 1;
      spawnTimer = Math.max(0.35, 1.1 - wave * 0.05);
      updateHud();
    }
  }

  // Zombies
  for (const z of zombies) {
    if (z.state === 'dead') continue;
    const { attacked } = z.update(dt, player.position, island.getHeight);
    if (attacked && player.alive) {
      if (player.takeDamage(z.damage)) {
        audio.hurt();
        damageFlash = 0.35;
        damageVignette.classList.add('active');
        updateHud();
        if (!player.alive) endGame();
      }
    }
  }

  // Cleanup dead
  zombies = zombies.filter((z) => {
    if (z.state === 'dead') {
      scene.remove(z.mesh);
      z.dispose();
      return false;
    }
    return true;
  });

  // Next wave
  if (
    running &&
    player.alive &&
    pendingSpawns === 0 &&
    zombies.every((z) => !z.isAlive) &&
    zombies.length === 0 &&
    !betweenWaves
  ) {
    betweenWaves = true;
    wavePause = 2.5;
    showBanner('WAVE CLEARED');
    addFeed('Breathing room…');
  }

  if (betweenWaves) {
    wavePause -= dt;
    if (wavePause <= 0) {
      startWave(wave + 1);
    }
  }

  // Auto-reload SFX when reload finishes (detect via HUD)
  updateHud();

  renderer.render(scene, player.camera);
}

// Initial camera for menu
player.camera.position.set(18, 10, 22);
player.camera.lookAt(0, 1, 0);
clock.start();
tick();
