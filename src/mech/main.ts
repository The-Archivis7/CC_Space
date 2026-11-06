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
interface WeaponProjectile { mesh: THREE.Object3D; dir: THREE.Vector3; speed: number; isPlayer: boolean; damage: number; life: number; pierce: boolean; trailColor?: number; color?: number; }
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
  walkTimer: number; hitFlash: number; flashApplied?: boolean;
}
interface ProjectileOpts { pos: THREE.Vector3; dir: THREE.Vector3; speed?: number; isPlayer: boolean; damage: number; life?: number; color?: number; size?: number; pierce?: boolean; trail?: boolean; }
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
  credits: number; rp: number; tokens: number;
  equipped: Record<string, string>;
  paint: { primary: number; secondary: number; emissive: number };
  aiConfig: { preset: string; range: number; retreat: number };
  unlockedParts: Record<string, string[]>;
  tech: { id: string; unlocked: boolean }[];
  bossTokensSpent: number; bestWave: number;
}
interface GameState {
  credits: number; rp: number; tokens: number;
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
        let wingmanDrone: WingmanDrone | null = null, mouseDown = false;
        /* =========================================================================
           PERSISTENCE (localStorage save)
           ========================================================================= */
        const SAVE_KEY = 'ironmaw_forge_save_v1';

