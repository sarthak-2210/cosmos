import * as THREE from 'three';

const ISLAND_RADIUS = 55;
const WATER_SIZE = 400;

export function createIsland(scene: THREE.Scene): {
  ground: THREE.Mesh;
  getHeight: (x: number, z: number) => number;
  isOnIsland: (x: number, z: number) => boolean;
  spawnPoints: THREE.Vector3[];
  trees: THREE.Object3D[];
} {
  // Procedural height via layered noise (deterministic, no textures needed)
  const heightAt = (x: number, z: number) => {
    const d = Math.hypot(x, z);
    if (d > ISLAND_RADIUS) return -2;
    const edge = 1 - THREE.MathUtils.smoothstep(ISLAND_RADIUS - 10, ISLAND_RADIUS, d);
    const n =
      Math.sin(x * 0.08) * Math.cos(z * 0.07) * 1.8 +
      Math.sin(x * 0.21 + 1.2) * Math.cos(z * 0.19) * 0.7 +
      Math.sin(x * 0.45) * Math.sin(z * 0.4) * 0.25;
    const beach = THREE.MathUtils.smoothstep(ISLAND_RADIUS - 14, ISLAND_RADIUS - 6, d);
    return (0.4 + n * 1.4) * edge * (1 - beach * 0.85) + beach * 0.15 * edge;
  };

  // Terrain
  const segments = 96;
  const geo = new THREE.PlaneGeometry(ISLAND_RADIUS * 2.2, ISLAND_RADIUS * 2.2, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, Math.max(y, -0.5));

    const d = Math.hypot(x, z);
    if (d > ISLAND_RADIUS - 8) {
      color.setHSL(0.1, 0.45, 0.55 + Math.random() * 0.08); // sand
    } else if (y > 2.2) {
      color.setHSL(0.28, 0.35, 0.28 + Math.random() * 0.05); // rocky green
    } else {
      color.setHSL(0.28 + Math.random() * 0.04, 0.55, 0.22 + Math.random() * 0.08); // grass
    }
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    }),
  );
  ground.receiveShadow = true;
  ground.castShadow = false;
  scene.add(ground);

  // Water
  const waterGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(
    waterGeo,
    new THREE.MeshStandardMaterial({
      color: 0x0a4a5c,
      roughness: 0.15,
      metalness: 0.55,
      transparent: true,
      opacity: 0.88,
    }),
  );
  water.position.y = 0.05;
  water.receiveShadow = true;
  scene.add(water);

  // Underwater dark plate
  const deep = new THREE.Mesh(
    new THREE.PlaneGeometry(WATER_SIZE * 1.2, WATER_SIZE * 1.2),
    new THREE.MeshBasicMaterial({ color: 0x021018 }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -1.5;
  scene.add(deep);

  // Shore foam ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 2.5, ISLAND_RADIUS + 1.5, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc8e8f0,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  scene.add(ring);

  // Rocks
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a5a52,
    roughness: 0.95,
    flatShading: true,
  });
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * (ISLAND_RADIUS - 16);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < 0.2) continue;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4 + Math.random() * 1.1, 0),
      rockMat,
    );
    rock.position.set(x, y + 0.2, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.set(
      0.7 + Math.random() * 0.8,
      0.5 + Math.random() * 0.7,
      0.7 + Math.random() * 0.8,
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // Palm trees & props
  const trees: THREE.Object3D[] = [];
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a2a,
    roughness: 0.9,
    flatShading: true,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1f6b2e,
    roughness: 0.75,
    flatShading: true,
  });
  const leafMat2 = new THREE.MeshStandardMaterial({
    color: 0x2d8a3e,
    roughness: 0.75,
    flatShading: true,
  });

  for (let i = 0; i < 42; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * (ISLAND_RADIUS - 14);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < 0.25) continue;

    const tree = new THREE.Group();
    const trunkH = 3.5 + Math.random() * 2.5;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, trunkH, 6),
      trunkMat,
    );
    trunk.position.y = trunkH / 2;
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Group();
    crown.position.y = trunkH;
    const fronds = 6 + Math.floor(Math.random() * 3);
    for (let f = 0; f < fronds; f++) {
      const frond = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 2.2 + Math.random(), 4),
        f % 2 === 0 ? leafMat : leafMat2,
      );
      frond.position.y = 0.2;
      frond.rotation.z = Math.PI / 2.4;
      frond.rotation.y = (f / fronds) * Math.PI * 2;
      frond.castShadow = true;
      crown.add(frond);
    }
    // coconut cluster
    const nut = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x3d2810, roughness: 0.85 }),
    );
    nut.position.y = 0.15;
    crown.add(nut);
    tree.add(crown);

    tree.position.set(x, y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    trees.push(tree);
  }

  // Crashed crate props near center
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x8b6914,
    roughness: 0.8,
    flatShading: true,
  });
  for (let i = 0; i < 6; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), crateMat);
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    crate.position.set(x, heightAt(x, z) + 0.45, z);
    crate.rotation.y = Math.random() * Math.PI;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
  }

  // Campfire glow near spawn
  const fireLight = new THREE.PointLight(0xff6622, 1.4, 18, 2);
  fireLight.position.set(2, 1.5, 2);
  scene.add(fireLight);

  const fireBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.9, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }),
  );
  fireBase.position.set(2, heightAt(2, 2) + 0.12, 2);
  scene.add(fireBase);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.1, 5),
    new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.85 }),
  );
  flame.position.set(2, heightAt(2, 2) + 0.85, 2);
  flame.name = 'campfire';
  scene.add(flame);

  // Spawn points around island edge (zombies)
  const spawnPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + Math.random() * 0.2;
    const r = ISLAND_RADIUS - 6 - Math.random() * 4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    spawnPoints.push(new THREE.Vector3(x, heightAt(x, z), z));
  }

  // Distant sky islands / rocks for depth
  const farMat = new THREE.MeshStandardMaterial({
    color: 0x1a3028,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 90 + Math.random() * 40;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(4 + Math.random() * 6, 0),
      farMat,
    );
    rock.position.set(Math.cos(a) * r, -1 + Math.random() * 3, Math.sin(a) * r);
    rock.scale.y = 0.5 + Math.random();
    scene.add(rock);
  }

  return {
    ground,
    getHeight: heightAt,
    isOnIsland: (x, z) => Math.hypot(x, z) < ISLAND_RADIUS - 1.5,
    spawnPoints,
    trees,
  };
}

