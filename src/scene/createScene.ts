import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  sunLight: THREE.PointLight;
}

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040a);
  scene.fog = new THREE.FogExp2(0x02040a, 0.0012);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    5000,
  );
  camera.position.set(0, 55, 95);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12;
  controls.maxDistance = 450;
  controls.enablePan = true;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI * 0.92;

  // Soft ambient so dark sides remain faintly visible
  const ambient = new THREE.AmbientLight(0x1a2040, 0.18);
  scene.add(ambient);

  // Hemisphere for subtle space gradient lighting
  const hemi = new THREE.HemisphereLight(0x304060, 0x080810, 0.25);
  scene.add(hemi);

  // Primary illumination from the sun
  const sunLight = new THREE.PointLight(0xfff2d0, 2.8, 600, 0.6);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  // Subtle fill from opposite side
  const fill = new THREE.DirectionalLight(0x4466aa, 0.08);
  fill.position.set(-80, 40, -60);
  scene.add(fill);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, controls, sunLight };
}
