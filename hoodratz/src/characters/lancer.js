const LANCER_FLASH = { startup: LANCER.flashStartup, active: 1, recovery: LANCER.flashRecovery,
  dmg: LANCER.flashDamage, height: 'high', hitstun: LANCER.flashHitstun, kb: 0, hitstop: 5, shake: 2,
  box: { x: 0, y: -155, w: 0, h: 100 } };
function lancerBlinking(f) {
  return f.state === 'attack' && f.moveName === 'flashSlash' && f.stateFrame === LANCER.flashStartup;
}
function shatterMask(f, g, held = false) {
  if (!f.masked) return;
  f.masked = false; f.mask = 0;
  if (f.hp <= 0 || f.koed) return;
  if (held || ['thrown', 'throw', 'burst'].includes(f.state)) f.maskShatterPending = true;
  else { f.enter('stagger'); f.timer = LANCER.maskStagger; f.vx = 0; }
  g.popup('MASK SHATTERED', f.x, f.y - 220, '#ffb6b6', 40); g.sound('shatter');
  g.sparks(f.x, f.y - 150, '#ffffff', 20);
  for (let i = 0; i < 7; i++) g.shards.push({ x: f.x + (i - 3) * 3, y: f.y - 150,
    vx: (i - 3) * 1.8, vy: -3 - i % 3, angle: i, spin: (i % 2 ? 1 : -1) * .2,
    size: 4 + i % 3, life: GUARD.shardFrames, color: '#fff4e3' });
}
function lancerWave(f, g, mini = false) {
  if (g.projectiles.some(p => p.owner === f.index && p.kind === 'crescent')) return false;
  const masked = f.masked, size = (mini ? .5 : 1) * (masked ? 1.5 : 1);
  const dmg = mini ? LANCER.miniDamage : masked ? LANCER.maskedWaveDamage : LANCER.waveDamage;
  spawnProjectile(g, { kind: 'crescent', owner: f.index, masked, mini,
    x: f.x + 58 * f.facing, y: f.y - 110, facing: f.facing,
    vx: (masked ? LANCER.maskedWaveSpeed : LANCER.waveSpeed) * f.facing, framesLeft: 110,
    box: { w: 30 * size, h: 110 * size }, blockGuard: 8, name: mini ? 'miniCrescent' : 'crescentWave',
    move: { fixedDamage: dmg, dmg, height: 'high', hitstun: 18, kb: 4, hitstop: 4, shake: 1, startup: 12, active: 1, recovery: 18 } });
  g.sound('slash'); return true;
}
const LANCER_ABILITIES = CHARACTER_ABILITIES.lancer = {
  cooldowns: { special: LANCER.waveCooldown, downSpecial: LANCER.maskCooldown, upSpecial: LANCER.flashCooldown },
  labels: { special: 'WAVE', downSpecial: 'MASK', upSpecial: 'FLASH' },
  reset(f) { f.mask = 0; f.masked = false; f.maskShatterPending = false; f.barrage = null; f.flashSlash = null; },
  cooldownFor(f, key) { return key === 'special' && f.masked ? LANCER.maskedWaveCooldown : this.cooldowns[key]; },
  damageScale(f) { return f.masked ? LANCER.maskDamage : 1; },
  speedScale(f) { return f.masked ? LANCER.maskSpeed : 1; },
  special(f, opp, g) {
    if (g.projectiles.some(p => p.owner === f.index && p.kind === 'crescent')) return false;
    return openAbility(f, 'crescentWindup', LANCER.waveWindup + LANCER.waveRecovery);
  },
  downSpecial(f) {
    if (!f.masked && f.mask < LANCER.maskRequired) return false;
    f.maskToggleOn = !f.masked;
    return openAbility(f, 'maskToggle', f.masked ? LANCER.maskOff : LANCER.maskOn);
  },
  upSpecial(f) {
    const lightUsed = f.chainUsed.has('light');
    kitAttack(f, 'flashSlash', { ...LANCER_FLASH });
    if (!lightUsed) f.chainUsed.delete('light');
    f.chainUsed.add('flashSlash');
    // Only a clean hit unlocks chains; a blocked/absorbed slash must finish recovery.
    f.moveAbsorbed = true; f.flashSlash = null; f.input.consume('up');
    return true;
  },
  invincible: lancerBlinking,
  passesThrough: lancerBlinking,
  attackBox(f) { return f.moveName === 'flashSlash' ? f.flashSlash?.box : null; },
  onHit(f, victim, dmg, name, g) {
    f.mask = Math.min(100, f.mask + LANCER.hitGain);
    if (name === 'flashSlash') {
      f.moveAbsorbed = false; f.move.recovery = LANCER.flashHitRecovery;
      f.facing = Math.sign(victim.x - f.x) || -f.facing;
    }
    if (name === 'overhead') g.floorCrack(f.x + 70 * f.facing);
  },
  onTakenHit(f, m, dmg, g) {
    if (f.maskShatterPending) return;
    if (f.masked && (m.grab || m.height === 'heavy' || dmg >= 80)) shatterMask(f, g);
    else f.mask = Math.min(100, f.mask + LANCER.takenGain);
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    if (f.maskShatterPending && !['throw', 'thrown', 'burst', 'hitstun'].includes(f.state)) {
      f.maskShatterPending = false; f.enter('stagger'); f.timer = LANCER.maskStagger;
    }
    if (f.masked) { f.mask = Math.max(0, f.mask - 100 / LANCER.maskFrames); if (f.mask <= 1e-9) shatterMask(f, g); }
    if (f.state === 'attack' && f.moveName === 'flashSlash') {
      f.vx = 0;
      if (f.stateFrame === LANCER.flashStartup) {
        const from = f.x, facing = f.facing, distance = (opp.x - from) * facing;
        const inPath = distance >= 0 && distance <= LANCER.flashDistance - LANCER.flashBehind && Math.abs(f.y - opp.y) < MOVE.pushHeight;
        f.x = clampArena(inPath ? opp.x + LANCER.flashBehind * facing : from + LANCER.flashDistance * facing);
        f.flashSlash = { from, to: f.x, y: f.y, facing, born: g.frame, masked: f.masked,
          box: { x: Math.min(from, f.x), y: f.y - 155, w: Math.abs(f.x - from), h: 100 } };
        g.sound('slash'); g.dust(from, FLOOR, -facing, 5);
      } else if (f.stateFrame > LANCER.flashStartup) {
        f.facing = Math.sign(opp.x - f.x) || -(f.flashSlash?.facing || f.facing);
      }
    }
    if (f.state === 'crescentWindup') {
      f.vx = 0;
      if (f.stateFrame === LANCER.waveWindup) lancerWave(f, g);
      if (f.stateFrame >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'maskToggle') {
      f.vx = 0;
      if (f.stateFrame >= f.abilityFrames) {
        f.masked = f.maskToggleOn; f.enter('idle');
        g.ring(f.x, f.y - 145, f.masked ? '#e84352' : '#eef6ff', 80, 18); g.sound('mask');
        g.popup(f.masked ? 'MASK ON' : 'MASK OFF', f.x, f.y - 220, f.stats.color, 28);
      }
    }
    if (ownDomain(f) && f.state === 'attack' && !f.move.grab && !f.normalWaveSent && f.stateFrame >= f.move.startup) {
      f.normalWaveSent = true; lancerWave(f, g, true);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.downSpecial && ((f.masked && f.mask < 15) || (!f.masked && f.mask > 50 && distance < 300 && opp.state !== 'attack'))) return 'downSpecial';
    if (!f.cooldowns.upSpecial && opp.grounded && distance > 65 && distance < LANCER.flashDistance - LANCER.flashBehind && opp.state !== 'block') return 'upSpecial';
    if (!f.cooldowns.special && distance > 150 && distance < 650) return 'special';
    return null;
  },
  pose(f, t, frame) { return newRosterPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawNewFighterBody(ctx, f, p, t); },
  draw(ctx, f, game) { if (!f.isAfterimage && !f.isDecoy) drawFlashSlash(ctx, f, game); },
  drawMeter(ctx, f) { drawKitMeter(ctx, f, f.mask, f.masked ? 'MASK ACTIVE' : 'MASK', '#ed768b'); },
};
