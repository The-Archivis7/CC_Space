/*
 * IRON MAW FORGE (original: mech2.html inline script)
 */
import * as THREE from 'three';
import { byId } from '../shared/dom';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

// --- Domain types (IRON MAW FORGE) ---
type PartCategory = 'head' | 'torso' | 'arms' | 'legs' | 'core' | 'armor';
interface MechPart {
  id: string; name: string; cost: number; unlocked: boolean; desc: string;
  hp?: number; shield?: number; energy?: number; speed?: number;
  damage?: number; heatRate?: number; range?: number;
  heatCool?: number; hpBonus?: number; speedBonus?: number;
}
interface TechNode { id: string; name: string; category: string; cost: number; unlocked: boolean; desc: string; }
interface WeaponProjectile { mesh: THREE.Object3D; dir: THREE.Vector3; speed: number; isPlayer: boolean; damage: number; life: number; pierce: boolean; trailColor?: number; color?: number; gravity?: number; splashRadius?: number; splashDamage?: number; pierceLeft?: number; hitTargets?: Set<MechEnemy>; }
interface MechParticle { mesh: THREE.Object3D; ring?: boolean; vel?: THREE.Vector3; life: number; maxLife?: number; ringGrow?: number; scaleRate?: number; fade?: boolean; gravity?: number; worldBounce?: boolean; }interface MechEntity {
  mesh: THREE.Group;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  energy: number; maxEnergy: number;
  heat: number; maxHeat: number; heatCoolRate: number;
  speed: number; position: THREE.Vector3; radius: number;
  walkTimer: number; dashCooldown: number; dashTime: number; dashDir: THREE.Vector3;
  invuln: number; overheated: boolean; lastFireTime: number; hitFlash: number; _lavaTick?: number; flashApplied?: boolean;
}
interface MechEnemy {
  mesh: THREE.Group; name: string;
  hp: number; maxHp: number; shield: number; maxShield: number; damage: number;
  position: THREE.Vector3; radius: number; cooldown: number;
  isBoss: boolean; scale: number; speed: number; strafeDir: number;
  burstCount: number; burstTimer: number;
  phase: number; attackTimer: number; missileVolleyTimer: number; shockwaveTimer: number;
  walkTimer: number; hitFlash: number; flashApplied?: boolean; stun?: number;
}
interface ProjectileOpts { pos: THREE.Vector3; dir: THREE.Vector3; speed?: number; isPlayer: boolean; damage: number; life?: number; color?: number; size?: number; pierce?: boolean; trail?: boolean; gravity?: number; }
interface WingmanDrone {
  mesh: THREE.Group; ring: THREE.Mesh;
  hp: number; maxHp: number;
  position: THREE.Vector3; velocity: THREE.Vector3;
  fireCooldown: number; hitFlash: number;
}
interface ArenaObstacle { mesh: THREE.Mesh; pos: THREE.Vector3; halfSize: number; }
interface DestructibleProp { mesh: THREE.Mesh; pos: THREE.Vector3; radius: number; hp: number; explosive: boolean; kind: 'barrel' | 'crate'; shield?: number; hitFlash?: number; flashApplied?: boolean; }
interface PickupItem { mesh: THREE.Mesh; type: string; spin: number; }
interface PickupPadEntry { pos: THREE.Vector3; next: number; }
interface LavaPool { x: number; z: number; r: number; }
interface AudioSystem { ctx: AudioContext | null; master: GainNode | null; musicGain: GainNode; sfxGain: GainNode; musicTimer: number | null; muted: boolean; started: boolean; }
interface MechSaveData {
  credits: number; rp: number; tokens: number; username?: string;
  equipped: Record<string, string>;
  paint: { primary: number; secondary: number; emissive: number };
  aiConfig: { preset: string; range: number; retreat: number };
  unlockedParts: Record<string, string[]>;
  tech: { id: string; unlocked: boolean }[];
  bossTokensSpent: number; bestWave: number;
}
interface GameState {
  credits: number; rp: number; tokens: number; username: string;
  currentTab: string; activePartCategory: string;
  selectedArena: string; selectedMode: string;
  inBattle: boolean;
  survivalWave: number; survivalEarnings: number;
  equipped: Record<string, string>;
  paint: { primary: number; secondary: number; emissive: number };
  aiConfig: { preset: string; range: number; retreat: number };
  // Runtime additions
  bossTokensSpent?: number; bestWave?: number; wingmanHold?: boolean;  survivalKills?: number; waveTransition?: boolean; battleTime?: number;
  postBattle?: boolean;
}

let destructibles: DestructibleProp[] = [], pickups: PickupItem[] = [], pickupPads: PickupPadEntry[] = [], arenaLavaPools: LavaPool[] = [];
let arenaIcePatches: LavaPool[] = [], arenaCoolVents: LavaPool[] = [];
let wingmanDrone: WingmanDrone | null = null, mouseDown = false;
interface CursedOrbState {
    kind: 'blue' | 'red';
    group: THREE.Group;
    core: THREE.Mesh;
    shell: THREE.Mesh;
    ringA: THREE.Mesh;
    ringB: THREE.Mesh;
    motes: THREE.Points;
    pos: THREE.Vector3;
    dir: THREE.Vector3;
    life: number;
    maxLife: number;
    max: boolean;
}
let gojoBlueOrb: CursedOrbState | null = null;
let gojoRedOrb: CursedOrbState | null = null;
let gojoDomain: {
    mesh: THREE.Group; life: number; shellMat: THREE.MeshBasicMaterial;
    stars: THREE.Points; starMat: THREE.PointsMaterial;
    arcs: THREE.LineSegments; arcMat: THREE.LineBasicMaterial;
    rings: THREE.Mesh[];
    galaxy: THREE.Points; galaxyMat: THREE.PointsMaterial;
    galaxyCore: THREE.Sprite; galaxyCoreMat: THREE.SpriteMaterial;
    blackHole: THREE.Group;
    bhDisks: THREE.Mesh[];
    bhMotes: THREE.Points; bhMoteMat: THREE.PointsMaterial;
    cosmosMats: THREE.Material[];
    env: THREE.Object3D | null;
    prevBg: THREE.Color | null;
    prevFog: THREE.FogBase | null;
    prevDustVisible: boolean;
    max: boolean;
} | null = null;
interface HollowPurpleState {
    group: THREE.Group;
    core: THREE.Mesh;
    shell: THREE.Mesh;
    ringA: THREE.Mesh;
    ringB: THREE.Mesh;
    red: THREE.Mesh;
    blue: THREE.Mesh;
    motes: THREE.Points;
    trail: THREE.Points;
    trailPositions: Float32Array;
    trailColors: Float32Array;
    trailAges: Float32Array;
    trailHead: number;
    pos: THREE.Vector3;
    dir: THREE.Vector3;
    state: 'merge' | 'fly';
    timer: number;
    life: number;
    max: boolean;
}
let gojoPurple: HollowPurpleState | null = null;
interface ComboPurpleState {
    group: THREE.Group;
    core: THREE.Mesh;
    shell: THREE.Mesh;
    ringA: THREE.Mesh;
    ringB: THREE.Mesh;
    pos: THREE.Vector3;
    timer: number;
}
let gojoComboPurple: ComboPurpleState | null = null;
let gojoMaxOutput = false;
let purpleAudio: HTMLAudioElement | null = null;
let gojoTimers = { blue: 0, red: 0, purple: 0, domain: 0 };

interface ZoltraakBeamState {
    group: THREE.Group;
    origin: THREE.Vector3;
    dir: THREE.Vector3;
    length: number;
    life: number;
    maxLife: number;
    coreMat: THREE.MeshBasicMaterial;
    glowMat: THREE.MeshBasicMaterial;
    sigils: { sprite: THREE.Sprite; baseOpacity: number }[];
}

interface FrierenShieldState {
    group: THREE.Group;
    kind: 'front' | 'sphere';
    center: THREE.Vector3;
    normal: THREE.Vector3;
    radius: number;
    life: number;
    maxLife: number;
    fillMat: THREE.MeshBasicMaterial;
    edgeMat: THREE.LineBasicMaterial;
    hitFlash: number;
}

let frierenBeam: ZoltraakBeamState | null = null;
let frierenFrontShield: FrierenShieldState | null = null;
let frierenSphereShield: FrierenShieldState | null = null;
let frierenTimers = { zoltraak: 0, shield: 0, sphere: 0 };
let zoltraakSigilTex: THREE.Texture | null = null;
let zoltraakSigilRequested = false;
let bossThemeAudio: HTMLAudioElement | null = null;
let gojoInfinityOn = true;
let gojoInfinityFx = 0;
let gojoBloom = 0;
let glowTexture: THREE.Texture | null = null;
let starTexture: THREE.Texture | null = null;
let firstPersonView = false;
let fpYaw = 0, fpPitch = 0;
let fpLastMouseX = -1, fpLastMouseY = -1;
let fpLockAcquired = false;
let playerMomentum = new THREE.Vector3();
let heliosBeam: THREE.Group | null = null;
let heliosBeamTick = 0;
let heliosBeamHitFx = 0;
        /* =========================================================================
           PERSISTENCE (localStorage save)
           ========================================================================= */
        const SAVE_KEY = 'ironmaw_forge_save_v1';

        function saveGame() {
            try {
                const data: MechSaveData = {
                    credits: GAME_STATE.credits, rp: GAME_STATE.rp, tokens: GAME_STATE.tokens,
                    username: GAME_STATE.username,
                    equipped: GAME_STATE.equipped, paint: GAME_STATE.paint,
                    unlockedParts: {}, aiConfig: GAME_STATE.aiConfig,
                    tech: TECH_NODES.map((t: TechNode) => ({ id: t.id, unlocked: t.unlocked })),
                    bossTokensSpent: GAME_STATE.bossTokensSpent || 0,
                    bestWave: GAME_STATE.bestWave || 0
                } as MechSaveData;
                Object.keys(PARTS_DB as Record<string, MechPart[]>).forEach((cat: string) => {
                    data.unlockedParts[cat] = (PARTS_DB[cat as PartCategory]).filter((p: MechPart) => p.unlocked).map((p: MechPart) => p.id);
                });
                localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            } catch (e) { /* storage unavailable */ }
        }

        function loadGame() {
            try {
                const raw = localStorage.getItem(SAVE_KEY);
                if (!raw) return false;
                const data = JSON.parse(raw) as MechSaveData & { unlockedParts?: Record<string,string[]>; equipped?: Record<string,string>; paint?: { primary: number; secondary: number; emissive: number }; aiConfig?: { preset: string; range: number; retreat: number }; tech?: { id: string; unlocked: boolean }[]; credits?: number; rp?: number; tokens?: number; bossTokensSpent?: number; bestWave?: number; username?: string };
                if (typeof data.username === 'string' && data.username.trim()) GAME_STATE.username = data.username.trim().slice(0, 18);
                if (typeof data.credits === 'number') GAME_STATE.credits = data.credits as number;
                if (typeof data.rp === 'number') GAME_STATE.rp = data.rp as number;
                if (typeof data.tokens === 'number') GAME_STATE.tokens = data.tokens as number;
                if (data.equipped) Object.assign(GAME_STATE.equipped, data.equipped);
                if (data.paint) Object.assign(GAME_STATE.paint, data.paint);
                if (data.aiConfig) Object.assign(GAME_STATE.aiConfig, data.aiConfig);
                if (typeof data.bossTokensSpent === 'number') GAME_STATE.bossTokensSpent = data.bossTokensSpent;
                if (typeof data.bestWave === 'number') GAME_STATE.bestWave = data.bestWave;
                if (data.unlockedParts) {
                    Object.keys(data.unlockedParts).forEach((cat: string) => {
                        const ids = (data.unlockedParts as Record<string,string[]>)[cat] || [];
                        (PARTS_DB[cat as PartCategory] || []).forEach((p: MechPart) => { if (ids.includes(p.id)) p.unlocked = true; });
                    });
                }
                if (Array.isArray(data.tech)) {
                    data.tech.forEach((t: { id: string; unlocked: boolean }) => { const n = TECH_NODES.find((x: TechNode) => x.id === t.id); if (n) n.unlocked = !!t.unlocked; });
                }
                return true;
            } catch (e) { return false; }
        }

        /* =========================================================================
           PROCEDURAL AUDIO ENGINE (WebAudio - no external files)
           ========================================================================= */
        let AudioSys: AudioSystem = { ctx: null, master: null, musicGain: null, sfxGain: null, musicTimer: null, muted: false, started: false } as unknown as AudioSystem;

        function initAudio() {
            if (AudioSys.ctx) return;
            try {
                AudioSys.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                AudioSys.master = AudioSys.ctx.createGain();
                AudioSys.master.gain.value = AudioSys.muted ? 0 : 0.55;
                const aCtx = AudioSys.ctx;
                AudioSys.musicGain = aCtx.createGain();
                AudioSys.musicGain.gain.value = 0.30;
                AudioSys.musicGain.connect(AudioSys.master);
                AudioSys.sfxGain = aCtx.createGain();
                AudioSys.sfxGain.gain.value = 0.85;
                AudioSys.sfxGain.connect(AudioSys.master);
            } catch (e) { /* audio unsupported */ }
        }

        function audioUnlock() { initAudio(); if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); }

        function sfx(type: string) {
            if (!AudioSys.ctx || AudioSys.muted) return;
            const ctx = AudioSys.ctx, t = ctx.currentTime;
            const tone = (freq: number, dur: number, type2: OscillatorType, vol: number, slideTo?: number) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = type2 || 'square'; o.frequency.setValueAtTime(freq, t);
                if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
                g.gain.setValueAtTime(vol, t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                o.connect(g); g.connect(AudioSys.sfxGain);
                o.start(t); o.stop(t + dur + 0.02);
            };
            const noise = (dur: number, vol: number, lpFreq?: number) => {
                const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
                const buf = ctx.createBuffer(1, len, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
                const src = ctx.createBufferSource(); src.buffer = buf;
                const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpFreq || 1200;
                const g = ctx.createGain(); g.gain.value = vol;
                src.connect(f); f.connect(g); g.connect(AudioSys.sfxGain);
                src.start(t);
            };
            switch (type) {
                case 'cannon': tone(140, 0.09, 'square', 0.16, 55); noise(0.08, 0.22, 2400); break;
                case 'plasma': tone(620, 0.14, 'sawtooth', 0.10, 180); break;
                case 'rail': tone(980, 0.05, 'square', 0.09, 120); noise(0.16, 0.30, 900); break;
                case 'hit': noise(0.10, 0.22, 1800); tone(220, 0.06, 'triangle', 0.08, 90); break;
                case 'explode': noise(0.55, 0.55, 700); tone(70, 0.45, 'sine', 0.30, 30); break;
                case 'bigexplode': noise(0.9, 0.7, 500); tone(55, 0.7, 'sine', 0.42, 22); break;
                case 'overheat': tone(320, 0.35, 'sawtooth', 0.16, 90); noise(0.3, 0.14, 2600); break;
                case 'dash': noise(0.22, 0.20, 3200); tone(180, 0.20, 'sine', 0.10, 420); break;
                case 'pickup': tone(660, 0.07, 'sine', 0.12); setTimeout(() => sfx2tone(990, 0.09), 70); break;
                case 'buy': tone(520, 0.08, 'sine', 0.12); setTimeout(() => sfx2tone(780, 0.12), 80); break;
                case 'deny': tone(160, 0.14, 'square', 0.10, 110); break;
                case 'victory': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => sfx2tone(f, 0.18, 'sine', 0.14), i * 130)); break;
                case 'defeat': [400, 320, 240, 160].forEach((f, i) => setTimeout(() => sfx2tone(f, 0.24, 'sawtooth', 0.12), i * 160)); break;
                case 'wavestart': tone(330, 0.12, 'square', 0.10, 440); setTimeout(() => sfx2tone(440, 0.16, 'square', 0.10), 120); break;
                case 'beam': tone(1180, 0.16, 'sawtooth', 0.055, 760); noise(0.14, 0.06, 5200); break;
                case 'zoltraak': tone(1760, 0.38, 'sawtooth', 0.10, 420); noise(0.42, 0.22, 7200); tone(88, 0.34, 'sine', 0.18, 42); break;
                case 'shield': tone(520, 0.22, 'triangle', 0.09, 880); tone(780, 0.28, 'sine', 0.07, 1170); break;
                case 'shieldhit': tone(880, 0.08, 'triangle', 0.06, 520); noise(0.1, 0.05, 4200); break;
            }
        }

        function sfx2tone(freq: number, dur: number, type?: OscillatorType, vol?: number) {
            if (!AudioSys.ctx || AudioSys.muted) return;
            const ctx = AudioSys.ctx, t = ctx.currentTime;
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = type || 'sine'; o.frequency.value = freq;
            g.gain.setValueAtTime(vol || 0.1, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(AudioSys.sfxGain);
            o.start(t); o.stop(t + dur + 0.02);
        }
        /* Simple driving industrial music loop: bass pulse + hats, scheduled with lookahead */
        let musicStep = 0;
        const BASSLINE = [55, 55, 65.4, 55, 49, 49, 58.3, 61.7];

        function musicTick() {
            if (!AudioSys.ctx || AudioSys.muted || !GAME_STATE.inBattle) return;
            const ctx = AudioSys.ctx, t = ctx.currentTime;
            const stepDur = 0.24;
            for (let s = 0; s < 2; s++) {
                const when = t + s * stepDur;
                const step = (musicStep + s) % 8;
                // bass
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'sawtooth'; o.frequency.value = BASSLINE[step];
                g.gain.setValueAtTime(0.0001, when);
                g.gain.exponentialRampToValueAtTime(0.16, when + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, when + stepDur * 0.9);
                const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
                o.connect(f); f.connect(g); g.connect(AudioSys.musicGain);
                o.start(when); o.stop(when + stepDur);
                // hat on off-beats
                if (step % 2 === 1) {
                    const len = Math.floor(ctx.sampleRate * 0.05);
                    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
                    const d = buf.getChannelData(0);
                    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
                    const src = ctx.createBufferSource(); src.buffer = buf;
                    const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000;
                    const hg = ctx.createGain(); hg.gain.value = 0.05;
                    src.connect(hf); hf.connect(hg); hg.connect(AudioSys.musicGain);
                    src.start(when);
                }
            }
            musicStep = (musicStep + 2) % 8;
        }

        function startMusic() { if (!AudioSys.musicTimer) AudioSys.musicTimer = setInterval(musicTick, 480); }

        function stopMusic() { if (AudioSys.musicTimer) { clearInterval(AudioSys.musicTimer); AudioSys.musicTimer = null; } }

        function startBossTheme() {
            stopMusic();
            if (!bossThemeAudio) {
                bossThemeAudio = new Audio('assets/songs/zoltraak.mp3');
                bossThemeAudio.loop = true;
                bossThemeAudio.volume = 0.34;
                bossThemeAudio.preload = 'auto';
            }
            bossThemeAudio.muted = AudioSys.muted;
            bossThemeAudio.currentTime = 0;
            const request = bossThemeAudio.play();
            if (request && typeof request.catch === 'function') {
                request.catch(() => { startMusic(); });
            }
        }

        function stopBossTheme() {
            if (!bossThemeAudio) return;
            bossThemeAudio.pause();
            bossThemeAudio.currentTime = 0;
        }

        function toggleMute() {
            AudioSys.muted = !AudioSys.muted;
            if (AudioSys.master) AudioSys.master.gain.value = AudioSys.muted ? 0 : 0.55;
            if (bossThemeAudio) bossThemeAudio.muted = AudioSys.muted;
            if (!AudioSys.muted && GAME_STATE.inBattle && GAME_STATE.selectedMode === 'boss' && bossThemeAudio) {
                bossThemeAudio.play().catch(() => { /* gesture-gated */ });
            }
            const btn = byId('btn-audio');
            if (btn) btn.innerText = AudioSys.muted ? '🔇 MUTED' : '🔊 SOUND';
        }

        /* =========================================================================
           HIGH-DETAIL PROCEDURAL TEXTURES & BUMP MAPS
           ========================================================================= */

        function tryBoostDash() {
            if (!playerEntity) return;
            if (playerEntity!.energy <= 0.01) {
                sfx('deny');
                showFloatText('CORE DRAINED — DASH OFFLINE', '#ff5533');
                return;
            }
            if (playerEntity!.dashCooldown > 0) { sfx('deny'); return; }
            let dir = new THREE.Vector3();
            if (keys['KeyW']) dir.z -= 1;
            if (keys['KeyS']) dir.z += 1;
            if (keys['KeyA']) dir.x -= 1;
            if (keys['KeyD']) dir.x += 1;
            if (dir.length() === 0) { const fwd = new THREE.Vector3(); playerEntity!.mesh.getWorldDirection(fwd); fwd.y = 0; dir = fwd.normalize(); }
            // Core-fed dash: no fixed cooldown, just energy. Only a completely drained core locks out.
            playerEntity!.energy = Math.max(0, playerEntity!.energy - 25);
            playerEntity!.dashCooldown = playerEntity!.energy <= 0.01 ? 1.2 : 0;
            playerEntity!.dashTime = 0.22;
            playerEntity!.dashDir = dir.normalize();
            playerEntity!.invuln = 0.30;
            sfx('dash');
            const burst = new THREE.Mesh(
                new THREE.RingGeometry(0.4, 1.6, 24),
                new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
            );
            burst.rotation.x = -Math.PI / 2;
            burst.position.set(playerEntity!.position.x, 0.4, playerEntity!.position.z);
            scene.add(burst);
            particles.push({ mesh: burst, ring: true, vel: new THREE.Vector3(), life: 0.35, maxLife: 0.35 });
        }

        function toggleWingmanHold() {
            GAME_STATE.wingmanHold = !GAME_STATE.wingmanHold;
            showFloatText(GAME_STATE.wingmanHold ? 'DRONE: HOLD POSITION' : 'DRONE: ESCORT MODE', '#00f0ff');
        }

        /* =========================================================================
           WEAPON PROFILES & ARENA DEFINITIONS
           ========================================================================= */
        type WeaponKind = 'cannon' | 'plasma' | 'rail' | 'grenade' | 'beam';
        interface WeaponProfile {
            id: string; label: string; kind: WeaponKind; sfx: string;
            interval: number;        // seconds between shots (beam: damage tick)
            damageMult: number;      // multiplier applied to the arm part damage
            speed: number;           // projectile speed (0 for the hitscan beam)
            range: number;           // effective range in metres
            color: number; size: number; trail: boolean; recoil: number;
            splashRadius?: number;
        }

        const WEAPON_PROFILES: Record<string, WeaponProfile> = {
            cannon_arms:  { id: 'cannon_arms',  label: 'ROTARY AUTOCANNONS', kind: 'cannon',  sfx: 'cannon',  interval: 0.11, damageMult: 0.21, speed: 215, range: 70,  color: 0xffcc66, size: 0.2,  trail: true,  recoil: 0.2 },
            plasma_arms:  { id: 'plasma_arms',  label: 'TWIN PLASMA',        kind: 'plasma',  sfx: 'plasma',  interval: 0.42, damageMult: 0.64, speed: 135, range: 90,  color: 0x66ffcc, size: 0.42, trail: true,  recoil: 0.3, splashRadius: 3.5 },
            grenade_arms: { id: 'grenade_arms', label: 'ARC MORTARS',        kind: 'grenade', sfx: 'cannon',  interval: 0.34, damageMult: 0.42, speed: 100, range: 100, color: 0xffa24d, size: 0.3,  trail: true,  recoil: 0.38, splashRadius: 7 },
            beamer_arms:  { id: 'beamer_arms',  label: 'HELIOS BEAM',        kind: 'beam',    sfx: 'beam',    interval: 0.1,  damageMult: 0.25, speed: 0,   range: 110, color: 0x8ef6ff, size: 0.22, trail: false, recoil: 0.1 },
            railgun_arms: { id: 'railgun_arms', label: 'MAG RAILGUNS',       kind: 'rail',    sfx: 'rail',    interval: 1.0,  damageMult: 0.61, speed: 330, range: 150, color: 0xffffff, size: 0.2,  trail: true,  recoil: 0.6 }
        };

        interface ArenaDef {
            id: string; name: string; layout: 'foundry' | 'volcanic' | 'arctic';
            floor: number; fog: number; fogD: number; primary: number; accent: number;
            hemi: number; sun: number; sunI: number;
            heatGain: number; coolMult: number; blurb: string;
        }

        const ARENA_DEFS: Record<string, ArenaDef> = {
            foundry: {
                id: 'foundry', name: 'INDUSTRIAL FOUNDRY', layout: 'foundry',
                floor: 0x161c28, fog: 0x0a0e16, fogD: 0.0075, primary: 0x1e293b, accent: 0xff5500,
                hemi: 0x3a4a66, sun: 0xfff2e6, sunI: 1.5,
                heatGain: 1.0, coolMult: 1.0, blurb: 'Symmetrical cargo grid. Coolant vents chill your reactor while you hold them.'
            },
            volcanic: {
                id: 'volcanic', name: 'VOLCANIC REFINERY', layout: 'volcanic',
                floor: 0x2a0f0a, fog: 0x1a0503, fogD: 0.011, primary: 0x3d1812, accent: 0xff4400,
                hemi: 0x662015, sun: 0xffb080, sunI: 1.7,
                heatGain: 1.35, coolMult: 0.85, blurb: 'Molten caldera. +35% weapon heat gain, lava pools burn hulls, cooling is sluggish.'
            },
            arctic: {
                id: 'arctic', name: 'ARCTIC EXPANSE', layout: 'arctic',
                floor: 0x16242e, fog: 0x0b1721, fogD: 0.012, primary: 0x2c4652, accent: 0x66d9ff,
                hemi: 0x2a4a66, sun: 0xbfe8ff, sunI: 1.3,
                heatGain: 0.8, coolMult: 1.2, blurb: 'Sub-zero ice field. Weapon heat gain -20%, rapid cooling, but ice patches destroy traction.'
            }
        };

        function getArenaDef(): ArenaDef { return ARENA_DEFS[GAME_STATE.selectedArena] || ARENA_DEFS.foundry; }
        function arenaHeatGain(): number { return getArenaDef().heatGain; }
        function arenaCoolMult(): number { return getArenaDef().coolMult; }
        function getArmsPart(): MechPart | undefined { return PARTS_DB.arms.find(p => p.id === GAME_STATE.equipped.arms); }
        function getWeaponProfile(): WeaponProfile { return WEAPON_PROFILES[GAME_STATE.equipped.arms] || WEAPON_PROFILES.cannon_arms; }

        function isGojo(): boolean {
            return (GAME_STATE.username || '').trim().toLowerCase() === 'gojo';
        }

        function isFrieren(): boolean {
            const callsign = (GAME_STATE.username || '').trim().toLowerCase();
            return callsign === 'frieren' || callsign === 'fern' || callsign === 'denken';
        }

        /** Heat build-up multiplier for the Helios beam from reactor (core) cooling investment. */
        function getBeamHeatMult(): number {
            const core = PARTS_DB.core.find(p => p.id === GAME_STATE.equipped.core);
            let coreCool = core?.heatCool || 40;
            if (TECH_NODES.find(t => t.id === 'tech_1' && t.unlocked)) coreCool *= 1.25;
            return THREE.MathUtils.clamp(1 - (coreCool - 40) / 110, 0.12, 1);
        }

        /** True cockpit look direction from the current yaw/pitch. */
        function getFPCameraDir(out?: THREE.Vector3): THREE.Vector3 {
            const dir = out || new THREE.Vector3();
            return dir.set(0, 0, -1).applyEuler(new THREE.Euler(fpPitch, fpYaw, 0, 'YXZ')).normalize();
        }

        function getAimPoint(): THREE.Vector3 {
            if (firstPersonView && playerEntity) {
                // In the cockpit the crosshair is the camera axis, not a point on the ground.
                return playerEntity.position.clone().setY(4.95).addScaledVector(getFPCameraDir(), 220);
            }
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mousePos, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2);
            const targetPoint = new THREE.Vector3();
            const hit = raycaster.ray.intersectPlane(plane, targetPoint);
            // Near the horizon the ground intersection races to infinity; use a far point on the
            // same ray instead so the aim never snaps between two unrelated directions.
            if (!hit || raycaster.ray.origin.distanceTo(targetPoint) > 260) {
                raycaster.ray.at(240, targetPoint);
            }
            return targetPoint;
        }

        function getBarrelTips(): THREE.Vector3[] {
            const tips: THREE.Vector3[] = [];
            if (!playerEntity) return tips;
            playerEntity.mesh.traverse(child => {
                if (child.name === 'barrelTip') {
                    const wp = new THREE.Vector3();
                    child.getWorldPosition(wp);
                    tips.push(wp);
                }
            });
            return tips;
        }

        function getMuzzlePosition(tips?: THREE.Vector3[]): THREE.Vector3 {
            const barrels = tips || getBarrelTips();
            if (barrels.length > 0) {
                activeWeaponBarrelIndex = (activeWeaponBarrelIndex + 1) % barrels.length;
                return barrels[activeWeaponBarrelIndex].clone();
            }
            return playerEntity ? playerEntity.position.clone().add(new THREE.Vector3(0, 3.1, 0)) : new THREE.Vector3();
        }

        function setFirstPerson(on: boolean, silent = false) {
            if (on === firstPersonView && document.body.classList.contains('fp-view') === on) return;
            firstPersonView = on;
            document.body.classList.toggle('fp-view', on);

            // Cockpit view hides the chassis so no shoulder/head geometry clips the near plane.
            if (playerEntity) playerEntity.mesh.visible = !on;

            camera.fov = on ? 74 : 60;
            camera.updateProjectionMatrix();
            camera.rotation.order = 'YXZ';

            if (on) {
                const dir = new THREE.Vector3();
                camera.getWorldDirection(dir);
                if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
                fpPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.99, 0.99));
                fpYaw = Math.atan2(-dir.x, -dir.z);
                fpLastMouseX = -1; fpLastMouseY = -1;
                fpLockAcquired = false;
                hideHeliosBeam();

                const boot = byId('fp-boot');
                if (boot) { boot.classList.remove('show'); void boot.offsetWidth; boot.classList.add('show'); }

                try {
                    const maybe = renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
                    if (maybe && typeof maybe.catch === 'function') maybe.catch(() => { /* mouse-delta fallback */ });
                } catch (e) { /* mouse-delta fallback */ }
            } else {
                if (document.pointerLockElement) document.exitPointerLock();
                const reticle = byId('reticle-circle');
                if (reticle) reticle.style.transform = '';
                const boot = byId('fp-boot');
                if (boot) boot.classList.remove('show');
            }

            if (!silent) showFloatText(on ? 'COMMS ESTABLISHED: SPARK-10 STREAM ACTIVE' : 'THIRD-PERSON CHASE VIEW', '#00f0ff');
        }

        /* WEAPON PROFILE FIRE - called every frame while LMB held */

