import * as THREE from 'three';

export function createStarfield(count = 8000): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Spherical shell distribution
    const r = 400 + Math.random() * 900;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Star color temperature variation
    const temp = Math.random();
    if (temp < 0.15) {
      color.setHSL(0.6, 0.4, 0.85); // blue-white
    } else if (temp < 0.35) {
      color.setHSL(0.55, 0.2, 0.95); // cool white
    } else if (temp < 0.8) {
      color.setHSL(0.1, 0.05, 0.95); // pure white
    } else if (temp < 0.95) {
      color.setHSL(0.1, 0.55, 0.9); // warm yellow
    } else {
      color.setHSL(0.02, 0.7, 0.85); // orange-red
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = Math.random() < 0.08 ? 2.2 + Math.random() * 2 : 0.6 + Math.random() * 1.2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 1.4,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const stars = new THREE.Points(geometry, material);
  stars.name = 'starfield';
  stars.frustumCulled = false;
  return stars;
}

/** Soft milky-way band as a translucent torus of particles */
export function createMilkyWayBand(count = 2500): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 500 + (Math.random() - 0.5) * 180;
    const height = (Math.random() - 0.5) * 60 * (1 - Math.abs(Math.random() - 0.5) * 0.5);

    // Tilt the galactic plane
    const x = Math.cos(angle) * radius;
    const y = height + Math.sin(angle) * radius * 0.25;
    const z = Math.sin(angle) * radius * 0.85;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    color.setHSL(0.6 + Math.random() * 0.08, 0.35, 0.45 + Math.random() * 0.25);
    colors[i * 3] = color.r * 0.5;
    colors[i * 3 + 1] = color.g * 0.45;
    colors[i * 3 + 2] = color.b * 0.7;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const band = new THREE.Points(geometry, material);
  band.name = 'milkyway';
  band.frustumCulled = false;
  return band;
}
