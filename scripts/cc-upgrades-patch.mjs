/**
 * CC Arcade upgrade pack — one-shot content + visual patch (v2, EOL-tolerant).
 * 1) Hub (index.html + src/space/main.ts): IRON MAW FORGE launcher card + wiring.
 * 2) Mech (src/mech/main.ts): 12 new PARTS_DB entries + sculpted visuals
 *    (head/torso standalone fallbacks, grenade/beamer arms, spider legs,
 *    twin/quantum core rings, ablative/energy armor trims).
 * 3) Rogue (src/rogue/main.ts): adventurer's kit layer on the hero.
 * 4) Wizard (src/wizard/main.ts): arms/hood/mantle/sash for the Spellweaver.
 * Re-run safe: every insertion is guarded by a unique marker.
 */
import fs from 'node:fs';

const patch = (file, marker, runner) => {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('skipped (up to date):', file); return; }
  s = runner(s);
  fs.writeFileSync(file, s);
  console.log('patched:', file);
};

/* ---------- helpers (CRLF/LF tolerant) ---------- */
function lineStartOf(s, p) { return s.lastIndexOf('\n', p) + 1; }

/** Insert lines after the line containing `needle`; optionally turn its trailing '}' into '},' */
function aafter(s, needle, lines, comma = false) {
  const p = s.indexOf(needle);
  if (p < 0) throw new Error('anchor missing: ' + needle);
  const le = s.indexOf('\n', p) + 1;            // index just past the anchor line's newline
  let line = s.slice(lineStartOf(s, p), le - 1);
  const eolChar = s[le - 2] === '\r' ? '\r\n' : '\n';
  if (line.endsWith('\r')) line = line.slice(0, -1);
  const fixed = comma && line.trimEnd().endsWith('}') ? line.slice(0, -1) + '},' : line;
  return s.slice(0, lineStartOf(s, p)) + fixed + eolChar + lines.join(eolChar) + s.slice(le);
}

/** Insert a block (ending with '\n') before the line containing `needle`. */
function ibefore(s, needle, block) {
  const p = s.indexOf(needle);
  if (p < 0) throw new Error('anchor missing: ' + needle);
  return s.slice(0, lineStartOf(s, p)) + block + s.slice(lineStartOf(s, p));
}

/** Replace the pair (line contains n1, immediately-following line contains n2) with new lines. */
function rep2(s, n1, n2, newLines) {
  let from = 0;
  while (true) {
    const p2 = s.indexOf(n2, from);
    if (p2 < 0) throw new Error('anchor missing: ' + n2);
    const l2start = lineStartOf(s, p2);
    if (l2start === 0) { from = p2 + 1; continue; }
    const l1start = s.lastIndexOf('\n', l2start - 2) + 1;
    const l1line = s.slice(l1start, l2start - 1).replace(/\r$/, '');
    if (l1line.includes(n1)) {
      const l2e = s.indexOf('\n', p2) + 1;
      const eolChar = s[l2start - 1] === '\r' ? '\r\n' : '\n';
      // newLines are the replacement of BOTH lines; first line must match n1 semantics
      const replaced = [l1line.includes(n1) && l1line.trim() === '}'.trim() ? newLines[0] : null];
      if (replaced[0] === null) {
        // n1 is a real line (e.g. '} else {'), keep a copy semantics: drop it and emit newLines
        return s.slice(0, l1start) + newLines.join(eolChar) + s.slice(l2e);
      }
      return s.slice(0, l1start) + newLines.join(eolChar) + s.slice(l2e);
    }
    from = p2 + 1;
  }
}

/* ============================ 1) HUB ============================ */

patch('index.html', 'launch-mech-btn', (x) => {
  let out = ibefore(x, '<button class="btn-secondary" id="attribution-btn"', [
    '            <button class="game-card-btn mech" id="launch-mech-btn">',
    '                <div class="game-title" style="color: #fb923c;">IRON MAW FORGE <span>FILE: mech2.html</span></div>',
    '                <div class="game-desc">Pilot heavy armor: outfit mechs, run survival waves, and topple the Omega Titans.</div>',
    '            </button>',
    '',
    ''
  ].join('\n'));
  out = ibefore(out, '.game-title {', [
    '        .game-card-btn.mech:hover {',
    '            background: rgba(255, 85, 0, 0.2);',
    '            border-color: #ff7a1a;',
    '            box-shadow: 0 0 15px rgba(255, 85, 0, 0.45);',
    '        }',
    '',
    ''
  ].join('\n'));
  return out;
});

