// Tonka: a masked summoner who keeps his hands in his pockets while bells, his truck and a green swarm fight for him.
// Bell meter: every landed hit rings a bell; at three, his next special is EMPOWERED.
// Unbothered: standing or walking, he shrugs off one light hit, recharging after 3 s without being hit.
// His domain is one of three arenas picked at random (seeded) each time, each with its own song.
// Ability state lives on fighter fields and is driven from update, so Siglarp's copies behave the same.

// ---- Seeded randomness (domain variant), never Math.random ----------------------------------------
function tonkaRandom(f) {
  f.tonkaSeed = (Math.imul(f.tonkaSeed || 1, 1664525) + 1013904223) >>> 0;
  return f.tonkaSeed / 4294967296;
}
function tonkaPickVariant(f) { return TONKA_VARIANTS[Math.floor(tonkaRandom(f) * TONKA_VARIANTS.length) % TONKA_VARIANTS.length]; }
function domainName(type, variant) { return type === 'tonka' && TONKA_DOMAINS[variant] ? TONKA_DOMAINS[variant].name : DOMAIN_NAMES[type]; }
function domainSubtitle(type, variant) { return type === 'tonka' && TONKA_DOMAINS[variant] ? TONKA_DOMAINS[variant].sub : DOMAIN_SUBTITLES[type]; }
function tonkaDomain(f, variant) {
  const d = g.domain;
  return d?.type === 'tonka' && d.owner === f.index && !g.domainSequence && (!variant || d.variant === variant) ? d : null;
}

// ---- Bell meter ----------------------------------------------------------------------------------
function takeEmpowered(f) {
  if ((f.bells || 0) < TONKA.bellsMax) return false;
  f.bells = 0; g.popup('EMPOWERED', f.x, f.y - 230, f.stats.accent || '#7dff3a', 30); return true;
}

