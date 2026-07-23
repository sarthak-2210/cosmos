import * as THREE from 'three';

export type ZombieState = 'idle' | 'chase' | 'attack' | 'dying' | 'dead';

export class Zombie {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  health: number;
  maxHealth: number;
  state: ZombieState = 'idle';
  speed: number;
  damage: number;
  attackRange = 1.7;
  attackCooldown = 0;
  hitFlash = 0;
  deathTimer = 0;
  private bob = Math.random() * Math.PI * 2;
  private bodyMat: THREE.MeshStandardMaterial;
  private headMat: THREE.MeshStandardMaterial;
  private leftArm: THREE.Object3D;
  private rightArm: THREE.Object3D;
  private leftLeg: THREE.Object3D;
  private rightLeg: THREE.Object3D;

  constructor(pos: THREE.Vector3, wave: number) {
    this.position = pos.clone();
    this.maxHealth = 40 + wave * 12;
    this.health = this.maxHealth;
    this.speed = 2.4 + Math.min(wave * 0.22, 3.2) + Math.random() * 0.4;
    this.damage = 8 + wave * 1.5;

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3d5a3a,
      roughness: 0.9,
      flatShading: true,
    });
    this.headMat = new THREE.MeshStandardMaterial({
      color: 0x6a8a55,
      roughness: 0.85,
      flatShading: true,
    });

    this.mesh = new THREE.Group();

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), this.bodyMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.mesh.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), this.headMat);
    head.position.y = 1.9;
    head.castShadow = true;
    this.mesh.add(head);

    // Glowing eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), eyeMat);
    eyeL.position.set(-0.12, 1.95, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    this.mesh.add(eyeL, eyeR);

    const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    this.leftArm = new THREE.Mesh(armGeo, this.bodyMat);
    this.leftArm.position.set(-0.52, 1.35, 0.1);
    this.leftArm.rotation.x = -0.8;
    ;(this.leftArm as THREE.Mesh).castShadow = true;
    this.rightArm = new THREE.Mesh(armGeo, this.bodyMat.clone());
    this.rightArm.position.set(0.52, 1.35, 0.1);
    this.rightArm.rotation.x = -0.9;
    ;(this.rightArm as THREE.Mesh).castShadow = true;
    this.mesh.add(this.leftArm, this.rightArm);

    const legGeo = new THREE.BoxGeometry(0.26, 0.7, 0.26);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a28,
      roughness: 0.95,
      flatShading: true,
    });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.18, 0.35, 0);
    this.rightLeg = new THREE.Mesh(legGeo, legMat.clone());
    this.rightLeg.position.set(0.18, 0.35, 0);
    this.mesh.add(this.leftLeg, this.rightLeg);

    // Ragged shoulder spike for variety
    if (Math.random() > 0.5) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.4, 4),
        new THREE.MeshStandardMaterial({ color: 0x4a2020, flatShading: true }),
      );
      spike.position.set(0.25, 1.65, -0.05);
      spike.rotation.z = -0.6;
      this.mesh.add(spike);
    }

    this.mesh.position.copy(this.position);
    this.state = 'chase';
  }

  get isAlive() {
    return this.state !== 'dead' && this.state !== 'dying';
  }

  takeDamage(amount: number): 'hit' | 'kill' | 'none' {
    if (!this.isAlive) return 'none';
    this.health -= amount;
    this.hitFlash = 0.12;
    if (this.health <= 0) {
      this.state = 'dying';
      this.deathTimer = 0.7;
      return 'kill';
    }
    return 'hit';
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    getHeight: (x: number, z: number) => number,
  ): { attacked: boolean } {
    let attacked = false;

    if (this.state === 'dead') return { attacked };

    if (this.state === 'dying') {
      this.deathTimer -= dt;
      this.mesh.rotation.x += dt * 2.5;
      this.mesh.position.y = getHeight(this.position.x, this.position.z) + this.deathTimer * 0.2;
      this.mesh.scale.setScalar(Math.max(0.01, this.deathTimer / 0.7));
      if (this.deathTimer <= 0) {
        this.state = 'dead';
        this.mesh.visible = false;
      }
      return { attacked };
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.bob += dt * (this.state === 'chase' ? 8 : 3);

    // Flash white on hit
    const flash = this.hitFlash > 0;
    this.bodyMat.emissive = new THREE.Color(flash ? 0x884444 : 0x000000);
    this.headMat.emissive = new THREE.Color(flash ? 0xaa3333 : 0x111100);

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist < this.attackRange) {
      this.state = 'attack';
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 1.05;
        attacked = true;
        // Lunge arms
        this.leftArm.rotation.x = -1.6;
        this.rightArm.rotation.x = -1.7;
      }
    } else {
      this.state = 'chase';
      if (dist > 0.01) {
        toPlayer.normalize();
        this.position.x += toPlayer.x * this.speed * dt;
        this.position.z += toPlayer.z * this.speed * dt;
      }
    }

    // Face player
    this.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    // Walk cycle
    const swing = Math.sin(this.bob) * 0.55;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    if (this.state === 'chase') {
      this.leftArm.rotation.x = -0.7 + swing * 0.4;
      this.rightArm.rotation.x = -0.8 - swing * 0.4;
    }

    const groundY = getHeight(this.position.x, this.position.z);
    this.position.y = groundY;
    this.mesh.position.set(
      this.position.x,
      this.position.y + Math.abs(Math.sin(this.bob)) * 0.04,
      this.position.z,
    );

    return { attacked };
  }

  getHitBox(): THREE.Box3 {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + 1.1, this.position.z),
      new THREE.Vector3(0.9, 2.2, 0.9),
    );
  }

  dispose() {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
