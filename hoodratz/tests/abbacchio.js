// Abbacchio: Stand strike, Replay counter, Rising Kick, Moody Blues, sprite clips and poses. Uses helpers from milestone5.js.
function abbacchioVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('abbacchio'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function abbacchioSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Abbacchio is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('abbacchio') && CHARACTERS.abbacchio.name === 'ABBACCHIO' && THROWS.abbacchio, 'rostered');
  abbacchioVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'abbacchioPalm', 'abbacchioReplay', 'abbacchioReplayHit'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = abbacchioMotion(p1); assert(ABBACCHIO_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    abbacchioVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = abbacchioMotion(p1); assert(ABBACCHIO_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  abbacchioVs(); abbacchioSpecial('up');
  for (let frame = 0; frame < 50; frame++) {
    p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), 'rise/' + frame);
    assert(ABBACCHIO_ATLAS.clips[abbacchioMotion(p1).key], 'rise clip');
  }
  abbacchioVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(abbacchioMotion(p1).key === 'grab', 'grab clip while throwing'); p1.enter('idle');
  for (const key of Object.keys(ABBACCHIO_ATLAS.clips)) { const c = ABBACCHIO_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= ABBACCHIO_ATLAS.frames, 'atlas ' + key); }
  drawAbbacchioSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawAbbacchioPortrait(STUB_CANVAS, 0, 0, 80); drawAbbacchioProjectiles(STUB_CANVAS, g);
});
check('Moody Blues strike sends one 45-damage Stand punch on frame 16; blocking stops it; 120-frame cooldown', () => {
  abbacchioVs('rip', 350); abbacchioSpecial();
  assert(p1.state === 'abbacchioPalm' && p1.cooldowns.special === ABBACCHIO.palmCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < ABBACCHIO.palmFrames + 50; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'abbacchioStand') seen.add(pr); }
  assert(seen.size === 1, 'one Stand punch: ' + seen.size);
  assert(p2.hp === MAX_HP - ABBACCHIO.palmDamage, 'hits once for 45: ' + p2.hp);
  abbacchioVs('rip', 350); press('Quote'); step(); abbacchioSpecial(); for (let i = 0; i < 100; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  abbacchioVs(); abbacchioSpecial(); step(ABBACCHIO.palmAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'abbacchioStand'), 'nothing before frame 16');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'abbacchioStand'), 'interrupted strike spawns nothing');
});
check('Replay catches a frontal strike once without damage, replies for 75, and a whiff is punishable', () => {
  abbacchioVs('rip', 80); abbacchioSpecial('down');
  assert(p1.state === 'abbacchioReplay' && p1.cooldowns.downSpecial === ABBACCHIO.replayCooldown, 'stance');
  p2.startAttack('light'); stepUntil(() => p1.state === 'abbacchioReplayHit', 20);
  assert(p1.state === 'abbacchioReplayHit' && p2.state === 'hitstun' && p2.hp === MAX_HP, 'caught without damage');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ABBACCHIO.replayDamage, 'one reply for 75: ' + p2.hp);
  stepUntil(() => p1.state === 'idle', 60);
  abbacchioVs('rip', 400); abbacchioSpecial('down'); step(ABBACCHIO.replayFrames - 2); assert(p1.state === 'abbacchioReplay', 'still committed');
  step(3); assert(p1.state === 'idle' && p2.hp === MAX_HP, 'whiff ends');
  abbacchioVs('rip', 80); abbacchioSpecial('down'); p2.y = FLOOR - 120; p2.vy = -1; p2.enter('air'); p2.startAttack('air');
  step(20); assert(p1.state !== 'abbacchioReplayHit', 'does not catch an aerial attack');
});
check('Rising Kick leaps into a 65-damage launcher and is punishable on whiff', () => {
  abbacchioVs('rip', 110); abbacchioSpecial('up');
  assert(p1.moveName === 'rise' && p1.cooldowns.upSpecial === ABBACCHIO.riseCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ABBACCHIO.riseDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  abbacchioVs('rip', 600); abbacchioSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Moody Blues is his domain: +20% damage and +10% speed for its duration; nobody else benefits', () => {
  abbacchioVs(); assert(p1.kit.damageScale(p1) === 1 && p1.kit.speedScale(p1) === 1, 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'abbacchio', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(abbacchioReplaying(p1) && p1.ultimate === 0, 'active and the meter is spent');
  assert(p1.kit.damageScale(p1) === ABBACCHIO.moodyDamage && p1.kit.speedScale(p1) === ABBACCHIO.moodySpeed, 'buffs apply to Abbacchio');
  assert(p2.kit?.damageScale?.(p2) !== ABBACCHIO.moodyDamage, 'not the opponent');
  drawAbbacchioSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!abbacchioReplaying(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
});
check('CPU Abbacchio picks sensible specials and the mirror match uses the alternate palette sheet', () => {
  abbacchioVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'Stand strike at range');
  p2.reset(p1.x + 120, -1); p2.enter('attack'); assert(p1.kit.cpuChoice(p1, p2, 120) === 'downSpecial', 'replay against an attack');
  setup(); p1.setCharacter('abbacchio'); p2.setCharacter('abbacchio', true);
  assert(p2.stats.color === CHARACTERS.abbacchio.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawAbbacchioSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
check('The Stand strike draws Moody Blues from the atlas while it flies', () => {
  assert(ABBACCHIO_ATLAS.clips.stand && ABBACCHIO_ATLAS.clips.stand.count === 10, 'stand clip');
  abbacchioVs('rip', 420); abbacchioSpecial(); step(ABBACCHIO.palmAt + 2);
  assert(g.projectiles.some(pr => pr.kind === 'abbacchioStand'), 'stand flying'); drawAbbacchioProjectiles(STUB_CANVAS, g);
});