// ---- Summons (projectiles; they only ever hit his opponents) -----------------------------------------
const ownsSummon = (f, kind, game = g) => game.projectiles.some(p => p.kind === kind && p.owner === f.index);
function hazardMove(dmg, height, extra = {}) {
  return { dmg, fixedDamage: dmg, height, hitstun: 22, kb: 6, hitstop: 6, shake: 2, startup: 1, active: 1, recovery: 1, ...extra };
}
// A giant bell falls onto x: it lands TONKA.bellFall ticks later, then rings a low shockwave along the floor.
function dropBell(f, x, dmg, g) {
  const fall = TONKA.bellFall, accel = 1.2, height = .5 * accel * fall * fall;
  spawnProjectile(g, { kind: 'tonkaBell', owner: f.index, x: clampArena(x), y: FLOOR - 45 - height, vx: 0, vy: 0, accel, facing: f.facing,
    framesLeft: fall + 6, box: { w: 84, h: 92 }, blockGuard: 10, name: 'bellDrop', shadowX: clampArena(x), pierce: true, hitsLeft: 1,   // hits once, still lands and rings
    move: hazardMove(dmg, 'overhead', { launch: -10, hitstun: 30, kb: 4 }) });
}
function landBell(p, g) {
  p.dead = true;
  const f = fighters[p.owner];
  for (const dir of [-1, 1]) spawnProjectile(g, { kind: 'tonkaRing', owner: p.owner, x: p.x + 30 * dir, y: FLOOR - 12, vx: 8 * dir, facing: dir,
    framesLeft: 14, box: { w: 40, h: 24 }, blockGuard: 4, name: 'bellRing', move: hazardMove(TONKA.ringDamage, 'low', { hitstun: 14, kb: 3 }) });
  if (f?.tonkaSinks) f.tonkaSinks.push({ x: p.x, life: 40 });
  g.sound('bell'); g.shake(3); g.ring(p.x, FLOOR - 10, f?.stats.accent || '#7dff3a', 120, 18); g.dust(p.x, FLOOR, 0, 10);
}
function sendVehicle(f, kind, dir, speed, dmg, extra, g) {
  const box = kind === 'tonkaHorse' ? { w: 140, h: extra.high ? 60 : 50 } : { w: kind === 'tonkaTruck' ? 230 : 200, h: kind === 'tonkaTruck' ? 105 : 95 };
  const y = kind === 'tonkaHorse' ? (extra.high ? FLOOR - 125 : FLOOR - 25) : FLOOR - box.h / 2;
  spawnProjectile(g, { kind, owner: f.index, x: dir > 0 ? WALL_L - 100 : WALL_R + 100, y, vx: speed * dir, facing: dir,
    framesLeft: 200, box, blockGuard: 12, name: kind, pierce: true, hitsLeft: 1, ...extra,
    move: hazardMove(dmg, kind === 'tonkaHorse' && extra.high ? 'high' : 'low', { kb: 12, hitstun: 26, launch: -5 }) });
}
function sendSwarm(f, empowered, g) {
  const big = empowered ? 2 : 1;
  spawnProjectile(g, { kind: 'tonkaSwarm', owner: f.index, x: f.x + 60 * f.facing, y: f.y - 110, vx: TONKA.swarmSpeed * f.facing, facing: f.facing,
    framesLeft: 150, box: { w: 90 * big, h: 70 * big }, blockGuard: 4, name: 'greenSwarm', big,
    hitsLeft: empowered ? TONKA.empSwarmHits : TONKA.swarmHits, rehitEvery: TONKA.swarmEvery,
    move: hazardMove(TONKA.swarmDamage, 'high', { hitstun: 14, kb: 2, hitstop: 3, shake: 1 }) });
}
// Called from updateProjectiles for his kinds: falling bells, a truck that can come back, everything else flies straight.
function updateTonkaProjectile(p, g) {
  if (p.kind === 'tonkaBell') { p.vy += p.accel; p.y += p.vy; if (p.y >= FLOOR - 46) landBell(p, g); }
  if (p.kind === 'tonkaTruck' && p.returns && (p.vx > 0 ? p.x > WALL_R + 60 : p.x < WALL_L - 60)) {
    p.returns = false; p.vx = -p.vx; p.facing = -p.facing; p.hitsLeft = 1; p.rehitAt = 0; p.framesLeft = 200;
  }
}

// ---- The world: domain hazards and the swarm's beam clash --------------------------------------------
function updateTonkaWorld(g) {
  for (const f of fighters) if (f.tonkaSinks) f.tonkaSinks = f.tonkaSinks.filter(s => --s.life > 0);
  // A swarm meeting an enemy projectile: both go out in a green-and-white burst.
  for (const s of g.projectiles) if (s.kind === 'tonkaSwarm' && !s.dead) {
    const q = g.projectiles.find(o => o !== s && !o.dead && o.owner !== s.owner && boxesOverlap(projectileBox(s), projectileBox(o)));
    if (q) { s.dead = q.dead = true; g.sparks((s.x + q.x) / 2, s.y, '#7dff3a', 18); g.ring((s.x + q.x) / 2, s.y, '#ffffff', 90, 14); g.popup('CLASH', (s.x + q.x) / 2, s.y - 60, '#ffffff', 26); g.sound('burst'); }
  }
  const d = g.domain;
  if (d?.type !== 'tonka' || g.domainSequence || d.startFrame === undefined) return;
  const owner = fighters[d.owner], opp = opponentOf(owner), t = g.frame - d.startFrame;
  if (!owner || !opp || t <= 0) return;
  if (d.variant === 'wasteland') {
    const k = t % TONKA.suvEvery;
    if (k === TONKA.suvEvery - TONKA.suvWarn) d.warn = { dir: (d.passes || 0) % 2 ? -1 : 1, until: g.frame + TONKA.suvWarn };
    if (k === 0) { const dir = (d.passes || 0) % 2 ? -1 : 1; d.passes = (d.passes || 0) + 1; sendVehicle(owner, 'tonkaSUV', dir, TONKA.suvSpeed, TONKA.suvDamage, {}, g); g.sound('honk'); }
  } else if (d.variant === 'bellCity') {
    if (t % TONKA.cityBellEvery === 0) dropBell(owner, opp.x, TONKA.cityBellDamage, g);
  } else if (d.variant === 'farmhouse') {
    const k = t % TONKA.horseEvery;
    if (k === TONKA.horseEvery - 20) g.sound('hooves');
    if (k === 0) {
      const white = (d.passes || 0) % 2 === 0; d.passes = (d.passes || 0) + 1;
      sendVehicle(owner, 'tonkaHorse', white ? 1 : -1, TONKA.horseSpeed, TONKA.horseDamage, { high: white, white }, g);
    }
  }
}

