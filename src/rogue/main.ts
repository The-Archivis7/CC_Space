/*
 * CC Rogue (original: rogue.html inline script)
 */
import * as THREE from 'three';
import { byId } from '../shared/dom';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Domain types ---
interface UpgradeOption {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tag: string;
}

interface RoguePlayer {
  x: number; y: number; vx: number; vy: number; grounded: boolean; jumpsLeft: number; maxJumps: number; facingRight: boolean;
  hp: number; maxHp: number; baseDamage: number; critChance: number; lifesteal: number;
  attacking: boolean; blocking: boolean; attackTimer: number; attackCooldown: number;
  holdingAttack: boolean; attackHoldTime: number; comboChain: number;
  dashCooldown: number; dashTimer: number; dashCooldownTimer: number; isDashing: boolean;
  invulnerableTimer: number; parryWindowTimer: number; coyoteTimer: number; jumpBufferTimer: number;
  touchingWall: number;
  combo: number; comboTimer: number; comboMaxTime: number;
  fireSaber: boolean; iceSaber: boolean; chainParry: boolean; deflectionMult: number; shieldExplosion: boolean; shieldCharge: number;
  moveSpeedMult: number; phantomSlash: boolean; thornArmor: boolean;
}

interface RogueEnemy {
  group: THREE.Group;
  x: number; y: number; vx: number; w: number; h: number;
  hp: number; maxHp: number; patrolLeft: number; patrolRight: number;
  type: string; isElite: boolean; shootTimer: number; alive: boolean;
  frozenTimer: number; fireDotTimer: number; dodgeCD: number;
}

interface BossBase {
  group: THREE.Group;
  x: number; y: number; vx: number; w: number; h: number;
  hp: number; maxHp: number; shootTimer: number; phase: number;
  attackCooldown: number; alive: boolean; type: string;
}
interface DreadnoughtBoss extends BossBase { type: 'dreadnought'; isCharging: boolean; chargeTimer: number; }
interface LichBoss extends BossBase { type: 'lich'; darknessMode: boolean; }
interface OverlordBoss extends BossBase { type: 'overlord'; featherStormTimer: number; }
type RogueBoss = DreadnoughtBoss | LichBoss | OverlordBoss;

interface Projectile {
  mesh: THREE.Mesh;
  x: number; y: number; vx: number; life: number; deflected: boolean;
}

interface Platform {
  x: number; y: number; w: number; h: number;
  bounds: { left: number; right: number; top: number; bottom: number };
  isGround: boolean;
}

interface ImpactParticle { mesh: THREE.Mesh; vx: number; vy: number; life: number; }
interface Firework { points: THREE.Points; velocities: { x: number; y: number; z: number }[]; life: number; maxLife: number; }
interface GhostTrail { mesh: THREE.Object3D; life: number; }
interface DamageEvent { time: number; dmg: number; }

