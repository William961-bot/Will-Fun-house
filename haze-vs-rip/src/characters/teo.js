function teoDrunk(f) { return ownDomain(f) || (f.tipsy >= 60 && f.state !== 'blackout'); }
function lootBottle(f, g) {
  f.bottles = Math.min(TEO.maxBottles, f.bottles + 1); f.lootFly = 24;
  g.popup('+ BOTTLE', f.x, f.y - 205, '#f4bd62', 20, `loot${f.index}`);
}
function addTipsy(f, amount, g) {
  f.tipsy = Math.min(100, f.tipsy + amount);
  if (ownDomain(f)) { f.tipsy = Math.min(99, Math.max(60, f.tipsy)); return; }
  if (f.tipsy >= 100) f.blackoutPending = true;
}
const TEO_PICK = { startup: TEO.pickStartup, active: TEO.pickActive, recovery: TEO.pickRecovery, dmg: 0, fixedDamage: 0,
  height: 'low', hitstun: 10, kb: 1, step: 6, hitstop: 3, shake: 0, steal: true,
  box: { x: 15, y: -75, w: 78, h: 55 } };
const TEO_COUNTER = { startup: 1, active: 4, recovery: 20, dmg: TEO.counterDamage, height: 'high', hitstun: 30, kb: 5,
  launch: -11, hitstop: 6, shake: 3, step: 6, box: { x: 10, y: -145, w: 100, h: 120 } };
const TEO_BELLOW = { startup: TEO.bellowWindup, active: 3, recovery: 20, dmg: TEO.bellowDamage, height: 'high',
  hitstun: 30, kb: 20, launch: -5, hitstop: 6, shake: 4, blockGuard: 12, box: { x: 10, y: -155, w: TEO.bellowReach, h: 140 } };