patch('src/space/main.ts', 'launch-mech-btn', (x) => {
  let out = aafter(x, "const launchWizardBtn = byId<HTMLButtonElement>('launch-wizard-btn');", [
    "const launchMechBtn = byId<HTMLButtonElement>('launch-mech-btn');"
  ]);
  out = rep2(out,
    "window.location.href = 'wizard.html';",
    '});',
    [
      "  launchWizardBtn.addEventListener('click', () => {",
      "    window.location.href = 'wizard.html';",
      '  });',
      '',
      "  launchMechBtn.addEventListener('click', () => {",
      "    window.location.href = 'mech2.html';",
      '  });'
    ]);
  return out;
});

/* ============================ 2) MECH UPGRADES ============================ */

patch('src/mech/main.ts', 'spider_legs', (x) => {
  let out = x;

  // 2a. new PARTS_DB entries
  out = aafter(out, '{ id: "siege_head"', [
    '                { id: "tactical_head", name: "Falcon Drone Node", hp: 300, shield: 150, speed: 8, cost: 2000, unlocked: false, desc: "Sensor barrette tuned for drone relay targeting with a wide sweep arc." },',
    '                { id: "guardian_head", name: "Aegis Bastion Helm", hp: 640, shield: 360, speed: -3, cost: 4500, unlocked: false, desc: "Fortified pillar helm shielding the entire cockpit ring." }'
  ], true);

  out = aafter(out, '{ id: "assault_torso"', [
    '                { id: "phantom_torso", name: "Shade Phantom Frame", hp: 1750, shield: 720, energy: 150, speed: 14, cost: 3200, unlocked: false, desc: "Featherweight stealth frame tuned for hit-and-run skirmishing." },',
    '                { id: "vanguard_torso", name: "Vanguard Bulwark Torso", hp: 3400, shield: 1350, energy: 190, speed: -6, cost: 4800, unlocked: false, desc: "Field-command bulk bristling with relay antennae." }'
  ], true);

  out = aafter(out, '{ id: "railgun_arms"', [
    '                { id: "grenade_arms", name: "Arc Mortar Pods", damage: 640, heatRate: 34, range: 95, cost: 4200, unlocked: false, desc: "Anvil-breech mortars that lob heavy shrapnel shells from cover." },',
    '                { id: "beamer_arms", name: "Helios Beam Cannons", damage: 700, heatRate: 30, range: 110, cost: 5200, unlocked: false, desc: "Prismatic lens emitters delivering intense raw focused heat." }'
  ], true);

  out = aafter(out, '{ id: "hover_legs"', [
    '                { id: "spider_legs", name: "Chitin Spider Struts", hp: 700, speed: 72, cost: 3800, unlocked: false, desc: "Four-legged all-terrain rig that climbs broken cover quickly." },',
    '                { id: "bulwark_legs", name: "Anchor Stabilizer Pistons", hp: 1600, speed: 30, cost: 2600, unlocked: false, desc: "Reinforced piston legs braced for static shock-absorber stands." }'
  ], true);

  out = aafter(out, '{ id: "overclocked_core"', [
    '                { id: "twin_core", name: "Twin Plasma Cores", energy: 300, heatCool: 70, cost: 5800, unlocked: false, desc: "Paired micro-furnaces that trade heavy power into cell heat." },',
    '                { id: "quantum_core", name: "Quantum Flux Reactor", energy: 280, heatCool: 110, cost: 7200, unlocked: false, desc: "Collapse-field reactor with exceptional cooling." }'
  ], true);

  out = aafter(out, '{ id: "reactive_armor"', [
    '                { id: "ablative_armor", name: "Ablative Ceramic Matrix", hpBonus: 1400, speedBonus: -6, cost: 2800, unlocked: false, desc: "Layered sacrificial ceramics that slough off incoming fire." },',
    '                { id: "energy_armor", name: "Refraction Energy Weave", hpBonus: 800, speedBonus: 10, cost: 6500, unlocked: false, desc: "Light-bending hull weave that shifts its silhouette in combat." }'
  ], true);

  // 2b. head fallback: standalone if (only builds when a named branch didn't)
  out = ibefore(out, 'torsoGroup.add(headGroup);', [
    '            if (!headGroup.children.length) {',
    '                // fallback head: covers tactical/guardian ids and any extra ids',
    '                const isTact = equipped.head === "tactical_head";',
    '                const browDome = new THREE.Mesh(new THREE.SphereGeometry(isTact ? 0.3 : 0.38, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.6), matPrimary);',
    '                browDome.position.y = 0.1;',
    '                headGroup.add(browDome);',
    '                const bandHelm = new THREE.Mesh(new THREE.CylinderGeometry(isTact ? 0.33 : 0.41, isTact ? 0.33 : 0.41, 0.22, 12), matSecondary);',
    '                bandHelm.position.y = -0.06;',
    '                headGroup.add(bandHelm);',
    '                const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.1), matEmissive);',
    '                visorSlit.position.set(0, 0.02, 0.34);',
    '                headGroup.add(visorSlit);',
    '                if (isTact) {',
    '                    // Falcon Drone Node: relay masts on the crest',
    '                    [-0.3, 0.05].forEach((mx) => {',
    '                        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), matJoint);',
    '                        mast.position.set(mx, 0.48, -0.05);',
    '                        headGroup.add(mast);',
    '                        const mastTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matEmissive);',
    '                        mastTip.position.set(mx, 0.92, -0.05);',
    '                        headGroup.add(mastTip);',
    '                    });',
    '                } else {',
    '                    // Guardian-style horns',
    '                    [-0.34, 0.34].forEach((hx) => {',
    '                        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.7, 6), matSecondary);',
    '                        horn.position.set(hx, 0.5, 0);',
    '                        horn.rotation.z = hx > 0 ? -0.28 : 0.28;',
    '                        headGroup.add(horn);',
    '                    });',
    '                }',
    '            }',
    ''
  ].join('\n'));

  // 2c. torso fallback: standalone if right before the reactor block
  out = ibefore(out, '// Core Reactor Intake + status ring', [
    '            if (torsoGroup.children.length === 0) {',
    '                // fallback mid-weight hull: covers phantom/vanguard and any extra ids',
    '                torsoWidth = equipped.torso === "phantom_torso" ? 2.15 : 2.2;',
    '                torsoHeight = 2.35;',
    '                const hullPrism = new THREE.Mesh(new THREE.CylinderGeometry(equipped.torso === "phantom_torso" ? 1.0 : 1.28, 0.95, 2.3, 6), matPrimary);',
    '                hullPrism.rotation.y = Math.PI / 6;',
    '                torsoGroup.add(hullPrism);',
    '                const chestPlateFb = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.5), matSecondary);',
    '                chestPlateFb.position.set(0, 0.3, 0.92);',
    '                chestPlateFb.rotation.x = -0.12;',
    '                torsoGroup.add(chestPlateFb);',
    '                [-1, 1].forEach((sx) => {',
    '                    const shoulderCap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.9), matPrimary);',
    '                    shoulderCap.position.set(sx * 1.08, 0.95, 0);',
    '                    torsoGroup.add(shoulderCap);',
    '                });',
    '                if (equipped.torso === "vanguard_torso") {',
    '                    [-0.75, 0.75].forEach((rx) => {',
    '                        const relayMast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 6), matJoint);',
    '                        relayMast.position.set(rx, 1.85, -0.4);',
    '                        torsoGroup.add(relayMast);',
    '                    });',      '                } else {',
      '                    [-1, 1].forEach((fx) => {',
    '                        const stealthFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.9), matSecondary);',
    '                        stealthFin.position.set(fx * 1.0, 0.2, -0.65);',
    '                        stealthFin.rotation.z = fx * -0.35;',
    '                        torsoGroup.add(stealthFin);',
    '                    });',
    '                }',
    '            }',
    ''
  ].join('\n'));

  // 2d. arms: grenade + beamer branches before the default cannon else
  out = rep2(out,
    '} else {',
    'const bodyPiece = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.0), matGun);',
    [
      '                } else if (equipped.arms === "grenade_arms") {',
      '                    const podBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.9), matGun);',
      '                    weaponMount.add(podBody);',
      '                    [-0.3, 0.3].forEach((py) => {',
      '                        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.5, 8), matSecondary);',
      '                        tube.rotateX(Math.PI / 2 - 0.14);',
      '                        tube.position.set(0, py, 0.95);',
      '                        weaponMount.add(tube);',
      '                        const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 6, 12), matEmissive);',
      '                        muzzleRing.position.set(0, py + 0.18, 1.62);',
      '                        weaponMount.add(muzzleRing);',
      '                    });',
      '                    barrelTipDummy.position.set(0, 0.18, 2.2);',
      '                } else if (equipped.arms === "beamer_arms") {',
      '                    const lensHousing = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 2.1), matGun);',
      '                    weaponMount.add(lensHousing);',
      '                    [-0.22, 0.22].forEach((ly) => {',
      '                        const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.3, 12), matSecondary);',
      '                        lensBarrel.rotateX(Math.PI / 2);',
      '                        lensBarrel.position.set(0, ly, 1.15);',
      '                        weaponMount.add(lensBarrel);',
      '                        const lensRod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 10), matEmissive);',
      '                        lensRod.rotateX(Math.PI / 2);',
      '                        lensRod.position.set(0, ly, 1.2);',
      '                        weaponMount.add(lensRod);',
      '                    });',
      '                    const lensCapM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.24), matSecondary);',
      '                    lensCapM.position.set(0, 0, 0.25);',
      '                    weaponMount.add(lensCapM);',
      '                    barrelTipDummy.position.set(0, 0, 2.25);',
      '                } else {',
      '                    const bodyPiece = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.0), matGun);'
    ]);

  // 2e. legs: four-legged spider rig, then the walker/bulwark default
  out = rep2(out,
    '} else {',
    'const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.08, 0.72, 6), matDark);',
    [
      '            } else if (equipped.legs === "spider_legs") {',
      '                const carapace = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.78, 0.62, 6), matDark);',
      '                carapace.position.y = 1.55;',
      '                carapace.rotation.y = Math.PI / 6;',
      '                legsGroup.add(carapace);',
      '                const spineRidge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), matSecondary);',
      '                spineRidge.position.y = 1.9;',
      '                legsGroup.add(spineRidge);',
      '                let spiderIdx = 0;',
      '                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((sz) => {',
      '                    const strut = new THREE.Group();',
      '                    strut.name = "leg_" + spiderIdx;',
      '                    strut.position.set(sz[0] * 0.9, 1.5, sz[1] * 0.5);',
      '                    const coxa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), matJoint);',
      '                    strut.add(coxa);',
      '                    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.95, 8), matPrimary);',
      '                    upperLeg.position.set(sz[0] * 0.22, 0.4, sz[1] * 0.1);',
      '                    upperLeg.rotation.z = sz[0] * -0.55;',
      '                    strut.add(upperLeg);',
      '                    const kneeNub = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), matSecondary);',
      '                    kneeNub.position.set(sz[0] * 0.5, 0.3, sz[1] * 0.16);',
      '                    strut.add(kneeNub);',
      '                    const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 8), matPrimary);',
      '                    lowerLeg.position.set(sz[0] * 0.78, -0.42, sz[1] * 0.22);',
      '                    lowerLeg.rotation.z = sz[0] * 0.38;',
      '                    strut.add(lowerLeg);',
      '                    const footPad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.42), matDark);',
      '                    footPad.position.set(sz[0] * 1.02, -1.18, sz[1] * 0.28);',
      '                    strut.add(footPad);',
      '                    legsGroup.add(strut);',
      '                    spiderIdx += 1;',
      '                });',
      '            } else {',
      '                // walker/bulwark biped rig',
      '                const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.08, 0.72, 6), matDark);'
    ]);

  // 2f. core visuals: twin/quantum standalone ifs before exhaust stacks
  out = ibefore(out, '// Back Exhausts: octagonal stacks with glowing caps', [
    '            if (equipped.core === "twin_core") {',
    '                [-0.42, 0.42].forEach((cx) => {',
    '                    const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.34, 10), matEmissive);',
    '                    mini.rotateX(Math.PI / 2);',
    '                    mini.position.set(cx, 0.2, torsoWidth * 0.5 + 0.06);',
    '                    torsoGroup.add(mini);',
    '                    const miniRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 20), matRingDim);',
    '                    miniRing.position.set(cx, 0.2, torsoWidth * 0.5 + 0.16);',
    '                    torsoGroup.add(miniRing);',
    '                });',
    '            } else if (equipped.core === "quantum_core") {',
    '                [0.72, 0.92, 1.12].forEach((qr) => {',
    '                    const qRing = new THREE.Mesh(new THREE.TorusGeometry(qr, 0.03, 8, 28), matRingDim);',
    '                    qRing.position.set(0, 0.2, torsoWidth * 0.5 + 0.16);',
    '                    torsoGroup.add(qRing);',
    '                });',
    '                [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ma) => {',
    '                    const qMote = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), matEmissive);',
    '                    qMote.position.set(Math.cos(ma) * 1.05, 0.2 + Math.sin(ma) * 0.5, torsoWidth * 0.5 + 0.16);',
    '                    torsoGroup.add(qMote);',
    '                });',
    '            }',
    ''
  ].join('\n'));

  // 2g. armor trims inside the walker leg loop
  out = ibefore(out, 'legsGroup.add(legContainer);', [
    '                    if (equipped.armor === "ablative_armor") {',
    '                        const guardPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.6), matSecondary);',
    '                        guardPlate.position.set(side * -0.42, -0.5, -0.1);',
    '                        legContainer.add(guardPlate);',
    '                        const abCell = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.4), matPrimary);',
    '                        abCell.position.set(side * -0.42, -0.15, -0.1);',
    '                        legContainer.add(abCell);',
    '                    } else if (equipped.armor === "energy_armor") {',
    '                        const weave = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.12), matEmissive);',
    '                        weave.position.set(side * 0.42, -1.15, 0.02);',
    '                        legContainer.add(weave);',
    '                    }',
    ''
  ].join('\n'));
  return out;
});

