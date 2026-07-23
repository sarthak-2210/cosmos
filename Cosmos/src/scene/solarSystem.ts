import * as THREE from 'three';
import { BODIES, MOON, type CelestialBody } from '../data/planets';

export interface BodyMeshes {
  data: CelestialBody;
  group: THREE.Group;
  mesh: THREE.Mesh;
  orbitLine: THREE.Line;
  label: HTMLDivElement;
  /** mean anomaly at t=0 */
  phase: number;
}

export interface SolarSystem {
  root: THREE.Group;
  bodies: BodyMeshes[];
  sunMesh: THREE.Mesh;
  moonMesh: THREE.Mesh;
  moonOrbit: THREE.Group;
  asteroidBelt: THREE.Points;
  labelContainer: HTMLDivElement;
  setOrbitsVisible(v: boolean): void;
  setLabelsVisible(v: boolean): void;
  setAsteroidsVisible(v: boolean): void;
  update(elapsedDays: number, camera: THREE.Camera, canvas: HTMLCanvasElement): void;
  focusTarget(id: string): THREE.Vector3 | null;
  getBodyPosition(id: string): THREE.Vector3 | null;
}

function keplerPosition(
  semiMajor: number,
  ecc: number,
  meanAnomaly: number,
): { x: number; z: number } {
  // Solve Kepler's equation M = E - e sin E (Newton)
  let E = meanAnomaly;
  for (let i = 0; i < 6; i++) {
    E = E - (E - ecc * Math.sin(E) - meanAnomaly) / (1 - ecc * Math.cos(E));
  }
  const a = semiMajor;
  const x = a * (Math.cos(E) - ecc);
  const z = a * Math.sqrt(1 - ecc * ecc) * Math.sin(E);
  return { x, z };
}

function createOrbitLine(body: CelestialBody): THREE.Line {
  const segments = 128;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const M = (i / segments) * Math.PI * 2;
    const { x, z } = keplerPosition(body.distance, body.eccentricity, M);
    points.push(new THREE.Vector3(x, 0, z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
  });
  const line = new THREE.Line(geometry, material);
  line.name = `orbit-${body.id}`;
  return line;
}

function createPlanetMaterial(body: CelestialBody): THREE.Material {
  if (body.kind === 'star') {
    return new THREE.MeshBasicMaterial({
      color: body.color,
    });
  }

  const color = new THREE.Color(body.color);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: body.id === 'earth' || body.id === 'mars' ? 0.72 : 0.45,
    metalness: 0.08,
    emissive: color.clone().multiplyScalar(0.04),
  });
}

function createSunGlow(): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 240, 180, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 200, 80, 0.55)');
  gradient.addColorStop(0.55, 'rgba(255, 140, 40, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 100, 20, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.9,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(36, 36, 1);
  return sprite;
}

function createRings(body: CelestialBody): THREE.Mesh | null {
  if (!body.rings) return null;
  const { inner, outer, color, opacity } = body.rings;
  const geometry = new THREE.RingGeometry(
    body.radius * inner,
    body.radius * outer,
    96,
    1,
  );
  // Orient ring in XZ plane with double-sided faces
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const u = (dist - body.radius * inner) / (body.radius * (outer - inner));
    uv.setXY(i, u, 0.5);
  }

  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function createAsteroidBelt(inner = 56, outer = 68, count = 1800): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = inner + Math.random() * (outer - inner);
    const y = (Math.random() - 0.5) * 1.2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;

    c.setHSL(0.08, 0.15, 0.35 + Math.random() * 0.35);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createLabel(name: string, container: HTMLDivElement): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'body-label';
  el.textContent = name;
  container.appendChild(el);
  return el;
}