        function saveGame() {
            try {
                const data: MechSaveData = {
                    credits: GAME_STATE.credits, rp: GAME_STATE.rp, tokens: GAME_STATE.tokens,
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
                const data = JSON.parse(raw) as MechSaveData & { unlockedParts?: Record<string,string[]>; equipped?: Record<string,string>; paint?: { primary: number; secondary: number; emissive: number }; aiConfig?: { preset: string; range: number; retreat: number }; tech?: { id: string; unlocked: boolean }[]; credits?: number; rp?: number; tokens?: number; bossTokensSpent?: number; bestWave?: number };
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

        function toggleMute() {
            AudioSys.muted = !AudioSys.muted;
            if (AudioSys.master) AudioSys.master.gain.value = AudioSys.muted ? 0 : 0.55;
            const btn = byId('btn-audio');
            if (btn) btn.innerText = AudioSys.muted ? '🔇 MUTED' : '🔊 SOUND';
        }

        /* =========================================================================
           HIGH-DETAIL PROCEDURAL TEXTURES & BUMP MAPS
           ========================================================================= */

        function tryBoostDash() {
            if (!playerEntity || playerEntity!.dashCooldown > 0 || playerEntity!.energy < 25) { if (playerEntity && playerEntity!.energy < 25) sfx('deny'); return; }
            let dir = new THREE.Vector3();
            if (keys['KeyW']) dir.z -= 1;
            if (keys['KeyS']) dir.z += 1;
            if (keys['KeyA']) dir.x -= 1;
            if (keys['KeyD']) dir.x += 1;
            if (dir.length() === 0) { const fwd = new THREE.Vector3(); playerEntity!.mesh.getWorldDirection(fwd); fwd.y = 0; dir = fwd.normalize(); }
            playerEntity!.energy -= 25;
            playerEntity!.dashCooldown = 1.6;
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
                { id: "combat_head", name: "Iron Command Visor", hp: 450, shield: 250, speed: 0, cost: 1200, unlocked: false, desc: "Heavy military visor with sloped composite faceplate." },
                { id: "siege_head", name: "Siege Dread Helmet", hp: 800, shield: 450, speed: -6, cost: 3500, unlocked: false, desc: "Reinforced armored crown designed for brutal frontline pressure." },
                { id: "tactical_head", name: "Falcon Drone Node", hp: 300, shield: 150, speed: 8, cost: 2000, unlocked: false, desc: "Sensor barrette tuned for drone relay targeting with a wide sweep arc." },
                { id: "guardian_head", name: "Aegis Bastion Helm", hp: 640, shield: 360, speed: -3, cost: 4500, unlocked: false, desc: "Fortified pillar helm shielding the entire cockpit ring." }            ],
            torso: [
                { id: "light_torso", name: "Striker Lightweight Frame", hp: 1400, shield: 500, energy: 120, speed: 18, cost: 0, unlocked: true, desc: "Agile chassis equipped with streamlined thruster wings." },
                { id: "heavy_torso", name: "Iron Maw Heavy Torso", hp: 2600, shield: 1000, energy: 160, speed: 0, cost: 2500, unlocked: false, desc: "Massive industrial frame featuring dual chest reactor intakes." },
                { id: "assault_torso", name: "Omega Citadel Torso", hp: 4200, shield: 1600, energy: 220, speed: -12, cost: 6000, unlocked: false, desc: "Impenetrable siege chassis with dynamic chest plating." },
                { id: "phantom_torso", name: "Shade Phantom Frame", hp: 1750, shield: 720, energy: 150, speed: 14, cost: 3200, unlocked: false, desc: "Featherweight stealth frame tuned for hit-and-run skirmishing." },
                { id: "vanguard_torso", name: "Vanguard Bulwark Torso", hp: 3400, shield: 1350, energy: 190, speed: -6, cost: 4800, unlocked: false, desc: "Field-command bulk bristling with relay antennae." }            ],
            arms: [
                { id: "cannon_arms", name: "Heavy Rotary Autocannons", damage: 320, heatRate: 15, range: 70, cost: 0, unlocked: true, desc: "Dual twin-barrel ballistic rotary cannons with high fire rate." },
                { id: "plasma_arms", name: "Twin Plasma Emitters", damage: 520, heatRate: 26, range: 85, cost: 2800, unlocked: false, desc: "Superheated plasma chargers that melt shields instantly." },
                { id: "railgun_arms", name: "Linear Magnetic Railguns", damage: 850, heatRate: 42, range: 140, cost: 5500, unlocked: false, desc: "Extreme long-range kinetic accelerators that pierce armor." },
                { id: "grenade_arms", name: "Arc Mortar Pods", damage: 640, heatRate: 34, range: 95, cost: 4200, unlocked: false, desc: "Anvil-breech mortars that lob heavy shrapnel shells from cover." },
                { id: "beamer_arms", name: "Helios Beam Cannons", damage: 700, heatRate: 30, range: 110, cost: 5200, unlocked: false, desc: "Prismatic lens emitters delivering intense raw focused heat." }            ],
            legs: [
                { id: "walker_legs", name: "Bipedal Piston Hydraulics", hp: 500, speed: 55, cost: 0, unlocked: true, desc: "Articulated mechanical bipedal legs with knee shock absorbers." },
                { id: "treads_legs", name: "Armored Twin Treads", hp: 1200, speed: 38, cost: 2000, unlocked: false, desc: "Heavy tank track modules providing maximum stability." },
                { id: "hover_legs", name: "Anti-Grav Thruster Ring", hp: 400, speed: 85, cost: 4800, unlocked: false, desc: "High-tech hover propulsion ring for rapid directional strafing." },
                { id: "spider_legs", name: "Chitin Spider Struts", hp: 700, speed: 72, cost: 3800, unlocked: false, desc: "Four-legged all-terrain rig that climbs broken cover quickly." },
                { id: "bulwark_legs", name: "Anchor Stabilizer Pistons", hp: 1600, speed: 30, cost: 2600, unlocked: false, desc: "Reinforced piston legs braced for static shock-absorber stands." }            ],
            core: [
                { id: "standard_core", name: "Fission Power Core", energy: 100, heatCool: 40, cost: 0, unlocked: true, desc: "Standard reactor core with reliable heat sink venting." },
                { id: "high_output_core", name: "Overcharged Fusion Core", energy: 160, heatCool: 60, cost: 1800, unlocked: false, desc: "Boosted power generation for energy weapon loadouts." },
                { id: "overclocked_core", name: "Singularity Reactor Core", energy: 240, heatCool: 85, cost: 4200, unlocked: false, desc: "Experimental reactor providing extreme power and cryo cooling." },
                { id: "twin_core", name: "Twin Plasma Cores", energy: 300, heatCool: 70, cost: 5800, unlocked: false, desc: "Paired micro-furnaces that trade heavy power into cell heat." },
                { id: "quantum_core", name: "Quantum Flux Reactor", energy: 280, heatCool: 110, cost: 7200, unlocked: false, desc: "Collapse-field reactor with exceptional cooling." }            ],
            armor: [
                { id: "light_armor", name: "Standard Composite Plating", hpBonus: 0, speedBonus: 5, cost: 0, unlocked: true, desc: "Baseline factory armor alloy." },
                { id: "heavy_armor", name: "Sloped Titanium Plating", hpBonus: 1000, speedBonus: -8, cost: 1500, unlocked: false, desc: "Dense sloped armor plates built to deflect kinetic rounds." },
                { id: "reactive_armor", name: "Reactive Nanite Armor", hpBonus: 2000, speedBonus: -16, cost: 3800, unlocked: false, desc: "Smart armor that dissipates explosions upon impact." },
                { id: "ablative_armor", name: "Ablative Ceramic Matrix", hpBonus: 1400, speedBonus: -6, cost: 2800, unlocked: false, desc: "Layered sacrificial ceramics that slough off incoming fire." },
                { id: "energy_armor", name: "Refraction Energy Weave", hpBonus: 800, speedBonus: 10, cost: 6500, unlocked: false, desc: "Light-bending hull weave that shifts its silhouette in combat." }            ]
        };

        const TECH_NODES: TechNode[] = [
            { id: "tech_1", name: "Cryo Injectors", category: "Cooling", cost: 150, unlocked: false, desc: "+25% faster heat sink recovery rate." },
            { id: "tech_2", name: "Overcharged Capacitors", category: "Shields", cost: 250, unlocked: false, desc: "+30% faster shield regeneration rate." },
            { id: "tech_3", name: "High-Velocity Acceleration", category: "Weapons", cost: 400, unlocked: false, desc: "+20% projectile speed and kinetic damage." }
        ];

        const COLOR_PALETTES = {
            primary: [0x282e3a, 0x5a1e1e, 0x1d3e2e, 0x4e3e1e, 0x0f172a, 0x475569],
            secondary: [0xff5500, 0x00f0ff, 0xffb700, 0xe2e8f0, 0xff2244, 0x00ff66],
            emissive: [0x00f0ff, 0xff2244, 0x00ff66, 0xffaa00, 0xa855f7]
        };

        let GAME_STATE: GameState = {
            credits: 2000,
            rp: 100,
            tokens: 0,
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
            composer.addPass(new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.55, 0.4, 0.82
            ));
            fxaaPass = new ShaderPass(FXAAShader);
            composer.addPass(fxaaPass);
            composer.setSize(window.innerWidth, window.innerHeight);
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
            }

            if (torsoGroup.children.length === 0) {
                // fallback mid-weight hull: covers phantom/vanguard and any extra ids
                torsoWidth = equipped.torso === "phantom_torso" ? 2.15 : 2.2;
                torsoHeight = 2.35;
                const hullPrism = new THREE.Mesh(new THREE.CylinderGeometry(equipped.torso === "phantom_torso" ? 1.0 : 1.28, 0.95, 2.3, 6), matPrimary);
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
                if (equipped.torso === "vanguard_torso") {
                    [-0.75, 0.75].forEach((rx) => {
                        const relayMast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 6), matJoint);
                        relayMast.position.set(rx, 1.85, -0.4);
                        torsoGroup.add(relayMast);
                    });
                } else {
                    [-1, 1].forEach((fx) => {
                        const stealthFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.9), matSecondary);
                        stealthFin.position.set(fx * 1.0, 0.2, -0.65);
                        stealthFin.rotation.z = fx * -0.35;
                        torsoGroup.add(stealthFin);
                    });
                }
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
            }
            if (!headGroup.children.length) {
                // fallback head: covers tactical/guardian ids and any extra ids
                const isTact = equipped.head === "tactical_head";
                const browDome = new THREE.Mesh(new THREE.SphereGeometry(isTact ? 0.3 : 0.38, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.6), matPrimary);
                browDome.position.y = 0.1;
                headGroup.add(browDome);
                const bandHelm = new THREE.Mesh(new THREE.CylinderGeometry(isTact ? 0.33 : 0.41, isTact ? 0.33 : 0.41, 0.22, 12), matSecondary);
                bandHelm.position.y = -0.06;
                headGroup.add(bandHelm);
                const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.1), matEmissive);
                visorSlit.position.set(0, 0.02, 0.34);
                headGroup.add(visorSlit);
                if (isTact) {
                    // Falcon Drone Node: relay masts on the crest
                    [-0.3, 0.05].forEach((mx) => {
                        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), matJoint);
                        mast.position.set(mx, 0.48, -0.05);
                        headGroup.add(mast);
                        const mastTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matEmissive);
                        mastTip.position.set(mx, 0.92, -0.05);
                        headGroup.add(mastTip);
                    });
                } else {
                    // Guardian-style horns
                    [-0.34, 0.34].forEach((hx) => {
                        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.7, 6), matSecondary);
                        horn.position.set(hx, 0.5, 0);
                        horn.rotation.z = hx > 0 ? -0.28 : 0.28;
                        headGroup.add(horn);
                    });
                }
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

        function updateGarageMechDisplay() {
            if (garageMechMesh) scene.remove(garageMechMesh);
            garageMechMesh = createProceduralMechMesh(GAME_STATE.equipped, GAME_STATE.paint);
            scene.add(garageMechMesh);
        }

        /* =========================================================================
           STAT CALCULATIONS & UI MANAGEMENT
           ========================================================================= */
        function calculateMechStats() {
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
            byId('mech-class-name').innerText = `${cls} CHASSIS`;
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
            ['foundry', 'volcanic', 'wasteland'].forEach(id => {
                byId(`arena-${id}`).classList.toggle('equipped', id === arenaId);
            });
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

        /* =========================================================================
           REAL-TIME COMBAT ENGINE, COLLISION & ENDLESS SURVIVAL WAVES
           ========================================================================= */
        let keys: Record<string, boolean> = {};
        let mousePos = new THREE.Vector2();

        function setupInputControls() {
            window.addEventListener('keydown', e => {
                if (GAME_STATE.inBattle && ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft'].includes(e.code)) e.preventDefault();
                keys[e.code] = true;
                if (GAME_STATE.inBattle && e.code === 'Space') tryBoostDash();
                if (GAME_STATE.inBattle && e.code === 'ShiftLeft') toggleWingmanHold();
            });
            window.addEventListener('keyup', e => keys[e.code] = false);
            window.addEventListener('mousemove', e => {
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
            audioUnlock(); startMusic();
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
                mesh: createProceduralMechMesh(GAME_STATE.equipped, GAME_STATE.paint),
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
            scene.add(playerEntity!.mesh);

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
            const arenaEnv = new THREE.Group();
            arenaEnv.name = 'arena_env';

            const ARENA_THEMES: Record<string, { floor: number; fog: number; fogD: number; primary: number; accent: number; hemi: number; sun: number; sunI: number }> = {
                foundry:   { floor: 0x161c28, fog: 0x0a0e16, fogD: 0.0075, primary: 0x1e293b, accent: 0xff5500, hemi: 0x3a4a66, sun: 0xfff2e6, sunI: 1.5 },
                volcanic:  { floor: 0x2a0f0a, fog: 0x1a0503, fogD: 0.011,  primary: 0x3d1812, accent: 0xff4400, hemi: 0x662015, sun: 0xffb080, sunI: 1.7 },
                wasteland: { floor: 0x14202c, fog: 0x0a141f, fogD: 0.012,  primary: 0x24333f, accent: 0x66d9ff, hemi: 0x2a4a66, sun: 0xbfe8ff, sunI: 1.3 }
            };
            const theme = ARENA_THEMES[GAME_STATE.selectedArena] || ARENA_THEMES.foundry;

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

            // Cover pillars with FIXED caps at the top + edge lights
            for (let i = 0; i < 22; i++) {
                const px = (Math.random() - 0.5) * 220;
                const pz = (Math.random() - 0.5) * 220;
                if (Math.hypot(px, pz - 30) < 18 || Math.hypot(px, pz + 40) < 18) continue;

                const h = 14 + Math.random() * 10;
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(9, h, 9),
                    new THREE.MeshStandardMaterial({ color: theme.primary, roughness: 0.45, metalness: 0.75, map: METAL_TEXTURE, bumpMap: BUMP_TEXTURE, bumpScale: 0.06 })
                );
                pillar.position.set(px, h / 2, pz);
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                arenaEnv.add(pillar);

                const cap = new THREE.Mesh(
                    new THREE.BoxGeometry(9.6, 0.5, 9.6),
                    new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 1.4 })
                );
                cap.position.set(px, h + 0.25, pz); // FIXED: cap sits on top of the pillar
                arenaEnv.add(cap);

                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(10, 0.6, 10),
                    new THREE.MeshStandardMaterial({ color: 0x0e1117, roughness: 0.6, metalness: 0.8 })
                );
                base.position.set(px, 0.3, pz);
                arenaEnv.add(base);

                arenaObstacles.push({ mesh: pillar, pos: new THREE.Vector3(px, 0, pz), halfSize: 4.5 });
            }

            // Theme dressing
            if (GAME_STATE.selectedArena === 'volcanic') {
                for (let i = 0; i < 10; i++) {
                    const x = (Math.random() - 0.5) * 240, z = (Math.random() - 0.5) * 240;
                    if (Math.hypot(x, z - 30) < 14 || Math.hypot(x, z + 40) < 14) continue;
                    const lava = new THREE.Mesh(new THREE.CircleGeometry(3 + Math.random() * 3, 24),
                        new THREE.MeshBasicMaterial({ color: 0xff3300 }));
                    lava.rotation.x = -Math.PI / 2;
                    lava.position.set(x, 0.05, z);
                    arenaEnv.add(lava);
                    arenaLavaPools.push({ x, z, r: lava.geometry.parameters.radius });
                }
                const glow = new THREE.PointLight(0xff4400, 1.6, 90);
                glow.position.set(0, 18, 0);
                arenaEnv.add(glow);
            } else {
                arenaLavaPools = [];
            }
            if (GAME_STATE.selectedArena === 'wasteland') {
                for (let i = 0; i < 8; i++) {
                    const ice = new THREE.Mesh(new THREE.ConeGeometry(1.6 + Math.random() * 2, 3 + Math.random() * 5, 6),
                        new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.75 }));
                    ice.position.set((Math.random() - 0.5) * 240, 1.5, (Math.random() - 0.5) * 240);
                    ice.castShadow = true;
                    arenaEnv.add(ice);
                }
            }

            // Destructible props (crates & explosive barrels) - keep center clear
            const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8, metalness: 0.2, map: METAL_TEXTURE });
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

            // Pickup pads (spawning armor/energy pickups during battle)
            [[-60, -60], [60, -60], [-60, 60], [60, 60]].forEach(([x, z]) => {
                const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 0.4, 24),
                    new THREE.MeshStandardMaterial({ color: 0x101820, emissive: 0x00f0ff, emissiveIntensity: 0.6 }));
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
            });

            // Drifting dust motes (animated in animate())
            const dustGeo = new THREE.BufferGeometry();
            const dustCount = 420;
            const dustPositions = new Float32Array(dustCount * 3);
            for (let i = 0; i < dustCount; i++) {
                dustPositions[i * 3] = (Math.random() - 0.5) * 240;
                dustPositions[i * 3 + 1] = 1 + Math.random() * 22;
                dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 240;
            }
            dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
            arenaDust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x9fb4c9, size: 0.35, transparent: true, opacity: 0.25, fog: false }));
            arenaEnv.add(arenaDust);

            // Corner floodlight beams tinted by the arena accent
            const floodColor = theme.accent || 0xff5500;
            [[-120, -120], [120, -120], [-120, 120], [120, 120]].forEach(([fx, fz]) => {
                const beam = new THREE.Mesh(
                    new THREE.ConeGeometry(14, 30, 16, 1, true),
                    new THREE.MeshBasicMaterial({ color: floodColor, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
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

        /* ACCURATE WEAPON FIRING DIRECTLY FROM BARREL TIP MARKS */
        function firePlayerWeapon() {
            if (!playerEntity || playerEntity!.overheated) return;
            const stats = calculateMechStats();
            const armsId = GAME_STATE.equipped.arms;
            const fireCost = armsId === 'plasma_arms' ? 26 : (armsId === 'railgun_arms' ? 42 : 14);
            const now = performance.now();
            const interval = armsId === 'plasma_arms' ? 420 : (armsId === 'railgun_arms' ? 950 : 95);
            if (now - playerEntity!.lastFireTime < interval) return;
            playerEntity!.lastFireTime = now;

            if (playerEntity!.heat + fireCost >= 100) {
                playerEntity!.overheated = true;
                sfx('overheat');
                showFloatText('⚠ OVERHEAT — VENTING', '#ff5533');
                return;
            }
            playerEntity!.heat += fireCost;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mousePos, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2);
            const targetPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, targetPoint);

            const barrelTips: THREE.Vector3[] = [];
            playerEntity!.mesh.traverse(child => {
                if (child.name === 'barrelTip') {
                    const worldPos = new THREE.Vector3();
                    child.getWorldPosition(worldPos);
                    barrelTips.push(worldPos);
                }
            });

            let spawnPos = playerEntity!.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0));
            if (barrelTips.length > 0) {
                activeWeaponBarrelIndex = (activeWeaponBarrelIndex + 1) % barrelTips.length;
                spawnPos = barrelTips[activeWeaponBarrelIndex];
            }

            const isRail = armsId === 'railgun_arms';
            const isPlasma = armsId === 'plasma_arms';
            const fireDir = targetPoint.clone().sub(spawnPos).normalize();

            const projGeo = isRail
                ? (() => { const g = new THREE.BoxGeometry(0.14, 0.14, 4.5); return g; })()
                : (() => { const g = new THREE.CylinderGeometry(isPlasma ? 0.3 : 0.18, isPlasma ? 0.3 : 0.18, isPlasma ? 1.2 : 1.8, 8); g.rotateX(Math.PI / 2); return g; })();
            const projColor = isRail ? 0xffffff : (isPlasma ? 0x66ffcc : GAME_STATE.paint.emissive);
            const proj = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({ color: projColor }));
            proj.position.copy(spawnPos);
            proj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fireDir);

            projectiles.push({
                mesh: proj,
                dir: fireDir,
                speed: isRail ? 320 : (isPlasma ? 140 : 180),
                isPlayer: true,
                damage: (stats.damage || 350) * (isRail ? 1.0 : (isPlasma ? 0.42 : 0.16)),
                life: 2.0,
                pierce: isRail,
                trailColor: projColor
            });
            scene.add(proj);

            // Muzzle flash + per-weapon sound
            spawnMuzzleFlash(spawnPos, fireDir, isRail ? 2.4 : 1.2, projColor);
            sfx(isRail ? 'rail' : (isPlasma ? 'plasma' : 'cannon'));
            cameraShake = Math.max(cameraShake, isRail ? 0.55 : (isPlasma ? 0.3 : 0.22));
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

            if (move.length() > 0) {
                move.normalize();
                if (playerEntity!.dashTime > 0) {
                    playerEntity!.position.addScaledVector(playerEntity!.dashDir, playerEntity!.speed * 4.2 * delta);
                    playerEntity!.dashTime -= delta;
                } else {
                    playerEntity!.position.addScaledVector(move, playerEntity!.speed * delta);
                }
                playerEntity!.walkTimer += delta * 12;
                const leg0 = playerEntity!.mesh.getObjectByName('leg_0');
                const leg1 = playerEntity!.mesh.getObjectByName('leg_1');
                if (leg0 && leg1) {
                    leg0.rotation.x = Math.sin(playerEntity!.walkTimer) * 0.45;
                    leg1.rotation.x = -Math.sin(playerEntity!.walkTimer) * 0.45;
                }
            } else if (playerEntity!.dashTime > 0) {
                playerEntity!.position.addScaledVector(playerEntity!.dashDir, playerEntity!.speed * 4.2 * delta);
                playerEntity!.dashTime -= delta;
            }

            resolveObstacleCollisions(playerEntity!.position, playerEntity!.radius);
            playerEntity!.mesh.position.copy(playerEntity!.position);

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mousePos, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2);
            const targetPoint = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, targetPoint)) {
                playerEntity!.mesh.lookAt(targetPoint.x, playerEntity!.mesh.position.y, targetPoint.z);
            }

            /* ---- HEAT: hysteresis lockout until cooled to 35% ---- */
            if (playerEntity!.overheated) {
                if (playerEntity!.heat <= 35) { playerEntity!.overheated = false; showFloatText('SYSTEMS COOLED', '#00ff66'); }
            }
            const heatMult = GAME_STATE.selectedArena === 'volcanic' ? 0.65 : (GAME_STATE.selectedArena === 'wasteland' ? 1.5 : 1.0);
            playerEntity!.heat = Math.max(0, playerEntity!.heat - (playerEntity!.heatCoolRate * heatMult) * delta);

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

            /* ---- HOLD-TO-FIRE ---- */
            if (mouseDown) firePlayerWeapon();

            /* ---- CAMERA: combat framing + shake ---- */
            camera.position.set(
                playerEntity!.position.x + (Math.random() - 0.5) * cameraShake,
                12 + (Math.random() - 0.5) * cameraShake,
                playerEntity!.position.z + 20 + (Math.random() - 0.5) * cameraShake
            );
            camera.lookAt(playerEntity!.position.x, 2.5, playerEntity!.position.z);
            cameraShake = Math.max(0, cameraShake - delta * 2.2);

            /* ---- ENEMY AI: approach, separation, strafing, burst fire ---- */
            enemyEntities.forEach(enemy => {
                enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - delta * 3);
                if (enemy.hitFlash <= 0.01 && enemy.flashApplied) { restoreHitFlash(enemy.mesh); enemy.flashApplied = false; }

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

            /* ---- PROJECTILES ---- */
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                const prevPos = p.mesh.position.clone();
                p.mesh.position.addScaledVector(p.dir, p.speed * delta);
                p.life -= delta;

                let hit = false;
                const px = p.mesh.position.x, pz = p.mesh.position.z;
                for (const obs of arenaObstacles) {
                    if (Math.abs(px - obs.pos.x) <= obs.halfSize + 0.2 && Math.abs(pz - obs.pos.z) <= obs.halfSize + 0.2) {
                        spawnExplosionParticles(p.mesh.position, 0xffaa00, 6, 8);
                        sfx('hit');
                        hit = true;
                        break;
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

                if (!hit) {
                    if (p.isPlayer) {
                        for (const enemy of enemyEntities) {
                            if (p.mesh.position.distanceTo(enemy.position) < enemy.radius + 0.9) {
                                applyDamageToEntity(enemy, p.damage, p.mesh.position.clone(), 'normal');
                                hit = true;
                                break;
                            }
                        }
                    } else {
                        if (p.mesh.position.distanceTo(playerEntity!.position) < playerEntity!.radius + 0.9) {
                            damagePlayer(p.damage, p.mesh.position.clone());
                            hit = true;
                        }
                        if (!hit && wingmanDrone && p.mesh.position.distanceTo(wingmanDrone!.position) < 1.6) {
                            damageWingman(p.damage * 0.5);
                            spawnExplosionParticles(p.mesh.position, 0x00f0ff, 8, 10);
                            hit = true;
                        }
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

        function applyDamageToEntity(entity: MechEntity | MechEnemy, damage: number, hitPos: THREE.Vector3, kind: string) {
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
            sfx('hit');
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

            byId('hud-heat-fill').style.width = `${playerEntity!.heat}%`;
            byId('hud-heat-val').innerText = `${Math.ceil(playerEntity!.heat)}%${playerEntity!.overheated ? ' ⚠ VENTING' : ''}`;

            if (enemyEntities.length > 0) {
                const target = enemyEntities[0];
                byId('hud-target-hp-fill').style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
                byId('hud-target-hp-val').innerText = `${Math.ceil((target.hp / target.maxHp) * 100)}%`;

                const tShPct = target.maxShield > 0 ? (target.shield / target.maxShield) * 100 : 0;
                byId('hud-target-shield-fill').style.width = `${Math.max(0, tShPct)}%`;
                byId('hud-target-shield-val').innerText = `${Math.ceil(tShPct)}%`;
            }
        }

        function endBattle(victory: boolean) {
            if (!GAME_STATE.inBattle) return;
            GAME_STATE.inBattle = false;
            stopMusic();
            mouseDown = false;
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
                pt.life -= delta;
                if (pt.life <= 0) {
                    scene.remove(pt.mesh);
                    particles.splice(i, 1);
                }
            }

            if (GAME_STATE.inBattle) {
                updateCombatLoop(delta);
            }

            if (composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }

        window.onload = () => {
            const hadSave = loadGame();
            initGraphicsEngine();
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
        };

        window.onload = () => {
            initGraphicsEngine();
            selectPartCategory('head');
            setupColorPickers();
            renderTechTree();
            refreshStatsUI();
            updateCurrencyUI();
        };

// Expose menu actions for inline HTML onclick handlers (mech2.html)
Object.assign(globalThis, {
  switchTab, selectPartCategory, setArena, setGameMode,
  startCombatDeployment, abortMission, closePostBattleModal,
  audioUnlock, toggleMute, updateAISettings
});