interface GameState {
  level: number; gameStarted: boolean; gameOver: boolean; cleared: boolean; upgradeActive: boolean;
  hitStopTimer: number;
  damageHistory: DamageEvent[];
  upgradesObtained: UpgradeOption[];
  player: RoguePlayer;
  enemies: RogueEnemy[];
  boss: RogueBoss | null;
  projectiles: Projectile[];
  platforms: Platform[];
  particles: ImpactParticle[];
  fireworks: Firework[];
  ghostTrails: GhostTrail[];
  platformMeshes: THREE.Group[];
  cameraShake: number; cycleTime: number;
  // Meshes registered at build time (createRogueCharacter)
  capeMeshes?: THREE.Mesh[];
  legs?: { left: THREE.Group; right: THREE.Group };
}

    const STORAGE_KEY_LEVELS_CLEARED = 'cc_rogue_levels_cleared';
    const GRAVITY = -34.0;
    const JUMP_FORCE = 14.0;
    const MOVE_SPEED = 12.0;
    const DAY_NIGHT_CYCLE_SECONDS = 600;
    const GROUND_PLANE_Y = 0.0;

    let levelsCleared = parseInt(localStorage.getItem(STORAGE_KEY_LEVELS_CLEARED) || '0', 10);
    byId('levels-cleared-count').textContent = String(levelsCleared);

    // Upgrades Pool Configuration
    const ALL_UPGRADES = [
      { id: 'hp', title: '+25 Max HP', desc: 'Increases Maximum Health by 25 and restores full HP.', icon: '❤️', tag: 'SURVIVAL' },
      { id: 'dmg', title: '+2 Saber Damage', desc: 'Permanently increases all melee and ranged attack damage.', icon: '⚔️', tag: 'OFFENSE' },
      { id: 'lifesteal', title: 'Vampiric Core', desc: 'Heals 15% of all damage dealt to enemies.', icon: '🩸', tag: 'UTILITY' },
      { id: 'triple_jump', title: 'Air Mastery', desc: 'Grants an additional jump mid-air (Triple Jump).', icon: '🦘', tag: 'MOBILITY' },
      { id: 'dash_cd', title: 'Flash Step', desc: 'Reduces Dash cooldown by 35%.', icon: '⚡', tag: 'MOBILITY' },
      { id: 'chain_parry', title: 'Volt Parry', desc: 'Perfect Parries unleash a chain lightning blast.', icon: '🌩️', tag: 'COMBAT' },
      { id: 'crit', title: 'Critical Eye', desc: 'Increases Critical Hit Chance by +20%.', icon: '🎯', tag: 'OFFENSE' },
      { id: 'fire', title: 'Flame Saber', desc: 'Saber attacks ignite enemies for burning DOT damage.', icon: '🔥', tag: 'ELEMENTAL' },
      { id: 'ice', title: 'Frost Core', desc: 'Saber attacks freeze and slow enemy movement speed.', icon: '❄️', tag: 'ELEMENTAL' },
      { id: 'deflect', title: 'Kinetic Deflect', desc: 'Deflected projectiles deal +100% extra damage.', icon: '🛡️', tag: 'DEFENSE' },
      { id: 'shield_exp', title: 'Nova Shield', desc: 'Blocking 3 attacks releases a massive pulse explosion.', icon: '💥', tag: 'DEFENSE' },
      { id: 'swift_boots', title: 'Swift Boots', desc: 'Move 25% faster and reduce Dash cooldown by 20%.', icon: '👟', tag: 'MOBILITY' },
      { id: 'phantom', title: 'Phantom Slash', desc: 'Saber strikes have a 30% chance to trigger a phantom echo, striking again for 60% damage.', icon: '👻', tag: 'COMBAT' },
      { id: 'thorns', title: 'Thorn Armor', desc: 'Taking a hit releases a thorn burst, damaging nearby enemies for 30% of the damage taken.', icon: '🌵', tag: 'DEFENSE' }
    ];

    const state: GameState = {
      level: 1, gameStarted: false, gameOver: false, cleared: false, upgradeActive: false,
      hitStopTimer: 0,
      damageHistory: [],
      upgradesObtained: [],
      player: {
        x: -12, y: 3, vx: 0, vy: 0, grounded: false, jumpsLeft: 2, maxJumps: 2, facingRight: true,
        hp: 100, maxHp: 100, baseDamage: 1.0, critChance: 0.10, lifesteal: 0,
        attacking: false, blocking: false, attackTimer: 0, attackCooldown: 0,
        holdingAttack: false, attackHoldTime: 0, comboChain: 0,
        dashCooldown: 1.2, dashTimer: 0, dashCooldownTimer: 0, isDashing: false,
        invulnerableTimer: 0, parryWindowTimer: 0, coyoteTimer: 0, jumpBufferTimer: 0,
        touchingWall: 0,
        combo: 0, comboTimer: 0, comboMaxTime: 3.0,
        fireSaber: false, iceSaber: false, chainParry: false, deflectionMult: 1.0, shieldExplosion: false, shieldCharge: 0,
        moveSpeedMult: 1.0, phantomSlash: false, thornArmor: false
      },
      enemies: [], boss: null, projectiles: [], platforms: [], particles: [], fireworks: [], ghostTrails: [], platformMeshes: [], cameraShake: 0, cycleTime: 150
    } as GameState;

    const keys: Record<string, boolean> = {};

    const availableSongs = [
      'assets/songs/entertainment.mp3',
      'assets/songs/adventure.mp3',
      'assets/songs/celebration.mp3'
    ];
    const bgAudio = new Audio();
    bgAudio.loop = true;
    bgAudio.volume = 0.45;

    function selectRandomSong() {
      const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
      bgAudio.src = randomSong;
      if (state.gameStarted) {
        bgAudio.play().catch(e => console.warn("Audio playback waiting on gesture:", e));
      }
    }

    function safeRemove(mesh: THREE.Object3D & Partial<THREE.Mesh> | null) {
      if (!mesh) return;
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else mesh.material.dispose();
      }
    }

    function triggerScreenFlash(color = 'white', duration = 0.15) {
      const overlay = byId('flash-overlay');
      overlay.style.backgroundColor = color;
      overlay.style.opacity = '0.6';
      setTimeout(() => { overlay.style.opacity = '0'; }, duration * 1000);
    }

    function spawnFloatingText(text: string, x: number, y: number, type = 'normal') {
      const p = new THREE.Vector3(x, y + 1.2, 0);
      p.project(camera);
      const sx = (p.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-(p.y * 0.5) + 0.5) * window.innerHeight;

      const div = document.createElement('div');
      div.className = `floating-dmg ${type}`;
      div.style.left = `${sx}px`;
      div.style.top = `${sy}px`;
      div.textContent = text;
      document.body.appendChild(div);

      setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 800);
    }

    function recordDamageDealt(dmg: number) {
      const now = performance.now();
      state.damageHistory.push({ time: now, dmg });
    }

    function updateDPSTracker() {
      const now = performance.now();
      state.damageHistory = state.damageHistory.filter(d => now - d.time <= 3000);
      const total = state.damageHistory.reduce((sum, d) => sum + d.dmg, 0);
      byId('stat-dps').textContent = (total / 3.0).toFixed(1);
    }

    function registerHitCombo(dmg: number, isCrit: boolean, pos: { x: number; y: number }, element: 'fire' | 'ice' | null = null, isExec = false) {
      const p = state.player;
      p.combo += 1;
      p.comboTimer = p.comboMaxTime;

      const comboBox = byId('combo-box');
      const comboNum = byId('combo-num');
      comboNum.textContent = String(p.combo);
      comboNum.style.transform = 'scale(1.3)';
      setTimeout(() => { comboNum.style.transform = 'scale(1)'; }, 100);
      comboBox.classList.add('active');

      if (p.lifesteal > 0) {
        const healAmt = Math.min(p.maxHp - p.hp, dmg * p.lifesteal);
        if (healAmt > 0) {
          p.hp += healAmt;
          spawnFloatingText(`+${healAmt.toFixed(0)}`, pos.x, pos.y + 0.5, 'heal');
        }
      }

      let type = isExec ? 'exec' : (isCrit ? 'crit' : (element || 'normal'));
      let displayDmg = isExec ? 'EXECUTE!' : dmg.toFixed(0) + (isCrit ? '!' : '');
      spawnFloatingText(displayDmg, pos.x, pos.y, type);
      recordDamageDealt(dmg);
    }

    const container = byId('canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.012);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 250);
    camera.position.set(0, 5, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 1.2, 0.4, 0.82);
    composer.addPass(bloomPass);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff1e6, 2.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5; sunLight.shadow.camera.far = 130;
    sunLight.shadow.camera.left = -60; sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 35; sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    scene.add(sunMesh);

    const bgMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), bgMat);
    bgMesh.position.set(0, 20, -45);
    scene.add(bgMesh);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 200;
      starPositions[i * 3 + 1] = Math.random() * 70;
      starPositions[i * 3 + 2] = -42 + (Math.random() - 0.5) * 10;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0 });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // ---------------------------------------------------------------------
    // Living sky FX (visual only): moon, sun glow, drifting clouds, auroras
    // ---------------------------------------------------------------------
    const skyFX = {
      moon: new THREE.Mesh(
        new THREE.SphereGeometry(1.9, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xdce5f8, transparent: true, opacity: 0 })
      ),
      sunGlow: new THREE.Sprite(new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement('canvas'); c.width = c.height = 256;
          const ctx = c.getContext('2d') as CanvasRenderingContext2D;
          const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
          g.addColorStop(0, 'rgba(255, 255, 255, 1)');
          g.addColorStop(0.25, 'rgba(255, 244, 220, 0.55)');
          g.addColorStop(0.6, 'rgba(255, 210, 140, 0.18)');
          g.addColorStop(1, 'rgba(255, 190, 90, 0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
          return new THREE.CanvasTexture(c);
        })(),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      })),
      clouds: [] as { group: THREE.Group; mat: THREE.MeshStandardMaterial; speed: number; baseY: number }[],
      auroras: [] as THREE.Mesh[]
    } as const;
    skyFX.moon.scale.setScalar(1.0);
    scene.add(skyFX.moon);
    skyFX.sunGlow.scale.set(26, 26, 1);
    scene.add(skyFX.sunGlow);

    // Fluffy cloud puffs, high and far behind the playfield
    for (let ci = 0; ci < 7; ci++) {
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xdde7f2, roughness: 1, metalness: 0, transparent: true, opacity: 0.9 });
      const cloudGroup = new THREE.Group();
      const puffCount = 4 + Math.floor(Math.random() * 4);
      for (let si = 0; si < puffCount; si++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 2.2, 10, 8), cloudMat);
        puff.position.set((si - puffCount / 2) * 1.9 + (Math.random() - 0.5), (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.5);
        puff.scale.y = 0.55;
        cloudGroup.add(puff);
      }
      cloudGroup.position.set((Math.random() - 0.5) * 160, 15 + Math.random() * 12, -30 - Math.random() * 9);
      cloudGroup.userData.baseY = cloudGroup.position.y;
      scene.add(cloudGroup);
      skyFX.clouds.push({ group: cloudGroup, mat: cloudMat, speed: 0.5 + Math.random() * 0.9, baseY: cloudGroup.position.y });
    }

    // Twin aurora ribbons that waltz across the night sky
    for (let ai = 0; ai < 2; ai++) {
      const ac = document.createElement('canvas'); ac.width = 512; ac.height = 128;
      const actx = ac.getContext('2d') as CanvasRenderingContext2D;
      const ag = actx.createLinearGradient(0, 0, 0, 128);
      ag.addColorStop(0, 'rgba(0,0,0,0)');
      ag.addColorStop(0.35, ai === 0 ? 'rgba(52, 255, 170, 0.55)' : 'rgba(140, 120, 255, 0.5)');
      ag.addColorStop(0.65, ai === 0 ? 'rgba(80, 200, 255, 0.4)' : 'rgba(255, 120, 200, 0.3)');
      ag.addColorStop(1, 'rgba(0,0,0,0)');
      actx.fillStyle = ag; actx.fillRect(0, 0, 512, 128);
      const ribbon = new THREE.Mesh(
        new THREE.PlaneGeometry(70, 9),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ac), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      ribbon.position.set(0, ai === 0 ? 19 : 24, -37 + ai);
      ribbon.rotation.z = ai === 0 ? 0.06 : -0.05;
      ribbon.userData.baseY = ribbon.position.y;
      scene.add(ribbon);
      skyFX.auroras.push(ribbon);
    }


    const mountainGroup = new THREE.Group(); mountainGroup.position.set(0, -2, -28); scene.add(mountainGroup);
    const mtnMatFar = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 });
    const mtnMatMid = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.90 });
    const mtnMatNear = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    for (let i = -10; i <= 10; i++) {
      const mtnFar = new THREE.Mesh(new THREE.ConeGeometry(14 + Math.random() * 6, 22 + Math.random() * 8, 5), mtnMatFar);
      mtnFar.position.set(i * 12 + (Math.random() - 0.5) * 4, 6, -8); mountainGroup.add(mtnFar);
      const mtnMid = new THREE.Mesh(new THREE.ConeGeometry(10 + Math.random() * 5, 16 + Math.random() * 6, 5), mtnMatMid);
      mtnMid.position.set(i * 10 + (Math.random() - 0.5) * 4, 3, -4); mountainGroup.add(mtnMid);
      const mtnNear = new THREE.Mesh(new THREE.ConeGeometry(7 + Math.random() * 4, 11 + Math.random() * 5, 4), mtnMatNear);
      mtnNear.position.set(i * 8 + (Math.random() - 0.5) * 3, 1, 0); mountainGroup.add(mtnNear);
    }

    // Material Library
    const matPlatform = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
    const matEdgeTrim = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.9 });
    const matGround = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9, metalness: 0.2 });
    const matRogueCoat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4, side: THREE.FrontSide });
    const matRogueArmor = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85, side: THREE.FrontSide });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 });
    const matShieldEmblem = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.8, roughness: 0.2 });
    const saberBladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.8, roughness: 0.1 });
    const saberCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Reflective environment for character metals (visual only): cheap gradient cubemap
    const charEnvCube = (function makeCharEnvCube() {
      const faces: HTMLCanvasElement[] = [];
      const skyCols = ['#7aa6ff', '#9ec6ff', '#cfe2ff'];
      const groundCols = ['#241a10', '#150f08'];
      for (let fi = 0; fi < 6; fi++) {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const ctx = c.getContext('2d') as CanvasRenderingContext2D;
        const vertical = fi === 2 || fi === 3; // py / ny
        if (vertical) {
          const g = ctx.createLinearGradient(0, 0, 0, 128);
          const cols = fi === 2 ? skyCols : groundCols.slice().reverse();
          cols.forEach((col, i) => g.addColorStop(i / Math.max(1, cols.length - 1), col));
          ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, 128);
          g.addColorStop(0, fi % 2 === 0 ? '#5b82e0' : '#6f95ea');
          g.addColorStop(0.62, '#38485e');
          g.addColorStop(1, '#221711');
          ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
        }
        faces.push(c);
      }
      const cube = new THREE.CubeTexture(faces);
      cube.needsUpdate = true;
      return cube;
    })();

    [matRogueArmor, matGold, matShieldEmblem, saberBladeMat].forEach((m) => {
      (m as THREE.MeshStandardMaterial).envMap = charEnvCube;
      m.needsUpdate = true;
    });


    // ==== Hero assembly — fully rebuilt layered rogue silhouette ====
    const rogueGroup = new THREE.Group();
    scene.add(rogueGroup);

    const torsoGroup = new THREE.Group();
    rogueGroup.add(torsoGroup);

    const waistcoatMat = new THREE.MeshStandardMaterial({ color: 0x2a2a58, roughness: 0.62, metalness: 0.12 });
    waistcoatMat.envMap = charEnvCube; waistcoatMat.needsUpdate = true;
    const matSilkLining = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
    const matStrap = new THREE.MeshStandardMaterial({ color: 0x3d2c18, roughness: 0.85, metalness: 0.1 });
    const matSheath = new THREE.MeshStandardMaterial({ color: 0x1f170f, roughness: 0.72, metalness: 0.28 });

    // Torso: faceted navy undercoat
    const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.21, 1.02, 9, 1), waistcoatMat);
    torsoMesh.position.y = 1.04;
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    // Overlapping lamellar chest wraps (half-shell plates, slight stagger)
    const strip1 = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.17, 14, 1, true, -Math.PI / 2, Math.PI), matRogueArmor);
    strip1.position.y = 0.86; strip1.rotation.y = 0.03;
    const strip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.17, 14, 1, true, -Math.PI / 2, Math.PI), matRogueArmor);
    strip2.position.y = 1.02; strip2.rotation.y = -0.04;
    const strip3 = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.17, 14, 1, true, -Math.PI / 2, Math.PI), matRogueArmor);
    strip3.position.y = 1.18; strip3.rotation.y = 0.05;
    [strip1, strip2, strip3].forEach(st => { st.castShadow = true; torsoGroup.add(st); });

    const goldStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.05, 14, 1, true, -Math.PI / 2, Math.PI), matGold);
    goldStripe.position.y = 1.28;
    torsoGroup.add(goldStripe);

    // Core gem riding the chest plate (animate() pulses its emissive)
    const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 1), matShieldEmblem);
    coreGem.position.set(0.20, 1.02, 0.315);
    coreGem.rotation.y = Math.PI / 4;
    torsoGroup.add(coreGem);
    const chestLight = new THREE.PointLight(0x8be9ff, 0.7, 2.6);
    chestLight.position.set(0.20, 1.05, 0.75);
    torsoGroup.add(chestLight);

    // Gorget plates
    [-0.15, 0.15].forEach((cx) => {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.11), matGold);
      plate.position.set(cx, 1.46, 0.02);
      plate.rotation.z = cx > 0 ? 0.5 : -0.5;
      plate.castShadow = true;
      torsoGroup.add(plate);
    });

    // Diagonal belt strap with a brass keeper
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.9, 0.045), matStrap);
    strap.position.set(0.02, 1.06, 0.30);
    strap.rotation.z = 0.72;
    torsoGroup.add(strap);
    const strapKeeper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.06), matGold);
    strapKeeper.position.set(0.03, 1.08, 0.315);
    strapKeeper.rotation.z = 0.72;
    torsoGroup.add(strapKeeper);

    // Waist belt + hex buckle
    const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.11, 10), matSheath);
    beltMesh.position.y = 0.60;
    torsoGroup.add(beltMesh);
    const buckleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6), matGold);
    buckleMesh.position.set(0, 0.60, 0.175);
    buckleMesh.rotation.x = Math.PI / 2;
    torsoGroup.add(buckleMesh);

    // Hip sash strands (cloth drape echo of the cape)
    [-1, 1].forEach((side) => {
      const sashStrand = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.34, 0.02), matSilkLining);
      sashStrand.position.set(side * 0.14, 0.42, 0.26);
      sashStrand.rotation.z = side < 0 ? 0.28 : -0.1;
      sashStrand.castShadow = true;
      torsoGroup.add(sashStrand);
    });

    // Crossed back scabbard with brass chapes
    const scabbardGroup = new THREE.Group();
    scabbardGroup.position.set(0.02, 1.0, -0.27);
    scabbardGroup.rotation.z = -0.6;
    torsoGroup.add(scabbardGroup);
    const scabbardBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.18, 0.08), matSheath);
    scabbardBody.castShadow = true;
    scabbardGroup.add(scabbardBody);
    [-0.55, 0.55].forEach((cy) => {
      const chape = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.052, 0.13, 8), matGold);
      chape.position.y = cy;
      scabbardGroup.add(chape);
    });

    // Shoulders: dome pauldrons with gold rims
    function createPauldron() {
      const pg = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), matRogueArmor);
      dome.scale.set(1.05, 0.8, 1.05);
      dome.castShadow = true;
      const domeRim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 18), matGold);
      domeRim.rotation.x = Math.PI / 2;
      domeRim.position.y = 0.005;
      pg.add(dome, domeRim);
      return pg;
    }
    const shoulderL = createPauldron(); shoulderL.position.set(0.02, 1.44, 0.34); torsoGroup.add(shoulderL);
    const shoulderR = createPauldron(); shoulderR.position.set(0.02, 1.44, -0.34); torsoGroup.add(shoulderR);

    // Head: face + swept-back hood cowl + sparking visor slit
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 10), matSkin);
    headMesh.position.y = 1.66;
    headMesh.scale.set(0.96, 1, 0.96);
    headMesh.castShadow = true;
    torsoGroup.add(headMesh);

    const hoodMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.245, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      waistcoatMat
    );
    hoodMesh.position.set(0.02, 1.67, 0);
    hoodMesh.scale.set(1.08, 1.0, 1.1);
    hoodMesh.rotation.x = -0.28;
    hoodMesh.castShadow = true;
    torsoGroup.add(hoodMesh);
    const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.02, 8, 20), matRogueCoat);
    hoodRim.position.set(0.06, 1.58, 0.08);
    hoodRim.rotation.x = Math.PI / 2 + 0.3;
    torsoGroup.add(hoodRim);
    const helmetVisor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.03), matShieldEmblem);
    helmetVisor.position.set(0.05, 1.665, 0.225);
    torsoGroup.add(helmetVisor);
    const helmetCrest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 4), matGold);
    helmetCrest.position.set(-0.02, 1.90, 0);
    helmetCrest.rotation.z = -0.15;
    torsoGroup.add(helmetCrest);

    // Cape: curved shell strips that flare as they fall
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d, roughness: 0.68, metalness: 0.05, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    });
    capeMat.envMap = charEnvCube; capeMat.needsUpdate = true;
    const capeGroup = new THREE.Group();
    capeGroup.position.set(0, 1.52, -0.16);
    torsoGroup.add(capeGroup);

    state.capeMeshes = [];
    for (let i = 0; i < 4; i++) {
      const r = 0.34 + i * 0.085;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 1.1, 0.34, 14, 1, true, Math.PI * 0.62, Math.PI * 0.76),
        capeMat
      );
      seg.position.set(0, -0.10 - i * 0.335, 0);
      seg.castShadow = true;
      capeGroup.add(seg);
      state.capeMeshes.push(seg);
    }

    // Legs: tapered thigh, kneecap, shin, brass-capped boot
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.8, metalness: 0.3 });
    bootMat.envMap = charEnvCube; bootMat.needsUpdate = true;

    state.legs = { left: new THREE.Group(), right: new THREE.Group() };

    function createArmoredLeg() {
      const lg = new THREE.Group();
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.105, 0.34, 8), waistcoatMat);
      thigh.position.y = -0.175;
      thigh.castShadow = true;
      lg.add(thigh);
      const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), matRogueArmor);
      kneePad.position.set(0.02, -0.35, 0.01);
      kneePad.scale.set(1, 0.72, 1);
      kneePad.castShadow = true;
      lg.add(kneePad);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.085, 0.28, 8), matRogueArmor);
      shin.position.y = -0.50;
      shin.castShadow = true;
      lg.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.32), bootMat);
      boot.position.set(0.05, -0.61, 0.06);
      boot.castShadow = true;
      lg.add(boot);
      const toeCap = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.07), matGold);
      toeCap.position.set(0.05, -0.63, 0.225);
      lg.add(toeCap);
      const heelPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.10), matGold);
      heelPlate.position.set(0.04, -0.665, -0.05);
      lg.add(heelPlate);
      return lg;
    }

    state.legs.left = createArmoredLeg(); state.legs.left.position.set(0, 0.62, 0.18); rogueGroup.add(state.legs.left);
    state.legs.right = createArmoredLeg(); state.legs.right.position.set(0, 0.62, -0.18); rogueGroup.add(state.legs.right);

    // --- Adventurer's kit layer (visual only) ---
    const fistMat = new THREE.MeshStandardMaterial({ color: 0x2b2b4a, roughness: 0.55, metalness: 0.45 });
    // swept hood point
    const hoodPoint = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 6), waistcoatMat);
    hoodPoint.position.set(0.02, 1.76, -0.26);
    hoodPoint.rotation.x = -1.05;
    torsoGroup.add(hoodPoint);
    // belt dagger tucked in the sash
    const daggerSheath = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.045), matStrap);
    daggerSheath.position.set(-0.27, 0.5, 0.2);
    daggerSheath.rotation.z = 0.5;
    torsoGroup.add(daggerSheath);
    const daggerHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.14, 6), matGold);
    daggerHilt.position.set(-0.34, 0.62, 0.2);
    daggerHilt.rotation.z = 0.5;
    torsoGroup.add(daggerHilt);
    const daggerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), matSilkLining);
    daggerGem.position.set(-0.38, 0.67, 0.2);
    torsoGroup.add(daggerGem);
    // matching dangle tassels
    [-0.12, 0.16].forEach((tx) => {
        const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.02), matSilkLining);
        tassel.position.set(tx, 0.32, 0.27);
        tassel.rotation.z = tx > 0 ? -0.22 : 0.18;
        torsoGroup.add(tassel);
        const tasselBead = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), matGold);
        tasselBead.position.set(tx * 1.06, 0.15, 0.27);
        torsoGroup.add(tasselBead);
    });
    let activeHatGroup = new THREE.Group();
    activeHatGroup.position.set(0, 1.80, 0); torsoGroup.add(activeHatGroup);



    // Held Items Assembly
    const armGroup = new THREE.Group();
    armGroup.position.set(0, 1.15, 0.35); torsoGroup.add(armGroup);

    const armMeshBasic = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8), matRogueCoat);
    armMeshBasic.position.set(0, -0.2, 0); armMeshBasic.rotation.z = -0.2; armMeshBasic.castShadow = true;
    armGroup.add(armMeshBasic);
    
    const saberGroup = new THREE.Group();
    saberGroup.position.set(0.1, -0.35, 0.1); saberGroup.rotation.x = Math.PI / 3; saberGroup.rotation.z = -Math.PI / 6;

    const pommelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), matGold);
    pommelMesh.position.y = -0.18; saberGroup.add(pommelMesh);
    const pommelGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), matShieldEmblem);
    pommelGem.position.y = -0.26; saberGroup.add(pommelGem);

    const hiltGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 8), matRogueArmor);
    hiltGrip.position.y = 0.02; saberGroup.add(hiltGrip);

    const guardCore = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.14), matGold);
    guardCore.position.y = 0.18; saberGroup.add(guardCore);

    const guardRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), matShieldEmblem);
    guardRing.position.y = 0.20; guardRing.rotation.x = Math.PI / 2; saberGroup.add(guardRing);

    const emitterCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.1, 8), matGold);
    emitterCollar.position.y = 0.25; saberGroup.add(emitterCollar);

    const bladeSheath = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 1.45, 12), saberBladeMat);
    bladeSheath.position.y = 0.98; bladeSheath.castShadow = true; saberGroup.add(bladeSheath);

    const bladeCore = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.42, 12), saberCoreMat);
    bladeCore.position.y = 0.98; saberGroup.add(bladeCore);

    for(let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045 - i * 0.005, 0.008, 6, 12), matShieldEmblem);
      ring.position.y = 0.35 + i * 0.12; ring.rotation.x = Math.PI / 2; saberGroup.add(ring);
    }

    const saberLight = new THREE.PointLight(0x38bdf8, 0, 6);
    saberLight.position.set(0, 0.98, 0); saberGroup.add(saberLight);
    armGroup.add(saberGroup);

    const offArmGroup = new THREE.Group();
    offArmGroup.position.set(0, 1.15, -0.35); torsoGroup.add(offArmGroup);

    const offArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8), matRogueCoat);
    offArmMesh.position.set(0, -0.2, 0); offArmMesh.rotation.z = 0.2; offArmMesh.castShadow = true;
    offArmGroup.add(offArmMesh);

    // --- Adventurer's kit layer: gauntleted hands (visual only) ---
    const saberFist = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), fistMat);
    saberFist.position.set(0.02, -0.46, 0.02);
    armGroup.add(saberFist);
    const saberCuff = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 6, 14), matGold);
    saberCuff.position.y = -0.32;
    saberCuff.rotation.x = Math.PI / 2;
    armGroup.add(saberCuff);
    const shieldFist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), fistMat);
    shieldFist.position.set(0, -0.44, 0);
    offArmGroup.add(shieldFist);
    const offCuff = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 6, 14), matGold);
    offCuff.position.y = -0.3;
    offCuff.rotation.x = Math.PI / 2;
    offArmGroup.add(offCuff);

    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(0.2, -0.25, -0.1);
    shieldGroup.rotation.y = Math.PI / 2;

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.7);
    shieldShape.lineTo(0.5, 0.48);
    shieldShape.lineTo(0.42, -0.42);
    shieldShape.lineTo(0, -0.8);
    shieldShape.lineTo(-0.42, -0.42);
    shieldShape.lineTo(-0.5, 0.48);
    shieldShape.closePath();

    const shieldExtrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.02, bevelThickness: 0.03 };
    const shieldPlateMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, shieldExtrudeSettings), matRogueArmor);
    shieldPlateMesh.castShadow = true; shieldGroup.add(shieldPlateMesh);

    const shieldBorderMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.1, bevelEnabled: false }), matGold);
    shieldBorderMesh.scale.set(0.9, 0.9, 0.85); shieldBorderMesh.position.z = 0.008; shieldGroup.add(shieldBorderMesh);

    const hexMatrixGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 6);
    const hexMatrixMesh = new THREE.Mesh(hexMatrixGeo, matShieldEmblem);
    hexMatrixMesh.rotation.x = Math.PI / 2; hexMatrixMesh.position.z = 0.09; shieldGroup.add(hexMatrixMesh);

    const shieldCoreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 2), saberCoreMat);
    shieldCoreMesh.position.set(0, 0, 0.12); shieldGroup.add(shieldCoreMesh);

    const shieldLight = new THREE.PointLight(0x38bdf8, 1.0, 4);
    shieldLight.position.set(0, 0, 0.22); shieldGroup.add(shieldLight);

    offArmGroup.add(shieldGroup);

    const usernameInput = byId<HTMLInputElement>('username');
    const startBtn = byId('start-btn');
    const startScreen = byId('start-screen');
    const respawnScreen = byId('respawn-screen');
    const respawnStageBtn = byId('respawn-stage-btn');
    const restartRunBtn = byId('restart-run-btn');

    function createFeatherMesh(color: number) {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({color, roughness:0.3, emissive:color, emissiveIntensity:0.2, side:THREE.DoubleSide});
      const q = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.75, 8), matGold); q.position.y = 0.35; g.add(q);
      const s = new THREE.Shape(); s.moveTo(0,0); s.quadraticCurveTo(0.18, 0.25, 0.12, 0.65); s.quadraticCurveTo(0, 0.75, 0, 0.75); s.quadraticCurveTo(-0.05, 0.5, 0, 0);
      const v = new THREE.Mesh(new THREE.ExtrudeGeometry(s, {depth:0.01, bevelEnabled:true, bevelSegments:2, steps:1, bevelSize:0.005, bevelThickness:0.005}), m);
      v.position.set(-0.02, 0.05, 0); v.rotation.y = 0.2; g.add(v);
      return g;
    }

    function buildCosmetics(username: string) {
      activeHatGroup.clear();
      const name = username.trim();
      let hatColor, featherColor = null, isBowler = false, labelText = "";

      if (name === "The_Corvid") { hatColor = 0x581c87; featherColor = 0xea580c; labelText = "Equipped: Purple Fedora & Orange Feather"; }
      else if (name === "AJTech") { hatColor = 0x1d4ed8; isBowler = true; labelText = "Equipped: Blue Bowler Hat"; }
      else if (name === "someone") { hatColor = 0x15803d; featherColor = 0xf8fafc; labelText = "Equipped: Green Fedora & White Feather"; }
      else if (name === "archivis7") { hatColor = 0xea580c; featherColor = 0x0f172a; labelText = "Equipped: Orange Fedora & Black Feather"; }
      else { hatColor = 0xb91c1c; labelText = "Equipped: Standard Red Fedora"; }

      const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.4 });
      if (isBowler) {
        activeHatGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16), hatMat));
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), hatMat); d.position.y = 0.02; activeHatGroup.add(d);
      } else {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.04, 16), hatMat); b.rotation.x = 0.08; activeHatGroup.add(b);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.35, 16), hatMat); c.position.set(0, 0.18, -0.02); c.rotation.x = 0.08; activeHatGroup.add(c);
      }
      if (featherColor !== null) {
        const f = createFeatherMesh(featherColor); f.position.set(-0.28, 0.15, 0.15); f.rotation.z = -Math.PI / 3.5; activeHatGroup.add(f);
      }
      byId('hat-status').textContent = labelText;
    }

    startBtn.addEventListener('click', () => { 
      buildCosmetics(usernameInput.value); 
      startScreen.classList.add('hidden'); 
      state.gameStarted = true; 
      bgAudio.play().catch(e => console.warn("Audio playback waiting on gesture:", e));
    });

    function resetPlayerStats(keepUpgrades = false) {
      const p = state.player;
      p.x = -12; p.y = 3; p.vx = 0; p.vy = 0;
      p.combo = 0; p.comboTimer = 0;
      p.dashCooldownTimer = 0; p.isDashing = false;
      p.invulnerableTimer = 0; p.holdingAttack = false; p.attackHoldTime = 0;
      if (!keepUpgrades) {
        p.maxHp = 100; p.hp = 100; p.baseDamage = 1.0; p.critChance = 0.10; p.lifesteal = 0;
        p.maxJumps = 2; p.dashCooldown = 1.2; p.fireSaber = false; p.iceSaber = false;
        p.chainParry = false; p.deflectionMult = 1.0; p.shieldExplosion = false; p.shieldCharge = 0;
        p.moveSpeedMult = 1.0; p.phantomSlash = false; p.thornArmor = false;
        state.upgradesObtained = [];
        updateUpgradePills();
      } else {
        p.hp = p.maxHp;
      }
      updateUIStats();
    }

    function respawnPlayer(restartRun = false) {
      if (restartRun) state.level = 1;
      resetPlayerStats(!restartRun);
      state.gameOver = false;
      state.upgradeActive = false;
      byId('game-status').textContent = 'Active';
      byId('game-status').style.color = '#4ade80';
      respawnScreen.classList.add('hidden');
      buildLevel(state.level);
    }

    respawnStageBtn.addEventListener('click', () => respawnPlayer(false));
    restartRunBtn.addEventListener('click', () => respawnPlayer(true));

    byId('hub-btn-start').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    byId('hub-btn-respawn').addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Enemy Mesh Factories
    const matMeleeEnemyArmor = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.3, metalness: 0.6, side: THREE.FrontSide });
    const matDarkPlate = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7, side: THREE.FrontSide });
    const matEnemyCoreGlow = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 });

    function createDetailedMeleeMesh(isElite = false, isBerserker = false) {
      const g = new THREE.Group();
      let colorMat = isElite ? new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.2, metalness: 0.8 }) : matMeleeEnemyArmor;
      let coreMat = isElite ? new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 4.0 }) : matEnemyCoreGlow;

      if (isBerserker) {
        colorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.1, metalness: 0.9 });
        coreMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xd97706, emissiveIntensity: 5.0 });
      }

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 1.2, 8), colorMat); torso.position.y = 0.85; torso.castShadow = true; g.add(torso);
      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.35), matDarkPlate); chestPlate.position.set(0.12, 0.9, 0); g.add(chestPlate);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), coreMat); core.position.set(0.28, 0.92, 0); g.add(core);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), matDarkPlate); head.position.y = 1.62; head.castShadow = true; g.add(head);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.32), coreMat); visor.position.set(0.16, 1.65, 0); g.add(visor);
      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.36), colorMat); pL.position.set(0, 1.35, 0.35); g.add(pL);
      const pR = pL.clone(); pR.position.z = -0.35; g.add(pR);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.08), matDarkPlate); blade.position.set(0.4, 0.8, 0.3); blade.rotation.z = -Math.PI / 4; g.add(blade);

      if (isElite) g.scale.set(1.3, 1.3, 1.3);
      if (isBerserker) g.scale.set(1.4, 1.4, 1.4);
      return g;
    }

    const matWizardRobe = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.5, side: THREE.FrontSide });
    const matWizardHood = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.6, side: THREE.FrontSide });
    const matOrbGlow = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 3.5 });
    const matWizardGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9 });

    function createDetailedRangedMesh(isElite = false) {
      const g = new THREE.Group();
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.55, 1.4, 10), matWizardRobe); robe.position.y = 0.85; robe.castShadow = true; g.add(robe);
      const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.5, 8), matWizardHood); cowl.position.set(-0.05, 1.6, 0); cowl.rotation.z = 0.2; g.add(cowl);
      const faceVoid = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), matDarkPlate); faceVoid.position.set(0.05, 1.52, 0); g.add(faceVoid);
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.25), matOrbGlow); eyes.position.set(0.2, 1.55, 0); g.add(eyes);
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), matWizardGold); staff.position.set(0.38, 1.0, 0.2); staff.rotation.z = -0.15; g.add(staff);
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 2), matOrbGlow); orb.position.set(0.42, 1.95, 0.2); g.add(orb);
      const orbLight = new THREE.PointLight(0x38bdf8, 1.5, 4); orbLight.position.copy(orb.position); g.add(orbLight);
      if (isElite) g.scale.set(1.25, 1.25, 1.25);
      return g;
    }

    function createShieldEnemyMesh(isElite = false) {
      const g = createDetailedMeleeMesh(isElite);
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.9), matDarkPlate);
      shield.position.set(0.5, 0.9, 0);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.42, 0.1), matGold);
      trim.position.set(0.5, 0.9, 0);
      g.add(shield, trim);
      return g;
    }

    function createAssassinMesh(isElite = false) {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
      const glowMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 3.0 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.1, 8), bodyMat); body.position.y = 0.7; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bodyMat); head.position.y = 1.35; g.add(head);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.25), glowMat); visor.position.set(0.15, 1.35, 0); g.add(visor);
      const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), glowMat); dagger.position.set(0.3, 0.7, 0.2); g.add(dagger);
      if (isElite) g.scale.set(1.2, 1.2, 1.2);
      return g;
    }

    const matBomberHull = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.4, metalness: 0.5 });
    const matBomberFuse = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 3.0 });

    function createBomberMesh(isElite = false) {
      const g = new THREE.Group();
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), matBomberHull); sphere.position.y = 0.65; sphere.castShadow = true; g.add(sphere);
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), matDarkPlate); fuse.position.set(0.18, 1.25, 0); fuse.rotation.z = -0.35; g.add(fuse);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), matBomberFuse); spark.position.set(0.30, 1.48, 0); g.add(spark);
      g.userData.bomberSpark = spark;
      const bandA = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 8, 16), matBomberFuse); bandA.position.y = 0.45; bandA.rotation.x = Math.PI / 2; g.add(bandA);
      const bandB = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 8, 16), matBomberFuse); bandB.position.y = 0.85; bandB.rotation.x = Math.PI / 2; g.add(bandB);
      if (isElite) g.scale.set(1.35, 1.35, 1.35);
      return g;
    }

    // Boss Meshes
    const matBossPlate = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.2, metalness: 0.8 });
    const matBossGlow = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 4.0 });
    
    function createBossMesh() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 2.8, 12), matBossPlate);
      body.position.y = 2.0; body.castShadow = true; g.add(body);
      
      const reactor = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), matBossGlow);
      reactor.position.set(0.6, 2.2, 0); g.add(reactor);
      
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 12, 24), matShieldEmblem);
      ring.rotation.x = Math.PI / 2; ring.position.y = 2.0; g.add(ring);
      g.userData.hoverRing = ring;

      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.2), matDarkPlate);
      shoulderL.position.set(0, 3.1, 1.2); g.add(shoulderL);
      const shoulderR = shoulderL.clone(); shoulderR.position.z = -1.2; g.add(shoulderR);

      const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.0, 10), matGold);
      thrusterL.position.set(-0.8, 2.8, 1.2); thrusterL.rotation.z = Math.PI/6; g.add(thrusterL);
      const thrusterR = thrusterL.clone(); thrusterR.position.z = -1.2; g.add(thrusterR);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), matDarkPlate);
      head.position.set(0.2, 3.5, 0); g.add(head);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.7), matBossGlow);
      visor.position.set(0.5, 3.5, 0); g.add(visor);

      const cannonL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8, 10), matDarkPlate);
      cannonL.position.set(0.8, 1.8, 0.9); cannonL.rotation.z = Math.PI/2; g.add(cannonL);
      const cannonR = cannonL.clone(); cannonR.position.z = -0.9; g.add(cannonR);

      return g;
    }

    const matLichBone = new THREE.MeshStandardMaterial({ color: 0xc2c5aa, roughness: 0.6, metalness: 0.2 });
    const matLichArmor = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.3, metalness: 0.9 });
    const matNecroGlow = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 3.5 });

    function createLichKingMesh() {
      const g = new THREE.Group();
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.5, 3.2, 12), matLichArmor);
      robe.position.y = 1.6; robe.castShadow = true; g.add(robe);

      const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 1.1, 8), matLichBone);
      ribcage.position.y = 2.4; g.add(ribcage);
      const soulCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 2), matNecroGlow);
      soulCore.position.set(0.1, 2.4, 0); g.add(soulCore);

      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), matLichBone);
      skull.position.set(0.1, 3.4, 0); g.add(skull);
      
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.8, 5), matGold);
      crown.position.set(0, 3.85, 0); g.add(crown);

      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 4), matNecroGlow);
      hornL.position.set(0.1, 4.0, 0.4); hornL.rotation.z = -0.3; hornL.rotation.x = 0.3; g.add(hornL);
      const hornR = hornL.clone(); hornR.position.z = -0.4; hornR.rotation.x = -0.3; g.add(hornR);

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.45), matNecroGlow);
      eyes.position.set(0.42, 3.45, 0); g.add(eyes);

      const scytheG = new THREE.Group();
      scytheG.position.set(1.1, 2.2, 0.4);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), matDarkPlate);
      handle.rotation.z = -0.2; scytheG.add(handle);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 4), matNecroGlow);
      blade.position.set(0.8, 1.9, 0); blade.rotation.z = Math.PI / 1.8; scytheG.add(blade);
      g.add(scytheG);
      g.userData.scythe = scytheG;

      const lichLight = new THREE.PointLight(0x22c55e, 3.0, 10);
      lichLight.position.set(0.5, 3.2, 0); g.add(lichLight);
      return g;
    }

    const matOverlordPlumage = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.35, metalness: 0.4 });
    const matOverlordGlow = new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 4.0 });

    function createOverlordMesh() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 14), matOverlordPlumage); body.position.y = 2.0; body.scale.set(1.0, 1.15, 1.0); body.castShadow = true; g.add(body);
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), matDarkPlate); chest.position.set(0, 1.9, 0.55); g.add(chest);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 2), matOverlordGlow); core.position.set(0, 1.95, 0.75); g.add(core);
      g.userData.overlordCore = core;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), matOverlordPlumage); head.position.set(0, 3.35, 0.15); g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 4), matGold); beak.position.set(0, 3.3, 0.55); beak.rotation.x = Math.PI / 2; g.add(beak);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 5.0 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat); eyeL.position.set(0.18, 3.45, 0.4); g.add(eyeL);
      const eyeR = eyeL.clone(); eyeR.position.x = -0.18; g.add(eyeR);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 4), matOverlordGlow); crest.position.set(0, 3.9, 0); crest.rotation.x = -0.4; g.add(crest);

      const wings = [];
      for (let i = 0; i < 2; i++) {
        const wing = new THREE.Group();
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.4, side: THREE.DoubleSide });
        const s = new THREE.Shape();
        s.moveTo(0, 0); s.lineTo(1.6, 0.5); s.lineTo(1.9, -0.3); s.lineTo(0.8, -0.8); s.closePath();
        const wm = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }), wingMat);
        wing.add(wm);
        const side = i === 0 ? 1 : -1;
        wing.position.set(side * 0.8, 2.4, 0);
        wing.scale.x = side;
        g.add(wing);
        wings.push(wing);
      }
      g.userData.wings = wings;

      const talonL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), matGold); talonL.position.set(0.3, 0.5, 0.2); talonL.rotation.x = Math.PI; g.add(talonL);
      const talonR = talonL.clone(); talonR.position.x = -0.3; g.add(talonR);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.07, 10, 32), matShieldEmblem);
      halo.rotation.x = Math.PI / 2; halo.position.y = 2.0; g.add(halo);
      g.userData.halo = halo;

      const olLight = new THREE.PointLight(0xea580c, 3.0, 12);
      olLight.position.set(0, 2.5, 0); g.add(olLight);
      return g;
    }

    // Character polish (visual only): env glints + full shadow casting on every part
    function polishCharacter(group: THREE.Object3D) {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (std.isMeshStandardMaterial && !std.envMap) {
            std.envMap = charEnvCube;
            std.envMapIntensity = 0.55;
            std.needsUpdate = true;
          }
        });
      });
    }

    function buildLevel(num: number) {
      selectRandomSong();
      state.platformMeshes.forEach(m => scene.remove(m)); state.platformMeshes = []; state.platforms = [];
      state.enemies.forEach(e => scene.remove(e.group)); state.enemies = [];
      if (state.boss) { scene.remove(state.boss.group); state.boss = null; }
      state.projectiles.forEach(p => safeRemove(p.mesh)); state.projectiles = [];
      
      const bossHud = byId('boss-hud');
      const bossTitle = byId('boss-title');

      if (num === 5 || num === 8 || num === 12) {
        bossHud.style.display = 'block';
        if (num === 5) {
          bossTitle.textContent = "LEVEL 5 BOSS: VOID DREADNOUGHT";
          bossTitle.style.color = "#ec4899";
        } else if (num === 8) {
          bossTitle.textContent = "LEVEL 8 BOSS: EVIL LICH KING";
          bossTitle.style.color = "#22c55e";
        } else {
          bossTitle.textContent = "LEVEL 12 BOSS: CORVID OVERLORD";
          bossTitle.style.color = "#ea580c";
        }
      } else {
        bossHud.style.display = 'none';
      }

      const groundWidth = 80 + num * 12;
      addPlatform(0, -1, groundWidth, 2, 4, true);

      if (num === 5) {
        const bg = createBossMesh(); bg.position.set(16, 0, 0); polishCharacter(bg); scene.add(bg);
        state.boss = { group: bg, x: 16, y: 0, vx: -3.5, w: 2.2, h: 3.5, hp: 60, maxHp: 60, shootTimer: 0, phase: 1, attackCooldown: 0, alive: true, type: 'dreadnought', isCharging: false, chargeTimer: 0 };
      } else if (num === 8) {
        const bg = createLichKingMesh(); bg.position.set(18, 0, 0); polishCharacter(bg); scene.add(bg);
        state.boss = { group: bg, x: 18, y: 0, vx: -4.0, w: 2.5, h: 3.8, hp: 100, maxHp: 100, shootTimer: 0, phase: 1, attackCooldown: 0, alive: true, type: 'lich', darknessMode: false };
      } else if (num === 12) {
        const bg = createOverlordMesh(); bg.position.set(20, 0, 0); polishCharacter(bg); scene.add(bg);
        state.boss = { group: bg, x: 20, y: 0, vx: -4.5, w: 2.6, h: 4.0, hp: 150, maxHp: 150, shootTimer: 0, phase: 1, attackCooldown: 0, alive: true, type: 'overlord', featherStormTimer: 8 };
      } else {
        const platformCount = 6 + (num % 4);
        for (let i = 0; i < platformCount; i++) {
          let px = -groundWidth/2 + 10 + i * ((groundWidth - 20) / platformCount) + Math.random()*2;
          let py = 2.5 + (i % 3) * 2.2 + Math.random();
          addPlatform(px, py, 6, 0.6);
        }
        const enemyCount = 4 + num * 2;
        for (let i = 0; i < enemyCount; i++) {
          const typeRoll = Math.random();
          const isElite = Math.random() < 0.20 + (num * 0.05);
          let type = 'melee';
          let g;

          if (typeRoll < 0.25) {
            type = 'melee'; g = createDetailedMeleeMesh(isElite, false);
          } else if (typeRoll < 0.50) {
            type = 'ranged'; g = createDetailedRangedMesh(isElite);
          } else if (typeRoll < 0.70) {
            type = 'shield'; g = createShieldEnemyMesh(isElite);
          } else if (typeRoll < 0.86) {
            type = 'assassin'; g = createAssassinMesh(isElite);
          } else if (typeRoll < 0.94) {
            type = 'bomber'; g = createBomberMesh(isElite);
          } else {
            type = 'berserker'; g = createDetailedMeleeMesh(isElite, true);
          }

          const ex = -groundWidth/2 + 15 + Math.random() * (groundWidth - 30);
          polishCharacter(g);
          g.position.set(ex, 0, 0); scene.add(g);

          let hpVal = type === 'shield' ? 6 : (type === 'assassin' ? 3 : (type === 'ranged' ? 4 : (type === 'berserker' ? 8 : (type === 'bomber' ? 2 : 5))));
          if (isElite) hpVal *= 2.2;

          state.enemies.push({
            group: g, x: ex, y: 0, vx: type === 'assassin' ? 5.5 : (type === 'berserker' ? 4.5 : (type === 'bomber' ? 4.0 : 2.5)), w: 0.8, h: 1.6,
            hp: hpVal, maxHp: hpVal, patrolLeft: ex - 8, patrolRight: ex + 8,
            type, isElite, shootTimer: Math.random() * 2, alive: true, frozenTimer: 0, fireDotTimer: 0, dodgeCD: 0
          });
        }
      }

      state.player.x = -groundWidth/2 + 6; state.player.y = 3; state.player.vx = 0; state.player.vy = 0; state.cleared = false;
      byId('level-num').textContent = String(num); updateEnemyCountUI();
    }

    function addPlatform(x: number, y: number, w: number, h: number, depth = 2, isGround = false) {
      const g = new THREE.Group(); g.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), isGround ? matGround : matPlatform); m.castShadow = true; m.receiveShadow = true; g.add(m);
      if (!isGround) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, depth + 0.02), matEdgeTrim); t.position.y = h / 2 + 0.03; g.add(t); }
      scene.add(g); state.platformMeshes.push(g); state.platforms.push({ x, y, w, h, bounds: { left: x - w/2, right: x + w/2, top: y + h/2, bottom: y - h/2 }, isGround });
    }

    function updateEnemyCountUI() {
      const r = state.enemies.filter(e => e.alive).length + (state.boss && state.boss.alive ? 1 : 0);
      byId('enemy-count').textContent = String(r);
    }

    function updateUIStats() {
      const p = state.player;
      byId('hp-text').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
      byId('hp-fill').style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
      byId('stat-dmg').textContent = (p.baseDamage * 10).toFixed(0);
      byId('stat-crit').textContent = `${Math.round(p.critChance * 100)}%`;
      const dashPct = p.dashCooldownTimer <= 0 ? 100 : Math.max(0, (1 - p.dashCooldownTimer / p.dashCooldown) * 100);
      byId('dash-fill').style.width = `${dashPct}%`;
      byId('dash-text').textContent = p.dashCooldownTimer <= 0 ? 'READY' : `${p.dashCooldownTimer.toFixed(1)}s`;

      const chargePct = Math.min(100, (p.attackHoldTime / 0.6) * 100);
      byId('charge-fill').style.width = `${chargePct}%`;
      byId('charge-text').textContent = chargePct >= 100 ? 'CHARGED!' : `${Math.round(chargePct)}%`;
    }

    function updateUpgradePills() {
      const container = byId('upgrade-pills');
      container.innerHTML = '';
      state.upgradesObtained.forEach(u => {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = u.title;
        container.appendChild(pill);
      });
    }

    function showUpgradeSelection() {
      state.upgradeActive = true;
      const screen = byId('upgrade-screen');
      const container = byId('upgrade-options');
      container.innerHTML = '';

      const singlePickIds = ['triple_jump', 'chain_parry', 'fire', 'ice', 'shield_exp', 'swift_boots', 'phantom', 'thorns'];
      const obtainedIds = state.upgradesObtained.map(u => u.id);

      let availablePool = ALL_UPGRADES.filter(u => {
        if (singlePickIds.includes(u.id) && obtainedIds.includes(u.id)) {
          return false;
        }
        return true;
      });

      if (availablePool.length === 0) availablePool = [...ALL_UPGRADES];

      const shuffled = [...availablePool].sort(() => 0.5 - Math.random());
      const choices = [];
      const chosenIds = new Set();
      for (const item of shuffled) {
        if (!chosenIds.has(item.id)) {
          choices.push(item);
          chosenIds.add(item.id);
        }
        if (choices.length === 3) break;
      }

      choices.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
          <div class="upgrade-icon">${opt.icon}</div>
          <div class="upgrade-title">${opt.title}</div>
          <div class="upgrade-desc">${opt.desc}</div>
          <div class="upgrade-tag">${opt.tag}</div>
        `;
        card.addEventListener('click', () => {
          applyUpgrade(opt);
          screen.classList.add('hidden');
          state.upgradeActive = false;
          state.level += 1;
          buildLevel(state.level);
        });
        container.appendChild(card);
      });

      screen.classList.remove('hidden');
    }

    function applyUpgrade(opt: UpgradeOption) {
      const p = state.player;
      state.upgradesObtained.push(opt);

      switch(opt.id) {
        case 'hp': p.maxHp += 25; p.hp = p.maxHp; break;
        case 'dmg': p.baseDamage += 0.35; break;
        case 'lifesteal': p.lifesteal += 0.15; break;
        case 'triple_jump': p.maxJumps = 3; break;
        case 'dash_cd': p.dashCooldown *= 0.65; break;
        case 'chain_parry': p.chainParry = true; break;
        case 'crit': p.critChance += 0.20; break;
        case 'fire': p.fireSaber = true; break;
        case 'ice': p.iceSaber = true; break;
        case 'deflect': p.deflectionMult += 1.0; break;
        case 'shield_exp': p.shieldExplosion = true; break;
        case 'swift_boots': p.moveSpeedMult = 1.25; p.dashCooldown *= 0.80; break;
        case 'phantom': p.phantomSlash = true; break;
        case 'thorns': p.thornArmor = true; break;
      }
      updateUpgradePills();
      updateUIStats();
    }

    function triggerFirework() {
      const fx = state.player.x + (Math.random()-0.5)*20; const fy = state.player.y+4+Math.random()*8;
      const c = [0xf59e0b, 0x38bdf8, 0xec4899, 0x22c55e][Math.floor(Math.random()*4)];
      const p = 70; const g = new THREE.BufferGeometry(); const pos = new Float32Array(p*3); const vel = [];
      for(let i=0; i<p; i++) { pos[i*3]=fx; pos[i*3+1]=fy; pos[i*3+2]=(Math.random()-0.5)*2; const t=Math.random()*Math.PI*2; const ph=(Math.random()-0.5)*Math.PI; const s=5+Math.random()*9; vel.push({x:Math.cos(t)*Math.cos(ph)*s, y:Math.sin(ph)*s, z:Math.sin(t)*Math.cos(ph)*s}); }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({color:c, size:0.28, transparent:true, opacity:1, blending:THREE.AdditiveBlending});
      const pts = new THREE.Points(g,m); scene.add(pts); state.fireworks.push({points:pts, velocities:vel, life:1.2, maxLife:1.2});
    }

    function spawnRangedProjectile(x: number, y: number, tx: number, c = 0xc084fc, speed = 12) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 10, 10), 
        new THREE.MeshBasicMaterial({ color: c })
      ); 
      m.position.set(x, y, 0);
      scene.add(m); 
      const dir = tx > x ? 1 : -1;
      const projectile = { mesh: m, x, y, vx: dir * speed, life: 3.5, deflected: false };
      state.projectiles.push(projectile);
      return projectile;
    }

    function createSlashParticles(x: number, y: number, c = 0x38bdf8, count = 16){
      for(let i=0; i<count; i++){ 
        const p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12), new THREE.MeshBasicMaterial({color:c})); 
        p.position.set(x,y,(Math.random()-0.5)*0.5); 
        scene.add(p); 
        state.particles.push({mesh:p, vx:(Math.random()-0.5)*12, vy:Math.random()*9+2, life:0.4}); 
      }
    }

    function handleShieldBlockImpact() {
      const p = state.player;
      if (!p.shieldExplosion) return;
      p.shieldCharge = (p.shieldCharge || 0) + 1;
      if (p.shieldCharge >= 3) {
        p.shieldCharge = 0;
        triggerScreenFlash('rgba(245, 158, 11, 0.5)', 0.2);
        createSlashParticles(p.x, p.y + 1, 0xf59e0b, 30);
        spawnFloatingText('NOVA EXPLOSION!', p.x, p.y + 1.8, 'crit');
        state.enemies.forEach(en => {
          if (en.alive && Math.abs(en.x - p.x) < 5.0) {
            en.hp -= 20 * p.baseDamage;
            if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); }
          }
        });
        if (state.boss && state.boss.alive && Math.abs(state.boss.x - p.x) < 6.0) {
          state.boss.hp -= 20 * p.baseDamage;
          if (state.boss.hp <= 0) { state.boss.alive = false; scene.remove(state.boss.group); updateEnemyCountUI(); }
        }
      }
    }

    function handleThornBurst(dmgTaken: number) {
      const p = state.player;
      if (!p.thornArmor || dmgTaken <= 0) return;
      createSlashParticles(p.x, p.y + 1, 0x22c55e, 22);
      spawnFloatingText('THORNS!', p.x, p.y + 1.8, 'heal');
      state.enemies.forEach(en => {
        if (en.alive && Math.abs(en.x - p.x) < 3.5) {
          en.hp -= dmgTaken * 0.30;
          if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); }
        }
      });
      if (state.boss && state.boss.alive && Math.abs(state.boss.x - p.x) < 4.0) {
        state.boss.hp -= dmgTaken * 0.30;
        if (state.boss.hp <= 0) { state.boss.alive = false; scene.remove(state.boss.group); updateEnemyCountUI(); }
      }
    }

    function performDash() {
      const p = state.player;
      if (p.dashCooldownTimer > 0) return;
      p.dashCooldownTimer = p.dashCooldown;
      p.isDashing = true;
      p.dashTimer = 0.22;
      p.invulnerableTimer = 0.35;
      p.vx = (p.facingRight ? 1 : -1) * MOVE_SPEED * 2.8;

      for(let i = 0; i < 3; i++) {
        setTimeout(() => {
          const ghost = rogueGroup.clone();
          ghost.position.copy(rogueGroup.position);
          ghost.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
            }
          });
          scene.add(ghost);
          state.ghostTrails.push({ mesh: ghost, life: 0.25 });
        }, i * 40);
      }
      createSlashParticles(p.x, p.y + 1, 0x38bdf8);
    }

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => { 
      if (!state.gameStarted || state.gameOver || state.upgradeActive) return; 
      keys[e.code] = true; 
      if (e.code === 'KeyQ') performDash();
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        state.player.jumpBufferTimer = 0.18;
      }
      if (e.code === 'KeyF') {
        state.player.holdingAttack = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown' || e.code === 'ShiftLeft') {
        state.player.blocking = true;
        state.player.parryWindowTimer = 0.20;
      }
    });

    window.addEventListener('keyup', (e) => { 
      if (!state.gameStarted || state.gameOver || state.upgradeActive) return;
      keys[e.code] = false; 
      if (e.code === 'KeyF') {
        triggerAttackRelease();
        state.player.holdingAttack = false;
        state.player.attackHoldTime = 0;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown' || e.code === 'ShiftLeft') {
        state.player.blocking = false;
      }
    });

    window.addEventListener('mousedown', (e) => { 
      if (!state.gameStarted || state.gameOver || state.upgradeActive) return; 
      if (e.button === 0) { 
        state.player.holdingAttack = true;
      } else if (e.button === 2) {
        state.player.blocking = true;
        state.player.parryWindowTimer = 0.20;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!state.gameStarted || state.gameOver || state.upgradeActive) return;
      if (e.button === 0) {
        triggerAttackRelease();
        state.player.holdingAttack = false;
        state.player.attackHoldTime = 0;
      }
      if (e.button === 2) state.player.blocking = false;
    });

    function triggerAttackRelease() {
      const p = state.player;
      if (p.attacking || p.attackCooldown > 0) return;
      const isCharged = p.attackHoldTime >= 0.6;
      triggerSaberSlash(isCharged);
    }

    function triggerSaberSlash(isCharged = false) {
      const p = state.player;
      p.attacking = true; 
      p.attackTimer = isCharged ? 0.40 : 0.22; 
      p.attackCooldown = isCharged ? 0.55 : 0.25;
      p.comboChain = (p.comboChain + 1) % 3;
      saberLight.intensity = isCharged ? 10 : 5;

      const airAttack = !p.grounded;
      const baseMult = isCharged ? 2.8 : (1.0 + p.comboChain * 0.25) + (airAttack ? 0.3 : 0);
      const slashX = p.x + (p.facingRight ? 1.6 : -1.6);
      const isCrit = Math.random() < p.critChance;
      const finalDmg = (12 * p.baseDamage * baseMult) * (isCrit ? 2.0 : 1.0);

      createSlashParticles(slashX, p.y + 1, isCharged ? 0xf59e0b : (airAttack ? 0x38bdf8 : 0xec4899), isCharged ? 28 : 16);

      let hitOccurred = false;

      // Projectile Parrying
      state.projectiles.forEach(pr => {
        if (pr.deflected) return;
        if (Math.abs(pr.x - slashX) < 2.8 && Math.abs(pr.y - (p.y + 1)) < 1.8) {
          pr.deflected = true;
          pr.vx = (p.facingRight ? 1 : -1) * (26 * p.deflectionMult);
          (pr.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
          state.cameraShake = 0.22;
          triggerScreenFlash('rgba(56, 189, 248, 0.4)', 0.1);
          createSlashParticles(pr.x, pr.y, 0x38bdf8, 20);

          if (p.chainParry) {
            state.enemies.forEach(en => {
              if (en.alive && Math.abs(en.x - p.x) < 9.0) {
                en.hp -= 12 * p.baseDamage;
                spawnFloatingText('CHAIN!', en.x, en.y + 1.2, 'parry');
                createSlashParticles(en.x, en.y + 1, 0x38bdf8, 12);
              }
            });
          }
        }
      });

      // Boss Hit Detection
      if (state.boss && state.boss.alive && Math.abs(state.boss.x - slashX) < 3.8 && Math.abs((state.boss.y + 1.5) - (p.y + 1)) < 2.5) {
        state.boss.hp -= finalDmg;
        hitOccurred = true;
        registerHitCombo(finalDmg, isCrit, { x: state.boss.x, y: state.boss.y + 2.0 }, p.fireSaber ? 'fire' : (p.iceSaber ? 'ice' : null));
        createSlashParticles(state.boss.x, state.boss.y + 1.8, state.boss.type === 'lich' ? 0x22c55e : 0xec4899);
        state.cameraShake = 0.20;
        if (state.boss.hp <= 0) { state.boss.alive = false; scene.remove(state.boss.group); updateEnemyCountUI(); }
      }

      // Enemy Hit Detection & Execution
      state.enemies.forEach(en => {
        if (!en.alive) return;
        if (Math.abs(en.x - slashX) < 2.8 && Math.abs((en.y + en.h / 2) - (p.y + 1)) < 1.8) {
          hitOccurred = true;
          let actualDmg = finalDmg;
          if (en.type === 'shield' && ((p.facingRight && en.vx < 0) || (!p.facingRight && en.vx > 0))) {
            actualDmg *= 0.25;
          }

          const executeThreshold = en.maxHp * 0.25;
          let isExec = false;
          if (en.hp <= executeThreshold) {
            actualDmg = en.hp + 99;
            isExec = true;
          }

          en.hp -= actualDmg;
          if (p.iceSaber) en.frozenTimer = 2.0;
          if (p.fireSaber) en.fireDotTimer = 3.0;

          registerHitCombo(actualDmg, isCrit, { x: en.x, y: en.y + 1.2 }, p.fireSaber ? 'fire' : (p.iceSaber ? 'ice' : null), isExec);
          createSlashParticles(en.x, en.y + 1, isExec ? 0xef4444 : (isCrit ? 0xf59e0b : 0xef4444), isExec ? 30 : 16);
          en.x += (p.facingRight ? 1.0 : -1.0) * (isCharged ? 2.2 : 0.8);

          if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); }
        }
      });

      // Phantom Slash Echo
      if (p.phantomSlash && hitOccurred && Math.random() < 0.30) {
        createSlashParticles(slashX, p.y + 1, 0x38bdf8, 20);
        spawnFloatingText('PHANTOM!', slashX, p.y + 2.2, 'parry');
        if (state.boss && state.boss.alive && Math.abs(state.boss.x - slashX) < 3.8 && Math.abs((state.boss.y + 1.5) - (p.y + 1)) < 2.5) {
          const echoDmg = finalDmg * 0.6;
          state.boss.hp -= echoDmg;
          registerHitCombo(echoDmg, false, { x: state.boss.x, y: state.boss.y + 2.0 }, 'ice');
          if (state.boss.hp <= 0) { state.boss.alive = false; scene.remove(state.boss.group); updateEnemyCountUI(); }
        }
        state.enemies.forEach(en => {
          if (!en.alive) return;
          if (Math.abs(en.x - slashX) < 2.8 && Math.abs((en.y + en.h / 2) - (p.y + 1)) < 1.8) {
            en.hp -= finalDmg * 0.6;
            createSlashParticles(en.x, en.y + 1, 0x38bdf8, 10);
            if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); }
          }
        });
      }

      if (hitOccurred) {
        state.hitStopTimer = isCharged ? 0.08 : 0.04;
      }
    }

    buildLevel(1);
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      if (!state.gameStarted) { composer.render(); return; }
      const dt = Math.min(clock.getDelta(), 0.08);

      if (state.gameOver || state.upgradeActive) { composer.render(); return; }

      if (state.hitStopTimer > 0) {
        state.hitStopTimer -= dt;
        return;
      }

      const p = state.player;

      // Check Stage Completion
      const remainingEnemies = state.enemies.filter(e => e.alive).length;
      const bossAlive = state.boss && state.boss.alive;
      if (remainingEnemies === 0 && !bossAlive && !state.cleared) {
        state.cleared = true;
        levelsCleared += 1;
        localStorage.setItem(STORAGE_KEY_LEVELS_CLEARED, String(levelsCleared));
        byId('levels-cleared-count').textContent = String(levelsCleared);

        const banner = byId('level-banner');
        banner.style.opacity = '1';
        for (let i = 0; i < 5; i++) setTimeout(triggerFirework, i * 200);

        setTimeout(() => {
          banner.style.opacity = '0';
          showUpgradeSelection();
        }, 1200);
      }

      // Check Player Defeat
      if (p.hp <= 0 && !state.gameOver) {
        state.gameOver = true;
        byId('game-status').textContent = 'Defeated';
        byId('game-status').style.color = '#ef4444';
        respawnScreen.classList.remove('hidden');
        composer.render();
        return;
      }

      // Handle Saber Hold Logic
      if (p.holdingAttack && !p.attacking) {
        p.attackHoldTime += dt;
      }

      // Combo System Timer
      if (p.combo > 0) {
        p.comboTimer -= dt;
        if (p.comboTimer <= 0) {
          p.combo = 0;
          byId('combo-box').classList.remove('active');
        }
      }

      updateDPSTracker();
      updateUIStats();

      state.cycleTime = (state.cycleTime + dt) % DAY_NIGHT_CYCLE_SECONDS;
      const cycleProgress = state.cycleTime / DAY_NIGHT_CYCLE_SECONDS;

      const totalHours = (cycleProgress * 24 + 6) % 24;
      const hours24 = Math.floor(totalHours);
      const minutes = Math.floor((totalHours - hours24) * 60);
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const displayHours = hours24 % 12 === 0 ? 12 : hours24 % 12;
      const timeString = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
      byId('time-hud').textContent = `Celestial Time: Day ${timeString}`;

      const sunAngle = cycleProgress * Math.PI * 2;
      const sunRadius = 55;
      sunMesh.position.x = p.x + Math.cos(sunAngle) * sunRadius;
      sunMesh.position.y = Math.sin(sunAngle) * sunRadius;
      sunMesh.position.z = -12;

      sunLight.position.copy(sunMesh.position);
      sunLight.target.position.set(p.x, p.y, 0);
      sunLight.target.updateMatrixWorld();

      const sunHeight = Math.sin(sunAngle);
      const dayColor = new THREE.Color(0x38bdf8);
      const sunsetColor = new THREE.Color(0xf97316);
      const nightColor = new THREE.Color(0x030712);

      const daySunLight = new THREE.Color(0xfff1e6);
      const sunsetSunLight = new THREE.Color(0xf59e0b);
      const nightSunLight = new THREE.Color(0x1e293b);
    const skyGlowDay = new THREE.Color(0xfff8e6);
    const skyGlowSunset = new THREE.Color(0xff9a3c);

      if (sunHeight > 0.2) { 
        const t = (sunHeight - 0.2) / 0.8; 
        bgMat.color.lerpColors(sunsetColor, dayColor, t); 
        sunLight.color.lerpColors(sunsetSunLight, daySunLight, t);
        sunLight.intensity = THREE.MathUtils.lerp(1.2, 2.5, t); 
        ambientLight.intensity = THREE.MathUtils.lerp(0.35, 0.5, t); 
        starMat.opacity = 0; 
      } else if (sunHeight > -0.2) { 
        const t = (sunHeight + 0.2) / 0.4;
        bgMat.color.lerpColors(nightColor, sunsetColor, t);
        sunLight.color.copy(sunsetSunLight);
        sunLight.intensity = THREE.MathUtils.lerp(0.2, 1.2, t);
        ambientLight.intensity = THREE.MathUtils.lerp(0.18, 0.35, t);
        starMat.opacity = THREE.MathUtils.lerp(0.6, 0.0, t);
      } else { 
        const t = Math.min(1, (-sunHeight - 0.2) / 0.8); 
        bgMat.color.lerpColors(sunsetColor, nightColor, t); 
        sunLight.color.copy(nightSunLight);
        sunLight.intensity = 0.15; 
        ambientLight.intensity = 0.12; 
        starMat.opacity = 0.85 * t; 
      }

      // Lich King Darkness Mode Visuals
      if (state.boss && state.boss.alive && state.boss.type === 'lich' && state.boss.darknessMode) {
        bgMat.color.setHex(0x020617);
        (scene.fog as THREE.FogExp2).color.setHex(0x020617);
        sunLight.intensity = 0.05;
      } else {
        scene.background = bgMat.color;
        (scene.fog as THREE.FogExp2).color.copy(bgMat.color);
      }

      // Living sky FX updates (visual only)
      const skyTime = clock.getElapsedTime();
      const lichDarkness = state.boss && state.boss.alive && state.boss.type === 'lich' && state.boss.darknessMode;

      const moonMat = skyFX.moon.material as THREE.MeshBasicMaterial;
      skyFX.moon.position.set(
        p.x - Math.cos(sunAngle) * sunRadius,
        -Math.sin(sunAngle) * sunRadius,
        -12
      );
      moonMat.opacity = lichDarkness ? 0.15 : THREE.MathUtils.clamp(skyFX.moon.position.y / 34, 0, 0.95);

      skyFX.sunGlow.position.copy(sunMesh.position);
      skyFX.sunGlow.position.z = -12;
      const sunGlowMat = skyFX.sunGlow.material as THREE.SpriteMaterial;
      const horizonGlow = Math.max(0, 1 - Math.abs(sunHeight) / 0.45);
      sunGlowMat.opacity = lichDarkness ? 0 : 0.3 + 0.55 * horizonGlow + 0.2 * Math.max(0, sunHeight);
      sunGlowMat.color.copy(skyGlowDay).lerp(skyGlowSunset, Math.max(0, 1 - Math.max(0, sunHeight) / 0.6));

      skyFX.clouds.forEach((cloud, ci) => {
        cloud.group.position.x += cloud.speed * dt;
        if (cloud.group.position.x > p.x + 95) cloud.group.position.x = p.x - 95;
        if (cloud.group.position.x < p.x - 95) cloud.group.position.x = p.x + 95;
        cloud.group.position.y = cloud.baseY + Math.sin(skyTime * 0.12 + ci * 1.7) * 0.9;
        cloud.mat.opacity = lichDarkness ? 0.04 : THREE.MathUtils.lerp(0.05, 0.92, Math.max(0, sunHeight));
      });

      const auroraStrength = lichDarkness ? 0 : Math.min(1, starMat.opacity * 1.4);
      skyFX.auroras.forEach((ribbon, ri) => {
        (ribbon.material as THREE.MeshBasicMaterial).opacity = auroraStrength * (ri === 0 ? 0.65 : 0.45);
        ribbon.position.x = p.x + Math.sin(skyTime * (0.08 + ri * 0.05)) * 20;
        ribbon.position.y = (ribbon.userData.baseY as number) + Math.sin(skyTime * 0.1 + ri * 2.1) * 1.8;
        ribbon.rotation.z = Math.sin(skyTime * 0.06 + ri * 1.3) * (ri === 0 ? 0.06 : -0.05);
      });

      // Dash & Movement Timers
      if (p.dashCooldownTimer > 0) p.dashCooldownTimer -= dt;
      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        if (p.dashTimer <= 0) p.isDashing = false;
      }

      if (!p.isDashing) {
        p.vx = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) { p.vx = -MOVE_SPEED * p.moveSpeedMult; p.facingRight = false; }
        if (keys['KeyD'] || keys['ArrowRight']) { p.vx = MOVE_SPEED * p.moveSpeedMult; p.facingRight = true; }
      }
      p.x += p.vx * dt;

      // Jump Buffering, Wall Jump & Coyote Time
      if (p.grounded) {
        p.coyoteTimer = 0.12;
        p.jumpsLeft = p.maxJumps;
      } else {
        p.coyoteTimer -= dt;
      }

      p.touchingWall = 0;
      state.platforms.forEach(plat => {
        const b = plat.bounds;
        if (p.y >= b.bottom && p.y <= b.top) {
          if (Math.abs(p.x - b.right) < 0.35) p.touchingWall = -1;
          if (Math.abs(p.x - b.left) < 0.35) p.touchingWall = 1;
        }
      });

      if (p.jumpBufferTimer > 0) {
        p.jumpBufferTimer -= dt;
        if (p.grounded || p.coyoteTimer > 0) {
          p.vy = JUMP_FORCE;
          p.grounded = false;
          p.coyoteTimer = 0;
          p.jumpBufferTimer = 0;
          p.jumpsLeft = p.maxJumps - 1;
        } else if (p.touchingWall !== 0) {
          p.vy = JUMP_FORCE * 1.05;
          p.vx = -p.touchingWall * MOVE_SPEED * 1.3;
          p.facingRight = p.touchingWall < 0;
          p.jumpBufferTimer = 0;
          createSlashParticles(p.x, p.y + 0.5, 0x38bdf8, 12);
        } else if (p.jumpsLeft > 0) {
          p.vy = JUMP_FORCE * 0.92;
          p.jumpsLeft -= 1;
          p.jumpBufferTimer = 0;
          createSlashParticles(p.x, p.y, 0xf8fafc, 10);
        }
      }

      const targetYRot = p.facingRight ? 0 : Math.PI;
      rogueGroup.rotation.y = THREE.MathUtils.lerp(rogueGroup.rotation.y, targetYRot, 18 * dt);
      
      const time = clock.getElapsedTime();

      // Core Crystal & Armor Breathing Animation
      const pulse = (Math.sin(time * 6) + 1) * 0.5;
      const breathing = Math.sin(time * 3) * 0.03;
      torsoGroup.position.y = 0.05 + breathing;
      coreGem.material.emissiveIntensity = 1.5 + pulse * 2.0;
      chestLight.intensity = 0.45 + pulse * 0.75;
      helmetVisor.material.emissiveIntensity = 1.5 + pulse * 1.5;

      const isMoving = p.vx !== 0;
      (state.capeMeshes as THREE.Mesh[]).forEach((seg, i) => {
        const targetRotZ = isMoving ? -(Math.PI / 6) - Math.sin(time * 12 - i * 0.6) * (Math.PI / 12) : 0;
        seg.rotation.z = THREE.MathUtils.lerp(seg.rotation.z, targetRotZ, 10 * dt);
      });

      if (p.blocking) {
        offArmGroup.rotation.z = THREE.MathUtils.lerp(offArmGroup.rotation.z, -Math.PI / 2.5, 16 * dt);
        offArmGroup.rotation.y = THREE.MathUtils.lerp(offArmGroup.rotation.y, Math.PI / 3, 16 * dt);
        shieldLight.intensity = THREE.MathUtils.lerp(shieldLight.intensity, 3.5, 16 * dt);
      } else {
        offArmGroup.rotation.z = THREE.MathUtils.lerp(offArmGroup.rotation.z, 0, 12 * dt);
        offArmGroup.rotation.y = THREE.MathUtils.lerp(offArmGroup.rotation.y, 0, 12 * dt);
        shieldLight.intensity = THREE.MathUtils.lerp(shieldLight.intensity, 1.0, 12 * dt);
      }

      const legs = state.legs as { left: THREE.Group; right: THREE.Group };
      if (p.grounded && isMoving) {
        const walkSpeed = 14;
        legs.left.rotation.z = Math.sin(time * walkSpeed) * 0.55;
        legs.right.rotation.z = -Math.sin(time * walkSpeed) * 0.55;
      } else if (!p.grounded) {
        legs.left.rotation.z = THREE.MathUtils.lerp(legs.left.rotation.z, Math.PI / 6, 15 * dt);
        legs.right.rotation.z = THREE.MathUtils.lerp(legs.right.rotation.z, -Math.PI / 8, 15 * dt);
      } else {
        legs.left.rotation.z = THREE.MathUtils.lerp(legs.left.rotation.z, 0, 15 * dt);
        legs.right.rotation.z = THREE.MathUtils.lerp(legs.right.rotation.z, 0, 15 * dt);
      }

      p.vy += GRAVITY * dt; p.y += p.vy * dt;
      p.grounded = false;
      if (p.y < GROUND_PLANE_Y) { p.y = GROUND_PLANE_Y; p.vy = 0; p.grounded = true; }
      state.platforms.forEach(plat => { if (plat.isGround) return; const b = plat.bounds; if (p.x+0.3 > b.left && p.x-0.3 < b.right) { if (p.vy <= 0 && p.y >= b.top - 0.25 && p.y + p.vy * dt <= b.top) { p.y = b.top; p.vy = 0; p.grounded = true; } } });
      if (p.y < -8) p.hp = 0;
      rogueGroup.position.set(p.x, p.y, 0);

      if (p.attackCooldown > 0) p.attackCooldown -= dt;
      if (p.parryWindowTimer > 0) p.parryWindowTimer -= dt;

      if (p.attacking) { 
        armGroup.rotation.z = -Math.sin((0.22 - (p.attackTimer-=dt)) / 0.22 * Math.PI) * 2.2; 
        if (p.attackTimer <= 0) { p.attacking = false; armGroup.rotation.z = 0; saberLight.intensity = 0; } 
      }
      if (p.invulnerableTimer > 0) { p.invulnerableTimer -= dt; rogueGroup.visible = Math.floor(p.invulnerableTimer * 20) % 2 === 0; } else { rogueGroup.visible = true; }

      // Dynamic Boss Behavioral AI
      if (state.boss && state.boss.alive) {
        const b = state.boss;
        b.shootTimer += dt;

        if (b.type === 'dreadnought') {
          if (b.group.userData.hoverRing) b.group.userData.hoverRing.rotation.z += dt * 3;

          const hpRatio = b.hp / b.maxHp;
          if (hpRatio < 0.3) b.phase = 3;
          else if (hpRatio < 0.65) b.phase = 2;

          if (b.isCharging) {
            b.x += (p.x > b.x ? 1 : -1) * 16.0 * dt;
            b.chargeTimer -= dt;
            if (b.chargeTimer <= 0) b.isCharging = false;
          } else {
            b.x += b.vx * dt; if (b.x > 22 || b.x < -22) b.vx *= -1;
          }

          b.group.position.set(b.x, b.y + Math.sin(time * 3) * 0.25, 0);
          b.group.rotation.y = THREE.MathUtils.lerp(b.group.rotation.y, b.vx < 0 ? 0 : Math.PI, 14 * dt);

          const shootDelay = b.phase === 3 ? 0.8 : (b.phase === 2 ? 1.1 : 1.5);
          if (b.shootTimer >= shootDelay) {
            b.shootTimer = 0;
            spawnRangedProjectile(b.x, b.y + 2.0, p.x, 0xec4899, 14);
            spawnRangedProjectile(b.x, b.y + 2.8, p.x, 0xa855f7, 14);
            if (b.phase >= 2) {
              spawnRangedProjectile(b.x, b.y + 1.2, p.x + (b.vx > 0 ? 6 : -6), 0xec4899, 16);
            }
            if (b.phase === 3 && Math.random() < 0.45) {
              b.isCharging = true;
              b.chargeTimer = 0.8;
              triggerScreenFlash('rgba(236, 72, 153, 0.3)', 0.15);
            }
          }
        } else if (b.type === 'lich') {
          if (b.group.userData.scythe) b.group.userData.scythe.rotation.x = Math.sin(time * 4) * 0.3;

          const hpRatio = b.hp / b.maxHp;
          if (hpRatio < 0.3) b.phase = 3;
          else if (hpRatio < 0.65) b.phase = 2;

          b.darknessMode = b.phase >= 2;

          b.x += b.vx * dt; if (b.x > 22 || b.x < -22) b.vx *= -1;
          b.group.position.set(b.x, b.y, 0);

          const shootDelay = b.phase === 3 ? 0.7 : (b.phase === 2 ? 1.0 : 1.3);

          if (b.shootTimer >= shootDelay) {
            b.shootTimer = 0;
            spawnRangedProjectile(b.x, b.y + 3.2, p.x, 0x22c55e, 14);
            spawnRangedProjectile(b.x + 1.2, b.y + 2.0, p.x + 2, 0x38bdf8, 14);
            spawnRangedProjectile(b.x - 1.2, b.y + 2.0, p.x - 2, 0x38bdf8, 14);

            if (b.phase === 3 && Math.random() < 0.35 && state.enemies.filter(e => e.alive).length < 3) {
              const minionG = createAssassinMesh(false);
              const mx = b.x + (Math.random() - 0.5) * 6;
              minionG.position.set(mx, 0, 0); scene.add(minionG);
              state.enemies.push({ group: minionG, x: mx, y: 0, vx: 5, w: 0.8, h: 1.6, hp: 2, maxHp: 2, patrolLeft: mx-4, patrolRight: mx+4, type: 'assassin', isElite: false, shootTimer: 0, alive: true, frozenTimer: 0, fireDotTimer: 0, dodgeCD: 0 });
              spawnFloatingText('SUMMON!', b.x, b.y + 3.0, 'parry');
            }

            if (b.phase >= 2 && Math.random() < 0.4) {
              createSlashParticles(b.x, b.y + 2.0, 0x22c55e, 20);
              b.x = p.x + (Math.random() > 0.5 ? 5 : -5);
              b.x = Math.max(-22, Math.min(22, b.x));
              createSlashParticles(b.x, b.y + 2.0, 0x22c55e, 20);
            }
          }
        } else if (b.type === 'overlord') {
          const hpRatio = b.hp / b.maxHp;
          if (hpRatio < 0.33) b.phase = 3;
          else if (hpRatio < 0.66) b.phase = 2;

          // Wing flap, halo spin, core pulse
          if (b.group.userData.wings) {
            b.group.userData.wings.forEach((wing: THREE.Group, i: number) => {
              (wing as THREE.Group).rotation.z = Math.sin(time * 7) * 0.5 * (i === 0 ? 1 : -1);
            });
          }
          if (b.group.userData.halo) b.group.userData.halo.rotation.z += dt * 4;
          if (b.group.userData.overlordCore) b.group.userData.overlordCore.rotation.y += dt * 5;

          // Hovering drift
          b.x += b.vx * dt; if (b.x > 24 || b.x < -24) b.vx *= -1;
          b.y = Math.sin(time * 2.2) * 1.2;
          b.group.position.set(b.x, b.y, 0);

          const shootDelay = b.phase === 3 ? 0.6 : (b.phase === 2 ? 0.9 : 1.2);
          if (b.shootTimer >= shootDelay) {
            b.shootTimer = 0;
            spawnRangedProjectile(b.x, b.y + 3.2, p.x, 0xea580c, 16);
            if (b.phase >= 2) {
              spawnRangedProjectile(b.x + 0.8, b.y + 3.0, p.x + 1.5, 0xf97316, 14);
              spawnRangedProjectile(b.x - 0.8, b.y + 3.0, p.x - 1.5, 0xf97316, 14);
            }
          }

          // Feather Storm: radial burst on a cycle
          b.featherStormTimer -= dt;
          if (b.featherStormTimer <= 0) {
            b.featherStormTimer = b.phase === 3 ? 3.5 : (b.phase === 2 ? 5 : 7);
            const count = b.phase === 3 ? 16 : (b.phase === 2 ? 12 : 8);
            for (let i = 0; i < count; i++) {
              const a = (i / count) * Math.PI * 2 + time;
              const pr = spawnRangedProjectile(b.x, b.y + 2.2, p.x, 0xc084fc, 10);
              pr.vx = Math.cos(a) * 9;
              pr.life = 2.5;
            }
            triggerScreenFlash('rgba(192, 132, 252, 0.25)', 0.18);
            spawnFloatingText('FEATHER STORM!', b.x, b.y + 4.5, 'parry');
          }
        }

        // Damage Collision with Boss
        if (Math.hypot(b.x - p.x, (b.y + 1.5) - (p.y + 0.8)) < 2.2 && p.invulnerableTimer <= 0) { 
          if (p.parryWindowTimer > 0) {
            p.invulnerableTimer = 0.4;
            spawnFloatingText('PERFECT PARRY!', p.x, p.y + 1.8, 'parry');
            triggerScreenFlash('rgba(56, 189, 248, 0.6)', 0.15);
            state.cameraShake = 0.3;
          } else {
            const baseDmg = 30;
            const dmg = p.blocking ? baseDmg * 0.5 : baseDmg;
            if (p.blocking) handleShieldBlockImpact();
            p.hp -= dmg; p.invulnerableTimer = 1.2; p.vy = 8; p.vx = b.vx > 0 ? 7 : -7; 
            handleThornBurst(dmg);
            createSlashParticles(p.x, p.y + 1.0, p.blocking ? 0x38bdf8 : 0xef4444); 
          }
        }
        byId('boss-hp-fill').style.width = (Math.max(0, b.hp / b.maxHp) * 100) + '%';
        byId('boss-hp-text').textContent = `${Math.ceil((b.hp / b.maxHp) * 100)}%`;
      }

      // Update Enemies
      state.enemies.forEach(en => { 
        if (!en.alive) return;

        if (en.dodgeCD > 0) en.dodgeCD -= dt;

        if (en.dodgeCD <= 0 && Math.abs(en.x - p.x) < 3.0 && p.attacking) {
          en.vx = (en.x > p.x ? 1 : -1) * 8.0;
          en.dodgeCD = 3.0;
          createSlashParticles(en.x, en.y + 0.8, 0x94a3b8, 10);
        }

        if (en.frozenTimer > 0) {
          en.frozenTimer -= dt;
        } else {
          en.x += en.vx * (en.type === 'assassin' ? 1.2 : 1.0) * dt;
          if (en.x > en.patrolRight || en.x < en.patrolLeft) en.vx *= -1;
        }

        if (en.fireDotTimer > 0) {
          en.fireDotTimer -= dt;
          en.hp -= 2.5 * dt;
          if (Math.random() < 0.2) createSlashParticles(en.x, en.y + 1, 0xef4444);
          if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); return; }
        }

        en.group.position.set(en.x, en.y, 0);
        en.group.rotation.y = THREE.MathUtils.lerp(en.group.rotation.y, en.vx > 0 ? 0 : Math.PI, 14 * dt);
        
        if (en.type === 'ranged' && (en.shootTimer += dt) >= 2.2) { en.shootTimer = 0; spawnRangedProjectile(en.x, en.y + 1.2, p.x); } 

        // Bomber: relentless pursuit, detonation on contact
        if (en.type === 'bomber') {
          if (en.group.userData.bomberSpark) {
            const sp = 0.8 + Math.abs(Math.sin(time * 18)) * 0.7;
            en.group.userData.bomberSpark.scale.set(sp, sp, sp);
          }
          en.vx = (p.x > en.x ? 1 : -1) * 6.0;
          en.patrolLeft = -1e9; en.patrolRight = 1e9;
          if (Math.hypot(en.x - p.x, (en.y + 0.8) - (p.y + 0.8)) < 1.0 && p.invulnerableTimer <= 0) {
            if (p.parryWindowTimer > 0) {
              en.vx = (p.facingRight ? 1 : -1) * 9.0;
              en.patrolLeft = en.x + (p.facingRight ? 1 : -1) * 20;
              en.patrolRight = en.patrolLeft;
              en.frozenTimer = 1.0;
              spawnFloatingText('KICKED!', en.x, en.y + 1.4, 'parry');
              triggerScreenFlash('rgba(56, 189, 248, 0.6)', 0.15);
              en.hp -= 10 * p.baseDamage;
              if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); }
              return;
            } else {
              const dmg = 34;
              p.hp -= dmg; p.invulnerableTimer = 1.2; p.vy = 9; p.vx = (p.x < en.x ? -1 : 1) * 8;
              handleThornBurst(dmg);
              createSlashParticles(p.x, p.y + 1.0, 0xf97316, 30);
              triggerScreenFlash('rgba(249, 115, 22, 0.45)', 0.2);
              state.cameraShake = 0.4;
              state.enemies.forEach(other => {
                if (other !== en && other.alive && Math.abs(other.x - en.x) < 3.0) {
                  other.hp -= 18;
                  if (other.hp <= 0) { other.alive = false; scene.remove(other.group); }
                }
              });
              en.alive = false; scene.remove(en.group); updateEnemyCountUI();
              return;
            }
          }
        }

        if (Math.hypot(en.x - p.x, (en.y+0.8) - (p.y+0.8)) < 1.1 && p.invulnerableTimer <= 0) { 
          if (p.parryWindowTimer > 0) {
            p.invulnerableTimer = 0.4;
            spawnFloatingText('PERFECT PARRY!', p.x, p.y + 1.8, 'parry');
            triggerScreenFlash('rgba(56, 189, 248, 0.6)', 0.15);
            en.hp -= 10 * p.baseDamage;
            if (en.hp <= 0) { en.alive = false; scene.remove(en.group); updateEnemyCountUI(); }
          } else {
            const baseDmg = en.isElite ? 32 : (en.type === 'berserker' ? 24 : 18);
            const dmg = p.blocking ? baseDmg * 0.5 : baseDmg;
            if (p.blocking) handleShieldBlockImpact();
            p.hp -= dmg; p.invulnerableTimer = 1.2; p.vy = 6; p.vx = en.vx > 0 ? 5 : -5; 
            handleThornBurst(dmg);
            createSlashParticles(p.x, p.y + 1.0, p.blocking ? 0x38bdf8 : 0xef4444); 
          }
        } 
      });

      // Update Projectiles
      for (let i = state.projectiles.length - 1; i >= 0; i--) { 
        const pr = state.projectiles[i]; pr.x += pr.vx * dt; pr.mesh.position.x = pr.x; pr.life -= dt; 
        if (pr.deflected) { 
          if (state.boss && state.boss.alive && Math.abs(pr.x - state.boss.x) < 1.8 && Math.abs(pr.y - (state.boss.y + 1.5)) < 2.0) {
            const defDmg = 15 * p.deflectionMult;
            state.boss.hp -= defDmg;
            registerHitCombo(defDmg, false, { x: state.boss.x, y: state.boss.y + 2 }, 'ice');
            createSlashParticles(state.boss.x, state.boss.y + 1.5, 0x38bdf8); safeRemove(pr.mesh); state.projectiles.splice(i, 1); continue;
          } 
          state.enemies.forEach(e => {
            if (!e.alive) return;
            if (Math.abs(pr.x - e.x) < 1.0 && Math.abs(pr.y - (e.y + 0.8)) < 1.2) {
              const defDmg = 15 * p.deflectionMult;
              e.hp -= defDmg;
              registerHitCombo(defDmg, false, { x: e.x, y: e.y + 1.2 }, 'ice');
              createSlashParticles(e.x, e.y + 1.0, 0x38bdf8); safeRemove(pr.mesh); state.projectiles.splice(i, 1);
            }
          }); 
        } else { 
          if (Math.hypot(pr.x - p.x, pr.y - (p.y + 0.9)) < 0.75 && p.invulnerableTimer <= 0) { 
            if (p.parryWindowTimer > 0) {
              pr.deflected = true;
              pr.vx = (p.facingRight ? 1 : -1) * (26 * p.deflectionMult);
              (pr.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
              spawnFloatingText('PERFECT PARRY!', p.x, p.y + 1.8, 'parry');
              triggerScreenFlash('rgba(56, 189, 248, 0.6)', 0.15);
            } else {
              const baseDmg = 16;
              const dmg = p.blocking ? baseDmg * 0.5 : baseDmg;
              if (p.blocking) handleShieldBlockImpact();
              p.hp -= dmg; p.invulnerableTimer = 1.0; 
              handleThornBurst(dmg);
              createSlashParticles(p.x, p.y + 1.0, p.blocking ? 0x38bdf8 : 0xc084fc); 
              safeRemove(pr.mesh); state.projectiles.splice(i, 1); continue; 
            }
          } 
        } 
        if (pr.life <= 0) { safeRemove(pr.mesh); state.projectiles.splice(i, 1); } 
      }

      // Update Ghost Trails
      for (let i = state.ghostTrails.length - 1; i >= 0; i--) {
        const gt = state.ghostTrails[i];
        gt.life -= dt;
        if (gt.life <= 0) {
          scene.remove(gt.mesh);
          state.ghostTrails.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.life -= dt;
        pt.mesh.position.x += pt.vx * dt;
        pt.mesh.position.y += pt.vy * dt;
        pt.vy -= 15.0 * dt;
        if (pt.life <= 0) {
          safeRemove(pt.mesh);
          state.particles.splice(i, 1);
        }
      }

      // Update Fireworks
      for (let i = state.fireworks.length - 1; i >= 0; i--) {
        const fw = state.fireworks[i];
        fw.life -= dt;
        const pos = fw.points.geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < fw.velocities.length; j++) {
          pos[j * 3] += fw.velocities[j].x * dt;
          pos[j * 3 + 1] += fw.velocities[j].y * dt;
          pos[j * 3 + 2] += fw.velocities[j].z * dt;
          fw.velocities[j].y -= 9.8 * dt;
        }
        fw.points.geometry.attributes.position.needsUpdate = true;
        (fw.points.material as THREE.PointsMaterial).opacity = Math.max(0, fw.life / fw.maxLife);
        if (fw.life <= 0) {
          // Three Points object: dispose via safeRemove (Object3D-compatible).
          safeRemove(fw.points as unknown as THREE.Mesh);
          state.fireworks.splice(i, 1);
        }
      }

      // Camera Follow & Shake
      if (state.cameraShake > 0) {
        state.cameraShake -= dt;
        camera.position.x = p.x + (Math.random() - 0.5) * state.cameraShake * 2.0;
        camera.position.y = p.y + 3.0 + (Math.random() - 0.5) * state.cameraShake * 2.0;
      } else {
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, p.x, 6 * dt);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, p.y + 3.0, 6 * dt);
      }
      camera.lookAt(p.x, p.y + 1.2, 0);

      composer.render();
    }

    animate();
  