/* ============================ 3) ROGUE ACCESSORIES ============================ */

patch('src/rogue/main.ts', "Adventurer's kit layer", (x) => {
  return ibefore(x, 'let activeHatGroup = new THREE.Group();', [
    "    // --- Adventurer's kit layer (visual only) ---",
    '    const fistMat = new THREE.MeshStandardMaterial({ color: 0x2b2b4a, roughness: 0.55, metalness: 0.45 });',
    '    // saber hand + gauntlet cuff',
    '    const saberFist = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), fistMat);',
    '    saberFist.position.set(0.02, -0.46, 0.02);',
    '    armGroup.add(saberFist);',
    '    const saberCuff = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 6, 14), matGold);',
    '    saberCuff.position.y = -0.32;',
    '    saberCuff.rotation.x = Math.PI / 2;',
    '    armGroup.add(saberCuff);',
    '    // off-hand fist below the shield',
    '    const shieldFist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), fistMat);',
    '    shieldFist.position.set(0, -0.44, 0);',
    '    offArmGroup.add(shieldFist);',
    '    const offCuff = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 6, 14), matGold);',
    '    offCuff.position.y = -0.3;',
    '    offCuff.rotation.x = Math.PI / 2;',
    '    offArmGroup.add(offCuff);',
    '    // swept hood point',
    '    const hoodPoint = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 6), waistcoatMat);',
    '    hoodPoint.position.set(0.02, 1.76, -0.26);',
    '    hoodPoint.rotation.x = -1.05;',
    '    torsoGroup.add(hoodPoint);',
    '    // belt dagger tucked in the sash',
    '    const daggerSheath = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.045), matStrap);',
    '    daggerSheath.position.set(-0.27, 0.5, 0.2);',
    '    daggerSheath.rotation.z = 0.5;',
    '    torsoGroup.add(daggerSheath);',
    '    const daggerHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.14, 6), matGold);',
    '    daggerHilt.position.set(-0.34, 0.62, 0.2);',
    '    daggerHilt.rotation.z = 0.5;',
    '    torsoGroup.add(daggerHilt);',
    '    const daggerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), matSilkLining);',
    '    daggerGem.position.set(-0.38, 0.67, 0.2);',
    '    torsoGroup.add(daggerGem);',
    '    // matching dangle tassels',
    '    [-0.12, 0.16].forEach((tx) => {',
    '        const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.02), matSilkLining);',
    '        tassel.position.set(tx, 0.32, 0.27);',
    '        tassel.rotation.z = tx > 0 ? -0.22 : 0.18;',
    '        torsoGroup.add(tassel);',
    '        const tasselBead = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), matGold);',
    '        tasselBead.position.set(tx * 1.06, 0.15, 0.27);',
    '        torsoGroup.add(tasselBead);',
    '    });',
    ''
  ].join('\n'));
});