const TONKA_ABILITIES = CHARACTER_ABILITIES.tonka = {
  cooldowns: { special: TONKA.bellCooldown, downSpecial: TONKA.truckCooldown, upSpecial: TONKA.swarmCooldown },
  labels: { special: 'BELL', downSpecial: 'TRUCK', upSpecial: 'SWARM' },
  reset(f) {
    f.bells = 0; f.tonkaHitAt = -9999; f.tonkaEmp = false; f.tonkaTarget = 0; f.tonkaSinks = []; f.tonkaCar = null;
    f.tonkaSeed = (0x7a11 ^ (f.index + 1) * 7919 ^ (g.round || 1) * 104729 ^ (g.matchSerial || 0) * 2654435761) >>> 0;
  },

  special(f, opp, g) {
    if (ownsSummon(f, 'tonkaBell', g)) return false;
    f.tonkaTarget = opp.x; f.tonkaEmp = takeEmpowered(f);
    return openAbility(f, 'bellCall', TONKA.bellStartup + TONKA.bellRecovery);
  },
  downSpecial(f, opp, g) {
    if (ownsSummon(f, 'tonkaTruck', g)) return false;
    f.tonkaEmp = takeEmpowered(f);
    return openAbility(f, 'truckCall', TONKA.truckStartup + TONKA.truckRecovery);
  },
  upSpecial(f) { f.tonkaEmp = takeEmpowered(f); return openAbility(f, 'swarmCall', TONKA.swarmStartup + TONKA.swarmRecovery); },

  // Unbothered: one light hit absorbed while calm. Bell City keeps it permanently ready.
  armor(f, m, g) {
    if (!['idle', 'walk'].includes(f.state) || m.grab || m.unblockable || m.height === 'heavy' || m.launch) return false;
    if ((m.fixedDamage ?? m.dmg) > TONKA.armorMaxDamage) return false;
    if (!tonkaDomain(f, 'bellCity') && g.frame - f.tonkaHitAt < TONKA.unbotheredRecharge) return false;
    g.popup('UNBOTHERED', f.x, f.y - 215, '#e8f4ff', 24, `unbothered${f.index}`); g.ring(f.x, f.y - 110, '#e8f4ff', 70, 12);
    return true;
  },
  // Bell Reset (Down + Special mid-combo, three bells): a wall bounce anywhere on the stage. It spends the bells,
  // pops the victim up in front of him and gives back the launcher, the air extension and his ground attacks.
  comboReset(f, opp, g, chain) {
    if ((f.bells || 0) < TONKA.bellsMax || opp.state !== 'hitstun' || opp.comboAttacker !== f.index || !tonkaCombo(opp)) return false;
    if (opp.wallBounces >= TONKA_COMBO.bounces || opp.combo >= TONKA_COMBO.total) return false;
    if (f.state === 'attack' ? !chain || !f.moveHit : !['idle', 'walk', 'run', 'skid', 'air'].includes(f.state)) return false;
    f.bells = 0; opp.bellResets = (opp.bellResets || 0) + 1;
    if (f.input.rawPressedAt) f.input.rawPressedAt.special = -1e9;   // this Special never forms the Attack + Special ultimate chord
    const accent = f.stats.accent || '#7dff3a';
    g.popup('BELL RESET', f.x, f.y - 245, accent, 30, `bellReset${f.index}`);
    g.sound('bell'); g.ring(opp.x, opp.y - 90, accent, 110, 16); g.sparks(opp.x, opp.y - 90, accent, 14);
    opp.x = clampArena(f.x + f.facing * TONKA_COMBO.resetPull); opp.vx = 0;   // the bell yanks them in front of him
    opp.vy = Math.min(opp.vy, TONKA_COMBO.resetPop); opp.hitstun = Math.max(opp.hitstun, TONKA_COMBO.resetStun);
    beginTonkaLoop(opp, g);
    f.chainUsed.clear(); f.airMovesUsed.clear(); f.abilityLink = null;
    if (f.state === 'attack') f.stateFrame = f.move.startup + f.move.active;   // a fresh chain window to follow up in
    return true;
  },
  onHit(f, victim, dmg, name, g) {
    if (dmg <= 0) return;
    const before = f.bells || 0;
    f.bells = Math.min(TONKA.bellsMax, before + 1);
    if (f.bells !== before) g.sound('ring');
    if (f.bells === TONKA.bellsMax && before < TONKA.bellsMax) g.popup('3 BELLS · EMPOWERED READY', f.x, f.y - 245, f.stats.accent || '#7dff3a', 20, `bells${f.index}`);
  },
  onTakenHit(f) { f.tonkaHitAt = g.frame; f.bells = Math.max(0, (f.bells || 0) - 1); },

  update(f, opp, g) {
    if (tonkaDomain(f, 'farmhouse')) for (const k of ['special', 'downSpecial', 'upSpecial'])
      f.cooldowns[k] = Math.max(0, f.cooldowns[k] - (TONKA.farmCooldownRate - 1));   // twice the recharge
    const sf = f.stateFrame;
    if (f.state === 'bellCall') {
      f.vx = 0;
      if (sf === TONKA.bellStartup) {
        const xs = f.tonkaEmp ? [-TONKA.bellSpread, 0, TONKA.bellSpread] : [0];
        for (const dx of xs) dropBell(f, f.tonkaTarget + dx, TONKA.bellDamage, g);
        g.sound('tonkaBell');   // the recorded bell (assets/sfx/), or the synth bell without it
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'truckCall') {
      f.vx = 0;
      if (sf === 4) g.sound('honk');
      if (sf === TONKA.truckStartup) {
        const emp = f.tonkaEmp;
        sendVehicle(f, 'tonkaTruck', f.facing, emp ? TONKA.empTruckSpeed : TONKA.truckSpeed, emp ? TONKA.empTruckDamage : TONKA.truckDamage, { returns: emp }, g);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'swarmCall') {
      f.vx = 0;
      if (sf === TONKA.swarmStartup) { sendSwarm(f, f.tonkaEmp, g); g.sound('whistle'); }
      if (sf >= f.abilityFrames) f.enter('idle');
    }
  },

  cpuChoice(f, opp, distance) {
    const level = f.input.level || 1, still = ['idle', 'block', 'blockstun', 'stagger'].includes(opp.state);
    const empowered = (f.bells || 0) >= TONKA.bellsMax;
    if (level >= 4 && empowered && !still && distance < 500 && opp.state !== 'hitstun') return null;   // save it for a good moment
    if (!f.cooldowns.downSpecial && opp.grounded && !['block', 'blockstun'].includes(opp.state) && distance > 160 &&
        !(level >= 4 && opp.state === 'jumpsquat')) return 'downSpecial';
    if (!f.cooldowns.special && (still || distance > 320)) return 'special';
    if (!f.cooldowns.upSpecial && distance > 140 && distance < 520) return 'upSpecial';
    return null;
  },

  bodyColor: f => f.stats.color === f.stats.altColor ? '#e9ecef' : '#1b1d1f',
  bodyDark: f => f.stats.color === f.stats.altColor ? '#9aa1a8' : '#000000',
  pose(f, t, frame) { return tonkaPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawTonkaBody(ctx, f, p, t); },
  drawMeter(ctx, f) { drawTonkaMeter(ctx, f); },
};