export function createSky(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x0b1a22);
  scene.fog = new THREE.FogExp2(0x0b1a22, 0.012);

  // Gradient sky dome
  const skyGeo = new THREE.SphereGeometry(180, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1820) },
      midColor: { value: new THREE.Color(0x1a3040) },
      bottomColor: { value: new THREE.Color(0x3a2018) },
      offset: { value: 8 },
      exponent: { value: 0.55 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        vec3 col = mix(bottomColor, midColor, max(pow(max(h, 0.0), exponent), 0.0));
        col = mix(col, topColor, max(pow(max(h - 0.15, 0.0), 0.8), 0.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Stars
  const starCount = 800;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.65 + 0.05); // upper hemisphere
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPos, 3)),
    new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    }),
  );
  scene.add(stars);

  // Moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(4, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe8c0 }),
  );
  moon.position.set(-40, 55, -60);
  scene.add(moon);

  const moonLight = new THREE.DirectionalLight(0xc8d8ff, 0.55);
  moonLight.position.set(-40, 55, -60);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.near = 10;
  moonLight.shadow.camera.far = 160;
  moonLight.shadow.camera.left = -70;
  moonLight.shadow.camera.right = 70;
  moonLight.shadow.camera.top = 70;
  moonLight.shadow.camera.bottom = -70;
  moonLight.shadow.bias = -0.0005;
  scene.add(moonLight);

  const ambient = new THREE.AmbientLight(0x334455, 0.35);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x445566, 0x1a1008, 0.45);
  scene.add(hemi);

  // Warm horizon rim
  const rim = new THREE.DirectionalLight(0xff8844, 0.25);
  rim.position.set(20, 5, 40);
  scene.add(rim);

  return { moon, moonLight, stars, fireLight: null as THREE.PointLight | null };
}

export { ISLAND_RADIUS };