const TEO_ABILITY = { chug: TEO.chugCooldown, bottle: TEO.throwCooldown, pick: TEO.pickCooldown, dodge: TEO.dodgeCooldown, smokeBreak: TEO.breakCooldown, bellow: TEO.bellowCooldown };
function teoSlot(f, key) {
  const drunk = teoDrunk(f);
  return key === 'special' ? drunk ? 'bottle' : 'chug' : key === 'downSpecial' ? drunk ? 'dodge' : 'pick' : drunk ? 'bellow' : 'smokeBreak';
}
const TEO_ABILITIES = CHARACTER_ABILITIES.teo = {
  cooldowns: { special: 120, downSpecial: 240, upSpecial: 480 },
  labels: { special: 'CHUG', downSpecial: 'PICK', upSpecial: 'BREAK' },
  reset(f) { f.tipsy = 0; f.bottles = 0; f.abilityCooldowns = {}; f.puddles = []; f.smokeHold = 0; f.blackoutPending = false; f.lootFly = 0; },
  cooldownFor(f, key) { return TEO_ABILITY[teoSlot(f, key)]; },
  cooldownLeft(f, key) { return f.abilityCooldowns[teoSlot(f, key)] || 0; },
  labelFor(f, key) { return { chug: 'CHUG', bottle: 'THROW', pick: 'PICK', dodge: 'DODGE', smokeBreak: 'BREAK', bellow: 'BELLOW' }[teoSlot(f, key)]; },
  onSpecialUsed(f, key) { f.abilityCooldowns[f.usedAbility] = TEO_ABILITY[f.usedAbility]; },
  damageScale(f) { return teoDrunk(f) ? TEO.drunkDamage : f.tipsy >= 25 ? TEO.buzzDamage : 1; },
  speedScale(f) { return f.tipsy >= 25 && f.tipsy < 60 ? TEO.buzzSpeed : 1; },
  armor(f, m) { return teoDrunk(f) && m.height !== 'heavy' && !m.grab; },
  avoid(f, m) {
    if (f.state === 'stumbleDodge' && f.stateFrame >= TEO.dodgeFrom && f.stateFrame <= TEO.dodgeThrough && ['high', 'low'].includes(m.height) && !m.grab && !m.unblockable) { f.dodged = true; return true; }
    return false;
  },
  onHit(f, victim, dmg, name, g) { if (!['pickpocket', 'grab'].includes(name)) lootBottle(f, g); },
  special(f, opp, g) {
    const id = teoSlot(f, 'special');
    if (!f.bottles || f.abilityCooldowns[id] || (id === 'bottle' && g.projectiles.some(p => p.owner === f.index && p.kind === 'bottle'))) return false;
    f.usedAbility = id; f.bottles--; return openAbility(f, id === 'chug' ? 'chug' : 'bottleWindup', id === 'chug' ? TEO.chugFrames : TEO.throwWindup + 18);
  },
  downSpecial(f) {
    const id = teoSlot(f, 'downSpecial'); if (f.abilityCooldowns[id]) return false;
    f.usedAbility = id;
    if (id === 'pick') return kitAttack(f, 'pickpocket', TEO_PICK);
    f.dodged = false; return openAbility(f, 'stumbleDodge', TEO.dodgeThrough + TEO.dodgeRecovery);
  },
  upSpecial(f) {
    const id = teoSlot(f, 'upSpecial'); if (f.abilityCooldowns[id]) return false;
    f.usedAbility = id;
    if (id === 'smokeBreak') return openAbility(f, 'smokeBreak', TEO.breakFrames);
    return kitAttack(f, 'bellow', { ...TEO_BELLOW, kb: TEO_BELLOW.kb * (f.tipsy >= 90 ? 1.5 : 1) });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    for (const key of Object.keys(f.abilityCooldowns)) f.abilityCooldowns[key] = Math.max(0, f.abilityCooldowns[key] - 1);
    if (f.smokeHold > 0) f.smokeHold--;
    if (!f.smokeHold && !f.bottles && f.state === 'idle' && !ownDomain(f)) f.tipsy = Math.max(0, f.tipsy - TEO.tipsyDrain / 60);
    if (f.blackoutPending && !ownDomain(f) && !['throw', 'thrown', 'burst', 'ko'].includes(f.state)) {
      f.blackoutPending = false; f.tipsy = 50; openAbility(f, 'blackout', TEO.blackoutFrames);
      g.popup('BLACKOUT!', f.x, f.y - 220, '#ffb673', 40); g.sound('hiccup');
    }
    const sf = f.stateFrame;
    if (f.state === 'chug' && sf >= TEO.chugFrames) { addTipsy(f, TEO.chugTipsy, g); f.enter('idle'); g.sound('chug'); }
    else if (f.state === 'bottleWindup') {
      if (sf === TEO.throwWindup) spawnProjectile(g, { kind: 'bottle', owner: f.index, x: f.x + 45 * f.facing, y: f.y - 130,
        facing: f.facing, vx: TEO.bottleSpeed * f.facing, vy: -2, framesLeft: 110, box: { w: 22, h: 32 }, name: 'bottleThrow', blockGuard: 6,
        move: { dmg: TEO.bottleDamage, fixedDamage: TEO.bottleDamage, height: 'high', hitstun: 16, kb: 4, hitstop: 4, shake: 1, startup: 12, active: 1, recovery: 18 } });
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'smokeBreak' && sf >= TEO.breakFrames) {
      f.smokeHold = TEO.breakHold; f.guard = Math.min(100, f.guard + TEO.breakGuard); f.enter('idle'); g.sound('smoke');
    } else if (f.state === 'stumbleDodge') {
      if (sf === TEO.dodgeThrough + 1 && f.dodged) kitAttack(f, 'stumbleCounter', TEO_COUNTER);
      else if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'blackout' && sf >= TEO.blackoutFrames) f.enter('idle');
    for (const key of ['special', 'downSpecial', 'upSpecial']) f.cooldowns[key] = f.abilityCooldowns[teoSlot(f, key)] || 0;
  },
  cpuChoice(f, opp, distance) {
    if (!teoDrunk(f)) {
      if (f.bottles && f.tipsy < 50 && !f.cooldowns.special && opp.state !== 'attack') return 'special';
      if (distance < 90 && !f.cooldowns.downSpecial) return 'downSpecial';
      if (distance > 450 && f.tipsy >= 25 && !f.cooldowns.upSpecial) return 'upSpecial';
    } else {
      if (opp.state === 'attack' && distance < 150 && !f.cooldowns.downSpecial) return 'downSpecial';
      if (f.bottles && distance > 180 && !f.cooldowns.special) return 'special';
      if (distance < 260 && !f.cooldowns.upSpecial) return 'upSpecial';
    }
    return null;
  },
  pose(f, t, frame) { return newRosterPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawNewFighterBody(ctx, f, p, t); },
  drawMeter(ctx, f) { drawKitMeter(ctx, f, f.tipsy, `TIPSY · ${ownDomain(f) ? 'PRACTICED' : f.tipsy >= 90 ? 'BLACKOUT' : f.tipsy >= 60 ? 'DRUNK' : f.tipsy >= 25 ? 'BUZZED' : 'SOBER'} · ${f.bottles}/3 BOTTLES`, '#f4bd62'); },
};
function shatterBottle(p, g) {
  const owner = fighters[p.owner]; owner.puddles.push({ x: clampArena(p.x), life: TEO.puddleFrames });
  g.sparks(p.x, FLOOR - 5, '#e1f3ff', 14); g.sound('glass');
}