export function createSolarSystem(labelParent: HTMLElement): SolarSystem {
  const root = new THREE.Group();
  root.name = 'solarSystem';

  const labelContainer = document.createElement('div');
  labelContainer.id = 'label-layer';
  labelContainer.className = 'label-layer';
  labelParent.appendChild(labelContainer);

  const bodies: BodyMeshes[] = [];
  let sunMesh!: THREE.Mesh;

  for (const data of BODIES) {
    const group = new THREE.Group();
    group.name = data.id;

    const geometry = new THREE.SphereGeometry(data.radius, 48, 32);
    const material = createPlanetMaterial(data);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = data.tilt;
    group.add(mesh);

    if (data.kind === 'star') {
      sunMesh = mesh;
      const glow = createSunGlow();
      group.add(glow);

      // Inner corona sphere
      const coronaGeo = new THREE.SphereGeometry(data.radius * 1.15, 32, 24);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(coronaGeo, coronaMat));
    }

    const rings = createRings(data);
    if (rings) {
      mesh.add(rings);
    }

    // Subtle band for gas giants via second shell (cheap visual interest)
    if (data.id === 'jupiter' || data.id === 'saturn') {
      const bandGeo = new THREE.SphereGeometry(data.radius * 1.01, 48, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.16);
      const bandMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(data.color).offsetHSL(0, 0, -0.12),
        roughness: 0.5,
        metalness: 0.05,
      });
      mesh.add(new THREE.Mesh(bandGeo, bandMat));
    }

    // Earth oceans / land hint
    if (data.id === 'earth') {
      const cloudGeo = new THREE.SphereGeometry(data.radius * 1.02, 32, 24);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        roughness: 1,
      });
      mesh.add(new THREE.Mesh(cloudGeo, cloudMat));
    }

    let orbitLine: THREE.Line;
    if (data.distance > 0) {
      orbitLine = createOrbitLine(data);
      root.add(orbitLine);
      const { x, z } = keplerPosition(data.distance, data.eccentricity, Math.random() * Math.PI * 2);
      group.position.set(x, 0, z);
    } else {
      orbitLine = new THREE.Line();
      orbitLine.visible = false;
    }

    root.add(group);

    const phase = Math.random() * Math.PI * 2;
    const label = createLabel(data.name, labelContainer);

    bodies.push({ data, group, mesh, orbitLine, label, phase });
  }

  // Moon around Earth
  const earthBody = bodies.find((b) => b.data.id === 'earth')!;
  const moonOrbit = new THREE.Group();
  moonOrbit.name = 'moonOrbit';
  earthBody.group.add(moonOrbit);

  const moonGeo = new THREE.SphereGeometry(MOON.radius, 24, 16);
  const moonMat = new THREE.MeshStandardMaterial({
    color: MOON.color,
    roughness: 0.9,
    metalness: 0.05,
  });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.position.set(MOON.distance, 0, 0);
  moonOrbit.add(moonMesh);

  const asteroidBelt = createAsteroidBelt();
  asteroidBelt.name = 'asteroidBelt';
  root.add(asteroidBelt);

  const projected = new THREE.Vector3();

  function setOrbitsVisible(v: boolean): void {
    for (const b of bodies) {
      if (b.data.distance > 0) b.orbitLine.visible = v;
    }
  }

  function setLabelsVisible(v: boolean): void {
    labelContainer.style.display = v ? 'block' : 'none';
  }

  function setAsteroidsVisible(v: boolean): void {
    asteroidBelt.visible = v;
  }

  function update(elapsedDays: number, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    for (const b of bodies) {
      const { data, group, mesh, phase } = b;

      // Spin
      if (data.dayLength !== 0) {
        const spins = elapsedDays / data.dayLength;
        mesh.rotation.y = spins * Math.PI * 2;
      }

      // Orbit
      if (data.periodDays > 0) {
        const M = phase + (elapsedDays / data.periodDays) * Math.PI * 2;
        const { x, z } = keplerPosition(data.distance, data.eccentricity, M);
        group.position.set(x, 0, z);
      }

      // Label projection
      projected.copy(group.position);
      projected.y += data.radius + 1.2;
      projected.project(camera);

      const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;
      const behind = projected.z > 1;

      if (behind || x < -40 || y < -20 || x > canvas.clientWidth + 40 || y > canvas.clientHeight + 20) {
        b.label.style.opacity = '0';
      } else {
        b.label.style.opacity = '1';
        b.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      }
    }

    // Moon orbit
    const moonAngle = (elapsedDays / MOON.periodDays) * Math.PI * 2;
    moonOrbit.rotation.y = moonAngle;
    moonMesh.rotation.y = elapsedDays * Math.PI * 2 * 0.5;

    // Slow asteroid belt drift
    asteroidBelt.rotation.y = elapsedDays * 0.00015;
  }

  function getBodyPosition(id: string): THREE.Vector3 | null {
    if (id === 'moon') {
      const p = new THREE.Vector3();
      moonMesh.getWorldPosition(p);
      return p;
    }
    const b = bodies.find((x) => x.data.id === id);
    return b ? b.group.position.clone() : null;
  }

  function focusTarget(id: string): THREE.Vector3 | null {
    return getBodyPosition(id);
  }

  return {
    root,
    bodies,
    sunMesh,
    moonMesh,
    moonOrbit,
    asteroidBelt,
    labelContainer,
    setOrbitsVisible,
    setLabelsVisible,
    setAsteroidsVisible,
    update,
    focusTarget,
    getBodyPosition,
  };
}
