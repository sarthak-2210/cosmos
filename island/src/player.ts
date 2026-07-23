import * as THREE from 'three';

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  readonly position = new THREE.Vector3(0, 2, 0);
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;

  health = 100;
  maxHealth = 100;
  ammo = 30;
  maxAmmo = 30;
  reloading = false;
  reloadTimer = 0;
  shootCooldown = 0;
  invuln = 0;
  onGround = false;
  alive = true;

  private readonly speed = 9;
  private readonly sprintMul = 1.55;
  private readonly jumpForce = 9.5;
  private readonly gravity = 28;
  private readonly eyeHeight = 1.7;
  private readonly radius = 0.45;

  private keys = new Set<string>();
  private pointerLocked = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.08, 220);
    this.camera.rotation.order = 'YXZ';
  }

  bindInput(dom: HTMLElement) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    dom.addEventListener('click', () => {
      if (!this.pointerLocked) dom.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === dom;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked || !this.alive) return;
      const sens = 0.0022;
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    });
  }

  get isPointerLocked() {
    return this.pointerLocked;
  }

  startReload() {
    if (this.reloading || this.ammo >= this.maxAmmo || !this.alive) return false;
    this.reloading = true;
    this.reloadTimer = 1.35;
    return true;
  }

  tryShoot(): boolean {
    if (!this.alive || this.reloading || this.shootCooldown > 0) return false;
    if (this.ammo <= 0) return false;
    this.ammo -= 1;
    this.shootCooldown = 0.14;
    if (this.ammo === 0) this.startReload();
    return true;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive || this.invuln > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invuln = 0.45;
    if (this.health <= 0) {
      this.alive = false;
      this.health = 0;
    }
    return true;
  }

  reset(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.ammo = this.maxAmmo;
    this.reloading = false;
    this.reloadTimer = 0;
    this.shootCooldown = 0;
    this.invuln = 0;
    this.alive = true;
    this.yaw = 0;
    this.pitch = 0;
  }

  update(
    dt: number,
    getHeight: (x: number, z: number) => number,
    isOnIsland: (x: number, z: number) => boolean,
  ) {
    if (!this.alive) {
      this.syncCamera();
      return;
    }

    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammo = this.maxAmmo;
      }
    }

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) wish.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) wish.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) wish.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) wish.sub(right);

    if (wish.lengthSq() > 0) wish.normalize();

    const sprint =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? this.sprintMul : 1;
    const targetSpeed = this.speed * sprint;
    const accel = this.onGround ? 40 : 12;

    this.velocity.x += (wish.x * targetSpeed - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (wish.z * targetSpeed - this.velocity.z) * Math.min(1, accel * dt);

    if (!this.onGround) {
      this.velocity.y -= this.gravity * dt;
    } else if (
      (this.keys.has('Space') || this.keys.has('KeyJ')) &&
      this.velocity.y <= 0.1
    ) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }

    // Integrate
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // Soft island boundary
    if (!isOnIsland(this.position.x, this.position.z)) {
      const len = Math.hypot(this.position.x, this.position.z) || 1;
      const maxR = 53.5;
      this.position.x = (this.position.x / len) * maxR;
      this.position.z = (this.position.z / len) * maxR;
      this.velocity.x *= -0.3;
      this.velocity.z *= -0.3;
    }

    const groundY = getHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY + 0.02) {
      this.position.y = groundY;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Simple rock/tree soft collision — keep player from sinking weirdly near edges of height field
    if (this.position.y < groundY) this.position.y = groundY;

    this.syncCamera();
  }

  private syncCamera() {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z,
    );
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  getShootOrigin() {
    return this.camera.position.clone();
  }

  getShootDirection() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  get radiusVal() {
    return this.radius;
  }
}
