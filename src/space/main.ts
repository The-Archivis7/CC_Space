/**
 * CC Space — 3D space shooter (original: index.html inline script).
 *
 * Type-safe port of the original game logic. All gameplay numbers, mechanics
 * and visual behavior are identical to the pre-refactor version.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Game Bounds ---
const BOUNDS = { width: 800, height: 600 };

// --- DOM helpers ---
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} element`);
  return el as T;
}

// --- UI References ---
const scoreEl = byId<HTMLSpanElement>('score');
const livesEl = byId<HTMLElement>('lives');
const bossesBeatenEl = byId<HTMLSpanElement>('bosses-beaten');
const gameOverModal = byId<HTMLDivElement>('game-over-modal');
const gameSelectModal = byId<HTMLDivElement>('game-select-modal');
const attributionModal = byId<HTMLDivElement>('attribution-modal');
const finalScoreEl = byId<HTMLSpanElement>('final-score');
const restartBtn = byId<HTMLButtonElement>('restart');
const upgradeBtn = byId<HTMLButtonElement>('upgrade-btn');
const menuBtn = byId<HTMLButtonElement>('menu-btn');
const gameOverMenuBtn = byId<HTMLButtonElement>('game-over-menu-btn');
const attributionBtn = byId<HTMLButtonElement>('attribution-btn');
const closeAttributionBtn = byId<HTMLButtonElement>('close-attribution-btn');
const upgradeMenu = byId<HTMLDivElement>('upgrade-menu');
const closeUpgradeBtn = byId<HTMLButtonElement>('close-upgrade');
const bossWarningEl = byId<HTMLDivElement>('boss-warning');
const launchSpaceBtn = byId<HTMLButtonElement>('launch-space-btn');
const launchRogueBtn = byId<HTMLButtonElement>('launch-rogue-btn');
const launchWizardBtn = byId<HTMLButtonElement>('launch-wizard-btn');
const launchMechBtn = byId<HTMLButtonElement>('launch-mech-btn');
// --- State Variables ---
let score = 0;
let lives = 3;
let maxLives = 3;
let bossesBeaten = 0;
let gameRunning = false;
let gameInitialized = false;
let lastShotTime = 0;
let bulletCooldown = 200;
let enemyBulletCooldown = 1800;
let totalUpgrades = 0;
let screenShakeTime = 0;

interface UpgradeCost {
  level: number;
  cost: number;
}

type UpgradeKey =
  | 'firingSpeed'
  | 'health'
  | 'movementSpeed'
  | 'bulletSpeed'
  | 'shield'
  | 'multiShot';

const upgrades: Record<UpgradeKey, UpgradeCost> = {
  firingSpeed: { level: 0, cost: 50 },
  health: { level: 0, cost: 100 },
  movementSpeed: { level: 0, cost: 75 },
  bulletSpeed: { level: 0, cost: 80 },
  shield: { level: 0, cost: 150 },
  multiShot: { level: 0, cost: 200 },
};

let shieldActive = false;
let shieldEndTime = 0;
let baseBulletSpeed = 12;

const keys: Record<string, boolean> = {};

// --- Boss Sequence & Scaling State ---
let currentBossType = 0;
let nextBossSpawnTime = Date.now() + 25000;
let bossSpawned = false;
let bossClearCount = 0;

// --- Entities ---
interface RectEntity {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerBullet extends RectEntity {
  vx: number;
  vy: number;
  mesh: THREE.Mesh;
}

interface Enemy extends RectEntity {
  speed: number;
  type: 'normal' | 'special';
  mesh: THREE.Mesh;
  lastShot: number;
}

interface EnemyBullet extends RectEntity {
  vx: number;
  vy: number;
  mesh: THREE.Mesh;
}

interface PlayerShip {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  mesh: THREE.Group | null;
  shieldMesh: THREE.Mesh | null;
  thrusterOuterMesh: THREE.Mesh | null;
  thrusterInnerMesh: THREE.Mesh | null;
  thrusterCoreMesh: THREE.Mesh | null;
}

// --- Boss types ---
interface BossBase {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  phase: 1 | 2 | 3;
  group: THREE.Group;
  lastAttack: number;
  attackTimer: number;
}

interface SentinelBoss extends BossBase {
  type: 0;
  frameMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  beamCharging: boolean;
  beamFiring: boolean;
  vx: number;
}

interface DreadnoughtBoss extends BossBase {
  type: 1;
  hullMesh: THREE.Mesh;
  leftCannon: THREE.Mesh;
  rightCannon: THREE.Mesh;
  coreMesh: THREE.Mesh;
  vx: number;
  dashTargetX: number;
}

interface WeaverBoss extends BossBase {
  type: 2;
  coreMesh: THREE.Mesh;
  innerMesh: THREE.Mesh;
  drones: THREE.Mesh[];
  vx: number;
  droneAngle: number;
}

type Boss = SentinelBoss | DreadnoughtBoss | WeaverBoss;

// --- Three.js & WebGL Bloom Setup ---
const container = byId<HTMLDivElement>('game-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02040a, 0.001);

const camera = new THREE.OrthographicCamera(
  -BOUNDS.width / 2, BOUNDS.width / 2,
  BOUNDS.height / 2, -BOUNDS.height / 2,
  0.1, 1000
);
camera.position.z = 500;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(BOUNDS.width, BOUNDS.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
container.appendChild(renderer.domElement);

// Bloom Post-Processing Pipeline
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(BOUNDS.width, BOUNDS.height),
  2.0,
  0.4,
  0.1
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// --- Dynamic Background Starfield ---
const starCount = 200;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
const starSpeeds: number[] = [];

for (let i = 0; i < starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * BOUNDS.width;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * BOUNDS.height;
  starPositions[i * 3 + 2] = -50 - Math.random() * 200;
  starSpeeds.push(1 + Math.random() * 3);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 2.5, transparent: true, opacity: 0.8 });
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// --- Particle System for Explosions & Exhaust Trail ---
const maxParticles = 500;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(maxParticles * 3);
const particleVelocities: THREE.Vector3[] = [];
const particleLifes = new Float32Array(maxParticles);
const particleColors = new Float32Array(maxParticles * 3);

for (let i = 0; i < maxParticles; i++) {
  particleVelocities.push(new THREE.Vector3());
  particleLifes[i] = 0;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

const particleMat = new THREE.PointsMaterial({
  size: 6,
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
});
const particleSystem = new THREE.Points(particleGeo, particleMat);
scene.add(particleSystem);

function triggerExplosion(x: number, y: number, colorHex = 0xffaa00, count = 25, spreadVelocity = 6): void {
  const positions = particleGeo.attributes.position.array as Float32Array;
  const colors = particleGeo.attributes.color.array as Float32Array;
  const c = new THREE.Color(colorHex);

  let spawned = 0;
  for (let i = 0; i < maxParticles && spawned < count; i++) {
    if (particleLifes[i] <= 0) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 10;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * spreadVelocity;
      particleVelocities[i].set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);

      particleLifes[i] = 1.0;

      colors[i * 3] = c.r * 2.2;
      colors[i * 3 + 1] = c.g * 2.2;
      colors[i * 3 + 2] = c.b * 2.2;

      spawned++;
    }
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate = true;
}

function updateParticles(): void {
  const positions = particleGeo.attributes.position.array as Float32Array;
  for (let i = 0; i < maxParticles; i++) {
    if (particleLifes[i] > 0) {
      particleLifes[i] -= 0.035;
      positions[i * 3] += particleVelocities[i].x;
      positions[i * 3 + 1] += particleVelocities[i].y;

      if (particleLifes[i] <= 0) {
        positions[i * 3 + 1] = -9999;
      }
    }
  }
  particleGeo.attributes.position.needsUpdate = true;
}

// --- Player Ship Setup ---
const player: PlayerShip = {
  x: 0,
  y: -220,
  width: 44,
  height: 44,
  speed: 6,
  mesh: null,
  shieldMesh: null,
  thrusterOuterMesh: null,
  thrusterInnerMesh: null,
  thrusterCoreMesh: null,
};

function createPlayerMesh(): void {
  const group = new THREE.Group();

  const bodyGeo = new THREE.ConeGeometry(22, 44, 4);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(bodyMesh);

  const engineGeo = new THREE.SphereGeometry(8, 8, 8);
  const engineMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  const engineMesh = new THREE.Mesh(engineGeo, engineMat);
  engineMesh.position.y = -18;
  group.add(engineMesh);

  const outerGeo = new THREE.ConeGeometry(9, 36, 12);
  outerGeo.rotateX(Math.PI);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xff00aa,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const thrusterOuterMesh = new THREE.Mesh(outerGeo, outerMat);
  thrusterOuterMesh.position.y = -34;
  group.add(thrusterOuterMesh);

  const innerGeo = new THREE.ConeGeometry(5.5, 26, 12);
  innerGeo.rotateX(Math.PI);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const thrusterInnerMesh = new THREE.Mesh(innerGeo, innerMat);
  thrusterInnerMesh.position.y = -29;
  group.add(thrusterInnerMesh);

  const coreGeo = new THREE.ConeGeometry(2.5, 18, 8);
  coreGeo.rotateX(Math.PI);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
  });
  const thrusterCoreMesh = new THREE.Mesh(coreGeo, coreMat);
  thrusterCoreMesh.position.y = -25;
  group.add(thrusterCoreMesh);

  const shieldGeo = new THREE.RingGeometry(28, 32, 32);
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;
  group.add(shieldMesh);

  player.mesh = group;
  player.shieldMesh = shieldMesh;
  player.thrusterOuterMesh = thrusterOuterMesh;
  player.thrusterInnerMesh = thrusterInnerMesh;
  player.thrusterCoreMesh = thrusterCoreMesh;
  scene.add(group);
}
createPlayerMesh();

// --- Entities Lists ---
let bullets: PlayerBullet[] = [];
let enemies: Enemy[] = [];
let enemyBullets: EnemyBullet[] = [];
let boss: Boss | null = null;

// --- Helper Functions ---
function isColliding(rect1: RectEntity, rect2: RectEntity): boolean {
  return rect1.x - rect1.width / 2 < rect2.x + rect2.width / 2 &&
    rect1.x + rect1.width / 2 > rect2.x - rect2.width / 2 &&
    rect1.y - rect1.height / 2 < rect2.y + rect2.height / 2 &&
    rect1.y + rect1.height / 2 > rect2.y - rect2.height / 2;
}

// --- Firing Lasers ---
function createPlayerLaser(x: number, y: number, vx = 0): void {
  const geo = new THREE.PlaneGeometry(6, 20);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);

  if (vx !== 0) {
    mesh.rotation.z = -Math.atan2(vx, baseBulletSpeed);
  }

  scene.add(mesh);

  bullets.push({
    x, y, width: 6, height: 20,
    vx, vy: baseBulletSpeed,
    mesh,
  });
}

function createEnemyLaser(x: number, y: number, vx: number, vy: number, colorHex = 0xff0055, size = 10): void {
  const geo = new THREE.SphereGeometry(size / 2, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  scene.add(mesh);

  enemyBullets.push({
    x, y, width: size, height: size,
    vx, vy, mesh,
  });
}

// --- Boss Creation Engine ---
function spawnBoss(typeIndex: number): void {
  enemies.forEach((e) => scene.remove(e.mesh));
  enemies = [];

  const group = new THREE.Group();
  let name = '';
  let baseHealth = 2000;
  let width = 120;
  let height = 120;

  const healthMultiplier = 1 + bossClearCount;
  const speedMultiplier = 1 + (bossClearCount * 0.15);

  if (typeIndex === 0) {
    name = bossClearCount > 0 ? `VOID SENTINEL MK-${bossClearCount + 1}` : 'VOID SENTINEL';
    baseHealth = 2000;

    const frameGeo = new THREE.OctahedronGeometry(60, 0);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    group.add(frameMesh);

    const coreGeo = new THREE.SphereGeometry(30, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    const ringGeo = new THREE.TorusGeometry(85, 3, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    const beamGeo = new THREE.PlaneGeometry(30, BOUNDS.height);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = -BOUNDS.height / 2;
    group.add(beamMesh);

    const scaledHealth = Math.floor(baseHealth * healthMultiplier);
    boss = {
      type: 0, name, x: 0, y: 180, width, height, health: scaledHealth, maxHealth: scaledHealth,
      phase: 1, group, frameMesh, coreMesh, ringMesh, beamMesh,
      lastAttack: Date.now(), attackTimer: 0, beamCharging: false, beamFiring: false, vx: 2.5 * speedMultiplier,
    };

  } else if (typeIndex === 1) {
    name = bossClearCount > 0 ? `CYBER DREADNOUGHT MK-${bossClearCount + 1}` : 'CYBER DREADNOUGHT';
    baseHealth = 3200;
    width = 160; height = 100;

    const hullGeo = new THREE.BoxGeometry(140, 50, 30);
    const hullMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed });
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    group.add(hullMesh);

    const cannonGeo = new THREE.CylinderGeometry(8, 12, 60);
    const cannonMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.position.set(-65, -10, 0);
    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.position.set(65, -10, 0);
    group.add(leftCannon);
    group.add(rightCannon);

    const coreGeo = new THREE.BoxGeometry(30, 30, 35);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    const scaledHealth = Math.floor(baseHealth * healthMultiplier);
    boss = {
      type: 1, name, x: 0, y: 180, width, height, health: scaledHealth, maxHealth: scaledHealth,
      phase: 1, group, hullMesh, leftCannon, rightCannon, coreMesh,
      lastAttack: Date.now(), attackTimer: 0, vx: 3.5 * speedMultiplier, dashTargetX: 0,
    };

  } else if (typeIndex === 2) {
    name = bossClearCount > 0 ? `COSMIC WEAVER MK-${bossClearCount + 1}` : 'COSMIC WEAVER';
    baseHealth = 4500;
    width = 140; height = 140;

    const coreGeo = new THREE.IcosahedronGeometry(45, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff00aa, wireframe: true });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    const innerGeo = new THREE.SphereGeometry(25, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    const drones: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const droneGeo = new THREE.DodecahedronGeometry(12);
      const droneMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const droneMesh = new THREE.Mesh(droneGeo, droneMat);
      group.add(droneMesh);
      drones.push(droneMesh);
    }

    const scaledHealth = Math.floor(baseHealth * healthMultiplier);
    boss = {
      type: 2, name, x: 0, y: 170, width, height, health: scaledHealth, maxHealth: scaledHealth,
      phase: 1, group, coreMesh, innerMesh, drones,
      lastAttack: Date.now(), attackTimer: 0, vx: 2.0 * speedMultiplier, droneAngle: 0,
    };
  }

  scene.add(group);

  bossWarningEl.textContent = `WARNING: ${name} APPROACHING (HP x${healthMultiplier})`;
  bossWarningEl.style.display = 'block';
  setTimeout(() => { bossWarningEl.style.display = 'none'; }, 3000);
  bossSpawned = true;
}

// --- Boss Update Controller ---
function updateBoss(): void {
  if (!boss) return;
  const now = Date.now();

  if (boss.type === 0) {
    boss.x += boss.vx;
    if (Math.abs(boss.x) > 280) boss.vx *= -1;

    boss.group.position.set(boss.x, boss.y, 0);
    boss.ringMesh.rotation.z += 0.03;
    boss.frameMesh.rotation.y += 0.02;

    const healthRatio = boss.health / boss.maxHealth;
    if (healthRatio < 0.65 && boss.phase === 1) {
      boss.phase = 2;
      (boss.coreMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00);
      triggerExplosion(boss.x, boss.y, 0xffaa00, 60);
    } else if (healthRatio < 0.3 && boss.phase === 2) {
      boss.phase = 3;
      (boss.coreMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      boss.vx *= 1.5;
      triggerExplosion(boss.x, boss.y, 0xff0000, 80);
    }

    if (now - boss.lastAttack > (boss.phase === 3 ? 600 : 1100)) {
      boss.attackTimer++;
      if (boss.phase === 1) {
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = (boss.attackTimer * 0.2) + (i * Math.PI * 2 / count);
          createEnemyLaser(boss.x, boss.y, Math.cos(angle) * 4, Math.sin(angle) * 4, 0x00e5ff, 12);
        }
      } else if (boss.phase === 2) {
        if (boss.attackTimer % 3 === 0) {
          boss.beamCharging = true;
          let chargeProgress = 0;
          const chargeInterval = setInterval(() => {
            chargeProgress += 0.1;
            const beam = (boss as SentinelBoss).beamMesh.material as THREE.MeshBasicMaterial; // kept unguarded like the original
            beam.opacity = chargeProgress * 0.4;            if (chargeProgress >= 1) {
              clearInterval(chargeInterval);
              (boss as SentinelBoss).beamFiring = true;
              const firingBeam = (boss as SentinelBoss).beamMesh.material as THREE.MeshBasicMaterial;
              firingBeam.opacity = 0.9;
              firingBeam.color.setHex(0xff0055);              screenShakeTime = 20;

              setTimeout(() => {
                const b0 = boss as SentinelBoss;
                (boss as SentinelBoss).beamCharging = false;
                const offBeam = (boss as SentinelBoss).beamMesh.material as THREE.MeshBasicMaterial;
                offBeam.opacity = 0;
                offBeam.color.setHex(0xff0000);
              }, 1200);
            }
          }, 100);
        } else {
          for (let i = -2; i <= 2; i += 2) {
            createEnemyLaser(boss.x + i * 20, boss.y, i * 1.5, -5, 0xffaa00, 14);
          }
        }
      } else if (boss.phase === 3) {
        const count = 14;
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2 / count) + Math.random() * 0.2;
          createEnemyLaser(boss.x, boss.y, Math.cos(angle) * 5.5, Math.sin(angle) * 5.5, 0xff0055, 10);
        }
      }
      boss.lastAttack = now;
    }

    if (boss.beamFiring && Math.abs(player.x - boss.x) < 25 && !shieldActive) {
      registerPlayerHit();
    }

  } else if (boss.type === 1) {
    boss.x += boss.vx;
    if (Math.abs(boss.x) > 260) boss.vx *= -1;

    boss.group.position.set(boss.x, boss.y, 0);

    const healthRatio = boss.health / boss.maxHealth;
    if (healthRatio < 0.6 && boss.phase === 1) {
      boss.phase = 2;
      (boss.coreMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0055);
      triggerExplosion(boss.x, boss.y, 0x7c3aed, 60);
    } else if (healthRatio < 0.3 && boss.phase === 2) {
      boss.phase = 3;
      (boss.coreMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffea00);
      boss.vx *= 1.4;
      triggerExplosion(boss.x, boss.y, 0xffea00, 80);
    }

    if (now - boss.lastAttack > (boss.phase === 3 ? 500 : 900)) {
      boss.attackTimer++;
      if (boss.phase === 1) {
        createEnemyLaser(boss.x - 65, boss.y - 20, 0, -6, 0x00e5ff, 12);
        createEnemyLaser(boss.x + 65, boss.y - 20, 0, -6, 0x00e5ff, 12);
      } else if (boss.phase === 2) {
        const offset = (boss.attackTimer % 5 - 2) * 2;
        createEnemyLaser(boss.x - 65, boss.y - 20, offset, -5.5, 0xff0055, 14);
        createEnemyLaser(boss.x + 65, boss.y - 20, -offset, -5.5, 0xff0055, 14);
      } else if (boss.phase === 3) {
        for (let dir = -1; dir <= 1; dir++) {
          createEnemyLaser(boss.x + dir * 50, boss.y - 10, dir * 2, -6, 0xffea00, 14);
        }
      }
      boss.lastAttack = now;
    }

  } else if (boss.type === 2) {
    boss.x += Math.sin(now * 0.002) * 3;
    boss.y = 170 + Math.cos(now * 0.003) * 20;

    boss.group.position.set(boss.x, boss.y, 0);
    boss.coreMesh.rotation.x += 0.02;
    boss.coreMesh.rotation.y += 0.03;

    boss.droneAngle += 0.04;
    const weaver = boss;
    weaver.drones.forEach((drone, idx) => {
      const angle = weaver.droneAngle + (idx * Math.PI * 2 / 3);
      drone.position.set(Math.cos(angle) * 80, Math.sin(angle) * 80, 0);
      drone.rotation.z += 0.05;
    });

    const healthRatio = boss.health / boss.maxHealth;
    if (healthRatio < 0.65 && boss.phase === 1) {
      boss.phase = 2;
      (boss.innerMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0055);
      triggerExplosion(boss.x, boss.y, 0xff00aa, 70);
    } else if (healthRatio < 0.3 && boss.phase === 2) {
      boss.phase = 3;
      (boss.innerMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
      triggerExplosion(boss.x, boss.y, 0x00ffff, 90);
    }

    if (now - boss.lastAttack > (boss.phase === 3 ? 450 : 800)) {
      boss.attackTimer++;
      if (boss.phase === 1) {
        boss.drones.forEach((drone) => {
          const worldPos = new THREE.Vector3();
          drone.getWorldPosition(worldPos);
          const dx = player.x - worldPos.x;
          const dy = player.y - worldPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          createEnemyLaser(worldPos.x, worldPos.y, (dx / dist) * 4.5, (dy / dist) * 4.5, 0x00e5ff, 10);
        });
      } else if (boss.phase === 2) {
        const count = 12;
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2 / count) + boss.droneAngle;
          createEnemyLaser(boss.x, boss.y, Math.cos(angle) * 5, Math.sin(angle) * 5, 0xff00aa, 12);
        }
      } else if (boss.phase === 3) {
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          createEnemyLaser(boss.x, boss.y, Math.cos(angle) * 6, Math.sin(angle) * 6, 0xffff00, 12);
        }
      }
      boss.lastAttack = now;
    }
  }
}

// --- Navigation & Launcher Controls ---
launchSpaceBtn.addEventListener('click', () => {
  gameSelectModal.style.display = 'none';
  if (!gameInitialized) {
    gameInitialized = true;
    restartGame();
  } else {
    gameRunning = true;
    gameLoop();
  }
});

launchRogueBtn.addEventListener('click', () => {
  window.location.href = 'rogue.html';
});

launchWizardBtn.addEventListener('click', () => {
  window.location.href = 'wizard.html';
  });

  launchMechBtn.addEventListener('click', () => {
    window.location.href = 'mech2.html';
  });
menuBtn.addEventListener('click', () => {
  gameRunning = false;
  upgradeMenu.style.display = 'none';
  gameOverModal.style.display = 'none';
  attributionModal.style.display = 'none';
  gameSelectModal.style.display = 'flex';
});

gameOverMenuBtn.addEventListener('click', () => {
  gameOverModal.style.display = 'none';
  gameSelectModal.style.display = 'flex';
});

attributionBtn.addEventListener('click', () => {
  gameSelectModal.style.display = 'none';
  attributionModal.style.display = 'block';
});

closeAttributionBtn.addEventListener('click', () => {
  attributionModal.style.display = 'none';
  gameSelectModal.style.display = 'flex';
});

// --- Controls & Upgrades ---
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyM' && gameRunning) toggleUpgradeMenu(true);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

restartBtn.addEventListener('click', restartGame);
upgradeBtn.addEventListener('click', () => toggleUpgradeMenu(true));
closeUpgradeBtn.addEventListener('click', () => toggleUpgradeMenu(false));

document.querySelectorAll<HTMLButtonElement>('.btn-upgrade').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const type = (e.currentTarget as HTMLButtonElement).dataset.upgrade;
    if (isUpgradeKey(type)) buyUpgrade(type);
  });
});

function isUpgradeKey(type: unknown): type is UpgradeKey {
  return typeof type === 'string' && type in upgrades;
}

function updateUpgradeButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('.btn-upgrade').forEach((btn) => {
    const type = btn.dataset.upgrade;
    if (!isUpgradeKey(type)) return;
    btn.disabled = score < upgrades[type].cost;
    const tag = btn.querySelector<HTMLElement>('.cost-tag');
    if (tag) {
      tag.textContent = `${upgrades[type].cost} pts${upgrades[type].level > 0 ? ` (Lvl ${upgrades[type].level})` : ''}`;
    }
  });
}

function toggleUpgradeMenu(show: boolean): void {
  upgradeMenu.style.display = show ? 'block' : 'none';
  gameRunning = !show;
  if (show) updateUpgradeButtons();
  else gameLoop();
}

function buyUpgrade(type: UpgradeKey): void {
  const up = upgrades[type];
  if (score < up.cost) return;

  score -= up.cost;
  up.level++;
  totalUpgrades++;
  scoreEl.textContent = String(score);

  switch (type) {
    case 'firingSpeed':
      bulletCooldown = Math.max(60, bulletCooldown - 25);
      up.cost = Math.floor(up.cost * 1.4);
      break;
    case 'health':
      maxLives++;
      lives = maxLives;
      livesEl.innerHTML = '♥'.repeat(lives);
      up.cost = Math.floor(up.cost * 1.5);
      break;
    case 'movementSpeed':
      player.speed += 1.2;
      up.cost = Math.floor(up.cost * 1.3);
      break;
    case 'bulletSpeed':
      baseBulletSpeed += 2.5;
      up.cost = Math.floor(up.cost * 1.3);
      break;
    case 'shield':
      shieldActive = true;
      shieldEndTime = Date.now() + 5000;
      up.cost = Math.floor(up.cost * 1.5);
      break;
    case 'multiShot':
      up.cost = Math.floor(up.cost * 1.6);
      break;
  }
  updateUpgradeButtons();
}

function registerPlayerHit(): void {
  if (shieldActive) return;

  lives--;
  livesEl.innerHTML = '♥'.repeat(Math.max(0, lives));
  triggerExplosion(player.x, player.y, 0x00e5ff, 40);
  screenShakeTime = 15;

  if (lives <= 0) {
    gameRunning = false;
    finalScoreEl.textContent = String(score);
    gameOverModal.style.display = 'block';
  } else {
    shieldActive = true;
    shieldEndTime = Date.now() + 1500;
  }
}

function restartGame(): void {
  score = 0;
  lives = maxLives;
  bossesBeaten = 0;
  bossesBeatenEl.textContent = String(bossesBeaten);
  livesEl.innerHTML = '♥'.repeat(lives);
  scoreEl.textContent = String(score);

  bullets.forEach((b) => scene.remove(b.mesh));
  enemies.forEach((e) => scene.remove(e.mesh));
  enemyBullets.forEach((b) => scene.remove(b.mesh));

  bullets = [];
  enemies = [];
  enemyBullets = [];

  if (boss) {
    scene.remove(boss.group);
    boss = null;
  }

  player.x = 0;
  player.y = -220;
  shieldActive = false;
  currentBossType = 0;
  bossClearCount = 0;
  bossSpawned = false;
  nextBossSpawnTime = Date.now() + 25000;
  gameRunning = true;
  gameOverModal.style.display = 'none';
  gameLoop();
}

// --- Core Update Loop ---
function update(): void {
  const now = Date.now();

  if (!boss && !bossSpawned && now > nextBossSpawnTime) {
    spawnBoss(currentBossType);
  }

  if (shieldActive) {
    if (player.shieldMesh) {
      player.shieldMesh.visible = true;
      player.shieldMesh.rotation.z += 0.05;
    }
    if (now > shieldEndTime) {
      shieldActive = false;
      if (player.shieldMesh) player.shieldMesh.visible = false;
    }
  }

  const isMovingUp = keys['ArrowUp'] || keys['KeyW'] === true;
  if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
  if (isMovingUp) player.y += player.speed;
  if (keys['ArrowDown'] || keys['KeyS']) player.y -= player.speed;

  player.x = Math.max(-BOUNDS.width / 2 + 25, Math.min(BOUNDS.width / 2 - 25, player.x));
  player.y = Math.max(-BOUNDS.height / 2 + 25, Math.min(BOUNDS.height / 2 - 25, player.y));

  if (player.mesh) player.mesh.position.set(player.x, player.y, 0);

  if (player.thrusterOuterMesh && player.thrusterInnerMesh && player.thrusterCoreMesh) {
    const flicker = 0.85 + Math.random() * 0.45;
    const boostScale = isMovingUp ? 1.8 : 1.0;

    player.thrusterOuterMesh.scale.set(flicker * 1.1, flicker * boostScale * 1.3, 1);
    player.thrusterInnerMesh.scale.set(flicker * 0.9, flicker * boostScale * 1.1, 1);
    player.thrusterCoreMesh.scale.set(flicker * 0.8, flicker * boostScale * 0.9, 1);

    if (Math.random() < (isMovingUp ? 0.95 : 0.6)) {
      const particleColor = Math.random() < 0.6 ? 0xff00aa : 0xff6600;
      triggerExplosion(
        player.x + (Math.random() - 0.5) * 8,
        player.y - 32,
        particleColor,
        2,
        2.5
      );
    }
  }

  if (keys['Space'] && now - lastShotTime > bulletCooldown) {
    const level = upgrades.multiShot.level;
    if (level === 0) {
      createPlayerLaser(player.x, player.y + 20, 0);
    } else {
      const totalShots = 1 + level * 3;
      const spreadSpan = Math.min(120, 30 + level * 15);
      const maxVx = Math.min(5.5, 1.5 + level * 0.8);

      for (let i = 0; i < totalShots; i++) {
        const pct = i / (totalShots - 1);
        const offsetX = (pct - 0.5) * spreadSpan;
        const vx = (pct - 0.5) * (maxVx * 2);
        createPlayerLaser(player.x + offsetX, player.y + 20, vx);
      }
    }
    lastShotTime = now;
  }

  // Update Player Lasers
  bullets = bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.mesh.position.set(b.x, b.y, 0);

    if (b.y > BOUNDS.height / 2) {
      scene.remove(b.mesh);
      return false;
    }
    return true;
  });

  // Spawn Regular Enemy Waves
  if (!boss && Math.random() < 0.03) {
    const geo = new THREE.DodecahedronGeometry(16);
    const mat = new THREE.MeshBasicMaterial({ color: Math.random() < 0.2 ? 0xa855f7 : 0x22c55e });
    const mesh = new THREE.Mesh(geo, mat);
    const x = (Math.random() - 0.5) * (BOUNDS.width - 60);
    const y = BOUNDS.height / 2 + 20;

    mesh.position.set(x, y, 0);
    scene.add(mesh);

    enemies.push({
      x, y, width: 32, height: 32,
      speed: 2 + Math.random() * 2,
      type: Math.random() < 0.2 ? 'special' : 'normal',
      mesh,
      lastShot: 0,
    });
  }

  // Update Regular Enemies
  enemies = enemies.filter((enemy) => {
    enemy.y -= enemy.speed;
    enemy.mesh.position.set(enemy.x, enemy.y, 0);
    enemy.mesh.rotation.x += 0.02;
    enemy.mesh.rotation.y += 0.02;

    if (totalUpgrades >= 1 && now - enemy.lastShot > enemyBulletCooldown) {
      createEnemyLaser(enemy.x, enemy.y - 15, 0, -4, 0xff0055, 8);
      enemy.lastShot = now;
    }

    if (enemy.y < -BOUNDS.height / 2 - 20) {
      scene.remove(enemy.mesh);
      return false;
    }
    return true;
  });

  // Update Enemy Lasers
  enemyBullets = enemyBullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.mesh.position.set(b.x, b.y, 0);

    if (isColliding(b, player)) {
      scene.remove(b.mesh);
      registerPlayerHit();
      return false;
    }

    if (Math.abs(b.x) > BOUNDS.width / 2 || Math.abs(b.y) > BOUNDS.height / 2) {
      scene.remove(b.mesh);
      return false;
    }
    return true;
  });

  if (boss) updateBoss();

  // Laser Collision Logic
  for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
    const b = bullets[bIdx];

    for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
      const e = enemies[eIdx];
      if (isColliding(b, e)) {
        triggerExplosion(e.x, e.y, e.type === 'special' ? 0xa855f7 : 0x22c55e, 20);
        score += e.type === 'special' ? 100 : 25;
        scoreEl.textContent = String(score);

        scene.remove(b.mesh);
        scene.remove(e.mesh);
        bullets.splice(bIdx, 1);
        enemies.splice(eIdx, 1);
        break;
      }
    }

    // Hit Boss
    if (boss && isColliding(b, boss)) {
      boss.health -= 15;
      triggerExplosion(b.x, b.y, 0xffea00, 5);
      scene.remove(b.mesh);
      bullets.splice(bIdx, 1);

      if (boss.health <= 0) {
        triggerExplosion(boss.x, boss.y, 0xff0055, 120);

        score += 500;
        scoreEl.textContent = String(score);

        // Increment Boss Defeat Variable & Update UI
        bossesBeaten++;
        bossesBeatenEl.textContent = String(bossesBeaten);

        scene.remove(boss.group);
        boss = null;

        bossClearCount++;
        currentBossType = (currentBossType + 1) % 3;
        bossSpawned = false;
        nextBossSpawnTime = Date.now() + 20000;
      }
    }
  }

  if (!shieldActive) {
    enemies.forEach((e) => {
      if (isColliding(player, e)) registerPlayerHit();
    });
    if (boss && isColliding(player, boss)) registerPlayerHit();
  }

  const positions = starGeo.attributes.position.array as Float32Array;
  for (let i = 0; i < starCount; i++) {
    positions[i * 3 + 1] -= starSpeeds[i];
    if (positions[i * 3 + 1] < -BOUNDS.height / 2) {
      positions[i * 3 + 1] = BOUNDS.height / 2;
    }
  }
  starGeo.attributes.position.needsUpdate = true;

  updateParticles();

  if (screenShakeTime > 0) {
    camera.position.x = (Math.random() - 0.5) * screenShakeTime * 0.8;
    camera.position.y = (Math.random() - 0.5) * screenShakeTime * 0.8;
    screenShakeTime--;
  } else {
    camera.position.x = 0;
    camera.position.y = 0;
  }
}

// --- Render Loop ---
function gameLoop(): void {
  if (!gameRunning) return;
  update();
  composer.render();
  requestAnimationFrame(gameLoop);
}

// Show Arcade Launcher Menu on load
gameSelectModal.style.display = 'flex';
composer.render();