/* WAVE SPAWNING - skirmish duel, escalating survival with elites, token-gated boss */
        const BOSS_DEFS = {
            omega:  { name: 'OMEGA TITAN SIEGE PLATFORM', hp: 42000, shield: 14000, damage: 520, scale: 2.8, speed: 9,  color: 0xff2244 },
            warlord:{ name: 'WARLORD VX-9 "ASHMAKER"',    hp: 68000, shield: 22000, damage: 640, scale: 3.2, speed: 11, color: 0xff6600 },
            hydra:  { name: 'PROJECT HYDRA "NULLCROWN"',  hp: 105000, shield: 34000, damage: 720, scale: 3.6, speed: 13, color: 0xa855f7 }
        };

        function currentBossDef() {
            const defeated = GAME_STATE.bossTokensSpent || 0;
            if (defeated >= 2) return BOSS_DEFS.hydra;
            if (defeated >= 1) return BOSS_DEFS.warlord;
            return BOSS_DEFS.omega;
        }

        function spawnWingmanDrone() {
            if (wingmanDrone && wingmanDrone!.mesh) scene.remove(wingmanDrone!.mesh);

            const g = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.9, 0),
                new THREE.MeshStandardMaterial({ color: 0x1b2432, roughness: 0.3, metalness: 0.9, emissive: 0x00f0ff, emissiveIntensity: 0.35 })
            );
            body.castShadow = true;
            g.add(body);
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.28, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0x00f0ff })
            );
            eye.position.set(0, 0, 0.75);
            g.add(eye);
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.35, 0.07, 8, 32),
                new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 })
            );
            ring.rotation.x = Math.PI / 2;
            g.add(ring);

            const stats = calculateMechStats();
            wingmanDrone = {
                mesh: g, ring,
                hp: 600 + stats.hp * 0.08, maxHp: 600 + stats.hp * 0.08,
                position: playerEntity!.position.clone().add(new THREE.Vector3(4, 5, 4)),
                velocity: new THREE.Vector3(),
                fireCooldown: 0,
                hitFlash: 0
            };
            g.position.copy(wingmanDrone!.position);
            scene.add(g);
            showFloatText('WINGMAN ONLINE — SHIFT TO ORDER HOLD', '#00f0ff');
        }

        function showFloatText(text: string, color?: string) {
            const el = document.createElement('div');
            el.style.cssText = `position:absolute; left:50%; top:20%; transform:translateX(-50%); z-index:50;
                font-weight:900; font-size:20px; letter-spacing:2px; color:${color || '#fff'};
                text-shadow:0 0 12px ${color || '#fff'}, 0 2px 6px #000; pointer-events:none;
                transition:opacity 0.4s ease; opacity:1;`;
            el.innerText = text;
            document.body.appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; }, 900);
            setTimeout(() => el.remove(), 1400);
        }

        function spawnMuzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3, scale: number, colorHex?: number) {
            const flash = new THREE.Mesh(
                new THREE.SphereGeometry(0.4 * scale, 10, 10),
                new THREE.MeshBasicMaterial({ color: colorHex || 0xffcc66, transparent: true, opacity: 0.95 })
            );
            flash.position.copy(pos);
            scene.add(flash);
            const s = scale;
            particles.push({
                mesh: flash, vel: dir.clone().multiplyScalar(6),
                life: 0.08, maxLife: 0.08, scaleRate: 4 * s, fade: true, worldBounce: false
            });
            // sparks
            for (let i = 0; i < 5; i++) {
                const spark = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 6, 6),
                    new THREE.MeshBasicMaterial({ color: 0xffdd88 })
                );
                spark.position.copy(pos);
                scene.add(spark);
                particles.push({
                    mesh: spark,
                    vel: dir.clone().multiplyScalar(20).add(new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 8, (Math.random() - 0.5) * 10)),
                    life: 0.2, maxLife: 0.2, fade: true, gravity: 25
                });
            }
        }

        function spawnProjectile(opts: ProjectileOpts) {
            const { pos, dir, speed = 160, isPlayer, damage, life = 2.2, color = 0xff2244, size = 0.4, pierce = false, trail } = opts;
            const geo = new THREE.SphereGeometry(size, 10, 10);
            const mat = new THREE.MeshBasicMaterial({ color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            if (trail) {
                const glow = new THREE.Mesh(
                    new THREE.SphereGeometry(size * 2.2, 8, 8),
                    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
                );
                mesh.add(glow);
            }
            scene.add(mesh);
            projectiles.push({ mesh, dir: dir.clone().normalize(), speed, isPlayer, damage, life, pierce: !!pierce, trailColor: color });
        }

        /* DESTRUCTIBLES */

        function damageDestructible(d: DestructibleProp, damage: number, hitPos: THREE.Vector3) {
            d.hp -= 1;
            spawnExplosionParticles(hitPos, d.explosive ? 0xff6600 : 0x997744, 6, 10);
            if (d.hp > 0) { sfx('hit'); return; }
            // destroyed
            scene.remove(d.mesh);
            const idx = destructibles.indexOf(d);
            if (idx !== -1) destructibles.splice(idx, 1);
            if (d.explosive) {
                sfx('bigexplode');
                cameraShake = Math.max(cameraShake, 0.5);
                spawnExplosionParticles(d.pos.clone().setY(1.2), 0xff5500, 26, 26);
                explosionDamage(d.pos, 9, 900);
            } else {
                sfx('explode');
                spawnExplosionParticles(d.pos.clone().setY(1), 0x886644, 10, 14);
            }
            // 40% chance to drop salvage pickup
            if (Math.random() < 0.4) spawnPickup(d.pos.clone().setY(1.2));
        }

        function explosionDamage(center: THREE.Vector3, radius: number, damage: number, friendlyFire?: boolean) {
            for (const e of enemyEntities) {
                if (e.position.distanceTo(center) <= radius + e.radius) {
                    applyDamageToEntity(e, damage, e.position.clone().setY(2), 'normal');
                }
        }
            if (friendlyFire) {
                if (playerEntity && playerEntity!.position.distanceTo(center) <= radius + playerEntity!.radius) {
                    damagePlayer(damage * 0.6, playerEntity!.position.clone().setY(2));
                }
            }
        }

        /* PICKUPS */
        const PICKUP_TYPES = {
            armor:   { color: 0x00ff66, label: '+ARMOR' },
            energy:  { color: 0x00f0ff, label: '+ENERGY' },
            coolant: { color: 0x66aaff, label: 'COOLANT' }
        };

        function spawnPickup(pos: THREE.Vector3) {
            const types = Object.keys(PICKUP_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            const def = PICKUP_TYPES[type as keyof typeof PICKUP_TYPES];
            const mesh = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.8, 0),
                new THREE.MeshBasicMaterial({ color: def.color })
            );
            mesh.position.copy(pos);
            scene.add(mesh);
            pickups.push({ mesh, type, spin: Math.random() * Math.PI });
        }

        function updatePickups(dt: number) {
            for (let i = pickups.length - 1; i >= 0; i--) {
                const pk = pickups[i];
                pk.spin += dt * 3;
                pk.mesh.rotation.y = pk.spin;
                pk.mesh.position.y = 1.2 + Math.sin(pk.spin * 2) * 0.25;
                if (pk.mesh.position.distanceTo(playerEntity!.position) < playerEntity!.radius + 1.6) {
                    if (pk.type === 'armor') {
                        playerEntity!.hp = Math.min(playerEntity!.maxHp, playerEntity!.hp + playerEntity!.maxHp * 0.12);
                    } else if (pk.type === 'energy') {
                        playerEntity!.energy = playerEntity!.maxEnergy;
                        playerEntity!.heat = Math.max(0, playerEntity!.heat - 40);
                    } else {
                        playerEntity!.heat = Math.max(0, playerEntity!.heat - 70);
                    }
                    showFloatText(PICKUP_TYPES[pk.type as keyof typeof PICKUP_TYPES].label, '#00ff99');
                    sfx('pickup');
                    scene.remove(pk.mesh);
                    pickups.splice(i, 1);
                }
            }
        }

        function updatePickupPads(dt: number) {
            pickupPads.forEach(pad => {
                pad.next -= dt;
                if (pad.next <= 0) {
                    pad.next = 14 + Math.random() * 10;
                    spawnPickup(pad.pos.clone().setY(1.2));
                }
            });
        }

        /* SHARED DAMAGE / FLASH HELPERS */

        function applyHitFlash(mesh: THREE.Object3D, flashGroup = 1) {
            if (!mesh || flashGroup <= 0) return;
            mesh.traverse(o => {
                const m = o as THREE.Mesh;
                const mat = m.material as THREE.MeshStandardMaterial;
                if ((m as THREE.Mesh).isMesh && mat && mat.emissive) {
                    if (!o.userData.baseEmissive) o.userData.baseEmissive = mat.emissive.getHex();
                    mat.emissive.setHex(0xffffff);
                    mat.emissiveIntensity = 0.9 * flashGroup;
                }
            });
        }

        function restoreHitFlash(mesh: THREE.Object3D) {
            mesh.traverse(o => {
                const m = o as THREE.Mesh;
                const mat = m.material as THREE.MeshStandardMaterial;
                if ((m as THREE.Mesh).isMesh && mat && mat.emissive && o.userData.baseEmissive !== undefined) {
                    mat.emissive.setHex(o.userData.baseEmissive);
                    mat.emissiveIntensity = o.name === 'barrelTip' ? 1 : (o.userData.baseIntensity !== undefined ? o.userData.baseIntensity : 1);
                    delete o.userData.baseEmissive;
                }
            });
        }

        function damagePlayer(damage: number, hitPos?: THREE.Vector3) {
            if (!playerEntity || playerEntity!.invuln > 0) return;
            if (isFrieren() && frierenSphereShield) {
                damage *= 0.12;
                frierenSphereShield.hitFlash = Math.max(frierenSphereShield.hitFlash, 0.45);
                spawnExplosionParticles(playerEntity!.position.clone().setY(4.0), 0x8fe8ff, 6, 9);
            }
            if (isGojo() && gojoInfinityOn) {
                damage *= 0.12;
                if (gojoInfinityFx <= 0) {
                    gojoInfinityFx = 0.35;
                    spawnExplosionParticles(playerEntity!.position.clone().setY(4.2), 0x9fe8ff, 4, 7);
                }
            }
            playerEntity!.hitFlash = 1;
            applyHitFlash(playerEntity!.mesh, 1);
            if (playerEntity!.shield > 0) {
                playerEntity!.shield = Math.max(0, playerEntity!.shield - damage);
                if (hitPos) spawnDamageNumber(damage, hitPos, 'shield');
            } else {
                playerEntity!.hp = Math.max(0, playerEntity!.hp - damage);
                if (hitPos) spawnDamageNumber(damage, hitPos, 'normal');
            }
            cameraShake = Math.max(cameraShake, 0.35);
        }

        function damageWingman(damage: number) {
            if (!wingmanDrone) return;
            wingmanDrone!.hp -= damage;
            wingmanDrone!.hitFlash = 1;
            applyHitFlash(wingmanDrone!.mesh, 1);
        }

        /* WINGMAN AI UPDATE - preset behaviors, now fully functional */

        function updateWingman(dt: number) {
            if (!wingmanDrone) return;
            const cfg = GAME_STATE.aiConfig;
            if (wingmanDrone!.hp <= 0) {
                spawnExplosionParticles(wingmanDrone!.position, 0x00f0ff, 20, 16);
                sfx('explode');
                scene.remove(wingmanDrone!.mesh);
                wingmanDrone = null;
                showFloatText('WINGMAN DOWN', '#ff5533');
                return;
            }
            wingmanDrone!.hitFlash = Math.max(0, wingmanDrone!.hitFlash - dt * 3);
            if (wingmanDrone!.hitFlash <= 0.01) restoreHitFlash(wingmanDrone!.mesh);

            // Pick target
            let target: MechEnemy | null = null, best = Infinity;
            const desired = cfg.preset === 'defensive' ? 14 : (cfg.preset === 'sniper' ? 55 : 26);
            enemyEntities.forEach(e => {
                const d = wingmanDrone!.position.distanceTo(e.position);
                if (d < best) { best = d; target = e; }
            });

            let moveTarget: THREE.Vector3;
            if (GAME_STATE.wingmanHold) {
                moveTarget = playerEntity!.position.clone().add(new THREE.Vector3(0, 5, 0));
            } else if (target && best < desired * 1.6) {
                const away = wingmanDrone!.position.clone().sub((target as MechEnemy).position).normalize();
                moveTarget = (target as MechEnemy).position.clone().add(away.multiplyScalar(desired * 0.9)).setY(5.5);
                moveTarget.y = 5.5;
            } else {
                moveTarget = playerEntity!.position.clone().add(new THREE.Vector3(Math.sin(clock.elapsedTime * 0.8) * 6, 5.5, 4 + Math.cos(clock.elapsedTime * 0.8) * 6));
            }
            moveTarget.x = THREE.MathUtils.clamp(moveTarget.x, -140, 140);
            moveTarget.z = THREE.MathUtils.clamp(moveTarget.z, -140, 140);
            const toT = moveTarget.clone().sub(wingmanDrone!.position);
            wingmanDrone!.velocity.lerp(toT.multiplyScalar(0.9), Math.min(1, dt * 3.2));
            wingmanDrone!.velocity.clampLength(0, cfg.preset === 'sniper' ? 26 : 34);
            wingmanDrone!.position.addScaledVector(wingmanDrone!.velocity, dt);
            wingmanDrone!.mesh.position.copy(wingmanDrone!.position);
            // The drone orbits at cockpit eye level; hide it in first person so it never fills the view.
            wingmanDrone!.mesh.visible = !firstPersonView;
            if (target) wingmanDrone!.mesh.lookAt((target as MechEnemy).position.x, 3, (target as MechEnemy).position.z);
            wingmanDrone!.ring.rotation.z += dt * 4;

            // Fire
            wingmanDrone!.fireCooldown -= dt;
            if (target && best < (cfg.preset === 'sniper' ? 70 : 48) && wingmanDrone!.fireCooldown <= 0) {
                wingmanDrone!.fireCooldown = cfg.preset === 'berserker' ? 0.22 : (cfg.preset === 'sniper' ? 0.9 : 0.45);
                const dir = (target as MechEnemy).position.clone().add(new THREE.Vector3(0, 2.5, 0)).sub(wingmanDrone!.position).normalize();
                spawnProjectile({ pos: wingmanDrone!.position.clone(), dir, speed: 150, isPlayer: true, damage: 70, life: 1.6, color: 0x00f0ff, size: 0.22, trail: true });
                if (wingmanDrone!.position.distanceTo(camera.position) < 60) sfx('plasma');
            }
        }

        function enemyFireAtPlayer(enemy: MechEnemy, shots: number) {
            const barrelTips: THREE.Vector3[] = [];
            enemy.mesh.traverse(child => {
                if (child.name === 'barrelTip') {
                    const wp = new THREE.Vector3();
                    child.getWorldPosition(wp);
                    barrelTips.push(wp);
                }
            });
            const spawnPoints = barrelTips.length > 0 ? barrelTips : [enemy.position.clone().add(new THREE.Vector3(0, 3, 0))];
            const aim = playerEntity!.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            spawnPoints.forEach(sp => {
                const spread = enemy.isBoss ? 0.02 : 0.05;
                const fireDir = aim.clone().sub(sp).normalize();
                fireDir.x += (Math.random() - 0.5) * spread;
                fireDir.y += (Math.random() - 0.5) * spread * 0.5;
                fireDir.z += (Math.random() - 0.5) * spread;
                spawnProjectile({
                    pos: sp.clone(), dir: fireDir, speed: enemy.isBoss ? 105 : 95,
                    isPlayer: false, damage: enemy.damage, life: 2.6,
                    color: enemy.isBoss ? 0xff3344 : 0xff2244, size: enemy.isBoss ? 0.6 : 0.38, trail: true
                });
            });
            if (enemy.position.distanceTo(camera.position) < 80) sfx('cannon');
        }

/* BOSS AI: 3 phases — barrage → missile volleys → +ground shockwaves */

        function updateBossLogic(boss: MechEnemy, delta: number, dist: number) {
            const hpFrac = boss.hp / boss.maxHp;
            const newPhase = hpFrac <= 0.33 ? 3 : (hpFrac <= 0.66 ? 2 : 1);
            if (newPhase !== boss.phase) {
                boss.phase = newPhase;
                showFloatText(`⚠ ${boss.name} — PHASE ${newPhase}`, '#ff2244');
                sfx('bigexplode');
                cameraShake = Math.max(cameraShake, 0.8);
                spawnExplosionParticles(boss.position.clone().setY(6), 0xff4400, 30, 26);
            }

            boss.attackTimer -= delta;
            if (boss.attackTimer <= 0 && dist < 110) {
                const shots = boss.phase === 1 ? 2 : (boss.phase === 2 ? 3 : 4);
                boss.attackTimer = boss.phase === 3 ? 1.0 : (boss.phase === 2 ? 1.3 : 1.7);
                for (let s = 0; s < shots; s++) {
                    setTimeout(() => { if (GAME_STATE.inBattle && boss.hp > 0) enemyFireAtPlayer(boss, 1); }, s * 120);
                }
            }

            boss.missileVolleyTimer -= delta;
            if (boss.missileVolleyTimer <= 0 && dist < 130) {
                boss.missileVolleyTimer = boss.phase === 3 ? 3.2 : 5.0;
                const missiles = boss.phase === 1 ? 5 : 8;
                showFloatText('MISSILE VOLLEY INBOUND', '#ff6600');
                for (let m = 0; m < missiles; m++) {
                    setTimeout(() => {
                        if (!GAME_STATE.inBattle || boss.hp <= 0) return;
                        const sp = boss.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 7 + boss.scale, (Math.random() - 0.5) * 8));
                        const aim = playerEntity!.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 1.5, (Math.random() - 0.5) * 10)).sub(sp).normalize();
                        spawnProjectile({ pos: sp, dir: aim, speed: 70, isPlayer: false, damage: boss.damage * 0.55, life: 3.2, color: 0xff7700, size: 0.5, trail: true });
                        sfx('rail');
                    }, m * 140);
                }
            }

            if (boss.phase >= 2) {
                boss.shockwaveTimer -= delta;
                if (boss.shockwaveTimer <= 0) {
                    boss.shockwaveTimer = 8;
                    showFloatText('SHOCKWAVE — DASH AWAY!', '#ff2244');
                    const ring = new THREE.Mesh(
                        new THREE.RingGeometry(1, 2.2, 40),
                        new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
                    );
                    ring.rotation.x = -Math.PI / 2;
                    ring.position.set(boss.position.x, 0.4, boss.position.z);
                    scene.add(ring);
                    particles.push({ mesh: ring, ring: true, vel: new THREE.Vector3(), life: 0.9, maxLife: 0.9, ringGrow: 26 });
                    setTimeout(() => {
                        if (!GAME_STATE.inBattle) return;
                        sfx('bigexplode');
                        cameraShake = Math.max(cameraShake, 0.9);
                        spawnExplosionParticles(boss.position.clone().setY(1), 0xff5500, 24, 20);
                        explosionDamage(boss.position.clone(), 16, 320, true);
                    }, 900);
                }
            }
        }

        /* BOSS VISUALS: hover bob + phase eye color + barrel glow */

        function updateBossVisuals(delta: number) {
            enemyEntities.forEach(e => {
                if (!e.isBoss) return;
                const t = clock.elapsedTime;
                e.mesh.position.y = Math.sin(t * 1.4) * 0.5;
                const eyeColor = e.phase === 3 ? 0xff00ff : (e.phase === 2 ? 0xff6600 : 0xff2244);
                e.mesh.traverse(o => {
                    const m = o as THREE.Mesh;
                    const mat = m.material as THREE.MeshStandardMaterial;
                    if ((m as THREE.Mesh).isMesh && mat && mat.emissive && !o.userData.baseEmissive) {
                        // tint barrels slightly by phase
                        mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 0.4 + e.phase * 0.35);
                    }
                });
            });
        }

        function onBossDefeated(boss: MechEnemy) {
            GAME_STATE.tokens += 2;
            GAME_STATE.credits += 2500;
            GAME_STATE.rp += 200;
            updateCurrencyUI();
            saveGame();
            showFloatText('🏆 BOSS TOKENS +2 — NEXT TITAN UNLOCKED', '#ffb700');
        }

        /* DAMAGE RESOLUTION: shields first, crits, hit flash */

        function applyAISettingsToUI() {
            byId<HTMLSelectElement>('ai-preset-select').value = GAME_STATE.aiConfig.preset;
            byId<HTMLInputElement>('ai-range-input').value = String(GAME_STATE.aiConfig.range);
            byId<HTMLInputElement>('ai-retreat-input').value = String(GAME_STATE.aiConfig.retreat);
            updateAISettings();
        }

        function updateWingmanStatusUI() {
            const el = byId('drone-status');
            if (!el) return;
            const names: Record<string, string> = { aggressive: 'AGGRESSOR', defensive: 'GUARDIAN', sniper: 'MARKSMAN', berserker: 'BRAWLER' };
            el.innerHTML = `DRONE LINK: <span style="color: var(--accent-cyan);">${wingmanDrone ? 'ONLINE' : 'STANDBY (deploys on sortie)'}</span><br>
                PARADIGM: <span style="color: var(--accent-orange);">${names[GAME_STATE.aiConfig.preset] || 'CUSTOM'}</span> ·
                STANDOFF ${GAME_STATE.aiConfig.range}m ·
                E-BUG-OUT ${GAME_STATE.aiConfig.retreat}% ·
                <span style="color: var(--text-dim);">SHIFT = HOLD ORDER</span>`;
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (composer) composer.setSize(window.innerWidth, window.innerHeight);
            if (fxaaPass) {
                const pxr = renderer.getPixelRatio();
                fxaaPass.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pxr), 1 / (window.innerHeight * pxr));
            }
        }

        /* =========================================================================
           HIGH-DETAIL PROCEDURAL TEXTURES & BUMP MAPS
           ========================================================================= */
        function createIndustrialMetalTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

            ctx.fillStyle = '#222834';
            ctx.fillRect(0, 0, 512, 512);

            for (let i = 0; i < 20000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const val = Math.floor(Math.random() * 40);
                ctx.fillStyle = `rgba(${val},${val},${val},0.08)`;
                ctx.fillRect(x, y, 2, 2);
            }

            ctx.strokeStyle = '#0e121a';
            ctx.lineWidth = 5;
            for (let i = 0; i <= 512; i += 64) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
            }

            ctx.strokeStyle = '#3b475a';
            ctx.lineWidth = 2;
            for (let i = 2; i < 512; i += 64) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
            }

            ctx.fillStyle = '#64748b';
            for (let x = 12; x < 512; x += 64) {
                for (let y = 12; y < 512; y += 64) {
                    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + 40, y + 40, 2.5, 0, Math.PI * 2); ctx.fill();
                }
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            return texture;
        }

        function createBumpMapTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 256; i += 32) {
                ctx.fillRect(i, 0, 2, 256);
                ctx.fillRect(0, i, 256, 2);
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4);
            return texture;
        }

        const METAL_TEXTURE = createIndustrialMetalTexture();
        const BUMP_TEXTURE = createBumpMapTexture();

        /* =========================================================================
           DATA CONFIGURATION & GAME DATABASE
           ========================================================================= */
        const PARTS_DB: Record<PartCategory, MechPart[]> = {
            head: [
                { id: "scout_head", name: "Scout Optics Array", hp: 200, shield: 100, speed: 6, cost: 0, unlocked: true, desc: "Light high-res scanner cowl with multi-lens target sensors." },
                { id: "combat_head", name: "Iron Command Visor", hp: 500, shield: 260, speed: 0, cost: 1200, unlocked: false, desc: "Heavy military visor with sloped composite faceplate." },
                { id: "tactical_head", name: "Falcon Drone Node", hp: 560, shield: 300, speed: 10, cost: 2000, unlocked: false, desc: "Drone-relay sensor barrette. Faster chassis sync than the command visor." },
                { id: "siege_head", name: "Siege Dread Helmet", hp: 800, shield: 450, speed: -6, cost: 3500, unlocked: false, desc: "Reinforced armored crown designed for brutal frontline pressure." },
                { id: "guardian_head", name: "Aegis Bastion Helm", hp: 1000, shield: 580, speed: -2, cost: 4500, unlocked: false, desc: "Fortified pillar helm shielding the entire cockpit ring. Strictly outclasses the dread helmet." }
            ],
            torso: [
                { id: "light_torso", name: "Striker Lightweight Frame", hp: 1400, shield: 500, energy: 120, speed: 18, cost: 0, unlocked: true, desc: "Agile chassis equipped with streamlined thruster wings." },
                { id: "phantom_torso", name: "Shade Phantom Frame", hp: 1900, shield: 800, energy: 160, speed: 20, cost: 3200, unlocked: false, desc: "Featherweight stealth frame. Improves every Striker stat with hit-and-run speed." },
                { id: "heavy_torso", name: "Iron Maw Heavy Torso", hp: 2600, shield: 1100, energy: 170, speed: 0, cost: 2500, unlocked: false, desc: "Massive industrial frame featuring dual chest reactor intakes." },
                { id: "vanguard_torso", name: "Vanguard Bulwark Torso", hp: 3300, shield: 1450, energy: 210, speed: 6, cost: 4800, unlocked: false, desc: "Field-command bulk with relay antennae. Tougher and faster than the Iron Maw." },
                { id: "assault_torso", name: "Omega Citadel Torso", hp: 4200, shield: 1800, energy: 240, speed: -10, cost: 6000, unlocked: false, desc: "Impenetrable siege chassis with dynamic chest plating and the largest reactor bay." }
            ],
            arms: [
                { id: "cannon_arms", name: "Heavy Rotary Autocannons", damage: 320, heatRate: 6, range: 70, cost: 0, unlocked: true, desc: "Twin rotary cannons. Alternating barrels, fast tracers, cheap heat." },
                { id: "plasma_arms", name: "Twin Plasma Emitters", damage: 560, heatRate: 23, range: 90, cost: 2800, unlocked: false, desc: "Slow heavy plasma orbs that splash on impact and chew through shields." },
                { id: "grenade_arms", name: "Arc Mortar Pods", damage: 700, heatRate: 17, range: 100, cost: 4200, unlocked: false, desc: "Lobbed arcing shells that detonate with wide shrapnel blasts. Rewards prediction." },
                { id: "beamer_arms", name: "Helios Beam Cannons", damage: 900, heatRate: 75, range: 110, cost: 5200, unlocked: false, desc: "Continuous prismatic lance. Highest damage output of any arm in the Forge, but heat gain is brutal without reactor cooling investment. Arctic air vents an extra 20%." },
                { id: "railgun_arms", name: "Linear Magnetic Railguns", damage: 1150, heatRate: 57, range: 150, cost: 5500, unlocked: false, desc: "Long-range kinetic slugs that pierce up to three hulls. Heavy recoil, heavy heat." }
            ],
            legs: [
                { id: "walker_legs", name: "Bipedal Piston Hydraulics", hp: 500, speed: 55, cost: 0, unlocked: true, desc: "Articulated mechanical bipedal legs with knee shock absorbers." },
                { id: "treads_legs", name: "Armored Twin Treads", hp: 1200, speed: 38, cost: 2000, unlocked: false, desc: "Heavy tank track modules providing maximum stability." },
                { id: "bulwark_legs", name: "Anchor Stabilizer Pistons", hp: 1700, speed: 44, cost: 2600, unlocked: false, desc: "Wide anchor stance with hydraulic feet. More armor and more speed than twin treads." },
                { id: "spider_legs", name: "Chitin Spider Struts", hp: 900, speed: 72, cost: 3800, unlocked: false, desc: "Four-legged all-terrain rig that climbs broken cover quickly." },
                { id: "hover_legs", name: "Anti-Grav Thruster Ring", hp: 1000, speed: 88, cost: 4800, unlocked: false, desc: "Hover propulsion ring with layered thrusters — the fastest chassis in the Forge." }
            ],
            core: [
                { id: "standard_core", name: "Fission Power Core", energy: 100, heatCool: 40, cost: 0, unlocked: true, desc: "Standard reactor core with reliable heat sink venting." },
                { id: "high_output_core", name: "Overcharged Fusion Core", energy: 160, heatCool: 60, cost: 1800, unlocked: false, desc: "Boosted power generation. Cuts Helios beam heat build-up by roughly 18%." },
                { id: "overclocked_core", name: "Singularity Reactor Core", energy: 230, heatCool: 85, cost: 4200, unlocked: false, desc: "Experimental reactor with cryo cooling. Cuts Helios beam heat build-up by roughly 41%." },
                { id: "twin_core", name: "Twin Plasma Cores", energy: 300, heatCool: 100, cost: 5800, unlocked: false, desc: "Paired micro-furnaces with dual loop cooling. Cuts Helios beam heat by roughly 55%." },
                { id: "quantum_core", name: "Quantum Flux Reactor", energy: 380, heatCool: 130, cost: 7200, unlocked: false, desc: "Collapse-field reactor. Best cooling in the game — cuts Helios beam heat by over 80%." }
            ],
            armor: [
                { id: "light_armor", name: "Standard Composite Plating", hpBonus: 0, speedBonus: 5, cost: 0, unlocked: true, desc: "Baseline factory armor alloy." },
                { id: "heavy_armor", name: "Sloped Titanium Plating", hpBonus: 1000, speedBonus: -8, cost: 1500, unlocked: false, desc: "Dense sloped armor plates built to deflect kinetic rounds." },
                { id: "ablative_armor", name: "Ablative Ceramic Matrix", hpBonus: 1600, speedBonus: -3, cost: 2800, unlocked: false, desc: "Layered sacrificial ceramics that slough off incoming fire. Better armor and mobility than titanium." },
                { id: "reactive_armor", name: "Reactive Nanite Armor", hpBonus: 2400, speedBonus: -12, cost: 3800, unlocked: false, desc: "Smart armor that dissipates explosions upon impact. Heaviest plating available." },
                { id: "energy_armor", name: "Refraction Energy Weave", hpBonus: 2600, speedBonus: 16, cost: 6500, unlocked: false, desc: "Light-bending hull weave. Top-tier protection with no mobility penalty." }
            ]
        };

        const TECH_NODES: TechNode[] = [
            { id: "tech_1", name: "Cryo Injectors", category: "Cooling", cost: 150, unlocked: false, desc: "+25% faster heat sink recovery rate." },
            { id: "tech_2", name: "Overcharged Capacitors", category: "Shields", cost: 250, unlocked: false, desc: "+30% faster shield regeneration rate." },
            { id: "tech_3", name: "High-Velocity Acceleration", category: "Weapons", cost: 400, unlocked: false, desc: "+20% projectile speed and kinetic damage." }
        ];

        /** Hidden technique set: one pilot callsign swaps the entire upgrade loadout for these. */
        const GOJO_TECHNIQUES = [
            { id: 'tech_blue', name: 'Cursed Technique: Blue', desc: 'Key 1 — a blue gravity orb that drags hostiles into a collapsing point.', color: 0x2e7bff },
            { id: 'tech_red', name: 'Cursed Technique: Red', desc: 'Key 2 — launch a red orb; its impact detonates a repulsion shockwave.', color: 0xff2f45 },
            { id: 'tech_purple', name: 'Imaginary Technique: Hollow Purple', desc: 'Key 3 or LMB — an annihilation orb. Under Maximum Output, a held Blue detonates with a fired Red.', color: 0xa855f7 },
            { id: 'tech_limitless', name: 'Limitless: Infinity', desc: 'Key 4 — toggle Infinity. Incoming force stalls; damage is almost nullified.', color: 0x9fe8ff },
            { id: 'tech_domain', name: 'Domain Expansion: Unlimited Void', desc: 'Key 5 — a solid void barrier with a black hole and galaxy; traps hostiles in space.', color: 0x6d3bff }
        ];
        const GOJO_STATS = { hp: 14000, shield: 8000, energy: 600, speed: 110, heatCool: 120, damage: 4500 };

        /** Hidden mage build: a glass-cannon frame built around Zoltraak and hex barriers. */
        const FRIEREN_TECHNIQUES = [
            { id: 'spell_zoltraak', name: 'Zoltraak', desc: 'Key 1 or LMB — a piercing white annihilation beam that tears through everything in its path.', color: 0xf5fbff },
            { id: 'spell_hex_shield', name: 'Hex Shield', desc: 'Key 2 — raise a forward wall of translucent blue hexagons that absorbs incoming fire.', color: 0x54c8ff },
            { id: 'spell_sphere_shield', name: 'Spherical Hex Shield', desc: 'Key 3 — seal yourself inside a rotating sphere of blue hexagons and blunt all damage.', color: 0x2d9cff }
        ];
        const FRIEREN_STATS = { hp: 10500, shield: 11000, energy: 850, speed: 98, heatCool: 180, damage: 6000 };
        const FRIEREN_PAINT = { primary: 0xdbe8f4, secondary: 0x3f9dff, emissive: 0xa8ecff };

        const COLOR_PALETTES = {
            primary: [0x282e3a, 0x5a1e1e, 0x1d3e2e, 0x4e3e1e, 0x0f172a, 0x475569],
            secondary: [0xff5500, 0x00f0ff, 0xffb700, 0xe2e8f0, 0xff2244, 0x00ff66],
            emissive: [0x00f0ff, 0xff2244, 0x00ff66, 0xffaa00, 0xa855f7]
        };

        let GAME_STATE: GameState = {
            credits: 2000,
            rp: 100,
            tokens: 0,
            username: 'PILOT',
            currentTab: 'garage',
            activePartCategory: 'head',
            selectedArena: 'foundry',
            selectedMode: 'skirmish',
            inBattle: false,
            survivalWave: 1,
            survivalEarnings: 0,
            equipped: {
                head: 'scout_head',
                torso: 'light_torso',
                arms: 'cannon_arms',
                legs: 'walker_legs',
                core: 'standard_core',
                armor: 'light_armor'
            },
            paint: {
                primary: 0x282e3a,
                secondary: 0xff5500,
                emissive: 0x00f0ff
            },
            aiConfig: {
                preset: 'aggressive',
                range: 40,
                retreat: 20
            }
        };

        /* =========================================================================
           THREE.JS SCENE, CAMERA & GRAPHICS INITIALIZATION
           ========================================================================= */
        let scene: THREE.Scene;
        let camera: THREE.PerspectiveCamera;
        let renderer: THREE.WebGLRenderer;
        let garageMechMesh: THREE.Group | null;
        let playerEntity: MechEntity | null;
        let enemyEntities: MechEnemy[] = [];
        let projectiles: WeaponProjectile[] = [], particles: MechParticle[] = [], arenaObstacles: ArenaObstacle[] = [];