/* ============================ 4) WIZARD PLAYER ============================ */

patch('src/wizard/main.ts', 'Spellweaver arms layer', (x) => {
  return ibefore(x, 'const capeGeo = new THREE.ConeGeometry(0.85, 1.9, 12, 1, true);', [
    '  // --- Spellweaver arms layer (visual only): both hands grip real items ---',
    '  {',
    '    const sleeveMatW = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.5, metalness: 0.15, emissive: 0x2e1065, emissiveIntensity: 0.35 });',
    '    const handMatW = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6, metalness: 0.05 });',
    '    const cuffMatW = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25, emissive: 0x78350f, emissiveIntensity: 0.4 });',
    '    const segBetween = (a: THREE.Vector3, b: THREE.Vector3, rTop: number, rBot: number): THREE.Mesh => {',
    '      const len = a.distanceTo(b);',
    '      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 10, 1), sleeveMatW);',
    '      sleeve.position.copy(a).lerp(b, 0.5);',
    '      sleeve.lookAt(b);',
    '      sleeve.rotateX(Math.PI / 2);',
    '      sleeve.castShadow = true;',
    '      playerBody.add(sleeve);',
    '      return sleeve;',
    '    };',
    '    // STAFF ARM (right side): shoulder -> elbow -> fist gripping the staff',
    '    segBetween(new THREE.Vector3(0.58, 2.28, 0.05), new THREE.Vector3(0.8, 2.06, 0.1), 0.17, 0.15);',
    '    const wristStaff = segBetween(new THREE.Vector3(0.8, 2.06, 0.1), new THREE.Vector3(0.75, 1.92, 0.1), 0.145, 0.12);',
    '    const gauntletStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 10), cuffMatW);',
    '    gauntletStaff.position.copy(wristStaff.position);',
    '    gauntletStaff.lookAt(new THREE.Vector3(0.75, 1.92, 0.1));',
    '    gauntletStaff.rotateX(Math.PI / 2);',
    '    playerBody.add(gauntletStaff);',
    '    const fistStaff = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 12), handMatW);',
    '    fistStaff.position.set(0.75, 1.92, 0.1);',
    '    playerBody.add(fistStaff);',
    '    // SHIELD/TOME ARM (left side)',
    '    segBetween(new THREE.Vector3(-0.58, 2.28, 0.08), new THREE.Vector3(-0.8, 2.0, 0.2), 0.17, 0.15);',
    '    segBetween(new THREE.Vector3(-0.8, 2.0, 0.2), new THREE.Vector3(-0.72, 1.78, 0.26), 0.145, 0.12);',
    '    const fistTome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), handMatW);',
    '    fistTome.position.set(-0.72, 1.78, 0.26);',
    '    playerBody.add(fistTome);',
    '    const grimoire = new THREE.Group();',
    '    grimoire.position.set(-0.77, 1.83, 0.38);',
    '    const tomeCover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.08), sleeveMatW);',
    '    const tomePages = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.03), new THREE.MeshStandardMaterial({ color: 0xe2d9c2, roughness: 0.9 }));',
    '    tomePages.position.z = 0.05;',
    '    const tomeSeal = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), cyanEmissiveMat);',
    '    tomeSeal.position.z = 0.1;',
    '    grimoire.add(tomeCover);',
    '    grimoire.add(tomePages);',
    '    grimoire.add(tomeSeal);',
    '    playerBody.add(grimoire);',
    '    // HOOD: cowl shell crowning the head, swept tip behind',
    '    const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), sleeveMatW);',
    '    cowl.position.set(0, 2.5, -0.02);',
    '    cowl.scale.set(1.12, 1.0, 1.08);',
    '    cowl.rotation.x = -0.32;',
    '    cowl.castShadow = true;',
    '    playerBody.add(cowl);',
    '    const cowlTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), sleeveMatW);',
    '    cowlTip.position.set(0, 2.72, -0.34);',
    '    cowlTip.rotation.x = -0.95;',
    '    playerBody.add(cowlTip);',
    '    // MANTLE: shoulder cape wrapping the chest',
    '    const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.84, 0.42, 14, 1, true, -Math.PI / 2, Math.PI),',
    '      new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.78, metalness: 0.05, emissive: 0x2e1065, emissiveIntensity: 0.5, side: THREE.DoubleSide }));',
    '    mantle.position.y = 2.48;',
    '    mantle.castShadow = true;',
    '    playerBody.add(mantle);',
    '    // RUNIC SASH + hanging charms',
    '    const sashBelt = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 8, 22), sleeveMatW);',
    '    sashBelt.rotation.x = Math.PI / 2;',
    '    sashBelt.position.y = 1.56;',
    '    playerBody.add(sashBelt);',
    '    [-0.3, 0.3].forEach((cx) => {',
    '      const charmStrap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.02), cuffMatW);',
    '      charmStrap.position.set(cx, 1.34, 0.42);',
    '      charmStrap.rotation.z = cx > 0 ? -0.15 : 0.2;',
    '      playerBody.add(charmStrap);',
    '      const charmSigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), cyanEmissiveMat);',
    '      charmSigil.position.set(cx * 1.12, 1.14, 0.42);',
    '      playerBody.add(charmSigil);',
    '    });',
    '  }',
    ''
  ].join('\n'));
});

console.log('upgrade pack complete');
