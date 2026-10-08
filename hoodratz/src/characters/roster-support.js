// Small kit hooks keep character rules independent of player side and projectile proxies.
function opponentsOf(f, aliveOnly = false) {
  return fighters.filter(other => other.index !== f.index && (!aliveOnly || (!other.koed && other.hp > 0)));
}
function observedEnemyX(f, enemy) {
  if (f.input instanceof CpuInput && nullHidden(enemy, g)) return f.input.lastSeenPositions?.[enemy.index] ?? enemy.previousX ?? enemy.x;
  if (enemy.blDecoy && !enemy.blDecoy.revealing) return decoyX(enemy);
  if (enemy.lagLeft > 0 && enemy.lagTrail?.length) return enemy.lagTrail[0].x;
  return enemy.x;
}
// Keep cinematic partners and combo targets stable; otherwise face the nearest surviving enemy.
function opponentOf(f) {
  if (fighters.length === 2) return fighters[1 - f.index] || fighters[0];
  if (f.state === 'thrown' && fighters[f.thrownBy]) return fighters[f.thrownBy];
  if (['throw', 'goonHold'].includes(f.state) && fighters[f.throwTarget]) return fighters[f.throwTarget];
  const pressuring = fighters[f.state === 'blockstun' ? f.blockAttacker : f.state === 'hitstun' ? f.comboAttacker : null];
  if (pressuring && !pressuring.koed) return pressuring;
  const linked = fighters[f.abilityLink?.target ?? f.combatTarget];
  if (linked && !linked.koed && ['hitstun', 'thrown'].includes(linked.state) && linked.comboAttacker === f.index) return linked;
  const enemies = opponentsOf(f, true), choices = enemies.length ? enemies : opponentsOf(f);
  return choices.sort((a, b) => Math.abs(observedEnemyX(f,a) - f.x) + Math.abs(a.y - f.y) * .25 - Math.abs(observedEnemyX(f,b) - f.x) - Math.abs(b.y - f.y) * .25 || a.index - b.index)[0] || f;
}
function fighterPairs() {
  const pairs = [];
  for (let i = 0; i < fighters.length; i++) for (let j = i + 1; j < fighters.length; j++) {
    if (!fighters[i].koed && !fighters[j].koed) pairs.push([fighters[i], fighters[j]]);
  }
  return pairs;
}
function realAttacker(f) { return f.projectileOwner === undefined ? f : fighters[f.projectileOwner]; }
function ownDomain(f, type = f.stats.id==='siglarp'&&f.siglarpUltimateId?f.siglarpUltimateId:f.stats.id) { return g.domain?.type === type && g.domain.owner === f.index; }
function enemyDomain(f, type) { return g.domain?.type === type && g.domain.owner !== f.index; }
function clampArena(x) { return Math.max(WALL_L + HALF_W, Math.min(WALL_R - HALF_W, x)); }
function openAbility(f, state, frames) { f.vx = 0; f.abilityFrames = frames; f.enter(state); return true; }
function kitAttack(f, name, move) {
  f.startAttack('light'); f.move = move; f.moveName = name; f.moveMomentum = 0; f.normalWaveSent = true; f.fake = false;
  f.vx = (move.step || 0) * f.facing;
  return true;
}
function damageScale(f, victim, move = f.move) { return f.kit?.damageScale?.(realAttacker(f), victim, move) ?? 1; }
function takenDamageScale(f) {return f.kit?.takenDamageScale?.(f)??1;}
function rosterSpeed(f) {
  let scale = f.kit?.speedScale?.(f) ?? 1;
  if (f.dread >= 33) scale *= CHEESE.fearSlow;
  if (enemyDomain(f, 'cheese')) scale *= CHEESE.chaseSlow;
  if (fighters.some(owner => owner.index !== f.index && owner.puddles?.some(p => Math.abs(f.x - p.x) <= 70 && f.grounded))) scale *= TEO.puddleSlow;
  return scale;
}
function rosterDrift(f) {
  if (!NEUTRAL.has(f.state) || !f.grounded) return 0;
  if (enemyDomain(f, 'lancer')) return (Math.sign(f.x - fighters[g.domain.owner].x) || -f.facing) * LANCER.skyDrift;
  if (enemyDomain(f, 'teo')) return Math.sin(g.frame * .11 + f.index) * 1.5;
  if (f.stats.id === 'teo' && teoDrunk(f)) return Math.sin(g.frame * .12) * TEO.drift;
  return 0;
}
function attackWobble(f) {
  if (!['light', 'medium', 'lowMedium', 'low', 'overhead'].includes(f.moveName) || f.move?.air) return 0;
  return (f.stats.id === 'teo' && teoDrunk(f)) || enemyDomain(f, 'teo') ? Math.sin(g.frame * .17 + f.index) * TEO.wobble : 0;
}
function addDread(f, amount) { f.dread = Math.max(0, Math.min(100, f.dread + amount)); if (f.dread >= 100) f.dreadQueued = true; }
function opponentWhiff(f) {
  const opp = opponentOf(f);
  if (opp.stats.id === 'cheese') addDread(f, CHEESE.whiffDread);
}
function updateRosterWorld(g) {
  updateNullMarks(g);
  updateBrainlagWorld(g);
  if (g.scareLeft > 0) g.scareLeft--;
  for (const owner of fighters) {
    if (owner.puddles) owner.puddles = owner.puddles.filter(p => --p.life > 0);
    if (owner.lootFly > 0) owner.lootFly--;
    const haunting=owner.stats.id==='cheese'||owner.siglarpUltimateId==='cheese';
    if (!haunting&&!(isSiglarp(owner)&&owner.traps?.length)) continue;
    for (const trap of owner.traps) trap.life--;
    for (const victim of opponentsOf(owner, true)) {
    const far = Math.abs(owner.x - victim.x) > 250;
    const delta = owner.state === 'vanished' ? CHEESE.vanishedDread : far ? CHEESE.farDread :
      !['hitstun', 'thrown'].includes(victim.state) ? -CHEESE.closeDrain : 0;
    if(haunting)addDread(victim, (delta + (ownDomain(owner) ? CHEESE.chaseDread : 0)) / 60);
    if (haunting&&victim.dread >= 66 && g.frame % 60 === 0) g.sound('heartbeat');
    if (haunting&&(victim.dreadQueued || victim.dread >= 100) && !g.domainSequence && !victim.koed && !victim.invincible &&
        !['hitstun', 'throw', 'thrown', 'stagger', 'goonHold'].includes(victim.state)) {
      victim.enter('stagger'); victim.timer = CHEESE.scareStun; victim.vx = 0;
      victim.dread = 40; victim.dreadQueued = false; g.scareLeft = CHEESE.scareFrames; g.scareOwner = owner.index;
      g.popup('JUMP SCARE!', victim.x, victim.y - 220, '#d1efaa', 42); g.sound('sting');
    }
    for (const trap of owner.traps) {
      if (trap.life <= 0) continue;
      if (!victim.grounded || victim.invincible || victim.koed || victim.phased || victim.comboCapped ||
          Math.abs(victim.x - trap.x) > CHEESE.trapWidth / 2 ||
          !['walk', 'run', 'dash', 'land', 'idle', 'hitstun'].includes(victim.state)) continue;
      const att = Object.create(owner); att.projectileOwner = owner.index;
      att.move = CHEESE_TRAP; att.moveName = 'trap'; att.moveMomentum = 0; att.facing = Math.sign(victim.x - trap.x) || owner.facing;
      // Floor snares have their specified dread reward, without a second normal-hit reward.
      applyHit(att, victim, { x: trap.x, y: FLOOR - 15 }, g);
      addDread(victim, CHEESE.trapDread); trap.life = 0;
      g.popup('BOO!', trap.x, FLOOR - 90, owner.stats.color, 30); g.sound('sting');
    }
    }
    owner.traps = owner.traps.filter(t => t.life > 0);
  }
}
