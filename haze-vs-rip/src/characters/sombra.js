// Somhack's bullets are short-range strikes: each burst round uses normal combat/defense rules.
const SOMBRA_HACK = { startup: SOMBRA.hackStartup, active: 3, recovery: 18,
  fixedDamage: SOMBRA.hackDamage, dmg: SOMBRA.hackDamage, height: 'high', hitstun: 28,
  kb: 1, step: 3, hitstop: 4, shake: 1, box: { x: 10, y: -155, w: 130, h: 110 } };
function revealSombra(f) {
  f.stealthed = false; f.stealthCharge = 0; f.sombraReveal = SOMBRA.revealFrames;
}
function sombraVirus(f, g) {
  return spawnProjectile(g, { kind: 'virus', name: 'virus', owner: f.index, color: f.stats.color,
    x: f.x + 48 * f.facing, y: f.y - 110, facing: f.facing, vx: SOMBRA.virusSpeed * f.facing,
    framesLeft: 38, box: { w: 24, h: 24 }, blockGuard: 8,
    move: { fixedDamage: SOMBRA.virusDamage, dmg: SOMBRA.virusDamage, height: 'high',
      hitstun: 28, kb: 2, hitstop: 4, shake: 1, startup: SOMBRA.virusStartup, active: 1, recovery: 18, virus: true } });
}
function startSomhackDomain(f, g) {
  f.ultimate = 0; f.enter('idle'); f.vx = 0; revealSombra(f);
  f.input.consume('attack'); f.input.consume('special'); f.domainPending = false;
  g.domainSequence = { kind: 'hackDomainWindup', owner: f.index, framesLeft: SOMBRA.empOpener };
  g.flash(.4); g.sound('hack'); return true;
}
function updateSomhackDomain(g) {
  const seq = g.domainSequence, f = fighters[seq.owner];
  if (--seq.framesLeft > 0) return;
  g.domainSequence = null;
  g.hackDomains.push({ owner: f.index, framesLeft: SOMBRA.hudHackFrames });
  kitAttack(f, 'emp', { startup: 1, active: 1, recovery: 24, fixedDamage: SOMBRA.empDamage,
    dmg: SOMBRA.empDamage, height: 'high', hitstun: 30, kb: 4, hitstop: 8, shake: 4,
    air: !f.grounded, box: { x: -SOMBRA.empRange, y: -220, w: SOMBRA.empRange * 2, h: 240 } });
  f.cooldowns.downSpecial = 0;
  g.ring(f.x, f.y - 100, f.stats.color, SOMBRA.empRange, 28); g.sound('emp');
  g.popup('U HAVE BEEN HACKED', W / 2, 280, f.stats.color, 36); g.impactFrame(2);
}
function updateSomhackDomains(g) {
  g.hackDomains = g.hackDomains.filter(domain => --domain.framesLeft > 0);
}
function somhackHudBlocked(f, g) {
  return g.phase === 'fight' && g.hackDomains.some(domain => domain.owner !== f.index && domain.framesLeft > 0);
}
const SOMBRA_ABILITIES = CHARACTER_ABILITIES.sombra = {
  cooldowns: { special: SOMBRA.hackCooldown, downSpecial: SOMBRA.beaconCooldown, upSpecial: SOMBRA.virusCooldown },
  labels: { special: 'HACK', downSpecial: 'BEACON', upSpecial: 'VIRUS' },
  ultimate: 'hudHack', airSpecials: ['special', 'downSpecial', 'upSpecial'],
  reset(f) {
    f.beacon = null; f.stealthCharge = 0; f.sombraReveal = 0; f.stealthed = false;
    f.smgSecond = false; f.smgShotLeft = 0;
  },
  moveFor(f, name, move) {
    if (!['medium', 'lowMedium', 'airMedium'].includes(name)) return move;
    return { ...move, dmg: move.dmg / 2, active: name === 'airMedium' ? 4 : 7,
      burst: true, burstGap: name === 'airMedium' ? 2 : 4, blockGuard: 5 };
  },
  onAttackStart(f) { revealSombra(f); f.smgSecond = false; f.smgShotLeft = 0; },
  // Hack spends cooldown on damage; Translocator spends it only on teleport, not placement.
  onSpecialUsed(f, key) {
    if (key === 'special' || key === 'downSpecial' && f.state === 'beaconWindup') f.cooldowns[key] = 0;
  },
  cooldownLeft(f, key) { return key === 'downSpecial' && f.beacon ? 0 : f.cooldowns[key]; },
  speedScale(f) { return f.stealthed && !f.hacked && NEUTRAL.has(f.state) ? SOMBRA.stealthSpeed : 1; },
  labelFor(f, key) { return key === 'downSpecial' && f.beacon ? 'TELEPORT' : this.labels[key]; },
  special(f) {
    revealSombra(f); return kitAttack(f, 'hackPulse', { ...SOMBRA_HACK, air: !f.grounded });
  },
  upSpecial(f, opp, g) {
    if (g.projectiles.some(p => p.owner === f.index && p.kind === 'virus')) return false;
    revealSombra(f); return openAbility(f, 'virusWindup', SOMBRA.virusStartup + 18);
  },
  downSpecial(f, opp, g) {
    revealSombra(f);
    if (!f.beacon) return openAbility(f, 'beaconWindup', SOMBRA.beaconStartup + 10);
    const origin = { x: f.x, y: f.y }, beacon = f.beacon; f.beacon = null;
    f.x = clampArena(beacon.x); f.y = Math.max(240, Math.min(FLOOR, beacon.y));
    f.vx = f.vy = 0; f.facing = Math.sign(opp.x - f.x) || f.facing;
    f.enter('teleportRecover'); f.abilityFrames = SOMBRA.teleportRecovery;
    g.ring(origin.x, origin.y - 70, f.stats.color, 65, 14);
    g.ring(f.x, f.y - 70, f.stats.color, 65, 14); g.sound('hack');
    g.popup('TRANSLOCATE', f.x, Math.max(280, f.y - 205), f.stats.color, 22); return true;
  },
  damageScale(f, victim, move) { return move?.virus && victim?.hacked > 0 ? SOMBRA.virusBonus : 1; },
  onHit(f, victim, dmg, name, g) {
    if (dmg <= 0) return;
    if (name === 'hackPulse') f.cooldowns.special = SOMBRA.hackCooldown;
    if (name === 'hackPulse' || name === 'emp') {
      victim.hacked = Math.max(victim.hacked, name === 'emp' ? SOMBRA.empHack : SOMBRA.hackFrames);
      g.popup('HACKED', victim.x, Math.max(270, victim.y - 215), f.stats.color, 30, `hacked${victim.index}`);
      g.sound('hack');
    }
    if (victim.hacked) g.sparks(victim.x, victim.y - 100, f.stats.color, 8);
  },
  onTakenHit(f) { revealSombra(f); },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    if (f.sombraReveal > 0) f.sombraReveal--;
    if (f.smgShotLeft > 0) f.smgShotLeft--;
    if (f.beacon) {
      const b = f.beacon; b.vy += .55; b.x = clampArena(b.x + b.vx); b.y += b.vy;
      if (b.y >= FLOOR) { b.y = FLOOR; b.vx = b.vy = 0; }
    }
    if (NEUTRAL.has(f.state) && !f.hacked) {
      f.stealthCharge = Math.min(SOMBRA.stealthAfter, f.stealthCharge + 1);
      f.stealthed = !f.sombraReveal && f.stealthCharge >= SOMBRA.stealthAfter;
    } else { f.stealthed = false; f.stealthCharge = 0; }
    const sf = f.stateFrame;
    if (f.state === 'attack' && MOVES[f.moveName] && f.moveName !== 'grab') {
      if (f.move.burst && !f.smgSecond && sf === f.move.startup + f.move.burstGap) {
        f.smgSecond = true; f.moveHit = false; f.moveAbsorbed = false;
      }
      if (sf === f.move.startup || f.move.burst && sf === f.move.startup + f.move.burstGap) {
        f.smgShotLeft = 3; g.sound('smg');
      }
    }
    if (f.state === 'virusWindup') {
      if (sf === SOMBRA.virusStartup) sombraVirus(f, g);
      if (sf >= f.abilityFrames) f.enter(f.grounded ? 'idle' : 'air');
    } else if (f.state === 'beaconWindup') {
      if (sf === SOMBRA.beaconStartup) {
        f.beacon = { x: f.x + 35 * f.facing, y: f.y - 90, vx: SOMBRA.beaconSpeed * f.facing,
          vy: -5 }; g.sound('shing');
      }
      if (sf >= f.abilityFrames) f.enter(f.grounded ? 'idle' : 'air');
    } else if (f.state === 'teleportRecover' && sf >= f.abilityFrames) f.enter(f.grounded ? 'idle' : 'air');
  },
  cpuChoice(f, opp, distance) {
    if (f.hacked) return null;
    if (f.beacon && (f.hp < f.maxHp * .4 || distance < 60)) return 'downSpecial';
    if (distance < 145 && !opp.hacked && !f.cooldowns.special) return 'special';
    if (distance > 130 && distance < 550 && Math.abs(f.y - opp.y) < 100 && !f.cooldowns.upSpecial) return 'upSpecial';
    if (distance > 220 && !f.beacon && !f.cooldowns.downSpecial) return 'downSpecial';
    return null;
  },
  pose(f, t, frame) { return sombraPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawSombraBody(ctx, f, p, t); },
  drawMeter(ctx, f) {
    if (f.beacon) {
      ctx.fillStyle=f.stats.color;ctx.font='bold 10px sans-serif';ctx.textAlign=hudAlign(f);
      ctx.fillText('TELEPORT READY · DOWN + SPECIAL',hudTextX(f,hudStart(f),180),210);return;
    }
    drawKitMeter(ctx, f, f.stealthCharge / SOMBRA.stealthAfter * 100,
      f.stealthed ? `STEALTH · SPEED +${Math.round((SOMBRA.stealthSpeed - 1) * 100)}%` : 'CAMOUFLAGE', f.stats.color);
  },
};
