import * as THREE from 'three';

export class MuzzleFlash {
  private light: THREE.PointLight;
  private mesh: THREE.Mesh;
  private t = 0;

  constructor(scene: THREE.Scene) {
    this.light = new THREE.PointLight(0xffaa44, 0, 12, 2);
    scene.add(this.light);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0 }),
    );
    scene.add(this.mesh);
  }

  trigger(origin: THREE.Vector3, dir: THREE.Vector3) {
    const p = origin.clone().add(dir.clone().multiplyScalar(0.6));
    this.light.position.copy(p);
    this.mesh.position.copy(p);
    this.light.intensity = 4;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
    this.t = 0.06;
  }

  update(dt: number) {
    if (this.t <= 0) {
      this.light.intensity = 0;
      (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      return;
    }
    this.t -= dt;
    this.light.intensity = Math.max(0, 4 * (this.t / 0.06));
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.t / 0.06);
  }
}

export class BulletTracers {
  private lines: { line: THREE.Line; life: number }[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  add(from: THREE.Vector3, to: THREE.Vector3) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.lines.push({ line, life: 0.07 });
  }

  update(dt: number) {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const item = this.lines[i];
      item.life -= dt;
      (item.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, item.life / 0.07);
      if (item.life <= 0) {
        this.scene.remove(item.line);
        item.line.geometry.dispose();
        (item.line.material as THREE.Material).dispose();
        this.lines.splice(i, 1);
      }
    }
  }
}

export class BloodBursts {
  private particles: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(pos: THREE.Vector3, count = 8) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4),
        new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x8b0000 : 0x4a1020,
        }),
      );
      mesh.position.copy(pos);
      mesh.position.y += 1 + Math.random() * 0.6;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 4,
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.4 + Math.random() * 0.3 });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(Math.max(0.01, p.life * 2));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}

export class WeaponView {
  readonly group = new THREE.Group();
  private kick = 0;
  private bobT = 0;

  constructor(camera: THREE.Camera) {
    // Simple low-poly rifle attached to camera
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a28,
      roughness: 0.6,
      metalness: 0.4,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.85,
    });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.55), bodyMat);
    receiver.position.set(0.22, -0.22, -0.45);
    this.group.add(receiver);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.55, 8),
      bodyMat,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.22, -0.18, -0.85);
    this.group.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.28), woodMat);
    stock.position.set(0.22, -0.26, -0.18);
    this.group.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), bodyMat);
    mag.position.set(0.22, -0.34, -0.4);
    this.group.add(mag);

    camera.add(this.group);
  }

  recoil() {
    this.kick = 1;
  }

  update(dt: number, moving: boolean, sprinting: boolean) {
    this.kick = Math.max(0, this.kick - dt * 8);
    this.bobT += dt * (moving ? (sprinting ? 14 : 10) : 2);
    const bob = moving ? Math.sin(this.bobT) * 0.012 : Math.sin(this.bobT) * 0.004;
    const bobY = moving ? Math.abs(Math.cos(this.bobT)) * 0.01 : 0;
    this.group.position.set(bob, bobY - this.kick * 0.04, this.kick * 0.06);
    this.group.rotation.x = -this.kick * 0.08;
  }
}