// Visual-only ambience (no gameplay effect)
let garageHoloRing: THREE.Group | null = null;
let garageScanRing: THREE.Mesh | null = null;
let arenaDust: THREE.Points | null = null;
let composer: EffectComposer | null = null;
let bloomPass: UnrealBloomPass | null = null;
let fxaaPass: ShaderPass | null = null;
        let cameraShake = 0;
        let activeWeaponBarrelIndex = 0;
        let clock = new THREE.Clock();

        function initGraphicsEngine() {
            const container = byId('canvas-container');

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x05070a);
            scene.fog = new THREE.FogExp2(0x05070a, 0.008);

            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 4, 11);

            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.1;
            container.appendChild(renderer.domElement);

            // Post-processing chain: scene -> bloom (emissives) -> FXAA
            composer = new EffectComposer(renderer);
            composer.addPass(new RenderPass(scene, camera));
            bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.55, 0.4, 0.82
            );
            composer.addPass(bloomPass);
            fxaaPass = new ShaderPass(FXAAShader);
            composer.addPass(fxaaPass);
            composer.setSize(window.innerWidth, window.innerHeight);
            // Compile the Hollow Purple shaders during boot instead of on the first cast.
            try {
                const hp = getHollowPurpleAssets();
                const blue = getBlueOrbAssets();
                const red = getRedOrbAssets();
                const warmScene = new THREE.Scene();
                const warm = new THREE.Group();
                warm.add(new THREE.Mesh(hp.coreGeo, hp.coreMat));
                warm.add(new THREE.Mesh(hp.shellGeo, hp.shellMat));
                warm.add(new THREE.Mesh(hp.ringGeoA, hp.ringMatA));
                warm.add(new THREE.Points(hp.trailGeo, hp.trailMat));
                warm.add(new THREE.Mesh(blue.coreGeo, blue.coreMat));
                warm.add(new THREE.Mesh(blue.shellGeo, blue.shellMat));
                warm.add(new THREE.Points(blue.moteGeo, blue.moteMat));
                warm.add(new THREE.Mesh(red.coreGeo, red.coreMat));
                warm.add(new THREE.Mesh(red.shellGeo, red.shellMat));
                warm.add(new THREE.Points(red.moteGeo, red.moteMat));
                warmScene.add(warm);
                renderer.compile(warmScene, camera);
            } catch (err) {
                console.warn('Gojo technique prewarm skipped', err);
            }
            const pr = renderer.getPixelRatio();
            fxaaPass.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const mainLight = new THREE.DirectionalLight(0xfff2e6, 1.6);
            mainLight.position.set(25, 45, 25);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 2048;
            mainLight.shadow.mapSize.height = 2048;
            mainLight.shadow.bias = -0.0005;
            scene.add(mainLight);

            const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
            rimLight.position.set(-25, 15, -25);
            scene.add(rimLight);

            setupGarageEnvironment();
            updateGarageMechDisplay();

            window.addEventListener('resize', onWindowResize);
            setupInputControls();

            animate();
        }

        function setupGarageEnvironment() {
            scene.children.filter(c => c.name === 'garage_env').forEach(c => scene.remove(c));

            const platformGroup = new THREE.Group();
            platformGroup.name = 'garage_env';

            const baseGeo = new THREE.CylinderGeometry(8.5, 9, 0.8, 32);
            const baseMat = new THREE.MeshStandardMaterial({ 
                color: 0x111622, roughness: 0.35, metalness: 0.85, 
                map: METAL_TEXTURE, bumpMap: BUMP_TEXTURE, bumpScale: 0.04 
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = -0.4;
            base.receiveShadow = true;
            platformGroup.add(base);

            const ringGeo = new THREE.TorusGeometry(8.2, 0.15, 16, 64);
            ringGeo.rotateX(Math.PI / 2);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff5500, emissiveIntensity: 1.5 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = 0.02;
            platformGroup.add(ring);

            const grid = new THREE.GridHelper(32, 32, 0xff5500, 0x1e293b);
            grid.position.y = 0.01;
            platformGroup.add(grid);

            // Rotating holo scan arcs around the mech
            const holoGroup = new THREE.Group();
            holoGroup.name = 'holo_ring';
            const holoMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
            for (let i = 0; i < 3; i++) {
                const arc = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.05, 8, 48, Math.PI * 0.42), holoMat);
                arc.rotation.x = Math.PI / 2;
                arc.rotation.z = i * Math.PI * 2 / 3;
                holoGroup.add(arc);
            }
            holoGroup.position.y = 2.2;
            platformGroup.add(holoGroup);
            garageHoloRing = holoGroup;

            // Breathing amber scan ring at head height
            const scanRing = new THREE.Mesh(
                new THREE.TorusGeometry(4.8, 0.035, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0xffb700, transparent: true, opacity: 0.35 })
            );
            scanRing.rotation.x = Math.PI / 2;
            scanRing.position.y = 5.6;
            platformGroup.add(scanRing);
            garageScanRing = scanRing;

            // Corner light pylons with soft floodlight cones
            const pylonMat = new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.4, metalness: 0.85 });
            [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(([px, pz]) => {
                const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 8.5, 12), pylonMat);
                pylon.position.set(px, 4.25, pz);
                platformGroup.add(pylon);

                const lamp = new THREE.Mesh(
                    new THREE.SphereGeometry(0.42, 12, 12),
                    new THREE.MeshBasicMaterial({ color: 0xff5500 })
                );
                lamp.position.set(px, 8.7, pz);
                platformGroup.add(lamp);

                const flood = new THREE.Mesh(
                    new THREE.ConeGeometry(3.2, 8.2, 14, 1, true),
                    new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.06, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
                );
                flood.position.set(px, 4.5, pz);
                platformGroup.add(flood);
            });

            // Radial floor accent spokes
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const spoke = new THREE.Mesh(
                    new THREE.BoxGeometry(5.6, 0.03, 0.28),
                    new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.4 })
                );
                spoke.position.set(Math.cos(a) * 5.4, 0.02, Math.sin(a) * 5.4);
                spoke.rotation.y = -a;
                platformGroup.add(spoke);
            }

            // Warm light pool under the mech (visual only)
            const poolCanvas = document.createElement('canvas');
            poolCanvas.width = 512;
            poolCanvas.height = 512;
            const poolCtx = poolCanvas.getContext('2d') as CanvasRenderingContext2D;
            const poolGrad = poolCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
            poolGrad.addColorStop(0, 'rgba(255, 110, 30, 0.5)');
            poolGrad.addColorStop(0.45, 'rgba(255, 85, 0, 0.16)');
            poolGrad.addColorStop(1, 'rgba(255, 85, 0, 0)');
            poolCtx.fillStyle = poolGrad;
            poolCtx.fillRect(0, 0, 512, 512);
            const lightPool = new THREE.Mesh(
                new THREE.PlaneGeometry(24, 24),
                new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(poolCanvas), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
            );
            lightPool.rotation.x = -Math.PI / 2;
            lightPool.position.y = 0.025;
            platformGroup.add(lightPool);

            scene.add(platformGroup);
        }

        /* =========================================================================
           DYNAMIC DIVERSE PROCEDURAL MECH MODEL GENERATOR
           ========================================================================= */
        function getRandomEnemyLoadout() {
            const categories = ['head', 'torso', 'arms', 'legs', 'core', 'armor'];
            const loadout: Record<string, string> = {};
            categories.forEach((cat: string) => {
                const parts = PARTS_DB[cat as PartCategory];
                loadout[cat] = parts[Math.floor(Math.random() * parts.length)].id;
            });

            const enemyPalettes = [
                { primary: 0x8b0000, secondary: 0x1a1a1a, emissive: 0xff3300 }, // Crimson Rampage
                { primary: 0x1f3a60, secondary: 0x0f172a, emissive: 0x00f0ff }, // Cobalt Interceptor
                { primary: 0x2d4a1d, secondary: 0x111827, emissive: 0x00ff66 }, // Toxic Ravager
                { primary: 0x5a3e1b, secondary: 0x221810, emissive: 0xffb700 }, // Wasteland Dread
                { primary: 0x4a1d5a, secondary: 0x180f24, emissive: 0xa855f7 }, // Void Sentinel
                { primary: 0x333333, secondary: 0xff0000, emissive: 0xff2222 }  // Shadow Executioner
            ];
            const paint = enemyPalettes[Math.floor(Math.random() * enemyPalettes.length)];

            return { loadout, paint };
        }

        function createProceduralMechMesh(equipped: Record<string, string>, paint: { primary: number; secondary: number; emissive: number }) {
            const mech = new THREE.Group();

            const matPrimary = new THREE.MeshStandardMaterial({
                color: paint.primary, roughness: 0.33, metalness: 0.8,
                map: METAL_TEXTURE, bumpMap: BUMP_TEXTURE, bumpScale: 0.03
            });
            const matSecondary = new THREE.MeshStandardMaterial({ color: paint.secondary, roughness: 0.3, metalness: 0.85 });
            const matEmissive = new THREE.MeshStandardMaterial({ color: paint.emissive, emissive: paint.emissive, emissiveIntensity: 3.0 });
            const matDark = new THREE.MeshStandardMaterial({ color: 0x0e1117, roughness: 0.5, metalness: 0.9 });
            const matGun = new THREE.MeshStandardMaterial({ color: 0x1b1f28, roughness: 0.25, metalness: 0.95 });
            const matJoint = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.42, metalness: 0.92, bumpMap: BUMP_TEXTURE, bumpScale: 0.04 });

            // TORSO DESIGN VARIATIONS
            const torsoGroup = new THREE.Group();
            torsoGroup.name = "torsoGroup";
            torsoGroup.position.y = 3.0;

            let torsoWidth = 2.0;
            let torsoHeight = 2.2;

            if (equipped.torso === 'light_torso') {
                torsoWidth = 1.8;
                torsoHeight = 2.0;

                // Hex-spined lightweight core with swept cockpit cowl
                const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.98, 2.0, 6), matPrimary);
                spine.rotation.y = Math.PI / 6;
                torsoGroup.add(spine);

                const cowl = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.85, 0.9), matPrimary);
                cowl.position.set(0, 0.45, 0.55);
                cowl.rotation.x = -0.12;
                torsoGroup.add(cowl);

                const cowlCap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.55), matSecondary);
                cowlCap.position.set(0, 0.9, 0.4);
                cowlCap.rotation.x = -0.32;
                torsoGroup.add(cowlCap);

                // Swept strake wings with emissive trailing edges
                [-1, 1].forEach(x => {
                    const strake = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 1.5), matSecondary);
                    strake.position.set(x * 1.02, 0.25, -0.28);
                    strake.rotation.z = x > 0 ? -0.32 : 0.32;
                    torsoGroup.add(strake);

                    const strakeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 1.05), matEmissive);
                    strakeEdge.position.set(x * 1.02, 0.25, -0.62);
                    strakeEdge.rotation.z = x > 0 ? -0.32 : 0.32;
                    torsoGroup.add(strakeEdge);
                });
            } else if (equipped.torso === 'heavy_torso') {
                torsoWidth = 2.6;
                torsoHeight = 2.5;

                // Industrial slab tower with sloped chest facet
                const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.3, 2.0), matPrimary);
                torsoGroup.add(hull);

                const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.6), matSecondary);
                chestMesh.position.set(0, 0.2, 1.15);
                chestMesh.rotation.x = -0.16;
                torsoGroup.add(chestMesh);

                const browPlate = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.4), matPrimary);
                browPlate.position.set(0, 0.95, 1.1);
                browPlate.rotation.x = -0.4;
                torsoGroup.add(browPlate);

                // Twin intake ducts with emissive grills
                [-0.75, 0.75].forEach(x => {
                    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.55, 6), matJoint);
                    duct.rotation.x = Math.PI / 2;
                    duct.position.set(x, 0.72, 1.25);
                    torsoGroup.add(duct);
                    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.06), matEmissive);
                    grill.position.set(x, 0.72, 1.52);
                    torsoGroup.add(grill);
                });

                const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 1.3), matSecondary);
                deckPlate.position.set(0, 1.15, -0.1);
                torsoGroup.add(deckPlate);
            } else if (equipped.torso === 'assault_torso') {
                torsoWidth = 3.2;
                torsoHeight = 2.8;

                // Faceted citadel: octagonal body + upper tier + sloped slabs
                const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.55, 2.55, 8), matPrimary);
                torsoMesh.rotation.y = Math.PI / 8;
                torsoGroup.add(torsoMesh);

                const tier = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.6, 0.7, 8), matSecondary);
                tier.rotation.y = Math.PI / 8;
                tier.position.y = 1.55;
                torsoGroup.add(tier);

                [-0.8, 0.8].forEach(x => {
                    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.5), matSecondary);
                    slab.position.set(x, 0, 1.4);
                    slab.rotation.y = x > 0 ? -0.2 : 0.2;
                    torsoGroup.add(slab);
                });

                // Reinforced prow with warning stripe
                const prow = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.8, 0.35), matPrimary);
                prow.position.set(0, 0.1, 1.7);
                prow.rotation.x = -0.28;
                torsoGroup.add(prow);
                const prowStripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), matEmissive);
                prowStripe.position.set(0, 0.42, 1.86);
                prowStripe.rotation.x = -0.28;
                torsoGroup.add(prowStripe);
            } else if (equipped.torso === 'phantom_torso') {
                torsoWidth = 2.05;
                torsoHeight = 2.15;

                // Low-observable wedge: narrow waist, forward-swept blades, dorsal stealth fin.
                const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.6, 2.15, 4), matPrimary);
                hull.rotation.y = Math.PI / 4;
                torsoGroup.add(hull);

                const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.75, 0.9), matPrimary);
                cockpit.position.set(0, 0.55, 0.62);
                cockpit.rotation.x = -0.2;
                torsoGroup.add(cockpit);
                const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.6), matEmissive);
                canopy.position.set(0, 0.74, 0.8);
                canopy.rotation.x = -0.35;
                torsoGroup.add(canopy);

                [-1, 1].forEach(sx => {
                    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 1.5), matSecondary);
                    blade.position.set(sx * 0.95, 0.32, -0.1);
                    blade.rotation.y = sx * 0.32;
                    blade.rotation.z = sx * -0.18;
                    torsoGroup.add(blade);
                    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 1.1), matEmissive);
                    edge.position.set(sx * 0.95, 0.45, -0.1);
                    edge.rotation.y = sx * 0.32;
                    torsoGroup.add(edge);
                    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.1), matEmissive);
                    slit.position.set(sx * 0.35, 0.42, 1.02);
                    torsoGroup.add(slit);
                });

                const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 1.15), matSecondary);
                dorsalFin.position.set(0, 1.0, -0.55);
                dorsalFin.rotation.x = 0.4;
                torsoGroup.add(dorsalFin);
            } else if (equipped.torso === 'vanguard_torso') {
                torsoWidth = 2.7;
                torsoHeight = 2.5;

                // Field-command block: sloped glacis, radar mast, antenna farm, shoulder relay pods.
                const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.0), matPrimary);
                torsoGroup.add(hull);

                const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 0.7), matSecondary);
                glacis.position.set(0, 0.42, 1.12);
                glacis.rotation.x = -0.32;
                torsoGroup.add(glacis);
                const commandStrip = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 0.12), matEmissive);
                commandStrip.position.set(0, 0.72, 1.36);
                torsoGroup.add(commandStrip);

                const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.6, 8), matJoint);
                radarMast.position.set(-0.8, 1.9, -0.55);
                torsoGroup.add(radarMast);
                const radarDish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), matSecondary);
                radarDish.rotation.x = -0.9;
                radarDish.position.set(-0.8, 2.6, -0.5);
                torsoGroup.add(radarDish);
                const dishGlow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), matEmissive);
                dishGlow.position.set(-0.8, 2.55, -0.28);
                torsoGroup.add(dishGlow);

                [0, 1, 2].forEach(i => {
                    const h = 0.9 + i * 0.35;
                    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, h, 6), matJoint);
                    antenna.position.set(0.55 + i * 0.14, 1.5 + h / 2, -0.8);
                    torsoGroup.add(antenna);
                });

                [-1, 1].forEach(sx => {
                    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.9), matSecondary);
                    pod.position.set(sx * 1.32, 0.75, -0.3);
                    torsoGroup.add(pod);
                });
                const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 1.1), matSecondary);
                deck.position.set(0, 1.15, -0.25);
                torsoGroup.add(deck);
            }

            if (torsoGroup.children.length === 0) {
                // fallback mid-weight hull for any extra ids
                torsoWidth = 2.2;
                torsoHeight = 2.35;
                const hullPrism = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 0.95, 2.3, 6), matPrimary);
                hullPrism.rotation.y = Math.PI / 6;
                torsoGroup.add(hullPrism);
                const chestPlateFb = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.5), matSecondary);
                chestPlateFb.position.set(0, 0.3, 0.92);
                chestPlateFb.rotation.x = -0.12;
                torsoGroup.add(chestPlateFb);
                [-1, 1].forEach((sx) => {
                    const shoulderCap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.9), matPrimary);
                    shoulderCap.position.set(sx * 1.08, 0.95, 0);
                    torsoGroup.add(shoulderCap);
                });
            }
            // Core Reactor Intake + status ring (outer rings scale with core part)
            const reactorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.4, 12), matEmissive);
            reactorMesh.rotateX(Math.PI / 2);
            reactorMesh.position.set(0, 0.2, torsoWidth * 0.5 + 0.1);
            torsoGroup.add(reactorMesh);

            const matRingDim = new THREE.MeshStandardMaterial({ color: paint.emissive, emissive: paint.emissive, emissiveIntensity: 1.1 });
            const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 8, 24), matRingDim);
            reactorRing.position.set(0, 0.2, torsoWidth * 0.5 + 0.16);
            torsoGroup.add(reactorRing);
            if (equipped.core === 'high_output_core') {
                const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 8, 24), matRingDim);
                ring2.position.set(0, 0.2, torsoWidth * 0.5 + 0.16);
                torsoGroup.add(ring2);
            } else if (equipped.core === 'overclocked_core') {
                [0.82, 1.0].forEach(rr => {
                    const ringX = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.045, 8, 24), matRingDim);
                    ringX.position.set(0, 0.2, torsoWidth * 0.5 + 0.16);
                    torsoGroup.add(ringX);
                });
            }

            if (equipped.core === "twin_core") {
                [-0.42, 0.42].forEach((cx) => {
                    const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.34, 10), matEmissive);
                    mini.rotateX(Math.PI / 2);
                    mini.position.set(cx, 0.2, torsoWidth * 0.5 + 0.06);
                    torsoGroup.add(mini);
                    const miniRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 20), matRingDim);
                    miniRing.position.set(cx, 0.2, torsoWidth * 0.5 + 0.16);
                    torsoGroup.add(miniRing);
                });
            } else if (equipped.core === "quantum_core") {
                [0.72, 0.92, 1.12].forEach((qr) => {
                    const qRing = new THREE.Mesh(new THREE.TorusGeometry(qr, 0.03, 8, 28), matRingDim);
                    qRing.position.set(0, 0.2, torsoWidth * 0.5 + 0.16);
                    torsoGroup.add(qRing);
                });
                [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ma) => {
                    const qMote = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), matEmissive);
                    qMote.position.set(Math.cos(ma) * 1.05, 0.2 + Math.sin(ma) * 0.5, torsoWidth * 0.5 + 0.16);
                    torsoGroup.add(qMote);
                });
            }
            // Back Exhausts: octagonal stacks with glowing caps
            [-0.7, 0.7].forEach(x => {
                const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.85, 8), matDark);
                stack.position.set(x * (torsoWidth * 0.4), 1.0, -1.22);
                stack.rotation.x = -0.18;
                torsoGroup.add(stack);

                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.2, 0.14, 8), matEmissive);
                cap.position.set(x * (torsoWidth * 0.4), 1.92, -1.38);
                cap.rotation.x = -0.18;
                torsoGroup.add(cap);
            });

            // HEAD DESIGN VARIATIONS
            const headGroup = new THREE.Group();
            headGroup.position.set(0, torsoHeight * 0.65, 0.2);

            if (equipped.head === 'scout_head') {
                // Segmented sensor barbette with twin barrel lenses
                const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.37, 0.85, 6), matPrimary);
                pod.rotateX(Math.PI / 2);
                pod.position.z = -0.05;
                headGroup.add(pod);

                const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.1), matEmissive);
                visorMesh.position.set(0, 0.08, 0.36);
                headGroup.add(visorMesh);

                [-0.19, 0.19].forEach((x) => {
                    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 10), matGun);
                    lens.rotateX(Math.PI / 2);
                    lens.position.set(x, 0.02, 0.34);
                    headGroup.add(lens);
                    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 14), matSecondary);
                    lensRing.position.set(x, 0.02, 0.44);
                    headGroup.add(lensRing);
                });

                [-0.3, 0.3].forEach(x => {
                    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.5), matSecondary);
                    fin.position.set(x, 0.28, -0.12);
                    fin.rotation.z = x > 0 ? -0.25 : 0.25;
                    headGroup.add(fin);
                });
            } else if (equipped.head === 'combat_head') {
                const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.95), matPrimary);
                headGroup.add(headMesh);

                // Sloped brow + chin guard with recessed visor slit
                const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.22), matEmissive);
                visorMesh.position.set(0, 0.05, 0.52);
                headGroup.add(visorMesh);

                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.5), matSecondary);
                brow.position.set(0, 0.34, 0.35);
                brow.rotation.x = -0.35;
                headGroup.add(brow);

                const chin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.35), matSecondary);
                chin.position.set(0, -0.28, 0.38);
                headGroup.add(chin);

                [-0.52, 0.52].forEach(x => {
                    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.8), matDark);
                    cheek.position.set(x, 0.02, -0.05);
                    headGroup.add(cheek);
                });
            } else if (equipped.head === 'siege_head') {
                const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.3), matPrimary);
                headGroup.add(headMesh);

                const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.28), matEmissive);
                visorMesh.position.set(0, 0.08, 0.66);
                headGroup.add(visorMesh);

                // Crowned horns + heavy brow
                const browPlate = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.3, 0.5), matSecondary);
                browPlate.position.set(0, 0.4, 0.4);
                browPlate.rotation.x = -0.3;
                headGroup.add(browPlate);

                [-0.5, 0.5].forEach(x => {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.95, 6), matSecondary);
                    horn.position.set(x, 0.62, -0.05);
                    horn.rotation.z = x > 0 ? -0.3 : 0.3;
                    headGroup.add(horn);
                });
            } else if (equipped.head === 'tactical_head') {
                // Falcon Drone Node: wide sensor barrette, twin relay masts, sweep dish.
                const barrette = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 0.72), matPrimary);
                headGroup.add(barrette);
                const band = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.76), matSecondary);
                band.position.y = 0.19;
                headGroup.add(band);
                const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.09, 0.12), matEmissive);
                visorSlit.position.set(0, -0.03, 0.39);
                headGroup.add(visorSlit);
                [-0.34, 0.34].forEach(mx => {
                    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), matJoint);
                    mast.position.set(mx, 0.66, -0.08);
                    headGroup.add(mast);
                    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matEmissive);
                    tip.position.set(mx, 1.13, -0.08);
                    headGroup.add(tip);
                });
                const dish = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), matSecondary);
                dish.rotation.x = -Math.PI * 0.55;
                dish.position.set(0, 0.42, 0.1);
                headGroup.add(dish);
            } else if (equipped.head === 'guardian_head') {
                // Aegis Bastion: slab helm, planet-ring halo and crown crest.
                const helm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.25), matPrimary);
                headGroup.add(helm);
                const brow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.7), matSecondary);
                brow.position.set(0, 0.42, 0.3);
                brow.rotation.x = -0.25;
                headGroup.add(brow);
                const visor = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.22), matEmissive);
                visor.position.set(0, 0.04, 0.64);
                headGroup.add(visor);
                const crest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 1.0), matSecondary);
                crest.position.set(0, 0.66, -0.05);
                headGroup.add(crest);
                const halo = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 28), matEmissive);
                halo.position.set(0, 0.2, -0.48);
                headGroup.add(halo);
                [-0.62, 0.62].forEach(gx => {
                    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.9), matDark);
                    guard.position.set(gx, -0.05, 0);
                    headGroup.add(guard);
                });
            } else {
                // generic fallback for unknown head ids
                const browDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.6), matPrimary);
                browDome.position.y = 0.1;
                headGroup.add(browDome);
                const bandHelm = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.22, 12), matSecondary);
                bandHelm.position.y = -0.06;
                headGroup.add(bandHelm);
                const fallbackVisor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.1), matEmissive);
                fallbackVisor.position.set(0, 0.02, 0.34);
                headGroup.add(fallbackVisor);
            }
            torsoGroup.add(headGroup);
            mech.add(torsoGroup);

            // LEGS DESIGN VARIATIONS
            const legsGroup = new THREE.Group();
            legsGroup.name = "legsGroup";

            if (equipped.legs === 'treads_legs') {
                [-1.6, 1.6].forEach(side => {
                    const treadGroup = new THREE.Group();
                    treadGroup.position.set(side, 0.8, 0);

                    const treadBody = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.45, 4.05), matDark);
                    treadGroup.add(treadBody);

                    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 3.6), matSecondary);
                    skirt.position.y = 0.55;
                    skirt.rotation.x = 0.06;
                    treadGroup.add(skirt);

                    for (let w = -1.5; w <= 1.5; w += 0.75) {
                        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.12, 16), matGun);
                        wheel.rotateZ(Math.PI / 2);
                        wheel.position.set(0, -0.28, w);
                        treadGroup.add(wheel);

                        // hub caps + tread lugs
                        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.18, 12), matJoint);
                        hub.rotateZ(Math.PI / 2);
                        hub.position.set(0, -0.28, w);
                        treadGroup.add(hub);
                        const lug = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.5, 0.12), matSecondary);
                        lug.position.set(0, -0.5, w);
                        treadGroup.add(lug);
                    }

                    // angled nose plate
                    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.5), matPrimary);
                    nose.position.set(0, 0.35, 2.1);
                    nose.rotation.x = 0.55;
                    treadGroup.add(nose);

                    legsGroup.add(treadGroup);
                });
            } else if (equipped.legs === 'hover_legs') {
                const ringGeo = new THREE.TorusGeometry(1.85, 0.35, 16, 32);
                ringGeo.rotateX(Math.PI / 2);
                const ring = new THREE.Mesh(ringGeo, matSecondary);
                ring.position.y = 1.1;
                legsGroup.add(ring);

                const glowDisk = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.25, 32), matEmissive);
                glowDisk.position.y = 0.9;
                legsGroup.add(glowDisk);

                // layered hover skirt with thruster bells + stabilizer vanes
                const skirt = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 1.62, 0.62, 24), matDark);
                skirt.position.y = 1.15;
                legsGroup.add(skirt);

                [-1.25, 1.25].forEach(tx => [-1.25, 1.25].forEach(tz => {
                    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.42, 12), matGun);
                    bell.position.set(tx, 0.88, tz);
                    legsGroup.add(bell);
                }));
                [[-2.2, 0], [2.2, 0], [0, -2.2], [0, 2.2]].forEach(([vx, vz]) => {
                    const vane = new THREE.Mesh(new THREE.BoxGeometry(vx !== 0 ? 0.55 : 0.18, 0.08, vz !== 0 ? 0.55 : 0.18), matSecondary);
                    vane.position.set(vx, 1.12, vz);
                    legsGroup.add(vane);
                });
            } else if (equipped.legs === "spider_legs") {
                const carapace = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.78, 0.62, 6), matDark);
                carapace.position.y = 1.55;
                carapace.rotation.y = Math.PI / 6;
                legsGroup.add(carapace);
                const spineRidge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), matSecondary);
                spineRidge.position.y = 1.9;
                legsGroup.add(spineRidge);
                let spiderIdx = 0;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((sz) => {
                    const strut = new THREE.Group();
                    strut.name = "leg_" + spiderIdx;
                    strut.position.set(sz[0] * 0.9, 1.5, sz[1] * 0.5);
                    const coxa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), matJoint);
                    strut.add(coxa);
                    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.95, 8), matPrimary);
                    upperLeg.position.set(sz[0] * 0.22, 0.4, sz[1] * 0.1);
                    upperLeg.rotation.z = sz[0] * -0.55;
                    strut.add(upperLeg);
                    const kneeNub = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), matSecondary);
                    kneeNub.position.set(sz[0] * 0.5, 0.3, sz[1] * 0.16);
                    strut.add(kneeNub);
                    const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 8), matPrimary);
                    lowerLeg.position.set(sz[0] * 0.78, -0.42, sz[1] * 0.22);
                    lowerLeg.rotation.z = sz[0] * 0.38;
                    strut.add(lowerLeg);
                    const footPad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.42), matDark);
                    footPad.position.set(sz[0] * 1.02, -1.18, sz[1] * 0.28);
                    strut.add(footPad);
                    legsGroup.add(strut);
                    spiderIdx += 1;
                });
            } else if (equipped.legs === 'bulwark_legs') {
                // Wide anchor stance: armoured hip block, twin hydraulic legs, splayed stabilizer feet.
                const hipBlock = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.8), matDark);
                hipBlock.position.y = 1.85;
                legsGroup.add(hipBlock);
                const hipArmor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.5), matSecondary);
                hipArmor.position.set(0, 2.25, 0.15);
                legsGroup.add(hipArmor);

                [-1.45, 1.45].forEach((side, idx) => {
                    const legContainer = new THREE.Group();
                    legContainer.name = `leg_${idx}`;
                    legContainer.position.set(side, 1.75, 0);
                    legsGroup.add(legContainer);

                    const hipJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.7, 10), matJoint);
                    hipJoint.rotateZ(Math.PI / 2);
                    legContainer.add(hipJoint);

                    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 1.0), matPrimary);
                    thigh.position.y = -0.7;
                    legContainer.add(thigh);

                    [-0.28, 0.28].forEach(px => {
                        const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 8), matGun);
                        piston.position.set(px, -0.75, -0.62);
                        legContainer.add(piston);
                        const pistonGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 8), matEmissive);
                        pistonGlow.position.set(px, -1.32, -0.62);
                        legContainer.add(pistonGlow);
                    });

                    const knee = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.1), matSecondary);
                    knee.position.set(0, -1.45, 0.05);
                    legContainer.add(knee);

                    const shin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 1.0), matPrimary);
                    shin.position.y = -2.15;
                    legContainer.add(shin);
                    const shinPlate = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.0, 0.22), matSecondary);
                    shinPlate.position.set(0, -2.1, 0.55);
                    legContainer.add(shinPlate);

                    const anchor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 2.0), matDark);
                    anchor.position.set(0, -2.95, 0.15);
                    legContainer.add(anchor);
                    [-0.55, 0.55].forEach(cz => {
                        const claw = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.9), matSecondary);
                        claw.position.set(0, -3.0, 0.15 + cz);
                        legContainer.add(claw);
                    });
                    const anchorGlow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), matEmissive);
                    anchorGlow.position.set(0, -2.78, 1.08);
                    legContainer.add(anchorGlow);
                });
            } else {
                // walker/bulwark biped rig
                const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.08, 0.72, 6), matDark);                pelvis.position.y = 1.8;
                pelvis.rotation.y = Math.PI / 6;
                legsGroup.add(pelvis);

                const crotchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 1.25), matSecondary);
                crotchPlate.position.set(0, 1.42, 0.05);
                legsGroup.add(crotchPlate);

                [-1.2, 1.2].forEach((side, idx) => {
                    const legContainer = new THREE.Group();
                    legContainer.name = `leg_${idx}`;
                    legContainer.position.set(side, 1.7, 0);

                    const hip = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), matDark);
                    legContainer.add(hip);

                    const hipHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.5, 8), matJoint);
                    hipHousing.rotateZ(Math.PI / 2);
                    legContainer.add(hipHousing);

                    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.4, 0.75), matPrimary);
                    thigh.position.set(0, -0.7, 0);
                    legContainer.add(thigh);
                    const thighPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.16), matSecondary);
                    thighPlate.position.set(0, -0.72, 0.4);
                    legContainer.add(thighPlate);

                    // hydraulic actuator behind the thigh
                    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 8), matGun);
                    piston.position.set(side > 0 ? -0.22 : 0.22, -0.95, -0.5);
                    piston.rotation.x = 0.35;
                    legContainer.add(piston);

                    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.95), matSecondary);
                    knee.position.set(0, -1.4, 0.2);
                    legContainer.add(knee);
                    const kneeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.06), matEmissive);
                    kneeSlit.position.set(0, -1.36, 0.68);
                    legContainer.add(kneeSlit);

                    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.8), matPrimary);
                    shin.position.set(0, -2.2, 0.1);
                    legContainer.add(shin);
                    const shinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.35, 0.2), matSecondary);
                    shinGuard.position.set(0, -2.18, 0.48);
                    shinGuard.rotation.x = 0.05;
                    legContainer.add(shinGuard);
                    const shinStrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, 0.05), matEmissive);
                    shinStrip.position.set(0, -2.15, 0.6);
                    legContainer.add(shinStrip);

                    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 1.7), matDark);
                    foot.position.set(0, -3.0, 0.3);
                    legContainer.add(foot);
                    const toePlate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.5), matSecondary);
                    toePlate.position.set(0, -2.98, 1.05);
                    toePlate.rotation.x = 0.2;
                    legContainer.add(toePlate);
                    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.35), matDark);
                    heel.position.set(0, -3.05, -0.6);
                    legContainer.add(heel);

                    // armor-part visual trim
                    if (equipped.armor === 'heavy_armor') {
                        const skirtPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 0.6), matSecondary);
                        skirtPlate.position.set(side > 0 ? 0.4 : -0.4, -0.75, 0);
                        legContainer.add(skirtPlate);
                    } else if (equipped.armor === 'reactive_armor') {
                        [[-0.42, -0.75], [0.42, -0.75]].forEach(([ax, ay]) => {
                            const reactiveCell = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.5), matEmissive);
                            reactiveCell.position.set(ax, ay, 0.05);
                            legContainer.add(reactiveCell);
                        });
                    }

                    if (equipped.armor === "ablative_armor") {
                        const guardPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.6), matSecondary);
                        guardPlate.position.set(side * -0.42, -0.5, -0.1);
                        legContainer.add(guardPlate);
                        const abCell = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.4), matPrimary);
                        abCell.position.set(side * -0.42, -0.15, -0.1);
                        legContainer.add(abCell);
                    } else if (equipped.armor === "energy_armor") {
                        const weave = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.12), matEmissive);
                        weave.position.set(side * 0.42, -1.15, 0.02);
                        legContainer.add(weave);
                    }
                    legsGroup.add(legContainer);
                });
            }
            mech.add(legsGroup);

            // WEAPON MOUNT BARRELS
            [-1, 1].forEach((side, sIdx) => {
                const armGroup = new THREE.Group();
                armGroup.position.set(side * (torsoWidth * 0.68), 3.2, 0);

                const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.3), matSecondary);
                armGroup.add(shoulder);

                // shoulder tower: top slat grill + charge strip
                for (let sl = 0; sl < 3; sl++) {
                    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 1.05), matDark);
                    slat.position.set(0, 0.62 + sl * 0.09, 0);
                    armGroup.add(slat);
                }
                const chargeLight = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 1.16), matEmissive);
                chargeLight.position.y = -0.48;
                armGroup.add(chargeLight);

                const strutPiece = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), matDark);
                strutPiece.position.y = -0.8;
                armGroup.add(strutPiece);
                // elbow actuator cuff
                const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.42, 8), matJoint);
                cuff.position.y = -1.05;
                armGroup.add(cuff);

                const weaponMount = new THREE.Group();
                weaponMount.position.set(0, -1.2, 0.2);

                const barrelTipDummy = new THREE.Object3D();
                barrelTipDummy.name = "barrelTip";

                if (equipped.arms === 'railgun_arms') {
                    const bodyPiece = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 2.4), matGun);
                    weaponMount.add(bodyPiece);

                    [-0.25, 0.25].forEach(ry => {
                        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.2), matSecondary);
                        rail.position.set(0, ry, 1.4);
                        weaponMount.add(rail);
                    });

                    [0.5, 1.6, 2.7].forEach(zz => {
                        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 6, 18), matEmissive);
                        coil.position.z = zz;
                        weaponMount.add(coil);
                    });

                    barrelTipDummy.position.set(0, 0, 3.5);
                } else if (equipped.arms === 'plasma_arms') {
                    const bodyPiece = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 2.2), matGun);
                    weaponMount.add(bodyPiece);

                    [0.35, 0.85].forEach(zz => {
                        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 18), matSecondary);
                        coil.position.z = zz;
                        weaponMount.add(coil);
                    });

                    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), matEmissive);
                    orb.position.set(0, 0, 1.2);
                    weaponMount.add(orb);

                    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1.2, 16), matSecondary);
                    nozzle.rotateX(Math.PI / 2);
                    nozzle.position.set(0, 0, 1.6);
                    weaponMount.add(nozzle);

                    barrelTipDummy.position.set(0, 0, 2.3);
                } else if (equipped.arms === "grenade_arms") {
                    const podBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.9), matGun);
                    weaponMount.add(podBody);
                    [-0.3, 0.3].forEach((py) => {
                        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.5, 8), matSecondary);
                        tube.rotateX(Math.PI / 2 - 0.14);
                        tube.position.set(0, py, 0.95);
                        weaponMount.add(tube);
                        const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 6, 12), matEmissive);
                        muzzleRing.position.set(0, py + 0.18, 1.62);
                        weaponMount.add(muzzleRing);
                    });
                    barrelTipDummy.position.set(0, 0.18, 2.2);
                } else if (equipped.arms === "beamer_arms") {
                    const lensHousing = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 2.1), matGun);
                    weaponMount.add(lensHousing);
                    [-0.22, 0.22].forEach((ly) => {
                        const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.3, 12), matSecondary);
                        lensBarrel.rotateX(Math.PI / 2);
                        lensBarrel.position.set(0, ly, 1.15);
                        weaponMount.add(lensBarrel);
                        const lensRod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 10), matEmissive);
                        lensRod.rotateX(Math.PI / 2);
                        lensRod.position.set(0, ly, 1.2);
                        weaponMount.add(lensRod);
                    });
                    const lensCapM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.24), matSecondary);
                    lensCapM.position.set(0, 0, 0.25);
                    weaponMount.add(lensCapM);
                    barrelTipDummy.position.set(0, 0, 2.25);
                } else {
                    const bodyPiece = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.0), matGun);                    weaponMount.add(bodyPiece);

                    const barrelBundle = new THREE.Group();
                    barrelBundle.position.set(0, 0, 1.2);

                    for (let b = 0; b < 6; b++) {
                        const angle = (b / 6) * Math.PI * 2;
                        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), matDark);
                        barrel.rotateX(Math.PI / 2);
                        barrel.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 1.2);
                        barrelBundle.add(barrel);
                    }
                    weaponMount.add(barrelBundle);

                    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), matDark);
                    muzzleBrake.rotateX(Math.PI / 2);
                    muzzleBrake.position.set(0, 0, 2.25);
                    weaponMount.add(muzzleBrake);

                    barrelTipDummy.position.set(0, 0, 2.4);
                }

                weaponMount.add(barrelTipDummy);
                armGroup.add(weaponMount);
                mech.add(armGroup);
            });

            // --- Detail kit (visual only) ---
            const antennaPiece = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), matJoint);
            antennaPiece.position.set(0.55, torsoHeight * 0.65 + 1.3, -0.3);
            torsoGroup.add(antennaPiece);
            const beaconMat = new THREE.MeshBasicMaterial({ color: paint.emissive });
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), beaconMat);
            beacon.position.set(0.55, torsoHeight * 0.65 + 2.1, -0.3);
            torsoGroup.add(beacon);

            [-0.45, 0.45].forEach(gx => {
                const greeble = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.16), matDark);
                greeble.position.set(gx, 0.45, torsoWidth * 0.5 - 0.05);
                torsoGroup.add(greeble);
            });
            const chestBar = new THREE.Mesh(new THREE.BoxGeometry(torsoWidth * 0.62, 0.09, 0.08), matEmissive);
            chestBar.position.set(0, -0.55, torsoWidth * 0.5);
            torsoGroup.add(chestBar);

            [-0.9, 0.9].forEach(vx => {
                const vent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.12), matEmissive);
                vent.position.set(vx, torsoHeight * 0.18, torsoWidth * 0.42);
                torsoGroup.add(vent);
            });

            // Armor-package trim on the hull (visual identity per plating type)
            if (equipped.armor === 'ablative_armor') {
                [-0.55, 0.55].forEach(ax => {
                    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.8, 0.16), matSecondary);
                    slab.position.set(ax, -0.15, torsoWidth * 0.5 + 0.02);
                    torsoGroup.add(slab);
                    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05), matEmissive);
                    stripe.position.set(ax, -0.15, torsoWidth * 0.5 + 0.12);
                    torsoGroup.add(stripe);
                });
            } else if (equipped.armor === 'energy_armor') {
                const weave = new THREE.Mesh(new THREE.TorusGeometry(torsoWidth * 0.62, 0.035, 6, 40), matEmissive);
                weave.rotation.x = Math.PI / 2;
                weave.position.y = -0.35;
                torsoGroup.add(weave);
                [-1, 1].forEach(sx => {
                    const shimmer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.5), matEmissive);
                    shimmer.position.set(sx * (torsoWidth * 0.5 + 0.02), 0.1, 0.25);
                    torsoGroup.add(shimmer);
                });
            }

            [-1, 1].forEach(finSide => {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.8), matEmissive);
                fin.position.set(finSide * (torsoWidth * 0.68 + 0.72), 3.55, 0.15);
                fin.rotation.z = finSide * -0.35;
                mech.add(fin);
            });

            const thrustMat = new THREE.MeshBasicMaterial({ color: paint.emissive, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            [-0.55, 0.55].forEach(tx => {
                const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.15, 10, 1, true), thrustMat);
                flame.position.set(tx * (torsoWidth * 0.4), 0.35, -2.4);
                flame.rotation.x = -Math.PI / 2 + 0.18;
                torsoGroup.add(flame);
            });

            // Full-contact shadows (visual only): every solid part casts
            mech.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (mesh.isMesh && !(mesh.material as unknown as { isMeshBasicMaterial?: boolean }).isMeshBasicMaterial) {
                    mesh.castShadow = true;
                }
            });

            return mech;
        }

        function getActivePilotPaint() {
            return isFrieren() ? FRIEREN_PAINT : GAME_STATE.paint;
        }

        function updateGarageMechDisplay() {
            if (garageMechMesh) scene.remove(garageMechMesh);
            garageMechMesh = createProceduralMechMesh(GAME_STATE.equipped, getActivePilotPaint());
            scene.add(garageMechMesh);
        }

        /* =========================================================================
           STAT CALCULATIONS & UI MANAGEMENT
           ========================================================================= */
        function calculateMechStats() {
            if (isGojo()) return { ...GOJO_STATS };
            if (isFrieren()) return { ...FRIEREN_STATS };
            let hp = 0, shield = 0, energy = 0, speed = 0, heatCool = 0, damage = 0;

            Object.keys(GAME_STATE.equipped as Record<string,string>).forEach((cat: string) => {
                const partId = GAME_STATE.equipped[cat];
                const partData = (PARTS_DB[cat as PartCategory]).find((p: MechPart) => p.id === partId);
                if (partData) {
                    if (partData.hp) hp += partData.hp;
                    if (partData.shield) shield += partData.shield;
                    if (partData.energy) energy += partData.energy;
                    if (partData.speed) speed += partData.speed;
                    if (partData.heatCool) heatCool += partData.heatCool;
                    if (partData.damage) damage += partData.damage;
                    if (partData.hpBonus) hp += partData.hpBonus;
                    if (partData.speedBonus) speed += partData.speedBonus;
                }
            });

            if (TECH_NODES.find(t => t.id === 'tech_1' && t.unlocked)) heatCool *= 1.25;
            if (TECH_NODES.find(t => t.id === 'tech_2' && t.unlocked)) shield *= 1.30;
            if (TECH_NODES.find(t => t.id === 'tech_3' && t.unlocked)) damage *= 1.20;

            return { hp, shield, energy, speed, heatCool, damage };
        }

        function refreshStatsUI() {
            const stats = calculateMechStats();

            byId('stat-hp-val').innerText = stats.hp.toLocaleString();
            byId('stat-shield-val').innerText = stats.shield.toLocaleString();
            byId('stat-energy-val').innerText = `${stats.energy} MW`;
            byId('stat-speed-val').innerText = `${stats.speed} km/h`;
            byId('stat-heat-val').innerText = `${Math.round(stats.heatCool)}/s`;

            byId('stat-hp-bar').style.width = `${Math.min(100, (stats.hp / 6000) * 100)}%`;
            byId('stat-shield-bar').style.width = `${Math.min(100, (stats.shield / 2500) * 100)}%`;
            byId('stat-energy-bar').style.width = `${Math.min(100, (stats.energy / 300) * 100)}%`;
            byId('stat-speed-bar').style.width = `${Math.min(100, (stats.speed / 100) * 100)}%`;
            byId('stat-heat-bar').style.width = `${Math.min(100, (stats.heatCool / 120) * 100)}%`;

            const cls = stats.hp > 5500 ? 'SIEGE' : (stats.speed > 70 ? 'RECON' : 'CUSTOM');
            byId('mech-class-name').innerText = isFrieren() ? 'ARCANE FRAME' : `${cls} CHASSIS`;
        }

        function selectPartCategory(cat: string) {
            GAME_STATE.activePartCategory = cat;
            document.querySelectorAll('#part-category-selector .cat-btn').forEach(btn => {
                btn.classList.toggle('active', (btn.getAttribute('onclick') as string).includes(cat));
            });
            renderPartList();
        }

        function renderPartList() {
            const grid = byId('parts-list-grid');
            grid.innerHTML = '';

            if (isGojo() || isFrieren()) {
                const techniques = isFrieren() ? FRIEREN_TECHNIQUES : GOJO_TECHNIQUES;
                techniques.forEach(tech => {
                    const card = document.createElement('div');
                    card.className = 'part-card equipped';
                    card.style.borderLeftColor = `#${tech.color.toString(16).padStart(6, '0')}`;
                    card.innerHTML = `
                        <div class="part-title-row">
                            <span class="part-name">${tech.name}</span>
                            <span class="part-status status-equipped">EQUIPPED</span>
                        </div>
                        <div class="part-desc">${tech.desc}</div>
                    `;
                    card.onclick = () => showFloatText(isFrieren() ? 'ARCANE SPELL — BOUND TO THE FRAME' : 'INNATE TECHNIQUE — ALWAYS ACTIVE', '#9fe8ff');
                    grid.appendChild(card);
                });
                return;
            }

            const cat = GAME_STATE.activePartCategory;
            const parts = PARTS_DB[cat as PartCategory] || [];

            parts.forEach(part => {
                const card = document.createElement('div');
                const isEquipped = GAME_STATE.equipped[cat] === part.id;

                card.className = `part-card ${isEquipped ? 'equipped' : ''} ${!part.unlocked ? 'locked' : ''}`;
                card.innerHTML = `
                    <div class="part-title-row">
                        <span class="part-name">${part.name}</span>
                        <span class="part-status ${isEquipped ? 'status-equipped' : (part.unlocked ? 'status-unlocked' : 'status-locked')}">
                            ${isEquipped ? 'EQUIPPED' : (part.unlocked ? 'SELECT' : `${part.cost} CR`)}
                        </span>
                    </div>
                    <div class="part-desc">${part.desc}</div>
                `;

                card.onclick = () => {
                    if (part.unlocked) {
                        GAME_STATE.equipped[cat] = part.id;
                        sfx('buy');
                    } else if (GAME_STATE.credits >= part.cost) {
                        GAME_STATE.credits -= part.cost;
                        part.unlocked = true;
                        GAME_STATE.equipped[cat] = part.id;
                        sfx('buy');
                    } else {
                        sfx('deny');
                        showFloatText('INSUFFICIENT CREDITS', '#ff5533');
                        return;
                    }
                    updateCurrencyUI(); saveGame();
                    renderPartList(); refreshStatsUI(); updateGarageMechDisplay();
                };

                grid.appendChild(card);
            });
        }

        function setupColorPickers() {
            (['primary', 'secondary', 'emissive'] as Array<'primary' | 'secondary' | 'emissive'>).forEach((type) => {
                const grid = byId(`paint-${type}-grid`);
                grid.innerHTML = '';
                COLOR_PALETTES[type].forEach(hex => {
                    const swatch = document.createElement('div');
                    swatch.className = `color-swatch ${GAME_STATE.paint[type] === hex ? 'active' : ''}`;
                    swatch.style.background = `#${hex.toString(16).padStart(6, '0')}`;
                    swatch.onclick = () => {
                        GAME_STATE.paint[type] = hex;
                        sfx('hit');
                        saveGame();
                        setupColorPickers();
                        updateGarageMechDisplay();
                    };
                    grid.appendChild(swatch);
                });
            });
        }

        function renderTechTree() {
            const container = byId('tech-nodes-list');
            container.innerHTML = '';

            if (isGojo() || isFrieren()) {
                const techniques = isFrieren() ? FRIEREN_TECHNIQUES : GOJO_TECHNIQUES;
                const card = document.createElement('div');
                card.className = 'part-card equipped';
                card.innerHTML = `
                    <div class="part-title-row">
                        <span class="part-name">${isFrieren() ? 'Arcane Spell Matrix' : 'Innate Technique Matrix'}</span>
                        <span class="part-status status-equipped">ALL ACTIVE</span>
                    </div>
                    <div class="part-desc">${techniques.map(t => t.name.replace(/^.*: /, '')).join(' \u00b7 ')}</div>
                `;
                container.appendChild(card);
                return;
            }

            TECH_NODES.forEach(tech => {
                const card = document.createElement('div');
                card.className = `part-card ${tech.unlocked ? 'equipped' : ''}`;
                card.innerHTML = `
                    <div class="part-title-row">
                        <span class="part-name">${tech.name}</span>
                        <span class="part-status ${tech.unlocked ? 'status-equipped' : 'status-unlocked'}">
                            ${tech.unlocked ? 'RESEARCHED' : `${tech.cost} RP`}
                        </span>
                    </div>
                    <div class="part-desc">${tech.desc}</div>
                `;

                card.onclick = () => {
                    if (!tech.unlocked && GAME_STATE.rp >= tech.cost) {
                        GAME_STATE.rp -= tech.cost;
                        tech.unlocked = true;
                        sfx('buy'); saveGame();
                        updateCurrencyUI(); renderTechTree(); refreshStatsUI();
                    } else if (!tech.unlocked) {
                        sfx('deny');
                        showFloatText('INSUFFICIENT RP', '#ff5533');
                    }
                };

                container.appendChild(card);
            });
        }

        function switchTab(tabName: string) {
            GAME_STATE.currentTab = tabName;
            document.querySelectorAll('.nav-tab').forEach(btn => {
                btn.classList.toggle('active', (btn.getAttribute('onclick') as string).includes(tabName));
            });

            document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));
            const panel = byId(`panel-${tabName}`);
            if (panel) panel.classList.remove('hidden');

            if (tabName === 'customizer') {
                camera.position.set(0, 3, 7);
            } else if (tabName === 'garage') {
                camera.position.set(0, 4, 11);
            }
        }

        function setArena(arenaId: string) {
            GAME_STATE.selectedArena = arenaId;
            sfx('hit');
            ['foundry', 'volcanic', 'arctic'].forEach(id => {
                byId(`arena-${id}`).classList.toggle('equipped', id === arenaId);
            });
            const arena = ARENA_DEFS[arenaId];
            if (arena) showFloatText(`${arena.name} SELECTED`, '#00f0ff');
        }

        function setGameMode(modeId: string) {
            GAME_STATE.selectedMode = modeId;
            sfx('hit');
            ['skirmish', 'survival', 'boss'].forEach(id => {
                byId(`mode-${id}`).classList.toggle('equipped', id === modeId);
            });
        }

        function updateAISettings() {
            GAME_STATE.aiConfig.preset = byId<HTMLSelectElement>('ai-preset-select').value;
            GAME_STATE.aiConfig.range = Number(byId<HTMLInputElement>('ai-range-input').value);
            GAME_STATE.aiConfig.retreat = Number(byId<HTMLInputElement>('ai-retreat-input').value);

            byId('ai-range-lbl').innerText = `${GAME_STATE.aiConfig.range}m`;
            byId('ai-retreat-lbl').innerText = `${GAME_STATE.aiConfig.retreat}%`;
            saveGame();
            updateWingmanStatusUI();
        }

        function updateCurrencyUI() {
            byId('res-credits-val').innerText = GAME_STATE.credits.toLocaleString();
            byId('res-rp-val').innerText = GAME_STATE.rp.toLocaleString();
            byId('res-tokens-val').innerText = GAME_STATE.tokens.toLocaleString();
        }

        /** Reflect the callsign and its fixed technique loadout across the garage UI. */
        function applyPilotNameUI() {
            const input = byId<HTMLInputElement>('pilot-name');
            input.value = GAME_STATE.username || 'PILOT';
            byId('hud-pilot-name').innerText = GAME_STATE.username || 'PILOT';
            const gojo = isGojo();
            const frieren = isFrieren();
            document.body.classList.toggle('gojo-view', gojo);
            document.body.classList.toggle('frieren-view', frieren);
            byId('part-category-selector').style.display = (gojo || frieren) ? 'none' : 'flex';
            document.querySelectorAll('#main-nav .nav-tab').forEach(btn => {
                const onclick = btn.getAttribute('onclick') || '';
                if (onclick.includes('research')) (btn as HTMLElement).style.display = (gojo || frieren) ? 'none' : '';
            });
            if ((gojo || frieren) && GAME_STATE.currentTab === 'research') switchTab('garage');
            if (frieren) getZoltraakSigilTexture();
        }

        function applyPilotName() {
            const input = byId<HTMLInputElement>('pilot-name');
            if (GAME_STATE.inBattle) { input.value = GAME_STATE.username; return; }
            GAME_STATE.username = (input.value || '').trim().slice(0, 18).toUpperCase() || 'PILOT';
            input.value = GAME_STATE.username;
            saveGame();
            applyPilotNameUI();
            renderPartList();
            renderTechTree();
            refreshStatsUI();
            updateGarageMechDisplay();
        }

        /* =========================================================================
           REAL-TIME COMBAT ENGINE, COLLISION & ENDLESS SURVIVAL WAVES
           ========================================================================= */
        let keys: Record<string, boolean> = {};
        let mousePos = new THREE.Vector2();

        function setupInputControls() {
            window.addEventListener('keydown', e => {
                if (GAME_STATE.inBattle && ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','Backslash','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6'].includes(e.code)) e.preventDefault();
                keys[e.code] = true;
                if (GAME_STATE.inBattle && e.code === 'Space' && !e.repeat) tryBoostDash();
                if (GAME_STATE.inBattle && e.code === 'ShiftLeft' && !e.repeat) toggleWingmanHold();
                if (GAME_STATE.inBattle && e.code === 'Backslash' && !e.repeat) setFirstPerson(!firstPersonView);
                if (GAME_STATE.inBattle && isGojo() && !e.repeat) {
                    if (e.code === 'Digit1' || e.code === 'Numpad1') castGojoBlue();
                    else if (e.code === 'Digit2' || e.code === 'Numpad2') castGojoRed();
                    else if (e.code === 'Digit3' || e.code === 'Numpad3') castHollowPurple();
                    else if (e.code === 'Digit4' || e.code === 'Numpad4') toggleGojoInfinity();
                    else if (e.code === 'Digit5' || e.code === 'Numpad5') castGojoDomain();
                    else if (e.code === 'Digit6' || e.code === 'Numpad6') toggleGojoMaxOutput();
                }
                if (GAME_STATE.inBattle && isFrieren() && !e.repeat) {
                    if (e.code === 'Digit1' || e.code === 'Numpad1') castZoltraak();
                    else if (e.code === 'Digit2' || e.code === 'Numpad2') castFrierenHexShield();
                    else if (e.code === 'Digit3' || e.code === 'Numpad3') castFrierenSphereShield();
                }
            });
            window.addEventListener('keyup', e => keys[e.code] = false);
            window.addEventListener('mousemove', e => {
                if (firstPersonView) {
                    let dx = 0, dy = 0;
                    if (document.pointerLockElement === renderer.domElement) {
                        dx = e.movementX; dy = e.movementY;
                    } else if (fpLastMouseX >= 0 && fpLastMouseY >= 0) {
                        // Pointer lock unavailable (e.g. embedded frame): fall back to raw deltas.
                        dx = e.clientX - fpLastMouseX; dy = e.clientY - fpLastMouseY;
                    }
                    fpLastMouseX = e.clientX; fpLastMouseY = e.clientY;
                    const sens = 0.0022;
                    fpYaw -= dx * sens;
                    fpPitch = THREE.MathUtils.clamp(fpPitch - dy * sens, -1.32, 1.32);
                    return;
                }
                mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
                mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
                const reticle = byId('reticle-circle');
                if (reticle) {
                    reticle.style.transform = `translate(${mousePos.x * 25}px, ${-mousePos.y * 25}px)`;
                }
            });
            window.addEventListener('mousedown', e => { if (GAME_STATE.inBattle && e.button === 0) mouseDown = true; });
            window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
            window.addEventListener('blur', () => { mouseDown = false; keys = {}; });

            // Esc / browser pointer-lock release leaves the cockpit instead of freezing the aim.
            document.addEventListener('pointerlockchange', () => {
                const locked = document.pointerLockElement === renderer.domElement;
                if (locked) { fpLockAcquired = true; return; }
                if (firstPersonView && fpLockAcquired) {
                    fpLockAcquired = false;
                    setFirstPerson(false, true);
                }
            });
        }

        /* BOOST DASH: i-frames + burst, gated by reactor energy */

        function startCombatDeployment() {
            if (GAME_STATE.selectedMode === 'boss' && GAME_STATE.tokens < 1) {
                sfx('deny');
                showFloatText('🔒 1 BOSS TOKEN REQUIRED — WIN SURVIVAL RUNS', '#ff5533');
                return;
            }
            if (GAME_STATE.selectedMode === 'boss') {
                GAME_STATE.tokens--;
                GAME_STATE.bossTokensSpent = (GAME_STATE.bossTokensSpent || 0) + 1;
                updateCurrencyUI(); saveGame();
            }
            audioUnlock();
            if (GAME_STATE.selectedMode === 'boss') startBossTheme();
            else startMusic();
            GAME_STATE.inBattle = true;
            GAME_STATE.survivalWave = 1;
            GAME_STATE.survivalEarnings = 0;
            GAME_STATE.survivalKills = 0;
            GAME_STATE.waveTransition = false;
            GAME_STATE.battleTime = 0;

            byId('main-nav').style.display = 'none';
            document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
            byId('hud-layer').style.display = 'flex';

            const waveInd = byId('wave-indicator');
            if (GAME_STATE.selectedMode === 'survival') {
                waveInd.style.display = 'block';
                waveInd.innerText = 'SURVIVAL WAVE 1';
            } else {
                waveInd.style.display = 'none';
            }

            scene.children.filter(c => c.name === 'garage_env' || c.name === 'arena_env').forEach(c => scene.remove(c));
            if (garageMechMesh) scene.remove(garageMechMesh);
            if (wingmanDrone && wingmanDrone!.mesh) scene.remove(wingmanDrone!.mesh);
            wingmanDrone = null;

            projectiles.forEach(p => scene.remove(p.mesh)); projectiles = [];
            particles.forEach(p => scene.remove(p.mesh)); particles = [];

            buildArenaGraphics();

            const stats = calculateMechStats();
            playerEntity = {
                mesh: createProceduralMechMesh(GAME_STATE.equipped, getActivePilotPaint()),
                hp: stats.hp,
                maxHp: stats.hp,
                shield: stats.shield,
                maxShield: stats.shield,
                energy: stats.energy,
                maxEnergy: stats.energy,
                heat: 0,
                maxHeat: 100,
                heatCoolRate: stats.heatCool,
                speed: stats.speed * 0.42,
                position: new THREE.Vector3(0, 0, 30),
                radius: 2.2,
                walkTimer: 0,
                dashCooldown: 0,
                dashTime: 0,
                dashDir: new THREE.Vector3(),
                invuln: 0,
                overheated: false,
                lastFireTime: 0,
                hitFlash: 0
            };
            playerEntity!.mesh.position.copy(playerEntity!.position);
            playerMomentum.set(0, 0, 0);
            scene.add(playerEntity!.mesh);

            if (isGojo()) clearGojoEffects();
            if (isFrieren()) clearFrierenEffects();

            spawnEnemyWave(1);
            spawnWingmanDrone();
            byId('target-hud-card').style.opacity = '1';
            showFloatText('DEPLOYED — GOOD HUNTING, PILOT', '#ffb700');
        }

        /* THEMED ARENA BUILDER - fixed pillar caps (at TOP), destructible props, pickup pads */

        function buildArenaGraphics() {
            arenaObstacles = [];
            destructibles = [];
            pickups = [];
            pickupPads = [];
            arenaLavaPools = [];
            arenaIcePatches = [];
            arenaCoolVents = [];
            arenaIcePatches = [];
            arenaCoolVents = [];
            const arenaEnv = new THREE.Group();
            arenaEnv.name = 'arena_env';

            const theme = getArenaDef();
            scene.background = new THREE.Color(theme.fog);
            scene.fog = new THREE.FogExp2(theme.fog, theme.fogD);

            // Retint battle lights
            scene.traverse(o => { const dl = o as THREE.DirectionalLight; if (dl.isDirectionalLight && dl.userData.isMain) { dl.color.setHex(theme.sun); dl.intensity = theme.sunI; } });
            scene.children.filter(o => (o as THREE.HemisphereLight).isHemisphereLight).forEach(o => scene.remove(o));
            const hemi = new THREE.HemisphereLight(theme.hemi, theme.floor, 0.55);
            arenaEnv.add(hemi);

            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(300, 300),
                new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.85, metalness: 0.4, map: METAL_TEXTURE, bumpMap: BUMP_TEXTURE, bumpScale: 0.05 })
            );
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            arenaEnv.add(floor);

            const grid = new THREE.GridHelper(280, 56, theme.accent, 0x1a2230);
            grid.position.y = 0.02;
            (grid.material as THREE.Material).transparent = true;
            (grid.material as THREE.Material).opacity = 0.25;
            arenaEnv.add(grid);

            /* --- cover helper: registers a solid, collidable block --- */
            const addCover = (px: number, pz: number, w: number, h: number, d: number, colorHex?: number, opts?: { rotY?: number; ice?: boolean }) => {
                const coverColor = colorHex || theme.primary;
                const mat = opts?.ice
                    ? new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.82 })
                    : new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.45, metalness: 0.75, map: METAL_TEXTURE, bumpMap: BUMP_TEXTURE, bumpScale: 0.06 });
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
                pillar.position.set(px, h / 2, pz);
                if (opts?.rotY) pillar.rotation.y = opts.rotY;
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                arenaEnv.add(pillar);

                const cap = new THREE.Mesh(
                    new THREE.BoxGeometry(w * 1.06, 0.5, d * 1.06),
                    new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 1.4 })
                );
                cap.position.set(px, h + 0.25, pz);
                if (opts?.rotY) cap.rotation.y = opts.rotY;
                arenaEnv.add(cap);

                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(w * 1.1, 0.6, d * 1.1),
                    new THREE.MeshStandardMaterial({ color: 0x0e1117, roughness: 0.6, metalness: 0.8 })
                );
                base.position.set(px, 0.3, pz);
                arenaEnv.add(base);

                arenaObstacles.push({ mesh: pillar, pos: new THREE.Vector3(px, 0, pz), halfSize: Math.max(w, d) / 2 });
            };

            /* ===================== PER-MAP LAYOUTS ===================== */
            if (theme.layout === 'foundry') {
                // Symmetrical cargo bay: four lockers of square stacks with open fire lanes.
                [-96, -48, 48, 96].forEach(px => {
                    [-96, -48, 48, 96].forEach(pz => {
                        addCover(px, pz, 9, 14 + Math.random() * 8, 9);
                    });
                });
                // Overhead gantry frames sell the factory silhouette.
                [-110, 110].forEach(gz => {
                    const beam = new THREE.Mesh(
                        new THREE.BoxGeometry(240, 2.2, 5),
                        new THREE.MeshStandardMaterial({ color: 0x222b38, roughness: 0.5, metalness: 0.85 })
                    );
                    beam.position.set(0, 21, gz);
                    arenaEnv.add(beam);
                    [-100, -50, 50, 100].forEach(gx => {
                        const strut = new THREE.Mesh(new THREE.BoxGeometry(2, 21, 2), new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.55, metalness: 0.85 }));
                        strut.position.set(gx, 10.5, gz);
                        arenaEnv.add(strut);
                    });
                });

                // Coolant vent pads: holding one chills the reactor fast.
                [[36, 0], [-36, 0], [0, 44], [0, -44]].forEach(([vx, vz]) => {
                    const vent = new THREE.Mesh(
                        new THREE.CylinderGeometry(4.6, 5, 0.35, 26),
                        new THREE.MeshStandardMaterial({ color: 0x0d1a22, emissive: 0x00f0ff, emissiveIntensity: 0.75 })
                    );
                    vent.position.set(vx, 0.18, vz);
                    arenaEnv.add(vent);
                    const ventRing = new THREE.Mesh(
                        new THREE.TorusGeometry(4.9, 0.12, 8, 32),
                        new THREE.MeshBasicMaterial({ color: 0x8ef6ff })
                    );
                    ventRing.rotation.x = -Math.PI / 2;
                    ventRing.position.set(vx, 0.4, vz);
                    arenaEnv.add(ventRing);
                    arenaCoolVents.push({ x: vx, z: vz, r: 5.2 });
                });
                const glow = new THREE.PointLight(0xff5500, 1.2, 120);
                glow.position.set(0, 24, 0);
                arenaEnv.add(glow);
            } else if (theme.layout === 'volcanic') {
                // Broken caldera: irregular basalt spires and a lava lake at the centre.
                for (let i = 0; i < 16; i++) {
                    const px = (Math.random() - 0.5) * 210;
                    const pz = (Math.random() - 0.5) * 210;
                    if (Math.hypot(px, pz - 30) < 20 || Math.hypot(px, pz + 45) < 20) continue;
                    if (Math.hypot(px, pz) < 26) continue;
                    addCover(px, pz, 6 + Math.random() * 7, 10 + Math.random() * 16, 6 + Math.random() * 7, theme.primary, { rotY: Math.random() * Math.PI });
                }
                // Central caldera: a wide lava pool ringed with obsidian teeth.
                const caldera = new THREE.Mesh(
                    new THREE.CircleGeometry(16, 40),
                    new THREE.MeshBasicMaterial({ color: 0xff4a00 })
                );
                caldera.rotation.x = -Math.PI / 2;
                caldera.position.set(0, 0.06, -8);
                arenaEnv.add(caldera);
                arenaLavaPools.push({ x: 0, z: -8, r: 15 });
                for (let i = 0; i < 12; i++) {
                    const a = (i / 12) * Math.PI * 2;
                    const tooth = new THREE.Mesh(
                        new THREE.ConeGeometry(1.5, 4 + Math.random() * 3, 5),
                        new THREE.MeshStandardMaterial({ color: 0x1b0d0a, roughness: 0.85, metalness: 0.2 })
                    );
                    tooth.position.set(Math.cos(a) * 19, 2, -8 + Math.sin(a) * 19);
                    tooth.castShadow = true;
                    arenaEnv.add(tooth);
                }
                for (let i = 0; i < 9; i++) {
                    const x = (Math.random() - 0.5) * 230, z = (Math.random() - 0.5) * 230;
                    if (Math.hypot(x, z - 30) < 16 || Math.hypot(x, z + 45) < 16) continue;
                    if (Math.hypot(x, z + 8) < 24) continue;
                    const lava = new THREE.Mesh(new THREE.CircleGeometry(2.6 + Math.random() * 3.2, 24), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
                    lava.rotation.x = -Math.PI / 2;
                    lava.position.set(x, 0.05, z);
                    arenaEnv.add(lava);
                    arenaLavaPools.push({ x, z, r: lava.geometry.parameters.radius });
                }
                const glow = new THREE.PointLight(0xff4400, 2.2, 140);
                glow.position.set(0, 16, -8);
                arenaEnv.add(glow);
            } else {
                // Arctic expanse: glacier plates, crystal spires and black ice.
                for (let i = 0; i < 12; i++) {
                    const px = (Math.random() - 0.5) * 220;
                    const pz = (Math.random() - 0.5) * 220;
                    if (Math.hypot(px, pz - 30) < 20 || Math.hypot(px, pz + 45) < 20) continue;
                    addCover(px, pz, 7 + Math.random() * 6, 8 + Math.random() * 14, 7 + Math.random() * 6, 0x9fd8ff, { rotY: Math.random() * Math.PI, ice: true });
                }
                for (let i = 0; i < 16; i++) {
                    const spire = new THREE.Mesh(
                        new THREE.ConeGeometry(1.1 + Math.random() * 1.9, 6 + Math.random() * 12, 6),
                        new THREE.MeshStandardMaterial({ color: 0xbfeaff, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.7 })
                    );
                    spire.position.set((Math.random() - 0.5) * 250, 4, (Math.random() - 0.5) * 250);
                    spire.rotation.z = (Math.random() - 0.5) * 0.25;
                    spire.castShadow = true;
                    arenaEnv.add(spire);
                }
                // Black ice patches: no damage, but traction is gone.
                for (let i = 0; i < 10; i++) {
                    const x = (Math.random() - 0.5) * 220, z = (Math.random() - 0.5) * 220;
                    if (Math.hypot(x, z - 30) < 14) continue;
                    const r = 5 + Math.random() * 6;
                    const ice = new THREE.Mesh(
                        new THREE.CircleGeometry(r, 30),
                        new THREE.MeshStandardMaterial({ color: 0x8fd4ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5 })
                    );
                    ice.rotation.x = -Math.PI / 2;
                    ice.position.set(x, 0.055, z);
                    arenaEnv.add(ice);
                    arenaIcePatches.push({ x, z, r });
                }
                const glow = new THREE.PointLight(0x8fd4ff, 1.4, 150);
                glow.position.set(0, 22, 0);
                arenaEnv.add(glow);
            }

            // Destructible props (crates & explosive barrels) - keep center clear
            const crateColor = theme.layout === 'arctic' ? 0x6f8fa3 : (theme.layout === 'volcanic' ? 0x5a3a2a : 0x8a6a3a);
            const crateMat = new THREE.MeshStandardMaterial({ color: crateColor, roughness: 0.8, metalness: 0.2, map: METAL_TEXTURE });
            const barrelMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.5, metalness: 0.6, emissive: 0x330000 });
            for (let i = 0; i < 14; i++) {
                const x = (Math.random() - 0.5) * 200, z = (Math.random() - 0.5) * 200;
                if (Math.hypot(x, z - 30) < 12 || Math.hypot(x, z + 40) < 12) continue;
                const isBarrel = Math.random() < 0.4;
                const mesh = isBarrel
                    ? new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 12), barrelMat.clone())
                    : new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat.clone());
                mesh.position.set(x, 1.1, z);
                mesh.rotation.y = Math.random() * Math.PI;
                mesh.castShadow = true;
                arenaEnv.add(mesh);
                destructibles.push({
                    mesh, pos: new THREE.Vector3(x, 1.1, z), radius: 1.6,
                    hp: isBarrel ? 1 : 3, explosive: isBarrel, kind: isBarrel ? 'barrel' : 'crate'
                });
            }

            // Pickup pads: layout-specific spots so each map plays differently.
            const padSpots: Record<string, number[][]> = {
                foundry: [[-60, -60], [60, -60], [-60, 60], [60, 60]],
                volcanic: [[-70, 10], [70, 10], [0, 70]],
                arctic: [[-55, -30], [55, -30], [0, 55], [-95, 90]]
            };
            (padSpots[theme.layout] || padSpots.foundry).forEach(([x, z]) => {
                const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 0.4, 24),
                    new THREE.MeshStandardMaterial({ color: 0x101820, emissive: theme.accent, emissiveIntensity: 0.6 }));
                pad.position.set(x, 0.2, z);
                arenaEnv.add(pad);
                pickupPads.push({ pos: new THREE.Vector3(x, 0, z), next: 8 + Math.random() * 8 });
            });

            // Arena boundary walls (visual)
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.7, metalness: 0.8 });
            [[0, -150, 320, 4], [0, 150, 320, 4], [-150, 0, 4, 320], [150, 0, 4, 320]].forEach(([x, z, w, d]) => {
                const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 10, d), wallMat);
                wall.position.set(x, 5, z);
                arenaEnv.add(wall);
                const trim = new THREE.Mesh(
                    new THREE.BoxGeometry(w, 0.22, d + 0.2),
                    new THREE.MeshBasicMaterial({ color: theme.accent })
                );
                trim.position.set(x, 10.1, z);
                arenaEnv.add(trim);
            });

            // Drifting motes / embers / snowfall
            const dustGeo = new THREE.BufferGeometry();
            const dustCount = theme.layout === 'arctic' ? 900 : (theme.layout === 'volcanic' ? 300 : 420);
            const dustPositions = new Float32Array(dustCount * 3);
            for (let i = 0; i < dustCount; i++) {
                dustPositions[i * 3] = (Math.random() - 0.5) * 240;
                dustPositions[i * 3 + 1] = 1 + Math.random() * (theme.layout === 'arctic' ? 38 : 22);
                dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 240;
            }
            dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
            const dustColor = theme.layout === 'arctic' ? 0xffffff : (theme.layout === 'volcanic' ? 0xff8844 : 0x9fb4c9);
            arenaDust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: dustColor, size: theme.layout === 'arctic' ? 0.45 : 0.35, transparent: true, opacity: theme.layout === 'arctic' ? 0.55 : 0.25, fog: false }));
            arenaDust.userData.snow = theme.layout === 'arctic';
            arenaEnv.add(arenaDust);

            // Corner floodlight beams tinted by the arena accent
            [[-120, -120], [120, -120], [-120, 120], [120, 120]].forEach(([fx, fz]) => {
                const beam = new THREE.Mesh(
                    new THREE.ConeGeometry(14, 30, 16, 1, true),
                    new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
                );
                beam.position.set(fx, 15, fz);
                beam.rotation.x = Math.PI;
                arenaEnv.add(beam);
            });

            scene.add(arenaEnv);
        }

        /* REINFORCED SOLID PILLAR COLLISION RESOLUTION */
        function resolveObstacleCollisions(pos: THREE.Vector3, radius: number) {
            for (const obs of arenaObstacles) {
                const nearestX = Math.max(obs.pos.x - obs.halfSize, Math.min(obs.pos.x + obs.halfSize, pos.x));
                const nearestZ = Math.max(obs.pos.z - obs.halfSize, Math.min(obs.pos.z + obs.halfSize, pos.z));

                const distX = pos.x - nearestX;
                const distZ = pos.z - nearestZ;
                const distanceSq = distX * distX + distZ * distZ;

                if (distanceSq < radius * radius) {
                    const distance = Math.sqrt(distanceSq);
                    if (distance > 0.0001) {
                        const overlap = radius - distance;
                        pos.x += (distX / distance) * overlap;
                        pos.z += (distZ / distance) * overlap;
                    } else {
                        pos.x += radius;
                    }
                }
            }

            pos.x = Math.max(-140, Math.min(140, pos.x));
            pos.z = Math.max(-140, Math.min(140, pos.z));
        }

        /* SPAWN ENEMY WAVE WITH STRONGER STATS & MODEL VARIETY */
        function spawnEnemyWave(wave: number) {
            enemyEntities.forEach(e => scene.remove(e.mesh));
            enemyEntities = [];

            const mode = GAME_STATE.selectedMode;
            let count = 1;

            if (mode === 'survival') {
                count = Math.min(7, 1 + Math.floor((wave - 1) * 0.6));
                byId('wave-indicator').innerText = `SURVIVAL WAVE ${wave}`;
                sfx('wavestart');
                showFloatText(`WAVE ${wave} INBOUND`, '#ffb700');
            }

            for (let i = 0; i < count; i++) {
                const enemyData = getRandomEnemyLoadout();
                const enemyMesh = createProceduralMechMesh(enemyData.loadout, enemyData.paint);

                let baseHp = 4200, baseShield = 1800, baseDamage = 300, scale = 1.0, name = '', speed = 15;

                if (mode === 'boss') {
                    const bd = currentBossDef();
                    baseHp = bd.hp; baseShield = bd.shield; baseDamage = bd.damage;
                    scale = bd.scale; speed = bd.speed; name = bd.name;
                    enemyMesh.scale.set(scale, scale, scale);
                } else if (mode === 'survival') {
                    const waveMult = 1 + (wave - 1) * 0.38;
                    baseHp = Math.round(baseHp * waveMult);
                    baseShield = Math.round(baseShield * waveMult);
                    baseDamage = Math.round(baseDamage * (1 + (wave - 1) * 0.18));
                    name = `HOSTILE UNIT [W${wave}]`;
                    if (wave >= 3 && Math.random() < Math.min(0.45, 0.12 + wave * 0.04)) {
                        baseHp = Math.round(baseHp * 1.8); baseShield = Math.round(baseShield * 1.6);
                        baseDamage = Math.round(baseDamage * 1.3); scale = 1.25; name = `ELITE [W${wave}]`;
                        enemyMesh.scale.set(scale, scale, scale);
                    }
                    speed = 14 + Math.min(8, wave * 0.7);
                } else {
                    baseHp = 4600; baseShield = 2000; baseDamage = 320;
                    name = 'RIVAL PILOT — IRON MAW';
                }

                let spawnX = (Math.random() - 0.5) * 120;
                let spawnZ = -40 - (Math.random() * 50);
                if (count > 1) spawnX = (i - (count - 1) / 2) * 30 + (Math.random() - 0.5) * 10;

                const enemy = {
                    mesh: enemyMesh, name,
                    hp: baseHp, maxHp: baseHp,
                    shield: baseShield, maxShield: baseShield,
                    damage: baseDamage,
                    position: new THREE.Vector3(spawnX, 0, spawnZ),
                    radius: mode === 'boss' ? 6.5 : 2.5,
                    cooldown: 1.2 + Math.random() * 0.8,
                    isBoss: mode === 'boss',
                    scale: scale,
                    speed,
                    strafeDir: Math.random() < 0.5 ? 1 : -1,
                    burstCount: 0, burstTimer: 0,
                    phase: 1, attackTimer: 0, missileVolleyTimer: 4, shockwaveTimer: 7,
                    walkTimer: 0, hitFlash: 0
                };

                enemyMesh.position.copy(enemy.position);
                
                // Hostile visor slit + hover glow ring (visual only)
                const visor = new THREE.Mesh(
                    new THREE.BoxGeometry(0.9, 0.12, 0.18),
                    new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.9 })
                );
                visor.position.set(0, 2.25, 0.55);
                enemyMesh.add(visor);

                const groundGlow = new THREE.Mesh(
                    new THREE.RingGeometry(2.3, 2.9, 32),
                    new THREE.MeshBasicMaterial({ color: 0xff5533, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })
                );
                groundGlow.rotation.x = -Math.PI / 2;
                groundGlow.position.y = 0.07;
                enemyMesh.add(groundGlow);

                scene.add(enemyMesh);
                enemyEntities.push(enemy);
            }

            if (enemyEntities.length > 0) {
                byId('target-title-name').innerText = enemyEntities[0].name;
            }
        }

        /* WINGMAN DRONE - the Tactical AI panel made real */

        /* =========================================================================
           WEAPON FIRING — every arm has its own projectile, cadence and feel
           ========================================================================= */
        function firePlayerWeapon() {
            if (!playerEntity || playerEntity.overheated) return;
            if (isGojo()) {
                if (!gojoPurple && gojoTimers.purple <= 0) castHollowPurple();
                return;
            }
            if (isFrieren()) {
                castZoltraak();
                return;
            }
            const profile = getWeaponProfile();
            if (profile.kind === 'beam') return; // continuous beam is handled per-frame

            const arms = getArmsPart();
            const now = performance.now();
            if (now - playerEntity!.lastFireTime < profile.interval * 1000) return;
            playerEntity!.lastFireTime = now;

            const heatCost = (arms?.heatRate || 6) * arenaHeatGain();
            if (playerEntity!.heat + heatCost >= 100) {
                playerEntity!.overheated = true;
                sfx('overheat');
                showFloatText('⚠ OVERHEAT — VENTING', '#ff5533');
                return;
            }
            playerEntity!.heat += heatCost;

            const targetPoint = getAimPoint();
            const tips = getBarrelTips();
            const spawnPos = getMuzzlePosition(tips);
            const fireDir = targetPoint.clone().sub(spawnPos).normalize();
            const damage = (arms?.damage || 320) * profile.damageMult;

            if (profile.kind === 'grenade') {
                // Lobbed mortar shell: arcing flight, then a wide shrapnel detonation.
                const shell = new THREE.Group();
                const body = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2, 0.26, 0.72, 8),
                    new THREE.MeshBasicMaterial({ color: profile.color })
                );
                body.rotateX(Math.PI / 2);
                shell.add(body);
                const fuse = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xff2200 })
                );
                fuse.position.z = 0.4;
                shell.add(fuse);
                [-1, 1].forEach(fx => {
                    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.3), new THREE.MeshBasicMaterial({ color: 0x1b1f28 }));
                    fin.position.set(fx * 0.22, 0, -0.3);
                    shell.add(fin);
                });
                if (profile.trail) {
                    const glow = new THREE.Mesh(
                        new THREE.SphereGeometry(0.36, 8, 8),
                        new THREE.MeshBasicMaterial({ color: profile.color, transparent: true, opacity: 0.3 })
                    );
                    shell.add(glow);
                }
                shell.position.copy(spawnPos);
                scene.add(shell);
                const lobDir = fireDir.clone();
                lobDir.y += 0.34;
                lobDir.normalize();
                projectiles.push({
                    mesh: shell, dir: lobDir, speed: profile.speed, isPlayer: true,
                    damage, life: 2.6, pierce: false, trailColor: profile.color,
                    gravity: 1.15, splashRadius: profile.splashRadius, splashDamage: damage * 0.85
                });
            } else {
                let geo: THREE.BufferGeometry;
                let color = profile.color;
                let pierceLeft = 0;
                if (profile.kind === 'rail') {
                    geo = new THREE.BoxGeometry(0.12, 0.12, 5.4);
                    color = 0xffffff;
                    pierceLeft = 3;
                } else if (profile.kind === 'plasma') {
                    geo = new THREE.SphereGeometry(profile.size + 0.12, 14, 14);
                    color = 0x66ffcc;
                } else {
                    // Rotary cannon tracer; alternates left/right barrels.
                    geo = new THREE.CylinderGeometry(profile.size * 0.7, profile.size * 0.7, 1.9, 8);
                    (geo as THREE.CylinderGeometry).rotateX(Math.PI / 2);
                    color = GAME_STATE.paint.emissive;
                }
                const proj = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
                proj.position.copy(spawnPos);
                proj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fireDir);
                if (profile.kind === 'plasma') {
                    const halo = new THREE.Mesh(
                        new THREE.SphereGeometry(profile.size + 0.34, 10, 10),
                        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
                    );
                    proj.add(halo);
                }
                scene.add(proj);
                projectiles.push({
                    mesh: proj, dir: fireDir, speed: profile.speed, isPlayer: true,
                    damage, life: 2.2, pierce: profile.kind === 'rail',
                    trailColor: color, pierceLeft,
                    splashRadius: profile.splashRadius, splashDamage: profile.splashRadius ? damage * 0.5 : undefined
                });
                if (profile.kind === 'rail') spawnRailTracer(spawnPos, fireDir);
            }

            spawnMuzzleFlash(spawnPos, fireDir, profile.kind === 'rail' ? 2.4 : (profile.kind === 'grenade' ? 1.6 : 1.2), profile.color);
            sfx(profile.sfx);
            cameraShake = Math.max(cameraShake, profile.recoil);
        }

        /** Bright elongated streak behind a railgun slug. */
        function spawnRailTracer(pos: THREE.Vector3, dir: THREE.Vector3) {
            const geo = new THREE.CylinderGeometry(0.05, 0.05, 9, 6);
            geo.rotateX(Math.PI / 2);
            const streak = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
            streak.position.copy(pos).addScaledVector(dir, 3.5);
            streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
            scene.add(streak);
            particles.push({ mesh: streak, vel: new THREE.Vector3(), life: 0.12, maxLife: 0.12, fade: true });
        }

        /* =========================================================================
           HELIOS BEAM — continuous lance with reactor-scaled heat
           ========================================================================= */
        function buildHeliosBeamMesh(): THREE.Group {
            if (heliosBeam) return heliosBeam;
            const beam = new THREE.Group();
            const coreGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 8, 1, true);
            coreGeo.rotateX(Math.PI / 2);
            coreGeo.translate(0, 0, 0.5);
            const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xe6ffff }));
            core.name = 'beamCore';
            beam.add(core);

            const glowGeo = new THREE.CylinderGeometry(0.4, 0.4, 1, 12, 1, true);
            glowGeo.rotateX(Math.PI / 2);
            glowGeo.translate(0, 0, 0.5);
            const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
                color: 0x8ef6ff, transparent: true, opacity: 0.32,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            }));
            glow.name = 'beamGlow';
            beam.add(glow);

            const impactGeo = new THREE.SphereGeometry(0.55, 10, 10);
            const impact = new THREE.Mesh(impactGeo, new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0.9,
                blending: THREE.AdditiveBlending, depthWrite: false
            }));
            impact.name = 'beamImpact';
            beam.add(impact);

            scene.add(beam);
            heliosBeam = beam;
            return beam;
        }

        function hideHeliosBeam() {
            if (!heliosBeam) return;
            scene.remove(heliosBeam);
            heliosBeam.traverse(o => {
                const m = o as THREE.Mesh;
                if (m.isMesh) {
                    m.geometry.dispose();
                    const mat = m.material as THREE.Material;
                    if (mat) mat.dispose();
                }
            });
            heliosBeam = null;
            heliosBeamTick = 0;
            heliosBeamHitFx = 0;
        }

        function disposeObject3D(obj: THREE.Object3D) {
            obj.traverse(o => {
                const renderable = o as unknown as {
                    isMesh?: boolean; isLine?: boolean; isPoints?: boolean; isSprite?: boolean;
                    geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[];
                };
                if (!(renderable.isMesh || renderable.isLine || renderable.isPoints || renderable.isSprite)) return;
                if (renderable.geometry) renderable.geometry.dispose();
                const mat = renderable.material as THREE.Material | THREE.Material[];
                if (Array.isArray(mat)) mat.forEach(m => m.dispose());
                else if (mat) mat.dispose();
            });
        }

        function clearGojoEffects() {
            if (gojoBlueOrb) { scene.remove(gojoBlueOrb.group); gojoBlueOrb = null; }
            if (gojoRedOrb) { scene.remove(gojoRedOrb.group); gojoRedOrb = null; }
            if (gojoComboPurple) { scene.remove(gojoComboPurple.group); gojoComboPurple = null; }
            gojoMaxOutput = false;
            document.body.classList.remove('max-output');
            if (purpleAudio) purpleAudio.pause();
            if (gojoPurple) {
                scene.remove(gojoPurple.group);
                scene.remove(gojoPurple.trail);
                gojoPurple.trail.visible = false;
                gojoPurple = null;
            }
            destroyGojoDomain();
            gojoTimers = { blue: 0, red: 0, purple: 0, domain: 0 };
            gojoInfinityOn = true;
            gojoInfinityFx = 0;
            gojoBloom = 0;
        }

        function getStarTexture(): THREE.Texture {
            if (starTexture) return starTexture;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grd.addColorStop(0, 'rgba(255,255,255,1)');
            grd.addColorStop(0.28, 'rgba(243,232,255,0.95)');
            grd.addColorStop(0.62, 'rgba(192,132,252,0.35)');
            grd.addColorStop(1, 'rgba(124,58,237,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 64, 64);
            starTexture = new THREE.CanvasTexture(canvas);
            return starTexture;
        }

        function getGlowTexture(): THREE.Texture {
            if (glowTexture) return glowTexture;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d')!;
            const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grd.addColorStop(0, 'rgba(255,255,255,1)');
            grd.addColorStop(0.18, 'rgba(243,232,255,0.95)');
            grd.addColorStop(0.42, 'rgba(192,132,252,0.55)');
            grd.addColorStop(0.72, 'rgba(124,58,237,0.18)');
            grd.addColorStop(1, 'rgba(76,29,149,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 128, 128);
            glowTexture = new THREE.CanvasTexture(canvas);
            return glowTexture;
        }

        /* HOLLOW PURPLE — a precompiled shader orb with a fixed flight vector.
           No dynamic lights, no per-cast shader compilation, one draw call for the trail. */
        let purpleTrailTexture: THREE.Texture | null = null;

        function getPurpleTrailTexture(): THREE.Texture {
            if (purpleTrailTexture) return purpleTrailTexture;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grd.addColorStop(0, 'rgba(230,190,255,1)');
            grd.addColorStop(0.28, 'rgba(180,105,255,0.9)');
            grd.addColorStop(0.62, 'rgba(109,40,217,0.34)');
            grd.addColorStop(1, 'rgba(76,29,149,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 64, 64);
            const tex = new THREE.CanvasTexture(canvas);
            purpleTrailTexture = tex;
            return tex;
        }

        const HP_TRAIL_COUNT = 64;
        const HP_CORE_VERT = `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocal;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vViewDir = normalize(-mvPosition.xyz);
                vLocal = normalize(position);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        const HP_CORE_FRAG = `
            uniform float uTime;
            uniform float uPower;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocal;
            float hash(vec3 p) {
                p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
                    f.z);
            }
            void main() {
                vec3 n = normalize(vNormal);
                vec3 v = normalize(vViewDir);
                float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);
                float t = uTime;
                vec3 q = vLocal;
                float n1 = noise(q * 3.2 + vec3(0.0, t * 0.45, t * 0.2));
                float n2 = noise(q * 7.0 - vec3(t * 0.3, 0.0, t * 0.55));
                float bands = 0.5 + 0.5 * sin(q.y * 9.0 + q.x * 5.0 + n1 * 5.0 + t * 3.0);
                float energy = clamp(n1 * 0.55 + n2 * 0.3 + bands * 0.35, 0.0, 1.0);
                vec3 deep = vec3(0.10, 0.015, 0.30);
                vec3 violet = vec3(0.44, 0.08, 1.0);
                vec3 hot = vec3(0.86, 0.44, 1.0);
                float filament = smoothstep(0.62, 0.96, bands) * smoothstep(0.15, 0.95, n2);
                vec3 col = mix(deep, violet, 0.42 + energy * 0.58);
                col = mix(col, hot, clamp(fres * 0.55 + energy * 0.22 * uPower, 0.0, 1.0));
                col += hot * filament * 0.55;
                col += hot * pow(fres, 3.0) * 0.6;
                col *= 0.92 + 0.16 * sin(t * 4.0 + n1 * 6.0);
                gl_FragColor = vec4(col, 1.0);
            }
        `;
        const HP_SHELL_FRAG = `
            uniform float uTime;
            uniform float uFade;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocal;
            void main() {
                float ndv = abs(dot(normalize(vNormal), normalize(vViewDir)));
                float fres = pow(1.0 - ndv, 2.6);
                float pulse = 0.82 + 0.18 * sin(uTime * 8.0);
                vec3 col = mix(vec3(0.38, 0.06, 1.0), vec3(0.82, 0.40, 1.0), fres);
                gl_FragColor = vec4(col, fres * 0.72 * uFade * pulse);
            }
        `;

        interface HollowPurpleAssets {
            coreGeo: THREE.SphereGeometry;
            shellGeo: THREE.SphereGeometry;
            ringGeoA: THREE.TorusGeometry;
            ringGeoB: THREE.TorusGeometry;
            redGeo: THREE.SphereGeometry;
            blueGeo: THREE.SphereGeometry;
            impactGeo: THREE.SphereGeometry;
            impactRingGeo: THREE.RingGeometry;
            moteGeo: THREE.BufferGeometry;
            moteMat: THREE.PointsMaterial;
            motePositions: Float32Array;
            coreMat: THREE.ShaderMaterial;
            shellMat: THREE.ShaderMaterial;
            ringMatA: THREE.MeshBasicMaterial;
            ringMatB: THREE.MeshBasicMaterial;
            redMat: THREE.MeshBasicMaterial;
            blueMat: THREE.MeshBasicMaterial;
            trailGeo: THREE.BufferGeometry;
            trailMat: THREE.PointsMaterial;
            trailPositions: Float32Array;
            trailColors: Float32Array;
            trailAges: Float32Array;
        }
        let hollowPurpleAssets: HollowPurpleAssets | null = null;

        function getHollowPurpleAssets(): HollowPurpleAssets {
            if (hollowPurpleAssets) return hollowPurpleAssets;
            const trailPositions = new Float32Array(HP_TRAIL_COUNT * 3);
            const trailColors = new Float32Array(HP_TRAIL_COUNT * 3);
            const trailAges = new Float32Array(HP_TRAIL_COUNT).fill(999);
            const motePositions = new Float32Array(12 * 3);
            const moteGeo = new THREE.BufferGeometry();
            moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
            const moteMat = new THREE.PointsMaterial({
                size: 0.2,
                map: getPurpleTrailTexture(),
                color: 0xc084fc,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            const trailGeo = new THREE.BufferGeometry();
            trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
            trailGeo.setDrawRange(0, HP_TRAIL_COUNT);
            const trailMat = new THREE.PointsMaterial({
                size: 0.78,
                map: getPurpleTrailTexture(),
                transparent: true,
                opacity: 0.95,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });

            hollowPurpleAssets = {
                coreGeo: new THREE.SphereGeometry(0.72, 32, 24),
                shellGeo: new THREE.SphereGeometry(1.12, 28, 18),
                ringGeoA: new THREE.TorusGeometry(1.22, 0.035, 6, 48),
                ringGeoB: new THREE.TorusGeometry(1.03, 0.028, 6, 40),
                redGeo: new THREE.SphereGeometry(0.3, 12, 10),
                blueGeo: new THREE.SphereGeometry(0.3, 12, 10),
                impactGeo: new THREE.SphereGeometry(0.8, 12, 8),
                impactRingGeo: new THREE.RingGeometry(0.8, 1.05, 40),
                moteGeo,
                moteMat,
                motePositions,
                coreMat: new THREE.ShaderMaterial({
                    uniforms: { uTime: { value: 0 }, uPower: { value: 1 } },
                    vertexShader: HP_CORE_VERT,
                    fragmentShader: HP_CORE_FRAG
                }),
                shellMat: new THREE.ShaderMaterial({
                    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
                    vertexShader: HP_CORE_VERT,
                    fragmentShader: HP_SHELL_FRAG,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.FrontSide
                }),
                ringMatA: new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
                ringMatB: new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false }),
                redMat: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
                blueMat: new THREE.MeshBasicMaterial({ color: 0x2563eb }),
                trailGeo,
                trailMat,
                trailPositions,
                trailColors,
                trailAges
            };
            return hollowPurpleAssets;
        }

        function spawnHollowPurpleRing(pos: THREE.Vector3, color: number, grow: number, life: number, faceCamera = false) {
            const assets = getHollowPurpleAssets();
            const ring = new THREE.Mesh(
                assets.impactRingGeo,
                new THREE.MeshBasicMaterial({
                    color, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending, depthWrite: false
                })
            );
            ring.position.copy(pos);
            if (faceCamera) ring.lookAt(camera.position);
            else ring.rotation.x = -Math.PI / 2;
            scene.add(ring);
            particles.push({ mesh: ring, ring: true, vel: new THREE.Vector3(), life, maxLife: life, ringGrow: grow });
        }

        function castHollowPurple() {
            if (!playerEntity) return;
            if (gojoTimers.purple > 0) {
                sfx('deny');
                showFloatText(`IMAGINARY TECHNIQUE: HOLLOW PURPLE — RECHARGING ${Math.ceil(gojoTimers.purple)}s`, '#d8b4fe');
                return;
            }
            if (gojoPurple || gojoComboPurple) return;
            const max = gojoMaxOutput;
            gojoTimers.purple = gojoCooldown(4.5);

            const assets = getHollowPurpleAssets();
            const eye = playerEntity.position.clone().setY(4.95);
            const dir = getAimPoint().sub(eye);
            if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
            dir.normalize();
            const muzzle = eye.clone().addScaledVector(dir, firstPersonView ? 5.5 : 4.2);

            const outputScale = max ? 3 : 1;
            const group = new THREE.Group();
            group.position.copy(muzzle);
            group.scale.setScalar(0.62 * outputScale);
            const core = new THREE.Mesh(assets.coreGeo, assets.coreMat);
            const shell = new THREE.Mesh(assets.shellGeo, assets.shellMat);
            const ringA = new THREE.Mesh(assets.ringGeoA, assets.ringMatA);
            ringA.rotation.x = Math.PI / 2;
            const ringB = new THREE.Mesh(assets.ringGeoB, assets.ringMatB);
            ringB.rotation.y = Math.PI / 2;
            const red = new THREE.Mesh(assets.redGeo, assets.redMat);
            red.position.set(-1.2, 0, 0);
            const blue = new THREE.Mesh(assets.blueGeo, assets.blueMat);
            blue.position.set(1.2, 0, 0);
            const motes = new THREE.Points(assets.moteGeo, assets.moteMat);
            motes.frustumCulled = false;
            group.add(core, shell, ringA, ringB, red, blue, motes);
            scene.add(group);

            const trail = new THREE.Points(assets.trailGeo, assets.trailMat);
            trail.frustumCulled = false;
            trail.visible = true;
            scene.add(trail);
            assets.trailAges.fill(999);
            assets.trailColors.fill(0);
            for (let i = 0; i < HP_TRAIL_COUNT; i++) {
                assets.trailPositions[i * 3] = muzzle.x;
                assets.trailPositions[i * 3 + 1] = muzzle.y;
                assets.trailPositions[i * 3 + 2] = muzzle.z;
            }
            assets.trailGeo.attributes.position.needsUpdate = true;
            assets.trailGeo.attributes.color.needsUpdate = true;

            assets.coreMat.uniforms.uPower.value = 0.35;
            assets.shellMat.uniforms.uFade.value = 0;
            assets.ringMatA.opacity = 0.25;
            assets.ringMatB.opacity = 0.2;
            core.rotation.set(0, 0, 0);
            ringA.rotation.set(Math.PI / 2, 0, 0);
            ringB.rotation.set(0, Math.PI / 2, 0);

            gojoPurple = {
                group, core, shell, ringA, ringB, red, blue, motes, trail,
                trailPositions: assets.trailPositions,
                trailColors: assets.trailColors,
                trailAges: assets.trailAges,
                trailHead: 0,
                pos: muzzle.clone(), dir,
                state: 'merge', timer: 0.38, life: 0, max
            };
            assets.trailMat.size = max ? 1.8 : 0.78;
            showFloatText(max ? 'IMAGINARY TECHNIQUE: HOLLOW PURPLE — MAXIMUM OUTPUT' : 'IMAGINARY TECHNIQUE: HOLLOW PURPLE', '#d8b4fe');
            if (max) playPurpleTheme();
            cameraShake = Math.max(cameraShake, 0.18);
            gojoBloom = Math.max(gojoBloom, 0.2);
            sfx('beam');
        }

        function detonateHollowPurple() {
            if (!gojoPurple) return;
            const shot = gojoPurple;
            const pos = shot.pos.clone();
            scene.remove(shot.group);
            scene.remove(shot.trail);
            shot.trail.visible = false;
            const blastRadius = shot.max ? 54 : 20;
            const blastScale = shot.max ? 3 : 1;
            getHollowPurpleAssets().trailMat.size = 0.78;
            gojoPurple = null;

            for (const e of [...enemyEntities]) {
                const d = e.position.distanceTo(pos);
                if (d >= blastRadius) continue;
                const dmg = 7200 * (shot.max ? 3 : 1) * (1 - (d / blastRadius) * 0.5);
                applyDamageToEntity(e, dmg, e.position.clone().setY(2.4), 'normal', true);
                spawnDamageNumber(Math.ceil(dmg), e.position.clone().setY(3.7), 'normal');
                e.stun = Math.max(e.stun || 0, 0.6);
            }

            const assets = getHollowPurpleAssets();
            const nearCockpit = firstPersonView && pos.distanceTo(camera.position) < 24;
            const shock = new THREE.Mesh(
                assets.impactGeo,
                new THREE.MeshBasicMaterial({
                    color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.62,
                    blending: THREE.AdditiveBlending, depthWrite: false
                })
            );
            if (!nearCockpit) {
                shock.position.copy(pos);
                shock.scale.setScalar(blastScale);
                scene.add(shock);
                particles.push({ mesh: shock, vel: new THREE.Vector3(), life: 0.42, maxLife: 0.42, scaleRate: 38 * blastScale, fade: true });

                const flash = new THREE.Mesh(
                    assets.impactGeo,
                    new THREE.MeshBasicMaterial({
                        color: 0xc084fc, transparent: true, opacity: 0.5,
                        blending: THREE.AdditiveBlending, depthWrite: false
                    })
                );
                flash.position.copy(pos);
                flash.scale.setScalar(blastScale);
                scene.add(flash);
                particles.push({ mesh: flash, vel: new THREE.Vector3(), life: 0.22, maxLife: 0.22, scaleRate: 12 * blastScale, fade: true });

                spawnHollowPurpleRing(pos, 0xd8b4fe, 26 * blastScale, 0.5);
                spawnHollowPurpleRing(pos, 0x7c3aed, 18 * blastScale, 0.42, true);
                spawnExplosionParticles(pos, 0x8b5cf6, 14 * blastScale, 28 * blastScale);
                spawnExplosionParticles(pos, 0x5b21b6, 6 * blastScale, 20 * blastScale);
            }

            cameraShake = Math.max(cameraShake, 0.85 * blastScale);
            gojoBloom = Math.max(gojoBloom, 0.45 * blastScale);
            sfx('bigexplode');
            showFloatText(shot.max ? 'IMAGINARY TECHNIQUE: HOLLOW PURPLE — MAXIMUM OUTPUT' : 'IMAGINARY TECHNIQUE: HOLLOW PURPLE', '#e9d5ff');
        }

        function updateGojoPurple(delta: number) {
            if (!gojoPurple) return;
            const shot = gojoPurple;
            const assets = getHollowPurpleAssets();
            assets.coreMat.uniforms.uTime.value = clock.elapsedTime;
            assets.shellMat.uniforms.uTime.value = clock.elapsedTime;
            for (let i = 0; i < 12; i++) {
                const a = clock.elapsedTime * (1.6 + i * 0.045) + i * (Math.PI * 2 / 12);
                const r = 1.18 + Math.sin(clock.elapsedTime * 2.4 + i) * 0.09;
                assets.motePositions[i * 3] = Math.cos(a) * r;
                assets.motePositions[i * 3 + 1] = Math.sin(a * 2.2 + i) * 0.46;
                assets.motePositions[i * 3 + 2] = Math.sin(a) * r;
            }
            assets.moteGeo.attributes.position.needsUpdate = true;

            if (shot.state === 'merge') {
                shot.timer -= delta;
                const t = Math.min(1, Math.max(0, 1 - shot.timer / 0.38));
                const ease = t * t * (3 - 2 * t);
                const sep = 1.2 * (1 - ease);
                shot.red.position.set(-sep, Math.sin(t * Math.PI) * 0.16, 0);
                shot.blue.position.set(sep, -Math.sin(t * Math.PI) * 0.16, 0);
                shot.group.rotation.z += delta * 4;
                shot.group.scale.setScalar((0.62 + 0.38 * ease) * (shot.max ? 3 : 1));
                shot.core.rotation.x += delta * 2;
                shot.core.rotation.y += delta * 3;
                shot.ringA.rotation.z += delta * 6;
                shot.ringB.rotation.x += delta * 7;
                assets.coreMat.uniforms.uPower.value = 0.35 + ease * 0.65;
                assets.shellMat.uniforms.uFade.value = ease;
                if (shot.timer <= 0) {
                    shot.state = 'fly';
                    shot.red.visible = false;
                    shot.blue.visible = false;
                    shot.group.scale.setScalar(shot.max ? 3 : 1);
                    shot.core.scale.setScalar(1);
                    assets.coreMat.uniforms.uPower.value = 1;
                    assets.shellMat.uniforms.uFade.value = 1;
                    assets.ringMatA.opacity = 0.85;
                    assets.ringMatB.opacity = 0.68;
                    spawnHollowPurpleRing(shot.pos, 0xa855f7, 30, 0.32, true);
                    gojoBloom = Math.max(gojoBloom, 0.32);
                    cameraShake = Math.max(cameraShake, 0.25);
                }
                shot.group.position.copy(shot.pos);
                return;
            }

            shot.life += delta;
            const px = shot.pos.x, py = shot.pos.y, pz = shot.pos.z;
            shot.pos.addScaledVector(shot.dir, 112 * delta);
            shot.group.position.copy(shot.pos);
            shot.group.rotation.z += delta * 1.6;
            shot.core.rotation.x += delta * 2.4;
            shot.core.rotation.y += delta * 3.6;
            shot.ringA.rotation.z += delta * 5.2;
            shot.ringB.rotation.x += delta * 7.0;

            for (let i = 0; i < HP_TRAIL_COUNT; i++) {
                if (shot.trailAges[i] >= 900) continue;
                shot.trailAges[i] += delta;
                const f = Math.max(0, 1 - shot.trailAges[i] / 0.42);
                const ff = f * f;
                shot.trailColors[i * 3] = 0.52 * ff;
                shot.trailColors[i * 3 + 1] = 0.12 * ff;
                shot.trailColors[i * 3 + 2] = 1.0 * ff;
            }
            const steps = Math.max(1, Math.min(6, Math.ceil(112 * delta / 0.75)));
            for (let s = 1; s <= steps; s++) {
                const a = s / steps;
                const i = shot.trailHead % HP_TRAIL_COUNT;
                shot.trailHead++;
                shot.trailPositions[i * 3] = px + (shot.pos.x - px) * a + (Math.random() - 0.5) * 0.12;
                shot.trailPositions[i * 3 + 1] = py + (shot.pos.y - py) * a + (Math.random() - 0.5) * 0.12;
                shot.trailPositions[i * 3 + 2] = pz + (shot.pos.z - pz) * a + (Math.random() - 0.5) * 0.12;
                shot.trailAges[i] = 0;
                shot.trailColors[i * 3] = 0.62;
                shot.trailColors[i * 3 + 1] = 0.18;
                shot.trailColors[i * 3 + 2] = 1.0;
            }
            assets.trailGeo.attributes.position.needsUpdate = true;
            assets.trailGeo.attributes.color.needsUpdate = true;

            let hit = false;
            // Let the orb clear the cockpit before it can strike the floor or a nearby prop.
            const armed = shot.life > 0.06;
            for (const e of enemyEntities) {
                if (!armed) break;
                const dx = e.position.x - shot.pos.x;
                const dy = 2.7 * e.scale - shot.pos.y;
                const dz = e.position.z - shot.pos.z;
                const rr = e.radius + 1.8;
                if (dx * dx + dy * dy + dz * dz < rr * rr) { hit = true; break; }
            }
            if (!hit && armed) {
                for (const obs of arenaObstacles) {
                    if (Math.abs(shot.pos.x - obs.pos.x) < obs.halfSize + 1.6 && Math.abs(shot.pos.z - obs.pos.z) < obs.halfSize + 1.6) { hit = true; break; }
                }
            }
            if ((armed && shot.pos.y < 0.9) || shot.life > 2.1) hit = true;
            if (hit) detonateHollowPurple();
        }

        function triggerMaxComboPurple(at: THREE.Vector3) {
            if (gojoComboPurple) {
                scene.remove(gojoComboPurple.group);
                gojoComboPurple = null;
            }
            if (gojoBlueOrb) {
                scene.remove(gojoBlueOrb.group);
                gojoBlueOrb = null;
            }
            const assets = getHollowPurpleAssets();
            const group = new THREE.Group();
            group.position.copy(at);
            group.scale.setScalar(3);
            const core = new THREE.Mesh(assets.coreGeo, assets.coreMat);
            const shell = new THREE.Mesh(assets.shellGeo, assets.shellMat);
            const ringA = new THREE.Mesh(assets.ringGeoA, assets.ringMatA);
            ringA.rotation.x = Math.PI / 2;
            const ringB = new THREE.Mesh(assets.ringGeoB, assets.ringMatB);
            ringB.rotation.y = Math.PI / 2;
            group.add(core, shell, ringA, ringB);
            scene.add(group);
            assets.shellMat.uniforms.uFade.value = 1;
            assets.ringMatA.opacity = 0.9;
            assets.ringMatB.opacity = 0.7;
            gojoComboPurple = { group, core, shell, ringA, ringB, pos: at.clone(), timer: 0.55 };
            playPurpleTheme();
            showFloatText('MAXIMUM OUTPUT — BLUE + RED: HOLLOW PURPLE', '#f0abfc');
            cameraShake = Math.max(cameraShake, 0.4);
            gojoBloom = Math.max(gojoBloom, 0.55);
            sfx('beam');
        }

        function detonateMaxComboPurple() {
            if (!gojoComboPurple) return;
            const combo = gojoComboPurple;
            const pos = combo.pos.clone();
            scene.remove(combo.group);
            gojoComboPurple = null;
            const radius = 54;
            for (const e of [...enemyEntities]) {
                const d = e.position.distanceTo(pos);
                if (d >= radius) continue;
                const dmg = 43200 * (1 - (d / radius) * 0.45);
                applyDamageToEntity(e, dmg, e.position.clone().setY(2.4), 'normal', true);
                spawnDamageNumber(Math.ceil(dmg), e.position.clone().setY(4.2), 'normal');
                e.stun = Math.max(e.stun || 0, 1.2);
            }
            const assets = getHollowPurpleAssets();
            const nearCockpit = firstPersonView && pos.distanceTo(camera.position) < 60;
            if (!nearCockpit) {
                const shock = new THREE.Mesh(
                    assets.impactGeo,
                    new THREE.MeshBasicMaterial({
                        color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.7,
                        blending: THREE.AdditiveBlending, depthWrite: false
                    })
                );
                shock.position.copy(pos);
                shock.scale.setScalar(3);
                scene.add(shock);
                particles.push({ mesh: shock, vel: new THREE.Vector3(), life: 0.5, maxLife: 0.5, scaleRate: 90, fade: true });
                const flash = new THREE.Mesh(
                    assets.impactGeo,
                    new THREE.MeshBasicMaterial({
                        color: 0xf0abfc, transparent: true, opacity: 0.55,
                        blending: THREE.AdditiveBlending, depthWrite: false
                    })
                );
                flash.position.copy(pos);
                flash.scale.setScalar(3);
                scene.add(flash);
                particles.push({ mesh: flash, vel: new THREE.Vector3(), life: 0.28, maxLife: 0.28, scaleRate: 30, fade: true });
                spawnHollowPurpleRing(pos, 0xf0abfc, 84, 0.6);
                spawnHollowPurpleRing(pos, 0x7c3aed, 60, 0.5, true);
                spawnExplosionParticles(pos, 0xa855f7, 30, 44);
                spawnExplosionParticles(pos, 0x4c1d95, 12, 30);
            }
            cameraShake = Math.max(cameraShake, 1.5);
            gojoBloom = Math.max(gojoBloom, 1.2);
            sfx('bigexplode');
            showFloatText('IMAGINARY TECHNIQUE: HOLLOW PURPLE — 600%', '#f5d0fe');
        }

        function updateGojoComboPurple(delta: number) {
            if (!gojoComboPurple) return;
            const combo = gojoComboPurple;
            const assets = getHollowPurpleAssets();
            assets.coreMat.uniforms.uTime.value = clock.elapsedTime;
            assets.shellMat.uniforms.uTime.value = clock.elapsedTime;
            combo.timer -= delta;
            combo.core.rotation.y += delta * 4;
            combo.ringA.rotation.z += delta * 8;
            combo.ringB.rotation.x += delta * 10;
            combo.group.scale.setScalar(3 * (1 + Math.sin(clock.elapsedTime * 9) * 0.05));
            if (combo.timer <= 0) detonateMaxComboPurple();
        }

        /* =========================================================================
           FRIEREN — ZOLTRAAK AND HEX BARRIERS
           ========================================================================= */
        function getZoltraakSigilTexture(): THREE.Texture | null {
            if (!zoltraakSigilRequested) {
                zoltraakSigilRequested = true;
                new THREE.TextureLoader().load('assets/zoltraak.png', tex => {
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    zoltraakSigilTex = tex;
                }, undefined, () => { zoltraakSigilRequested = false; });
            }
            return zoltraakSigilTex;
        }

        function makeZoltraakSigil(scale: number, opacity: number): THREE.Sprite | null {
            const tex = getZoltraakSigilTexture();
            if (!tex) return null;
            const mat = new THREE.SpriteMaterial({
                map: tex, color: 0xffffff, transparent: true, opacity,
                blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(scale, scale, 1);
            sprite.renderOrder = 6;
            return sprite;
        }

        function frierenNearestTarget(maxDist: number): MechEnemy | null {
            if (!playerEntity) return null;
            let target: MechEnemy | null = null, best = maxDist;
            for (const e of enemyEntities) {
                const d = e.position.distanceTo(playerEntity.position);
                if (d < best) { best = d; target = e; }
            }
            return target;
        }

        function frierenAimDir(): THREE.Vector3 {
            if (!playerEntity) return new THREE.Vector3(0, 0, -1);
            const eye = playerEntity.position.clone().setY(4.2);
            const dir = getAimPoint().sub(eye);
            if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
            return dir.normalize();
        }

        function castZoltraak() {
            if (!playerEntity) return;
            if (frierenTimers.zoltraak > 0) {
                sfx('deny');
                showFloatText(`ZOLTRAAK RECHARGING — ${Math.ceil(frierenTimers.zoltraak)}s`, '#dff7ff');
                return;
            }
            frierenTimers.zoltraak = 6.5;
            getZoltraakSigilTexture();

            const eye = playerEntity.position.clone().setY(firstPersonView ? 4.95 : 4.2);
            const target = frierenNearestTarget(230);
            let aim = getAimPoint();
            if (target) aim = target.position.clone().setY(2.7 * target.scale);
            const dir = aim.clone().sub(eye);
            if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
            dir.normalize();
            const length = Math.max(2, Math.min(230, eye.distanceTo(aim)));
            const end = eye.clone().addScaledVector(dir, length);

            const group = new THREE.Group();
            group.position.copy(eye);
            group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

            const coreMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0.95,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x8fe8ff, transparent: true, opacity: 0.15,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const beamGeo = new THREE.CylinderGeometry(0.46, 0.46, length, 10, 1, true);
            const core = new THREE.Mesh(beamGeo, coreMat);
            core.rotation.x = Math.PI / 2;
            core.position.z = length / 2;
            group.add(core);
            const glowGeo = new THREE.CylinderGeometry(1.05, 1.05, length, 10, 1, true);
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.rotation.x = Math.PI / 2;
            glow.position.z = length / 2;
            group.add(glow);
            scene.add(group);

            const sigils: { sprite: THREE.Sprite; baseOpacity: number }[] = [];
            const muzzleDist = firstPersonView ? 7.0 : 5.2;
            const muzzleScale = firstPersonView ? 4.0 : 5.2;
            const muzzleSigil = makeZoltraakSigil(muzzleScale, 0.62);
            if (muzzleSigil) {
                muzzleSigil.position.copy(eye.clone().addScaledVector(dir, muzzleDist));
                scene.add(muzzleSigil);
                sigils.push({ sprite: muzzleSigil, baseOpacity: 0.62 });
            }
            const impactSigil = makeZoltraakSigil(THREE.MathUtils.clamp(length * 0.13, 3, 16), 0.55);
            if (impactSigil) {
                impactSigil.position.copy(end.clone().addScaledVector(dir, 0.8));
                scene.add(impactSigil);
                sigils.push({ sprite: impactSigil, baseOpacity: 0.55 });
            }

            frierenBeam = {
                group, origin: eye.clone(), dir: dir.clone(), length,
                life: 1.2, maxLife: 1.2, coreMat, glowMat, sigils
            };

            const line = new THREE.Line3(eye, end);
            const closest = new THREE.Vector3();
            for (const e of [...enemyEntities]) {
                const center = e.position.clone().setY(2.7 * e.scale);
                line.closestPointToPoint(center, true, closest);
                if (closest.distanceTo(center) < 3.2 + e.radius) {
                    const dmg = 26000;
                    applyDamageToEntity(e, dmg, center, 'normal', true);
                    spawnDamageNumber(Math.ceil(dmg), center, 'normal');
                    e.stun = Math.max(e.stun || 0, 0.75);
                }
            }

            spawnExplosionParticles(end, 0xffffff, 16, 34);
            spawnExplosionParticles(end, 0x8fe8ff, 10, 24);
            spawnHollowPurpleRing(end, 0xffffff, 38, 0.42);
            spawnHollowPurpleRing(end, 0x8fe8ff, 26, 0.34, true);
            cameraShake = Math.max(cameraShake, 0.85);
            gojoBloom = Math.max(gojoBloom, 0.85);
            sfx('zoltraak');
            showFloatText('ZOLTRAAK — WHITE ANNIHILATION', '#f4fcff');
        }

        function updateZoltraak(delta: number) {
            if (!frierenBeam) return;
            const beam = frierenBeam;
            beam.life -= delta;
            const fade = Math.max(0, beam.life / beam.maxLife);
            beam.coreMat.opacity = 0.95 * fade;
            beam.glowMat.opacity = 0.15 * fade;
            for (const sig of beam.sigils) {
                const mat = sig.sprite.material as THREE.SpriteMaterial;
                mat.rotation += delta * 3.2;
                mat.opacity = sig.baseOpacity * Math.min(1, fade * 1.4);
            }
            if (beam.life <= 0) {
                scene.remove(beam.group);
                beam.group.traverse(o => {
                    const mesh = o as THREE.Mesh;
                    if (mesh.geometry) mesh.geometry.dispose();
                });
                beam.coreMat.dispose();
                beam.glowMat.dispose();
                for (const sig of beam.sigils) {
                    scene.remove(sig.sprite);
                    (sig.sprite.material as THREE.SpriteMaterial).dispose();
                }
                frierenBeam = null;
            }
        }

        function makeHexShieldMaterials() {
            return {
                fill: new THREE.MeshBasicMaterial({
                    color: 0x1f8bff, transparent: true, opacity: 0.28,
                    side: THREE.DoubleSide, depthWrite: false, fog: false
                }),
                edge: new THREE.LineBasicMaterial({
                    color: 0xbdf3ff, transparent: true, opacity: 0.95, fog: false
                })
            };
        }

        function castFrierenHexShield() {
            if (!playerEntity) return;
            if (frierenTimers.shield > 0) {
                sfx('deny');
                showFloatText(`HEX SHIELD RECHARGING — ${Math.ceil(frierenTimers.shield)}s`, '#bdefff');
                return;
            }
            frierenTimers.shield = 12;
            const dir = frierenAimDir();
            const center = playerEntity.position.clone().addScaledVector(dir, 5.0).setY(4.0);
            const group = new THREE.Group();
            group.position.copy(center);
            group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
            const mats = makeHexShieldMaterials();
            const hexGeo = new THREE.CircleGeometry(2.0, 6);
            const edgeGeo = new THREE.EdgesGeometry(hexGeo);
            const h = Math.sqrt(3) * 2.0;
            const spots = [
                [0, 0], [h, 0], [-h, 0],
                [h / 2, 3.0], [-h / 2, 3.0],
                [h / 2, -3.0], [-h / 2, -3.0]
            ];
            for (const [x, y] of spots) {
                const panel = new THREE.Mesh(hexGeo, mats.fill);
                panel.position.set(x, y, 0);
                group.add(panel);
                const edge = new THREE.LineSegments(edgeGeo, mats.edge);
                edge.position.set(x, y, 0.02);
                group.add(edge);
            }
            scene.add(group);
            frierenFrontShield = {
                group, kind: 'front', center: center.clone(), normal: dir.clone(),
                radius: 7.2, life: 5.0, maxLife: 5.0,
                fillMat: mats.fill, edgeMat: mats.edge, hitFlash: 0
            };
            spawnHollowPurpleRing(center, 0x54c8ff, 32, 0.45, true);
            sfx('shield');
            showFloatText('HEX SHIELD — FORWARD BARRIER', '#bdefff');
        }

        function castFrierenSphereShield() {
            if (!playerEntity) return;
            if (frierenTimers.sphere > 0) {
                sfx('deny');
                showFloatText(`SPHERICAL SHIELD RECHARGING — ${Math.ceil(frierenTimers.sphere)}s`, '#bdefff');
                return;
            }
            frierenTimers.sphere = 18;
            const center = playerEntity.position.clone().setY(3.6);
            const group = new THREE.Group();
            group.position.copy(center);
            const mats = makeHexShieldMaterials();
            mats.fill.blending = THREE.NormalBlending;
            mats.fill.color.setHex(0x0a55ff);
            mats.fill.opacity = 0.2;
            mats.edge.color.setHex(0x6fdcff);
            mats.edge.opacity = 0.65;
            const hexGeo = new THREE.CircleGeometry(1.25, 6);
            const edgeGeo = new THREE.EdgesGeometry(hexGeo);
            const count = 42;
            const golden = Math.PI * (3 - Math.sqrt(5));
            for (let i = 0; i < count; i++) {
                const y = 1 - (i / (count - 1)) * 2;
                const r = Math.sqrt(Math.max(0, 1 - y * y));
                const theta = golden * i;
                const normal = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
                const panel = new THREE.Mesh(hexGeo, mats.fill);
                panel.position.copy(normal).multiplyScalar(4.9);
                panel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
                group.add(panel);
                const edge = new THREE.LineSegments(edgeGeo, mats.edge);
                edge.position.copy(panel.position).multiplyScalar(1.008);
                edge.quaternion.copy(panel.quaternion);
                group.add(edge);
            }
            const aura = new THREE.Mesh(
                new THREE.SphereGeometry(4.78, 20, 14),
                new THREE.MeshBasicMaterial({
                    color: 0x1e6fff, transparent: true, opacity: 0.04,
                    side: THREE.DoubleSide, depthWrite: false
                })
            );
            group.add(aura);
            scene.add(group);
            frierenSphereShield = {
                group, kind: 'sphere', center: center.clone(), normal: new THREE.Vector3(0, 1, 0),
                radius: 5.1, life: 4.0, maxLife: 4.0,
                fillMat: mats.fill, edgeMat: mats.edge, hitFlash: 0
            };
            spawnHollowPurpleRing(center.clone().setY(0.35), 0x54c8ff, 42, 0.5, true);
            sfx('shield');
            showFloatText('SPHERICAL HEX SHIELD — SEALED', '#bdefff');
        }

        function disposeFrierenShield(state: FrierenShieldState) {
            scene.remove(state.group);
            state.group.traverse(o => {
                const mesh = o as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                const materials = Array.isArray(mesh.material) ? mesh.material : (mesh.material ? [mesh.material] : []);
                materials.forEach(m => m.dispose());
            });
        }

        function updateFrierenShields(delta: number) {
            if (!playerEntity) return;
            if (frierenFrontShield) {
                const shield = frierenFrontShield;
                shield.life -= delta;
                const dir = frierenAimDir();
                const center = playerEntity.position.clone().addScaledVector(dir, 5.0).setY(4.0);
                shield.group.position.copy(center);
                shield.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
                shield.center.copy(center);
                shield.normal.copy(dir);
                shield.hitFlash = Math.max(0, shield.hitFlash - delta * 4);
                const fade = Math.min(1, shield.life / 0.65);
                shield.fillMat.opacity = (0.28 + shield.hitFlash * 0.16) * fade;
                shield.edgeMat.opacity = (0.9 + shield.hitFlash * 0.05) * fade;
                if (shield.life <= 0) { disposeFrierenShield(shield); frierenFrontShield = null; }
            }
            if (frierenSphereShield) {
                const shield = frierenSphereShield;
                shield.life -= delta;
                const center = playerEntity.position.clone().setY(3.6);
                shield.group.position.copy(center);
                shield.center.copy(center);
                shield.group.rotation.y += delta * 0.22;
                shield.hitFlash = Math.max(0, shield.hitFlash - delta * 4);
                const fade = Math.min(1, shield.life / 0.65);
                const fpDamp = firstPersonView ? 0.55 : 1;
                shield.fillMat.opacity = (0.2 + shield.hitFlash * 0.1) * fade * fpDamp;
                shield.edgeMat.opacity = (0.65 + shield.hitFlash * 0.2) * fade * (firstPersonView ? 0.82 : 1);
                if (shield.life <= 0) { disposeFrierenShield(shield); frierenSphereShield = null; }
            }
        }

        function frierenBlocksProjectile(from: THREE.Vector3, to: THREE.Vector3): boolean {
            if (frierenSphereShield) {
                const shield = frierenSphereShield;
                if (to.distanceTo(shield.center) < shield.radius + 0.8) {
                    shield.hitFlash = 0.35;
                    spawnExplosionParticles(to.clone(), 0x8fe8ff, 5, 8);
                    sfx('shieldhit');
                    return true;
                }
            }
            if (frierenFrontShield) {
                const shield = frierenFrontShield;
                const d0 = from.clone().sub(shield.center).dot(shield.normal);
                const d1 = to.clone().sub(shield.center).dot(shield.normal);
                if (d0 * d1 <= 0 && Math.abs(d0 - d1) > 0.0001) {
                    const t = d0 / (d0 - d1);
                    const hit = from.clone().lerp(to, t);
                    if (hit.distanceTo(shield.center) < shield.radius) {
                        shield.hitFlash = 0.45;
                        spawnExplosionParticles(hit, 0x8fe8ff, 6, 10);
                        sfx('shieldhit');
                        return true;
                    }
                }
            }
            return false;
        }

        function updateFrierenAbilityHUD() {
            if (!isFrieren()) return;
            const set = (id: string, text: string, cooling: boolean, firing = false) => {
                const root = byId(`fab-${id}`);
                byId(`fab-${id}-state`).innerText = text;
                root.classList.toggle('cooling', cooling);
                root.classList.toggle('firing', firing);
            };
            set('zoltraak', frierenTimers.zoltraak > 0 ? `${Math.ceil(frierenTimers.zoltraak)}s` : 'READY', frierenTimers.zoltraak > 0, !!frierenBeam);
            set('hex', frierenFrontShield ? 'ACTIVE' : (frierenTimers.shield > 0 ? `${Math.ceil(frierenTimers.shield)}s` : 'READY'), frierenTimers.shield > 0, !!frierenFrontShield);
            set('sphere', frierenSphereShield ? 'ACTIVE' : (frierenTimers.sphere > 0 ? `${Math.ceil(frierenTimers.sphere)}s` : 'READY'), frierenTimers.sphere > 0, !!frierenSphereShield);
        }

        function updateFrierenTechniques(delta: number) {
            frierenTimers.zoltraak = Math.max(0, frierenTimers.zoltraak - delta);
            frierenTimers.shield = Math.max(0, frierenTimers.shield - delta);
            frierenTimers.sphere = Math.max(0, frierenTimers.sphere - delta);
            updateZoltraak(delta);
            updateFrierenShields(delta);
            updateFrierenAbilityHUD();
        }

        function clearFrierenEffects() {
            if (frierenBeam) {
                scene.remove(frierenBeam.group);
                frierenBeam.group.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) mesh.geometry.dispose(); });
                frierenBeam.coreMat.dispose();
                frierenBeam.glowMat.dispose();
                for (const sig of frierenBeam.sigils) {
                    scene.remove(sig.sprite);
                    (sig.sprite.material as THREE.SpriteMaterial).dispose();
                }
                frierenBeam = null;
            }
            if (frierenFrontShield) { disposeFrierenShield(frierenFrontShield); frierenFrontShield = null; }
            if (frierenSphereShield) { disposeFrierenShield(frierenSphereShield); frierenSphereShield = null; }
            frierenTimers = { zoltraak: 0, shield: 0, sphere: 0 };
        }

        function gojoNearestTarget(maxDist: number): MechEnemy | null {
            if (!playerEntity) return null;
            let target: MechEnemy | null = null, best = maxDist;
            for (const e of enemyEntities) {
                const d = e.position.distanceTo(playerEntity.position);
                if (d < best) { best = d; target = e; }
            }
            return target;
        }

        /* BLUE / RED — shared shader orbs with palette uniforms, precompiled at boot. */
        const CURSED_CORE_FRAG = `
            uniform float uTime;
            uniform float uPower;
            uniform vec3 uDeep;
            uniform vec3 uMid;
            uniform vec3 uHot;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocal;
            void main() {
                vec3 n = normalize(vNormal);
                vec3 v = normalize(vViewDir);
                float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
                float t = uTime;
                float band = sin(vLocal.y * 7.0 + vLocal.x * 4.0 + sin(vLocal.z * 6.0 - t * 2.4) * 1.8 + t * 3.0);
                float swirl = 0.5 + 0.5 * sin(vLocal.z * 9.0 - t * 2.8 + band * 1.7);
                float energy = clamp(0.5 + 0.5 * band * swirl, 0.0, 1.0);
                vec3 col = mix(uDeep, uMid, 0.35 + energy * 0.65);
                col = mix(col, uHot, fres * 0.5 + energy * 0.22 * uPower);
                col += uHot * pow(fres, 3.0) * 0.55;
                gl_FragColor = vec4(col, 1.0);
            }
        `;
        const CURSED_SHELL_FRAG = `
            uniform float uTime;
            uniform float uFade;
            uniform vec3 uInner;
            uniform vec3 uOuter;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocal;
            void main() {
                float ndv = abs(dot(normalize(vNormal), normalize(vViewDir)));
                float fres = pow(1.0 - ndv, 2.5);
                vec3 col = mix(uInner, uOuter, fres);
                float pulse = 0.85 + 0.15 * sin(uTime * 7.0);
                gl_FragColor = vec4(col, fres * 0.7 * uFade * pulse);
            }
        `;

        interface CursedOrbAssets {
            coreGeo: THREE.SphereGeometry;
            shellGeo: THREE.SphereGeometry;
            ringGeoA: THREE.TorusGeometry;
            ringGeoB: THREE.TorusGeometry;
            coreMat: THREE.ShaderMaterial;
            shellMat: THREE.ShaderMaterial;
            ringMatA: THREE.MeshBasicMaterial;
            ringMatB: THREE.MeshBasicMaterial;
            moteGeo: THREE.BufferGeometry;
            moteMat: THREE.PointsMaterial;
            motePositions: Float32Array;
        }
        let blueOrbAssets: CursedOrbAssets | null = null;
        let redOrbAssets: CursedOrbAssets | null = null;

        function buildCursedOrbAssets(deep: number, mid: number, hot: number, shellIn: number, shellOut: number, ringA: number, ringB: number): CursedOrbAssets {
            const motePositions = new Float32Array(10 * 3);
            const moteGeo = new THREE.BufferGeometry();
            moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
            return {
                coreGeo: new THREE.SphereGeometry(0.62, 24, 18),
                shellGeo: new THREE.SphereGeometry(0.95, 20, 14),
                ringGeoA: new THREE.TorusGeometry(1.02, 0.03, 6, 40),
                ringGeoB: new THREE.TorusGeometry(0.82, 0.024, 6, 36),
                coreMat: new THREE.ShaderMaterial({
                    uniforms: {
                        uTime: { value: 0 }, uPower: { value: 1 },
                        uDeep: { value: new THREE.Color(deep) },
                        uMid: { value: new THREE.Color(mid) },
                        uHot: { value: new THREE.Color(hot) }
                    },
                    vertexShader: HP_CORE_VERT,
                    fragmentShader: CURSED_CORE_FRAG
                }),
                shellMat: new THREE.ShaderMaterial({
                    uniforms: {
                        uTime: { value: 0 }, uFade: { value: 1 },
                        uInner: { value: new THREE.Color(shellIn) },
                        uOuter: { value: new THREE.Color(shellOut) }
                    },
                    vertexShader: HP_CORE_VERT,
                    fragmentShader: CURSED_SHELL_FRAG,
                    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide
                }),
                ringMatA: new THREE.MeshBasicMaterial({ color: ringA, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
                ringMatB: new THREE.MeshBasicMaterial({ color: ringB, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false }),
                moteGeo,
                moteMat: new THREE.PointsMaterial({
                    size: 0.18, map: getStarTexture(), color: hot, transparent: true, opacity: 0.95,
                    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
                }),
                motePositions
            };
        }

        function getBlueOrbAssets(): CursedOrbAssets {
            if (!blueOrbAssets) blueOrbAssets = buildCursedOrbAssets(0x03142e, 0x1450d8, 0x63d8ff, 0x0b2f78, 0x55c8ff, 0x2e7bff, 0x9fe8ff);
            return blueOrbAssets;
        }

        function getRedOrbAssets(): CursedOrbAssets {
            if (!redOrbAssets) redOrbAssets = buildCursedOrbAssets(0x240207, 0xb3121f, 0xff6b5e, 0x6b0712, 0xff9a7a, 0xff2f45, 0xffb08a);
            return redOrbAssets;
        }

        function spawnCursedOrb(assets: CursedOrbAssets, kind: 'blue' | 'red', pos: THREE.Vector3, dir: THREE.Vector3, maxLife: number, max: boolean): CursedOrbState {
            const group = new THREE.Group();
            group.position.copy(pos);
            group.scale.setScalar(0.78);
            const core = new THREE.Mesh(assets.coreGeo, assets.coreMat);
            const shell = new THREE.Mesh(assets.shellGeo, assets.shellMat);
            const ringA = new THREE.Mesh(assets.ringGeoA, assets.ringMatA);
            ringA.rotation.x = Math.PI / 2;
            const ringB = new THREE.Mesh(assets.ringGeoB, assets.ringMatB);
            ringB.rotation.y = Math.PI / 2;
            const motes = new THREE.Points(assets.moteGeo, assets.moteMat);
            motes.frustumCulled = false;
            group.add(core, shell, ringA, ringB, motes);
            scene.add(group);
            return {
                kind, group, core, shell, ringA, ringB, motes,
                pos: pos.clone(), dir: dir.clone(), life: 0, maxLife, max
            };
        }

        function animateCursedOrb(orb: CursedOrbState, delta: number) {
            const assets = orb.kind === 'blue' ? getBlueOrbAssets() : getRedOrbAssets();
            assets.coreMat.uniforms.uTime.value = clock.elapsedTime;
            assets.shellMat.uniforms.uTime.value = clock.elapsedTime;
            orb.group.rotation.z += delta * 1.5;
            orb.core.rotation.y += delta * 2.4;
            orb.ringA.rotation.z += delta * 4.5;
            orb.ringB.rotation.x += delta * 6.2;
            for (let i = 0; i < 10; i++) {
                const a = clock.elapsedTime * (2.0 + i * 0.08) + i * (Math.PI * 2 / 10);
                const r = 1.03 + Math.sin(clock.elapsedTime * 3 + i) * 0.07;
                assets.motePositions[i * 3] = Math.cos(a) * r;
                assets.motePositions[i * 3 + 1] = Math.sin(a * 2.1 + i) * 0.38;
                assets.motePositions[i * 3 + 2] = Math.sin(a) * r;
            }
            assets.moteGeo.attributes.position.needsUpdate = true;
        }

        function castGojoBlue() {
            if (!playerEntity) return;
            if (gojoTimers.blue > 0) {
                sfx('deny');
                showFloatText(`BLUE RECHARGING — ${Math.ceil(gojoTimers.blue)}s`, '#7dd3fc');
                return;
            }
            if (gojoBlueOrb) {
                sfx('deny');
                showFloatText('BLUE ALREADY ACTIVE', '#7dd3fc');
                return;
            }
            const target = gojoNearestTarget(110);
            if (!target) {
                sfx('deny');
                showFloatText('NO TARGET IN RANGE', '#7dd3fc');
                return;
            }
            const max = gojoMaxOutput;
            gojoTimers.blue = gojoCooldown(7);
            const pos = target.position.clone().setY(2.8 * target.scale);
            gojoBlueOrb = spawnCursedOrb(getBlueOrbAssets(), 'blue', pos, new THREE.Vector3(0, 0, -1), 2.2, max);
            gojoBlueOrb.group.scale.setScalar(1.35 * (max ? 3 : 1));
            spawnHollowPurpleRing(pos, 0x2e7bff, 30, 0.45, true);
            showFloatText('CURSED TECHNIQUE — BLUE', '#6aa9ff');
            sfx('beam');
        }

        function castGojoRed() {
            if (!playerEntity) return;
            if (gojoTimers.red > 0) {
                sfx('deny');
                showFloatText(`RED RECHARGING — ${Math.ceil(gojoTimers.red)}s`, '#ff8a96');
                return;
            }
            if (gojoRedOrb) return;
            if (gojoMaxOutput && gojoBlueOrb && !gojoPurple && !gojoComboPurple) {
                gojoTimers.red = gojoCooldown(7);
                triggerMaxComboPurple(gojoBlueOrb.pos.clone());
                return;
            }
            const max = gojoMaxOutput;
            gojoTimers.red = gojoCooldown(7);
            const target = gojoNearestTarget(120);
            const eye = playerEntity.position.clone().setY(4.95);
            const aim = target ? target.position.clone().setY(2.6 * target.scale) : getAimPoint();
            const dir = aim.sub(eye);
            if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
            dir.normalize();
            const spawn = eye.clone().addScaledVector(dir, firstPersonView ? 4.6 : 3.4);
            gojoRedOrb = spawnCursedOrb(getRedOrbAssets(), 'red', spawn, dir, 1.5, max);
            gojoRedOrb.group.scale.setScalar(1.0 * (max ? 3 : 1));
            showFloatText('CURSED TECHNIQUE — RED', '#ff5a66');
            sfx('beam');
        }

        function detonateGojoRed() {
            if (!gojoRedOrb) return;
            const orb = gojoRedOrb;
            const pos = orb.pos.clone();
            scene.remove(orb.group);
            gojoRedOrb = null;
            const max = orb.max;
            const blastRadius = max ? 60 : 30;
            const power = max ? 3 : 1;
            const fxScale = max ? 2 : 1;

            for (const e of [...enemyEntities]) {
                const d = e.position.distanceTo(pos);
                if (d >= blastRadius) continue;
                const dmg = 1600 * power * (1 - (d / blastRadius) * 0.55);
                const push = e.position.clone().sub(pos).setY(0);
                if (push.lengthSq() < 0.01) push.set(1, 0, 0);
                push.normalize().multiplyScalar(18 * power * (1 - d / (blastRadius + 4)));
                e.position.add(push);
                applyDamageToEntity(e, dmg, e.position.clone().setY(2.4), 'normal', true);
                spawnDamageNumber(Math.ceil(dmg), e.position.clone().setY(3.7), 'normal');
                e.stun = Math.max(e.stun || 0, 0.35);
            }

            const nearCockpit = firstPersonView && pos.distanceTo(camera.position) < (max ? 56 : 32);
            if (!nearCockpit) {
                const assets = getRedOrbAssets();
                const shock = new THREE.Mesh(
                    assets.coreGeo,
                    new THREE.MeshBasicMaterial({ color: 0xff3344, wireframe: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                shock.position.copy(pos);
                shock.scale.setScalar(fxScale);
                scene.add(shock);
                particles.push({ mesh: shock, vel: new THREE.Vector3(), life: 0.42, maxLife: 0.42, scaleRate: 28 * fxScale, fade: true });

                const flash = new THREE.Mesh(
                    assets.shellGeo,
                    new THREE.MeshBasicMaterial({ color: 0xff8a6a, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                flash.position.copy(pos);
                flash.scale.setScalar(fxScale);
                scene.add(flash);
                particles.push({ mesh: flash, vel: new THREE.Vector3(), life: 0.24, maxLife: 0.24, scaleRate: 14 * fxScale, fade: true });

                spawnHollowPurpleRing(pos, 0xff2f45, 58 * fxScale, 0.55);
                spawnHollowPurpleRing(pos, 0xffb08a, 42 * fxScale, 0.45, true);
                spawnExplosionParticles(pos, 0xff4d4d, 18 * fxScale, 30 * fxScale);
                spawnExplosionParticles(pos, 0xffb000, 8 * fxScale, 22 * fxScale);
                cameraShake = Math.max(cameraShake, 0.8 * fxScale);
                gojoBloom = Math.max(gojoBloom, 0.42 * fxScale);
            }
            sfx('bigexplode');
            showFloatText('RED — REPULSION SHOCKWAVE', '#ffb08a');
        }

        function createVoidStarfield(center: THREE.Vector3): { stars: THREE.Points; starMat: THREE.PointsMaterial } {
            const count = 900;
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 44 + Math.random() * 14;
                positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
                positions[i * 3 + 1] = Math.cos(phi) * r;
                positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const starMat = new THREE.PointsMaterial({
                color: 0xd8b4ff, size: 1.1, transparent: true, opacity: 0,
                map: getStarTexture(), alphaTest: 0.02,
                blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
            });
            const stars = new THREE.Points(geo, starMat);
            stars.position.copy(center);
            scene.add(stars);
            return { stars, starMat };
        }

        function createVoidArcs(center: THREE.Vector3): { arcs: THREE.LineSegments; arcMat: THREE.LineBasicMaterial } {
            const positions: number[] = [];
            for (let a = 0; a < 20; a++) {
                const theta = Math.random() * Math.PI * 2;
                const radius = 16 + Math.random() * 38;
                let prev = new THREE.Vector3(
                    Math.cos(theta) * radius,
                    2 + Math.random() * 40,
                    Math.sin(theta) * radius
                );
                for (let s = 0; s < 5; s++) {
                    const next = prev.clone().add(new THREE.Vector3(
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 9,
                        (Math.random() - 0.5) * 10
                    ));
                    positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
                    prev = next;
                }
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
            const arcMat = new THREE.LineBasicMaterial({
                color: 0xc084fc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const arcs = new THREE.LineSegments(geo, arcMat);
            arcs.position.copy(center);
            scene.add(arcs);
            return { arcs, arcMat };
        }

        function createVoidGalaxy(center: THREE.Vector3): { galaxy: THREE.Points; galaxyMat: THREE.PointsMaterial; galaxyCore: THREE.Sprite; galaxyCoreMat: THREE.SpriteMaterial } {
            const count = 1500;
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const arm = i % 3;
                const r = Math.pow(Math.random(), 0.62) * 20;
                const angle = arm * (Math.PI * 2 / 3) + r * 0.20 + (Math.random() - 0.5) * (0.32 + r * 0.024);
                positions[i * 3] = Math.cos(angle) * r;
                positions[i * 3 + 1] = (Math.random() - 0.5) * (1.1 + r * 0.04);
                positions[i * 3 + 2] = Math.sin(angle) * r;
                const shade = 0.5 + 0.5 * (1 - r / 20);
                const pink = i % 9 === 0;
                colors[i * 3] = (pink ? 0.92 : 0.42 * shade);
                colors[i * 3 + 1] = (pink ? 0.38 : 0.30 * shade);
                colors[i * 3 + 2] = pink ? 0.82 : (0.62 + 0.38 * shade);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            const galaxyMat = new THREE.PointsMaterial({
                size: 0.68, map: getStarTexture(), vertexColors: true, transparent: true,
                opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false
            });
            const centroid = center.clone().add(new THREE.Vector3(-6, 14, -34));
            const galaxy = new THREE.Points(geo, galaxyMat);
            galaxy.position.copy(centroid);
            galaxy.rotation.set(-0.3, 0.35, 0.16);
            scene.add(galaxy);

            const galaxyCoreMat = new THREE.SpriteMaterial({
                map: getGlowTexture(), color: 0x8b5cf6, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, fog: false
            });
            const galaxyCore = new THREE.Sprite(galaxyCoreMat);
            galaxyCore.position.copy(centroid);
            galaxyCore.scale.set(10, 10, 1);
            scene.add(galaxyCore);
            return { galaxy, galaxyMat, galaxyCore, galaxyCoreMat };
        }

        function createVoidBlackHole(center: THREE.Vector3): { blackHole: THREE.Group; bhDisks: THREE.Mesh[]; bhMotes: THREE.Points; bhMoteMat: THREE.PointsMaterial; cosmosMats: THREE.Material[] } {
            const group = new THREE.Group();
            group.position.copy(center).add(new THREE.Vector3(7, 15, -33));
            scene.add(group);

            const horizon = new THREE.Mesh(
                new THREE.SphereGeometry(5.4, 24, 18),
                new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })
            );
            group.add(horizon);

            const cosmosMats: THREE.Material[] = [];
            const addDisk = (radius: number, tube: number, color: number, opacity: number, tiltX: number, tiltZ: number) => {
                const mat = new THREE.MeshBasicMaterial({
                    color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
                    depthWrite: false, side: THREE.DoubleSide, fog: false
                });
                mat.userData.baseOpacity = opacity;
                cosmosMats.push(mat);
                const disk = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 64), mat);
                disk.rotation.set(tiltX, 0, tiltZ);
                group.add(disk);
                return disk;
            };
            const diskA = addDisk(6.5, 0.28, 0xff7a2f, 0.42, 1.15, 0.18);
            const diskB = addDisk(7.2, 0.08, 0x7c3aed, 0.24, 1.0, -0.3);
            const photon = addDisk(5.8, 0.035, 0x9d5cff, 0.22, 1.22, 0.1);

            const moteCount = 140;
            const motePositions = new Float32Array(moteCount * 3);
            const moteColors = new Float32Array(moteCount * 3);
            for (let i = 0; i < moteCount; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 5.7 + Math.random() * 1.6;
                motePositions[i * 3] = Math.cos(a) * r;
                motePositions[i * 3 + 1] = (Math.random() - 0.5) * 1.1;
                motePositions[i * 3 + 2] = Math.sin(a) * r;
                const warm = Math.random() < 0.65;
                moteColors[i * 3] = warm ? 1.0 : 0.72;
                moteColors[i * 3 + 1] = warm ? 0.52 : 0.30;
                moteColors[i * 3 + 2] = warm ? 0.22 : 1.0;
            }
            const moteGeo = new THREE.BufferGeometry();
            moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
            moteGeo.setAttribute('color', new THREE.BufferAttribute(moteColors, 3));
            const bhMoteMat = new THREE.PointsMaterial({
                size: 0.2, map: getStarTexture(), vertexColors: true, transparent: true,
                opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false
            });
            bhMoteMat.userData.baseOpacity = 0.5;
            cosmosMats.push(bhMoteMat);
            const bhMotes = new THREE.Points(moteGeo, bhMoteMat);
            bhMotes.rotation.x = 1.15;
            group.add(bhMotes);

            return { blackHole: group, bhDisks: [diskA, diskB, photon], bhMotes, bhMoteMat, cosmosMats };
        }

        function destroyGojoDomain() {
            if (!gojoDomain) return;
            const dome = gojoDomain;
            scene.remove(dome.mesh);
            disposeObject3D(dome.mesh);
            scene.remove(dome.stars);
            dome.stars.geometry.dispose();
            dome.starMat.dispose();
            scene.remove(dome.arcs);
            dome.arcs.geometry.dispose();
            dome.arcMat.dispose();
            scene.remove(dome.galaxy);
            dome.galaxy.geometry.dispose();
            dome.galaxyMat.dispose();
            scene.remove(dome.galaxyCore);
            dome.galaxyCoreMat.dispose();
            scene.remove(dome.blackHole);
            disposeObject3D(dome.blackHole);
            if (dome.env) dome.env.visible = true;
            if (arenaDust) arenaDust.visible = dome.prevDustVisible;
            if (dome.prevBg) scene.background = dome.prevBg;
            else {
                const theme = getArenaDef();
                scene.background = new THREE.Color(theme.fog);
            }
            if (dome.prevFog) scene.fog = dome.prevFog;
            else {
                const theme = getArenaDef();
                scene.fog = new THREE.FogExp2(theme.fog, theme.fogD);
            }
            gojoDomain = null;
            const overlay = byId('domain-overlay');
            if (overlay) overlay.classList.remove('active');
        }

        function castGojoDomain() {
            if (!playerEntity) return;
            if (gojoTimers.domain > 0) {
                sfx('deny');
                showFloatText(`DOMAIN RECHARGING — ${Math.ceil(gojoTimers.domain)}s`, '#c9a2ff');
                return;
            }
            if (gojoDomain) return;
            const p = playerEntity.position;
            const inRange = enemyEntities.filter(e => e.position.distanceTo(p) < 80);
            const max = gojoMaxOutput;
            gojoTimers.domain = max ? 60 : 20;
            const center = p.clone().setY(4);

            const env = scene.getObjectByName('arena_env');
            const prevBg = scene.background instanceof THREE.Color ? scene.background.clone() : null;
            const prevFog = scene.fog ? scene.fog.clone() : null;
            const prevDustVisible = arenaDust ? arenaDust.visible : true;
            if (env) env.visible = false;
            if (arenaDust) arenaDust.visible = false;
            scene.background = new THREE.Color(0x010006);
            scene.fog = null;

            const g = new THREE.Group();
            g.position.copy(center);

            const shellMat = new THREE.MeshBasicMaterial({
                color: 0x010006, transparent: true, opacity: 1,
                side: THREE.BackSide, depthWrite: true, fog: false
            });
            g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), shellMat));

            const wire = new THREE.Mesh(
                new THREE.SphereGeometry(0.997, 24, 16),
                new THREE.MeshBasicMaterial({
                    color: 0x6d28d9, wireframe: true, transparent: true, opacity: 0.08,
                    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
                })
            );
            g.add(wire);

            const innerShell = new THREE.Mesh(
                new THREE.SphereGeometry(1.004, 42, 28),
                new THREE.MeshBasicMaterial({
                    color: 0x2b0b4d, transparent: true, opacity: 0.1,
                    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
                })
            );
            g.add(innerShell);

            const rings: THREE.Mesh[] = [];
            for (let i = 0; i < 8; i++) {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(0.52 + Math.random() * 0.44, 0.004 + Math.random() * 0.01, 6, 110),
                    new THREE.MeshBasicMaterial({
                        color: i % 2 === 0 ? 0xc084fc : 0x8b5cf6,
                        transparent: true, opacity: 0.28 + Math.random() * 0.3,
                        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
                    })
                );
                ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                g.add(ring);
                rings.push(ring);
            }

            const streamPositions: number[] = [];
            for (let i = 0; i < 44; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 0.55 + Math.random() * 0.42;
                streamPositions.push(0, 0, 0,
                    Math.sin(phi) * Math.cos(theta) * r,
                    Math.cos(phi) * r,
                    Math.sin(phi) * Math.sin(theta) * r);
            }
            const streamGeo = new THREE.BufferGeometry();
            streamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(streamPositions), 3));
            g.add(new THREE.LineSegments(streamGeo, new THREE.LineBasicMaterial({
                color: 0xa855f7, transparent: true, opacity: 0.2,
                blending: THREE.AdditiveBlending, depthWrite: false
            })));

            for (let i = 0; i < 46; i++) {
                const shard = new THREE.Mesh(
                    new THREE.TetrahedronGeometry(0.01 + Math.random() * 0.022, 0),
                    new THREE.MeshBasicMaterial({
                        color: i % 2 ? 0xd8b4fe : 0x8b5cf6, transparent: true,
                        opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false
                    })
                );
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 0.35 + Math.random() * 0.56;
                shard.position.set(
                    Math.sin(phi) * Math.cos(theta) * r,
                    Math.cos(phi) * r,
                    Math.sin(phi) * Math.sin(theta) * r
                );
                shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                g.add(shard);
            }
            g.scale.setScalar(6);
            scene.add(g);

            const { stars, starMat } = createVoidStarfield(center);
            const { arcs, arcMat } = createVoidArcs(center);
            const { galaxy, galaxyMat, galaxyCore, galaxyCoreMat } = createVoidGalaxy(center);
            const { blackHole, bhDisks, bhMotes, bhMoteMat, cosmosMats } = createVoidBlackHole(center);

            gojoDomain = {
                mesh: g, life: 6.0, shellMat, stars, starMat, arcs, arcMat, rings,
                galaxy, galaxyMat, galaxyCore, galaxyCoreMat, blackHole, bhDisks, bhMotes, bhMoteMat, cosmosMats,
                env: env || null, prevBg, prevFog, prevDustVisible, max
            };

            for (const e of inRange) e.stun = Math.max(e.stun || 0, 5.2);
            const overlay = byId('domain-overlay');
            if (overlay) overlay.classList.add('active');

            for (let i = 0; i < 3; i++) {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(0.7, 1.1, 72),
                    new THREE.MeshBasicMaterial({
                        color: i === 0 ? 0xc084fc : 0x8b5cf6, transparent: true,
                        opacity: 0.9, side: THREE.DoubleSide,
                        blending: THREE.AdditiveBlending, depthWrite: false
                    })
                );
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(p.x, 0.3 + i * 0.5, p.z);
                scene.add(ring);
                particles.push({ mesh: ring, ring: true, vel: new THREE.Vector3(), life: 0.9 + i * 0.15, maxLife: 0.9 + i * 0.15, ringGrow: 75 + i * 30 });
            }

            showFloatText('DOMAIN EXPANSION — UNLIMITED VOID', '#c9a2ff');
            sfx('bigexplode');
            cameraShake = Math.max(cameraShake, 0.9);
            gojoBloom = Math.max(gojoBloom, 1.1);
        }

        function gojoCooldown(base: number): number {
            return base * (gojoMaxOutput ? 3 : 1);
        }

        function playPurpleTheme() {
            try {
                if (!purpleAudio) {
                    purpleAudio = new Audio('assets/songs/purple.mp3');
                    purpleAudio.preload = 'auto';
                    purpleAudio.volume = 0.85;
                }
                purpleAudio.currentTime = 0;
                const request = purpleAudio.play();
                if (request && typeof request.catch === 'function') request.catch(() => { /* gesture-gated */ });
            } catch (err) {
                console.warn('Purple audio unavailable', err);
            }
        }

        function toggleGojoMaxOutput() {
            gojoMaxOutput = !gojoMaxOutput;
            document.body.classList.toggle('max-output', gojoMaxOutput);
            showFloatText(gojoMaxOutput ? 'MAXIMUM OUTPUT — 300% POWER / 300% COOLDOWN' : 'MAXIMUM OUTPUT — DISENGAGED', gojoMaxOutput ? '#ffb700' : '#9fe8ff');
            sfx(gojoMaxOutput ? 'overheat' : 'hit');
        }

        function toggleGojoInfinity() {
            gojoInfinityOn = !gojoInfinityOn;
            showFloatText(gojoInfinityOn ? 'INFINITY — ACTIVE' : 'INFINITY — RELEASED', gojoInfinityOn ? '#9fe8ff' : '#ff8a66');
            sfx('hit');
        }

        function updateGojoAbilityHUD() {
            if (!isGojo()) return;
            const set = (id: string, text: string, cooling: boolean, off = false, firing = false) => {
                const root = byId(`gab-${id}`);
                byId(`gab-${id}-state`).innerText = text;
                root.classList.toggle('cooling', cooling);
                root.classList.toggle('off', off);
                root.classList.toggle('firing', firing);
            };
            set('blue', gojoBlueOrb ? 'ACTIVE' : (gojoTimers.blue > 0 ? `${Math.ceil(gojoTimers.blue)}s` : 'READY'), gojoTimers.blue > 0, false, !!gojoBlueOrb);
            set('red', gojoRedOrb ? 'FLY' : (gojoTimers.red > 0 ? `${Math.ceil(gojoTimers.red)}s` : 'READY'), gojoTimers.red > 0, false, !!gojoRedOrb);
            set('purple', gojoComboPurple ? 'COMBO' : (gojoPurple ? (gojoPurple.state === 'merge' ? 'MERGE' : 'FLY') : (gojoTimers.purple > 0 ? `${Math.ceil(gojoTimers.purple)}s` : 'READY')), gojoTimers.purple > 0, false, !!gojoPurple || !!gojoComboPurple);
            set('limitless', gojoInfinityOn ? 'ON' : 'OFF', false, !gojoInfinityOn);
            set('domain', gojoDomain ? 'VOID' : (gojoTimers.domain > 0 ? `${Math.ceil(gojoTimers.domain)}s` : 'READY'), gojoTimers.domain > 0, false, !!gojoDomain);
            set('max', gojoMaxOutput ? 'ON' : 'OFF', false, !gojoMaxOutput, gojoMaxOutput);
        }

        /** Cooldowns and active technique effects; casts are keybound in the battle input handler. */
        function updateGojoTechniques(delta: number) {
            if (!playerEntity) return;
            const p = playerEntity.position;
            gojoTimers.blue = Math.max(0, gojoTimers.blue - delta);
            gojoTimers.red = Math.max(0, gojoTimers.red - delta);
            gojoTimers.purple = Math.max(0, gojoTimers.purple - delta);
            gojoTimers.domain = Math.max(0, gojoTimers.domain - delta);
            gojoInfinityFx = Math.max(0, gojoInfinityFx - delta);

            updateGojoPurple(delta);
            updateGojoComboPurple(delta);

            if (gojoBlueOrb) {
                const orb = gojoBlueOrb;
                orb.life += delta;
                animateCursedOrb(orb, delta);
                const assets = getBlueOrbAssets();
                const fade = Math.min(1, Math.max(0, (orb.maxLife - orb.life) / 0.45));
                assets.shellMat.uniforms.uFade.value = fade;
                assets.ringMatA.opacity = 0.85 * fade;
                assets.ringMatB.opacity = 0.65 * fade;
                orb.group.scale.setScalar((0.95 + Math.sin(clock.elapsedTime * 6) * 0.04) * (0.82 + 0.18 * fade) * (orb.max ? 3 : 1));
                const pullRadius = orb.max ? 66 : 22;
                const power = orb.max ? 3 : 1;
                for (const e of [...enemyEntities]) {
                    const d = e.position.distanceTo(orb.pos);
                    if (d < pullRadius) {
                        const pull = orb.pos.clone().sub(e.position).setY(0).normalize();
                        e.position.addScaledVector(pull, Math.min(d, 30) * delta * 1.4 * power);
                        applyDamageToEntity(e, 110 * delta * power, e.position.clone().setY(2.2), 'normal', true);
                    }
                }
                if (orb.life >= orb.maxLife) {
                    scene.remove(orb.group);
                    spawnHollowPurpleRing(orb.pos, 0x2e7bff, 30, 0.45, true);
                    gojoBlueOrb = null;
                }
            }

            if (gojoRedOrb) {
                const orb = gojoRedOrb;
                orb.life += delta;
                const prev = orb.pos.clone();
                orb.pos.addScaledVector(orb.dir, 150 * delta);
                animateCursedOrb(orb, delta);

                let hit = false;
                let contact: THREE.Vector3 | null = null;
                const sx = orb.pos.x - prev.x;
                const sy = orb.pos.y - prev.y;
                const sz = orb.pos.z - prev.z;
                const lenSq = sx * sx + sy * sy + sz * sz;
                if (orb.life > 0.04 && lenSq > 0.0001) {
                    let bestT = 2;
                    for (const e of enemyEntities) {
                        const ex = e.position.x - prev.x;
                        const ey = 2.7 * e.scale - prev.y;
                        const ez = e.position.z - prev.z;
                        const t = THREE.MathUtils.clamp((ex * sx + ey * sy + ez * sz) / lenSq, 0, 1);
                        const dx = ex - sx * t, dy = ey - sy * t, dz = ez - sz * t;
                        const rr = e.radius + 1.7 * (orb.max ? 3 : 1);
                        if (dx * dx + dy * dy + dz * dz < rr * rr && t < bestT) {
                            bestT = t;
                            hit = true;
                            contact = prev.clone().addScaledVector(orb.dir, 150 * delta * t);
                        }
                    }
                    if (!hit) {
                        const steps = Math.max(2, Math.min(16, Math.ceil(Math.sqrt(lenSq) / 4)));
                        for (let st = 1; st <= steps && !hit; st++) {
                            const t = st / steps;
                            const px = prev.x + sx * t, py = prev.y + sy * t, pz = prev.z + sz * t;
                            for (const obs of arenaObstacles) {
                                if (Math.abs(px - obs.pos.x) < obs.halfSize + 1.5 && Math.abs(pz - obs.pos.z) < obs.halfSize + 1.5) {
                                    hit = true;
                                    contact = new THREE.Vector3(px, py, pz);
                                    break;
                                }
                            }
                        }
                    }
                    if (!hit && orb.pos.y < 0.9 && prev.y >= 0.9) {
                        const t = (0.9 - prev.y) / (orb.pos.y - prev.y);
                        hit = true;
                        contact = prev.clone().addScaledVector(orb.dir, 150 * delta * t);
                    }
                    if (!hit && orb.pos.y < 0.9) {
                        hit = true;
                        contact = orb.pos.clone();
                    }
                }
                if (contact) {
                    orb.pos.copy(contact);
                }
                orb.group.position.copy(orb.pos);
                if (hit || orb.life >= orb.maxLife) detonateGojoRed();
            }

            if (gojoDomain) {
                const dome = gojoDomain;
                dome.life -= delta;
                const elapsed = 6.0 - dome.life;
                const radius = Math.min(62, 6 + elapsed * 70);
                dome.mesh.scale.setScalar(Math.max(0.01, radius));
                dome.mesh.rotation.y += delta * 0.18;
                dome.rings.forEach((ring, i) => {
                    ring.rotation.x += delta * (0.22 + i * 0.05);
                    ring.rotation.z += delta * (0.16 + i * 0.04);
                });
                dome.stars.rotation.y += delta * 0.07;
                dome.stars.rotation.x += delta * 0.02;
                dome.arcs.rotation.y -= delta * 0.22;
                dome.galaxy.rotation.y += delta * 0.035;
                dome.galaxy.rotation.z += delta * 0.006;
                dome.blackHole.rotation.y += delta * 0.12;
                dome.bhDisks.forEach((disk, i) => {
                    disk.rotation.z += delta * (0.5 + i * 0.18);
                });
                dome.bhMotes.rotation.z += delta * 0.4;
                const fade = Math.min(1, elapsed / 0.55) * Math.min(1, Math.max(0, dome.life) / 0.7);
                dome.starMat.opacity = 0.9 * fade;
                dome.arcMat.opacity = (0.35 + Math.abs(Math.sin(clock.elapsedTime * 24)) * 0.5) * fade;
                dome.galaxyMat.opacity = 0.95 * fade;
                dome.galaxyCoreMat.opacity = 0.30 * fade;
                dome.bhMoteMat.opacity = 0.85 * fade;
                for (const mat of dome.cosmosMats) {
                    const base = (mat.userData.baseOpacity as number | undefined) ?? 1;
                    mat.opacity = base * fade;
                }
                dome.shellMat.opacity = Math.min(1, Math.max(0, dome.life) / 0.45);
                gojoBloom = Math.max(gojoBloom, 0.15 * fade);

                if (elapsed > 0.6) {
                    const c = dome.mesh.position;
                    const limit = radius - 2.5;
                    const clampBody = (obj: { position: THREE.Vector3 }) => {
                        const dx = obj.position.x - c.x;
                        const dz = obj.position.z - c.z;
                        const dist = Math.hypot(dx, dz);
                        if (dist > limit && dist > 0.001) {
                            obj.position.x = c.x + (dx / dist) * limit;
                            obj.position.z = c.z + (dz / dist) * limit;
                        }
                    };
                    if (playerEntity) clampBody(playerEntity);
                    for (const e of enemyEntities) clampBody(e);
                }

                for (const e of [...enemyEntities]) {
                    if (e.position.distanceTo(p) < radius) {
                        applyDamageToEntity(e, 420 * delta * (dome.max ? 3 : 1), e.position.clone().setY(2.2), 'normal', true);
                        e.stun = Math.max(e.stun || 0.35, 0.35);
                    }
                }
                if (dome.life <= 0) {
                    gojoBloom = Math.max(gojoBloom, 0.9);
                    destroyGojoDomain();
                }
            }

            updateGojoAbilityHUD();
        }

        /** 2D slab test: how far a beam can travel before a solid pillar blocks it. */
        function beamObstacleClip(origin: THREE.Vector3, dir: THREE.Vector3, maxLen: number): number {
            let best = maxLen;
            for (const obs of arenaObstacles) {
                const minX = obs.pos.x - obs.halfSize, maxX = obs.pos.x + obs.halfSize;
                const minZ = obs.pos.z - obs.halfSize, maxZ = obs.pos.z + obs.halfSize;
                let tmin = 0, tmax = maxLen;
                if (Math.abs(dir.x) < 1e-5) {
                    if (origin.x < minX || origin.x > maxX) continue;
                } else {
                    let t1 = (minX - origin.x) / dir.x, t2 = (maxX - origin.x) / dir.x;
                    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
                    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
                }
                if (Math.abs(dir.z) < 1e-5) {
                    if (origin.z < minZ || origin.z > maxZ) continue;
                } else {
                    let t1 = (minZ - origin.z) / dir.z, t2 = (maxZ - origin.z) / dir.z;
                    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
                    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
                }
                if (tmin <= tmax && tmin < best) best = Math.max(0, tmin);
            }
            return best;
        }

        function updateHeliosBeam(delta: number) {
            if (!GAME_STATE.inBattle || !playerEntity || isGojo()) { hideHeliosBeam(); return; }
            const profile = getWeaponProfile();
            if (!mouseDown || profile.kind !== 'beam' || playerEntity.overheated) { hideHeliosBeam(); return; }

            const arms = getArmsPart();
            // Beam heat = base rate x reactor cooling investment x arena air temperature.
            // The arctic arena applies its extra -20% through arenaHeatGain().
            const heatPerSecond = (arms?.heatRate || 75) * getBeamHeatMult() * arenaHeatGain();
            playerEntity.heat = Math.min(100, playerEntity.heat + heatPerSecond * delta);
            if (playerEntity.heat >= 100) {
                playerEntity.overheated = true;
                sfx('overheat');
                showFloatText('⚠ HELIOS OVERHEAT — VENTING', '#ff5533');
                hideHeliosBeam();
                return;
            }

            const tips = getBarrelTips();
            let muzzle = tips.length
                ? tips.reduce((acc, t) => acc.add(t), new THREE.Vector3()).multiplyScalar(1 / tips.length)
                : playerEntity.position.clone().add(new THREE.Vector3(0, 3.1, 0));
            const aim = getAimPoint();
            if (firstPersonView) {
                // Start the lance just ahead of the cockpit; otherwise its near end is clipped by the camera.
                const eye = playerEntity.position.clone().setY(4.95);
                muzzle = eye.addScaledVector(aim.clone().sub(eye).normalize(), 1.6);
            }
            const dir = aim.clone().sub(muzzle).normalize();

            let length = profile.range;
            let target: MechEnemy | null = null;
            for (const enemy of enemyEntities) {
                const center = enemy.position.clone().setY(2.6 * enemy.scale);
                const toCenter = center.clone().sub(muzzle);
                const along = toCenter.dot(dir);
                if (along <= 0 || along > length) continue;
                const perp = toCenter.addScaledVector(dir, -along).length();
                if (perp <= enemy.radius + 1.5) { length = along; target = enemy; }
            }
            length = beamObstacleClip(muzzle, dir, length);

            const beam = buildHeliosBeamMesh();
            beam.position.copy(muzzle);
            beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
            const flicker = 0.92 + Math.random() * 0.16;
            // The wide additive glow shell reads as a huge 12-gon when the cockpit camera looks down its axis.
            const beamGlow = beam.getObjectByName('beamGlow');
            if (beamGlow) beamGlow.visible = !firstPersonView;
            beam.children.forEach(child => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                if (mesh.name === 'beamImpact') {
                    mesh.position.set(0, 0, length);
                    const pulse = 1 + Math.sin(clock.elapsedTime * 32) * 0.18;
                    mesh.scale.set(pulse, pulse, pulse);
                } else {
                    const width = firstPersonView ? 0.55 : 1;
                    mesh.scale.set(width, width, length * flicker);
                }
            });

            // Continuous damage ticks.
            heliosBeamTick -= delta;
            const tickDamage = (arms?.damage || 900) * profile.damageMult;
            if (heliosBeamTick <= 0) {
                heliosBeamTick += profile.interval;
                if (target) {
                    const wasShielded = target.shield > 0;
                    applyDamageToEntity(target, tickDamage, target.position.clone().setY(2.6 * target.scale), 'normal', true);
                    if (Math.random() < 0.35) {
                        spawnDamageNumber(Math.ceil(tickDamage), target.position.clone().setY(3.2 * target.scale), wasShielded ? 'shield' : 'normal');
                    }
                } else {
                    spawnExplosionParticles(muzzle.clone().addScaledVector(dir, length), 0x8ef6ff, 2, 6);
                }
            }

            heliosBeamHitFx -= delta;
            if (heliosBeamHitFx <= 0) {
                heliosBeamHitFx = 0.14;
                sfx('beam');
                cameraShake = Math.max(cameraShake, 0.06);
                const impact = muzzle.clone().addScaledVector(dir, length);
                spawnExplosionParticles(impact, target ? 0xfff0c2 : 0x8ef6ff, 3, 7);
            }
        }

        function updateCombatLoop(delta: number) {
            if (!GAME_STATE.inBattle) return;
            GAME_STATE.battleTime = (GAME_STATE.battleTime || 0) + delta;

            /* ---- PLAYER MOVEMENT ---- */
            const move = new THREE.Vector3();
            if (keys['KeyW']) move.z -= 1;
            if (keys['KeyS']) move.z += 1;
            if (keys['KeyA']) move.x -= 1;
            if (keys['KeyD']) move.x += 1;
            if (firstPersonView) move.applyAxisAngle(new THREE.Vector3(0, 1, 0), fpYaw);

            // Arctic ice patches destroy traction: the chassis keeps sliding after input ends.
            let onIce = false;
            for (const ice of arenaIcePatches) {
                if (Math.hypot(playerEntity!.position.x - ice.x, playerEntity!.position.z - ice.z) < ice.r) { onIce = true; break; }
            }
            const desiredVel = move.length() > 0
                ? move.normalize().multiplyScalar(playerEntity!.speed * (onIce ? 1.15 : 1))
                : new THREE.Vector3();
            if (onIce) playerMomentum.lerp(desiredVel, Math.min(1, delta * 3.2));
            else playerMomentum.copy(desiredVel);

            if (playerEntity!.dashTime > 0) {
                playerEntity!.position.addScaledVector(playerEntity!.dashDir, playerEntity!.speed * 4.2 * delta);
                playerEntity!.dashTime -= delta;
                playerMomentum.copy(playerEntity!.dashDir).multiplyScalar(playerEntity!.speed);
            } else if (playerMomentum.lengthSq() > 0.01) {
                playerEntity!.position.addScaledVector(playerMomentum, delta);
            }

            if (playerMomentum.lengthSq() > 1) {
                playerEntity!.walkTimer += delta * 12;
                const leg0 = playerEntity!.mesh.getObjectByName('leg_0');
                const leg1 = playerEntity!.mesh.getObjectByName('leg_1');
                if (leg0 && leg1) {
                    leg0.rotation.x = Math.sin(playerEntity!.walkTimer) * 0.45;
                    leg1.rotation.x = -Math.sin(playerEntity!.walkTimer) * 0.45;
                }
            }

            resolveObstacleCollisions(playerEntity!.position, playerEntity!.radius);
            playerEntity!.mesh.position.copy(playerEntity!.position);

            const targetPoint = getAimPoint();
            playerEntity!.mesh.lookAt(targetPoint.x, playerEntity!.mesh.position.y, targetPoint.z);

            /* ---- HEAT: hysteresis lockout until cooled to 35% ---- */
            if (playerEntity!.overheated) {
                if (playerEntity!.heat <= 35) { playerEntity!.overheated = false; showFloatText('SYSTEMS COOLED', '#00ff66'); }
            }
            // Heat sinks are saturated while the Helios lance fires; ambient cooling only resumes after.
            const beamLancing = !isGojo() && getWeaponProfile().kind === 'beam' && mouseDown && !playerEntity!.overheated;
            if (!beamLancing) {
                let ventBonus = 0;
                for (const vent of arenaCoolVents) {
                    if (Math.hypot(playerEntity!.position.x - vent.x, playerEntity!.position.z - vent.z) < vent.r) { ventBonus = 30; break; }
                }
                playerEntity!.heat = Math.max(0, playerEntity!.heat - (playerEntity!.heatCoolRate * arenaCoolMult() + ventBonus) * delta);
            }

            playerEntity!.energy = Math.min(playerEntity!.maxEnergy, playerEntity!.energy + 14 * delta);
            playerEntity!.dashCooldown = Math.max(0, playerEntity!.dashCooldown - delta);
            playerEntity!.invuln = Math.max(0, playerEntity!.invuln - delta);

            if (playerEntity!.hitFlash > 0) {
                playerEntity!.hitFlash -= delta * 3;
                if (playerEntity!.hitFlash <= 0.01) restoreHitFlash(playerEntity!.mesh);
            }

            if (playerEntity!.shield < playerEntity!.maxShield) {
                const regen = 60 * (TECH_NODES.find(t => t.id === 'tech_2' && t.unlocked) ? 1.3 : 1);
                playerEntity!.shield = Math.min(playerEntity!.maxShield, playerEntity!.shield + regen * delta);
            }

            if (isGojo()) updateGojoTechniques(delta);
            else if (isFrieren()) updateFrierenTechniques(delta);

            /* ---- HOLD-TO-FIRE ---- */
            if (mouseDown) firePlayerWeapon();
            updateHeliosBeam(delta);

            /* ---- CAMERA: third-person chase or first-person cockpit ---- */
            const shakeX = (Math.random() - 0.5) * cameraShake;
            const shakeY = (Math.random() - 0.5) * cameraShake;
            if (firstPersonView) {
                // Eye-level cockpit camera with a subtle locomotion bob; orientation is pointer-lock look.
                const bob = Math.sin(playerEntity!.walkTimer * 1.7) * 0.035 * Math.min(1, playerMomentum.length() / 8);
                camera.position.set(
                    playerEntity!.position.x + shakeX * 0.12,
                    4.95 + bob + shakeY * 0.12,
                    playerEntity!.position.z
                );
                camera.rotation.set(
                    fpPitch + shakeY * 0.004,
                    fpYaw + shakeX * 0.004,
                    0,
                    'YXZ'
                );
            } else {
                camera.position.set(
                    playerEntity!.position.x + shakeX,
                    12 + shakeY,
                    playerEntity!.position.z + 20
                );
                camera.lookAt(playerEntity!.position.x, 2.5, playerEntity!.position.z);
            }
            cameraShake = Math.max(0, cameraShake - delta * 2.2);

            /* ---- ENEMY AI: approach, separation, strafing, burst fire ---- */
            enemyEntities.forEach(enemy => {
                enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - delta * 3);
                if (enemy.hitFlash <= 0.01 && enemy.flashApplied) { restoreHitFlash(enemy.mesh); enemy.flashApplied = false; }
                if (enemy.stun && enemy.stun > 0) {
                    enemy.stun = Math.max(0, enemy.stun - delta);
                    enemy.mesh.position.copy(enemy.position);
                    return;
                }

                const dist = enemy.position.distanceTo(playerEntity!.position);
                const dirToPlayer = playerEntity!.position.clone().sub(enemy.position).normalize();

                // separation steering so mechs don't stack
                const sep = new THREE.Vector3();
                enemyEntities.forEach(other => {
                    if (other === enemy) return;
                    const d = enemy.position.distanceTo(other.position);
                    const minD = enemy.radius + other.radius + 2;
                    if (d < minD && d > 0.001) {
                        sep.addScaledVector(enemy.position.clone().sub(other.position).normalize(), (minD - d) / minD);
                    }
                });

                let velocity = new THREE.Vector3();
                const standRange = enemy.isBoss ? 26 : 20;
                if (dist > standRange) {
                    velocity.addScaledVector(dirToPlayer, enemy.speed);
                } else if (dist < standRange * 0.55) {
                    velocity.addScaledVector(dirToPlayer, -enemy.speed * 0.6);
                } else {
                    const side = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
                    velocity.addScaledVector(side, enemy.speed * 0.55 * enemy.strafeDir);
                }
                velocity.addScaledVector(sep, enemy.speed * 1.6);

                enemy.position.addScaledVector(velocity, delta);
                enemy.walkTimer += delta * (2 + velocity.length() * 0.35);
                const leg0 = enemy.mesh.getObjectByName('leg_0');
                const leg1 = enemy.mesh.getObjectByName('leg_1');
                if (leg0 && leg1) {
                    leg0.rotation.x = Math.sin(enemy.walkTimer) * 0.4;
                    leg1.rotation.x = -Math.sin(enemy.walkTimer) * 0.4;
                }

                resolveObstacleCollisions(enemy.position, enemy.radius);
                enemy.mesh.position.copy(enemy.position);
                enemy.mesh.lookAt(playerEntity!.position.x, enemy.mesh.position.y, playerEntity!.position.z);

                /* ATTACKS */
                enemy.cooldown -= delta;
                if (enemy.isBoss) updateBossLogic(enemy, delta, dist);
                else if (enemy.cooldown <= 0 && dist < 90) {
                    if (enemy.burstCount > 0) {
                        enemy.burstCount--;
                        enemy.cooldown = 0.16;
                        enemyFireAtPlayer(enemy, 1);
                    } else {
                        enemy.burstCount = 2 + Math.floor(Math.random() * 2);
                        enemy.cooldown = 1.4 + Math.random() * 0.6;
                        enemyFireAtPlayer(enemy, 1);
                    }
                }
            });

            /* ---- WINGMAN / PROPS / PICKUPS ---- */
            updateWingman(delta);
            updatePickups(delta);
            updatePickupPads(delta);
            updateBossVisuals(delta);

            /* ---- PROJECTILES (ballistic, arcing mortar shells, piercing rail slugs) ---- */
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                // In the cockpit, hostiles about to hit the canopy would otherwise balloon across the view.
                p.mesh.visible = !(firstPersonView && !p.isPlayer && p.mesh.position.distanceTo(camera.position) < 3.4);
                if (p.gravity) p.dir.y -= p.gravity * delta;
                const prevProjectilePos = p.mesh.position.clone();
                p.mesh.position.addScaledVector(p.dir, p.speed * delta);
                if (p.dir.lengthSq() > 0.0001) p.mesh.lookAt(p.mesh.position.clone().add(p.dir));
                p.life -= delta;

                let hit = false;
                let splashed = false;
                const px = p.mesh.position.x, pz = p.mesh.position.z;

                // Lobbed shells detonate on the deck.
                if (p.gravity && p.mesh.position.y <= 0.35) hit = true;

                if (!hit) {
                    for (const obs of arenaObstacles) {
                        if (Math.abs(px - obs.pos.x) <= obs.halfSize + 0.2 && Math.abs(pz - obs.pos.z) <= obs.halfSize + 0.2) {
                            hit = true;
                            break;
                        }
                    }
                }

                if (!hit) {
                    // destructibles (both sides' shots break props)
                    for (const d of destructibles) {
                        if (p.mesh.position.distanceTo(d.pos) < d.radius + 0.6) {
                            damageDestructible(d, p.damage, p.mesh.position.clone());
                            hit = true;
                            break;
                        }
                    }
                }

                if (!hit && p.isPlayer) {
                    for (const enemy of enemyEntities) {
                        if (p.hitTargets?.has(enemy)) continue;
                        if (p.mesh.position.distanceTo(enemy.position) < enemy.radius + 0.9) {
                            applyDamageToEntity(enemy, p.damage, p.mesh.position.clone(), 'normal', true);
                            if (p.splashRadius) {
                                applySplashDamage(p.mesh.position.clone(), p.splashRadius, p.splashDamage || p.damage * 0.5, enemy);
                                splashed = true;
                            }
                            if (p.pierceLeft && p.pierceLeft > 0) {
                                p.pierceLeft--;
                                if (!p.hitTargets) p.hitTargets = new Set<MechEnemy>();
                                p.hitTargets.add(enemy);
                            } else {
                                hit = true;
                            }
                            break;
                        }
                    }
                }

                if (!hit && !p.isPlayer) {
                    if (isFrieren() && frierenBlocksProjectile(prevProjectilePos, p.mesh.position)) {
                        hit = true;
                    }
                    if (!hit && p.mesh.position.distanceTo(playerEntity!.position) < playerEntity!.radius + 0.9) {
                        damagePlayer(p.damage, p.mesh.position.clone());
                        hit = true;
                    }
                    if (!hit && wingmanDrone && p.mesh.position.distanceTo(wingmanDrone!.position) < 1.6) {
                        damageWingman(p.damage * 0.5);
                        spawnExplosionParticles(p.mesh.position, 0x00f0ff, 8, 10);
                        hit = true;
                    }
                }

                if (hit) {
                    if (p.splashRadius) {
                        if (!splashed) applySplashDamage(p.mesh.position.clone(), p.splashRadius, p.splashDamage || p.damage * 0.5);
                        spawnExplosionParticles(p.mesh.position.clone(), 0xffa24d, 22, 20);
                        sfx('explode');
                        cameraShake = Math.max(cameraShake, 0.35);
                    } else {
                        spawnExplosionParticles(p.mesh.position, p.isPlayer ? 0xffcc88 : 0xff5500, 6, 9);
                        sfx('hit');
                    }
                }

                if (hit || p.life <= 0) {
                    scene.remove(p.mesh);
                    projectiles.splice(i, 1);
                }
            }

            /* ---- LAVA HAZARD ---- */
            if (arenaLavaPools.length && playerEntity) {
                for (const pool of arenaLavaPools) {
                    if (Math.hypot(playerEntity!.position.x - pool.x, playerEntity!.position.z - pool.z) < pool.r) {
                        if (!playerEntity!._lavaTick || (GAME_STATE.battleTime || 0) - playerEntity!._lavaTick > 0.5) {
                            playerEntity!._lavaTick = GAME_STATE.battleTime || 0;
                            damagePlayer(90, playerEntity!.position.clone().setY(2));
                        }
                    }
                }
            }

            /* ---- KILLS / WAVES / END ---- */
            for (let i = enemyEntities.length - 1; i >= 0; i--) {
                const e = enemyEntities[i];
                if (e.hp <= 0) {
                    spawnExplosionParticles(e.position.clone().setY(2.5), 0xff7700, 30, 24);
                    sfx(e.isBoss ? 'bigexplode' : 'explode');
                    cameraShake = Math.max(cameraShake, e.isBoss ? 1.0 : 0.4);
                    scene.remove(e.mesh);
                    enemyEntities.splice(i, 1);
                    GAME_STATE.survivalKills = (GAME_STATE.survivalKills || 0) + 1;
                    GAME_STATE.survivalEarnings += e.isBoss ? 0 : (GAME_STATE.selectedMode === 'survival' ? 380 : 0);
                    if (e.isBoss) onBossDefeated(e);
                }
            }

            if (playerEntity!.hp <= 0) {
                endBattle(false);
            } else if (GAME_STATE.selectedMode === 'survival' && enemyEntities.length === 0 && !GAME_STATE.waveTransition) {
                GAME_STATE.waveTransition = true;
                GAME_STATE.survivalWave++;
                const bonus = 150 + GAME_STATE.survivalWave * 60;
                GAME_STATE.credits += bonus;
                GAME_STATE.rp += 25;
                if ((GAME_STATE.survivalWave - 1) % 3 === 0) {
                    GAME_STATE.tokens++;
                    showFloatText('+1 BOSS TOKEN EARNED', '#ffb700');
                }
                updateCurrencyUI();
                showFloatText(`WAVE CLEARED +${bonus} CR`, '#00ff66');
                spawnPickup(playerEntity!.position.clone().add(new THREE.Vector3(6, 1.2, 0)));
                setTimeout(() => {
                    GAME_STATE.waveTransition = false;
                    if (GAME_STATE.inBattle) spawnEnemyWave(GAME_STATE.survivalWave);
                }, 1600);
            } else if (GAME_STATE.selectedMode !== 'survival' && enemyEntities.length === 0) {
                endBattle(true);
            }

            updateBattleHUD();
        }

        function applyDamageToEntity(entity: MechEntity | MechEnemy, damage: number, hitPos: THREE.Vector3, kind: string, quiet = false) {
            let remaining = damage;
            const crit = entity.shield <= 0 && Math.random() < 0.12;
            if (crit) remaining *= 1.6;

            if (entity.shield > 0) {
                const absorbed = Math.min(entity.shield, remaining);
                entity.shield -= absorbed;
                remaining -= absorbed;
                if (hitPos) spawnDamageNumber(Math.ceil(absorbed), hitPos, 'shield');
            }
            if (remaining > 0) {
                entity.hp = Math.max(0, entity.hp - remaining);
                if (hitPos) spawnDamageNumber(Math.ceil(remaining), hitPos, crit ? 'crit' : 'normal');
            }

            spawnExplosionParticles(hitPos, crit ? 0xffb700 : 0xff5500, crit ? 12 : 7, 12);
            entity.hitFlash = 1;
            entity.flashApplied = true;
            applyHitFlash(entity.mesh, 1);
            if (!quiet) sfx('hit');
        }

        /** Area damage used by plasma bursts and mortar shells. */
        function applySplashDamage(center: THREE.Vector3, radius: number, damage: number, exclude?: MechEnemy) {
            for (const enemy of enemyEntities) {
                if (enemy === exclude) continue;
                if (center.distanceTo(enemy.position) <= radius + enemy.radius) {
                    applyDamageToEntity(enemy, damage, enemy.position.clone().setY(2.4), 'normal', true);
                }
            }
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.6, 1.2, 28),
                new THREE.MeshBasicMaterial({ color: 0xffa24d, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(center.x, 0.25, center.z);
            scene.add(ring);
            particles.push({ mesh: ring, ring: true, vel: new THREE.Vector3(), life: 0.4, maxLife: 0.4, ringGrow: radius * 2.2 });
        }

        function spawnExplosionParticles(pos: THREE.Vector3, colorHex: number, count = 16, power = 18) {
            for (let i = 0; i < count; i++) {
                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16 + Math.random() * 0.22, 6, 6),
                    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true })
                );
                particle.position.copy(pos);
                scene.add(particle);
                particles.push({
                    mesh: particle,
                    vel: new THREE.Vector3((Math.random() - 0.5) * power, Math.random() * power * 0.8, (Math.random() - 0.5) * power),
                    life: 0.45 + Math.random() * 0.35, maxLife: 0.8,
                    fade: true, gravity: 30, scaleRate: -1.2
                });
            }
            const flash = new THREE.Mesh(
                new THREE.SphereGeometry(0.9, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
            );
            flash.position.copy(pos);
            scene.add(flash);
            particles.push({ mesh: flash, vel: new THREE.Vector3(), life: 0.12, maxLife: 0.12, scaleRate: 14, fade: true });
        }

        function spawnDamageNumber(val: string | number, pos: THREE.Vector3, kind: string) {
            const el = document.createElement('div');
            el.className = 'dmg-text';
            if (kind === 'shield') {
                el.style.color = '#00d5ff';
                el.innerText = `-${val}`;
            } else if (kind === 'crit') {
                el.style.color = '#ffb700';
                el.style.fontSize = '34px';
                el.innerText = `${val}!`;
            } else {
                el.innerText = `-${val}`;
            }
            document.body.appendChild(el);
            const screenPos = pos.clone().project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            setTimeout(() => el.remove(), 750);
        }

        function updateBattleHUD() {
            if (!playerEntity) return;

            const hpPct = (playerEntity!.hp / playerEntity!.maxHp) * 100;
            const shieldPct = playerEntity!.maxShield > 0 ? (playerEntity!.shield / playerEntity!.maxShield) * 100 : 0;

            byId('hud-hp-fill').style.width = `${Math.max(0, hpPct)}%`;
            byId('hud-hp-val').innerText = `${Math.ceil(playerEntity!.hp)} / ${playerEntity!.maxHp}`;

            byId('hud-shield-fill').style.width = `${Math.max(0, shieldPct)}%`;
            byId('hud-shield-val').innerText = `${Math.ceil(playerEntity!.shield)} / ${playerEntity!.maxShield}`;

            const beamActive = getWeaponProfile().kind === 'beam';
            byId('hud-heat-fill').style.width = `${playerEntity!.heat}%`;
            byId('hud-heat-val').innerText = isGojo()
                ? (gojoInfinityOn ? '∞ INFINITY' : '∞ RELEASED')
                : (isFrieren()
                    ? '∞ ARCANE CORE'
                    : `${Math.ceil(playerEntity!.heat)}%${playerEntity!.overheated ? ' ⚠ VENTING' : (beamActive ? ` ⚡ HELIOS x${getBeamHeatMult().toFixed(2)}` : '')}`);

            const energyPct = playerEntity!.maxEnergy > 0 ? (playerEntity!.energy / playerEntity!.maxEnergy) * 100 : 0;
            byId('hud-energy-fill').style.width = `${Math.max(0, energyPct)}%`;
            byId('hud-energy-val').innerText = `${Math.ceil(energyPct)}%`;

            if (enemyEntities.length > 0) {
                const target = enemyEntities[0];
                byId('hud-target-hp-fill').style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
                byId('hud-target-hp-val').innerText = `${Math.ceil((target.hp / target.maxHp) * 100)}%`;

                const tShPct = target.maxShield > 0 ? (target.shield / target.maxShield) * 100 : 0;
                byId('hud-target-shield-fill').style.width = `${Math.max(0, tShPct)}%`;
                byId('hud-target-shield-val').innerText = `${Math.ceil(tShPct)}%`;
            }

            if (firstPersonView) updateFPHUD();
        }

        /** SPARK cockpit overlay: heading, telemetry, weapon state and a projected target lock. */
        function updateFPHUD() {
            if (!playerEntity) return;
            const heading = ((-fpYaw * 180 / Math.PI) % 360 + 360) % 360;
            byId('fp-heading').innerText = `${Math.round(heading).toString().padStart(3, '0')}\u00b0`;
            byId('fp-dial').style.transform = `rotate(${-heading}deg)`;

            const setBar = (id: string, frac: number) => {
                const clamped = Math.max(0, Math.min(1, frac));
                byId(`${id}-fill`).style.width = `${clamped * 100}%`;
                byId(`${id}-val`).innerText = `${Math.ceil(clamped * 100)}%`;
            };
            setBar('fp-hull', playerEntity.hp / playerEntity.maxHp);
            setBar('fp-shield', playerEntity.maxShield > 0 ? playerEntity.shield / playerEntity.maxShield : 0);
            setBar('fp-heat', playerEntity.heat / 100);
            setBar('fp-core', playerEntity.maxEnergy > 0 ? playerEntity.energy / playerEntity.maxEnergy : 0);
            byId('fp-speed').innerText = `${Math.round(playerMomentum.length() * 2.2)} KPH`;

            const profile = getWeaponProfile();
            if (isGojo()) {
                byId('fp-weapon').innerText = 'LIMITLESS';
                byId('fp-weapon-state').innerText = gojoInfinityOn ? 'INFINITY' : 'INFINITY OFF';
            } else if (isFrieren()) {
                byId('fp-weapon').innerText = 'ZOLTRAAK';
                byId('fp-weapon-state').innerText = frierenTimers.zoltraak > 0 ? `RECHARGE ${Math.ceil(frierenTimers.zoltraak)}s` : 'WHITE BEAM READY';
            } else {
                byId('fp-weapon').innerText = profile.label;
                byId('fp-weapon-state').innerText = playerEntity.overheated
                    ? 'THERMAL VENT'
                    : (profile.kind === 'beam' ? `BEAM x${getBeamHeatMult().toFixed(2)}` : 'READY');
            }

            const statusEl = byId('fp-status-line');
            const hpFrac = playerEntity.hp / playerEntity.maxHp;
            const shFrac = playerEntity.maxShield > 0 ? playerEntity.shield / playerEntity.maxShield : 1;
            let statusText = 'ALL SYSTEMS NOMINAL';
            let statusWarn = false;
            if (hpFrac < 0.3) { statusText = 'HULL CRITICAL — EVASIVE ACTION'; statusWarn = true; }
            else if (playerEntity.overheated) { statusText = 'THERMAL SATURATION — VENTING'; statusWarn = true; }
            else if (shFrac < 0.25) { statusText = 'SHIELD MATRIX UNSTABLE'; statusWarn = true; }
            statusEl.innerText = statusText;
            statusEl.classList.toggle('warn', statusWarn);

            const waveEl = byId('fp-wave');
            if (GAME_STATE.selectedMode === 'survival') {
                waveEl.style.display = 'block';
                waveEl.innerText = `WAVE ${GAME_STATE.survivalWave.toString().padStart(2, '0')}`;
            } else {
                waveEl.style.display = 'none';
            }

            const box = byId('fp-target');
            const target = enemyEntities[0];
            if (target) {
                const aim = target.position.clone().setY(2.6 * target.scale);
                const dist = aim.distanceTo(playerEntity.position);
                const p = aim.project(camera);
                const onScreen = p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95 && dist < 170;
                if (onScreen) {
                    const size = THREE.MathUtils.clamp(1400 / Math.max(8, dist), 44, 190);
                    box.style.display = 'block';
                    box.style.width = `${size}px`;
                    box.style.height = `${size}px`;
                    box.style.left = `${(p.x * 0.5 + 0.5) * 100}%`;
                    box.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`;
                    const labelEl = byId('fp-target-label');
                    labelEl.innerText = `LOCK // ${Math.round(dist)}m`;
                    // Keep the readout on-screen when the lock box is near either edge.
                    labelEl.style.left = '50%';
                    labelEl.style.right = 'auto';
                    labelEl.style.transform = 'translateX(-50%)';
                    if (p.x > 0.55) {
                        labelEl.style.left = 'auto';
                        labelEl.style.right = '0';
                        labelEl.style.transform = 'none';
                    } else if (p.x < -0.55) {
                        labelEl.style.left = '0';
                        labelEl.style.right = 'auto';
                        labelEl.style.transform = 'none';
                    }
                } else {
                    box.style.display = 'none';
                }
            } else {
                box.style.display = 'none';
            }
        }

        function endBattle(victory: boolean) {
            if (!GAME_STATE.inBattle) return;
            GAME_STATE.inBattle = false;
            stopMusic();
            stopBossTheme();
            mouseDown = false;
            setFirstPerson(false, true);
            hideHeliosBeam();
            clearGojoEffects();
            clearFrierenEffects();
            byId('hud-layer').style.display = 'none';

            const modal = byId('modal-post-battle');
            const title = byId('result-title-text');
            const subtitle = byId('result-subtitle-text');

            let creditBonus = 0, rpBonus = 0;
            if (victory) {
                title.innerText = 'VICTORY ACHIEVED';
                title.className = 'modal-title victory';
                sfx('victory');
                if (GAME_STATE.selectedMode === 'boss') {
                    creditBonus = 5000; rpBonus = 400;
                    subtitle.innerText = 'Titan Siege Platform destroyed. The Maw remembers.';
                } else {
                    creditBonus = 1200; rpBonus = 150;
                    subtitle.innerText = 'Hostile targets eliminated successfully.';
                }
            } else {
                title.className = 'modal-title defeat';
                sfx('defeat');
                if (GAME_STATE.selectedMode === 'survival') {
                    title.innerText = 'SURVIVAL OVER';
                    creditBonus = GAME_STATE.survivalEarnings + 200;
                    rpBonus = GAME_STATE.survivalWave * 40;
                    subtitle.innerText = `Reached Wave ${GAME_STATE.survivalWave} — ${GAME_STATE.survivalKills} kills. Best: Wave ${Math.max(GAME_STATE.bestWave || 0, GAME_STATE.survivalWave)}`;
                    GAME_STATE.bestWave = Math.max(GAME_STATE.bestWave || 0, GAME_STATE.survivalWave);
                } else {
                    title.innerText = 'CRITICAL FAILURE';
                    creditBonus = 200; rpBonus = 40;
                    subtitle.innerText = 'Chassis destroyed in active combat. Salvage recovered.';
                }
            }

            GAME_STATE.credits += creditBonus;
            GAME_STATE.rp += rpBonus;
            byId('rew-credits').innerText = `+${creditBonus.toLocaleString()} CR`;
            byId('rew-rp').innerText = `+${rpBonus} RP`;
            byId('rew-kills').innerText = `${GAME_STATE.survivalKills || 0}`;
            byId('rew-tokens').innerText = `${GAME_STATE.tokens} TK`;

            updateCurrencyUI();
            saveGame();
            modal.classList.add('active');
        }

        function closePostBattleModal() {
            byId('modal-post-battle').classList.remove('active');
            byId('main-nav').style.display = 'flex';

            projectiles.forEach(p => scene.remove(p.mesh)); projectiles = [];
            particles.forEach(p => scene.remove(p.mesh)); particles = [];
            pickups.forEach(p => scene.remove(p.mesh)); pickups = [];
            destructibles.forEach(d => scene.remove(d.mesh)); destructibles = [];
            hideHeliosBeam();
            clearGojoEffects();
            clearFrierenEffects();
            setFirstPerson(false, true);
            playerMomentum.set(0, 0, 0);
            pickupPads = [];
            arenaLavaPools = [];
            if (wingmanDrone && wingmanDrone!.mesh) scene.remove(wingmanDrone!.mesh);
            wingmanDrone = null;
            if (playerEntity) { scene.remove(playerEntity!.mesh); playerEntity = null; }
            enemyEntities.forEach(e => scene.remove(e.mesh));
            enemyEntities = [];

            scene.background = new THREE.Color(0x05070a);
            scene.fog = new THREE.FogExp2(0x05070a, 0.008);
            scene.children.filter(o => (o as THREE.HemisphereLight).isHemisphereLight).forEach(o => scene.remove(o));
            scene.children.filter(c => c.name === 'arena_env').forEach(c => scene.remove(c));
            // remove any leftover arena meshes
            for (let i = scene.children.length - 1; i >= 0; i--) {
                const c = scene.children[i];
                if (c.userData.isArena && !(c as THREE.Light).isLight) { scene.remove(c); }
            }
            scene.traverse(o => { const dl = o as THREE.DirectionalLight; if (dl.isDirectionalLight && dl.userData.isMain) { dl.color.setHex(0xfff2e6); dl.intensity = 1.6; } });

            setupGarageEnvironment();
            updateGarageMechDisplay();
            switchTab('garage');
        }

        function abortMission() { endBattle(false); }

        /* UI MANAGEMENT */

        function animate() {
            requestAnimationFrame(animate);
            const delta = Math.min(0.05, clock.getDelta());

            if (!GAME_STATE.inBattle && garageMechMesh) {
                garageMechMesh.rotation.y += 0.35 * delta;
            }

            // Ambience (visual only)
            if (!GAME_STATE.inBattle) {
                if (garageHoloRing) garageHoloRing.rotation.y += 0.6 * delta;
                if (garageScanRing) {
                    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.015;
                    garageScanRing.scale.set(pulse, pulse, 1);
                    const scanMat = garageScanRing.material as THREE.MeshBasicMaterial;
                    scanMat.opacity = 0.28 + Math.sin(clock.elapsedTime * 2.2) * 0.1;
                }
            }
            if (GAME_STATE.inBattle && arenaDust) {
                arenaDust.rotation.y += delta * 0.02;
                if (arenaDust.userData.snow) {
                    arenaDust.position.y -= delta * 2.4;
                    if (arenaDust.position.y < -12) arenaDust.position.y = 0;
                }
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const pt = particles[i];
                if (pt.ring && pt.ringGrow) {
                    const g = pt.ringGrow * delta;
                    pt.mesh.scale.x += g; pt.mesh.scale.y += g; pt.mesh.scale.z += g;
                } else {
                    pt.mesh.position.addScaledVector(pt.vel!, delta);
                    if (pt.gravity) pt.vel!.y -= pt.gravity * delta;
                }
                if (pt.scaleRate) {
                    const s = Math.max(0.01, pt.mesh.scale.x + pt.scaleRate * delta);
                    pt.mesh.scale.set(s, s, s);
                }
                if (pt.fade && pt.maxLife) {
                    const frac = Math.max(0, pt.life / pt.maxLife);
                    const fadeMat = pt.mesh as THREE.Mesh; if (fadeMat.material) (fadeMat.material as THREE.MeshBasicMaterial).opacity = frac;
                }
                // Effects that detonate on the player would engulf the cockpit camera.
                pt.mesh.visible = !(firstPersonView && pt.mesh.position.distanceTo(camera.position) < 5.5);
                pt.life -= delta;
                if (pt.life <= 0) {
                    scene.remove(pt.mesh);
                    particles.splice(i, 1);
                }
            }

            if (GAME_STATE.inBattle) {
                updateCombatLoop(delta);
            }

            if (bloomPass) {
                const bloomTarget = 0.55 + gojoBloom;
                bloomPass.strength += (bloomTarget - bloomPass.strength) * Math.min(1, delta * 10);
            }
            gojoBloom = Math.max(0, gojoBloom - delta * 1.8);

            if (composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }

        window.onload = () => {
            const hadSave = loadGame();
            initGraphicsEngine();
            applyPilotNameUI();
            selectPartCategory('head');
            setupColorPickers();
            renderTechTree();
            refreshStatsUI();
            applyAISettingsToUI();
            updateCurrencyUI();
            updateWingmanStatusUI();
            if (hadSave) showFloatText('PILOT PROFILE RESTORED', '#00f0ff');
            window.addEventListener('pointerdown', audioUnlock, { once: true });
            window.addEventListener('keydown', audioUnlock, { once: true });
            const pilotInput = byId<HTMLInputElement>('pilot-name');
            pilotInput.addEventListener('change', applyPilotName);
            pilotInput.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter') { e.preventDefault(); pilotInput.blur(); }
            });
        };

// Expose menu actions for inline HTML onclick handlers (mech2.html)
Object.assign(globalThis, {
  switchTab, selectPartCategory, setArena, setGameMode,
  startCombatDeployment, abortMission, closePostBattleModal,
  audioUnlock, toggleMute, updateAISettings
});
