// Ichigo: Getsuga Tensho, Flash Step, Steel Uppercut, Vasto Lorde, sprite clips and poses. Uses helpers from milestone5.js.
function ichigoVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('ichigo'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function ichigoSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Ichigo is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('ichigo') && CHARACTERS.ichigo.name === 'ICHIGO' && THROWS.ichigo, 'rostered');
  ichigoVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'ichigoGetsuga', 'ichigoFlash'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = ichigoMotion(p1); assert(ICHIGO_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    ichigoVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = ichigoMotion(p1); assert(ICHIGO_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  ichigoVs(); ichigoSpecial('up');
  for (let frame = 0; frame < 50; frame++) {
    p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), 'steel/' + frame);
    assert(ICHIGO_ATLAS.clips[ichigoMotion(p1).key], 'steel clip');
  }
  for (const key of Object.keys(ICHIGO_ATLAS.clips)) { const c = ICHIGO_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= ICHIGO_ATLAS.frames, 'atlas ' + key); }
  drawIchigoSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawIchigoPortrait(STUB_CANVAS, 0, 0, 80); drawIchigoProjectiles(STUB_CANVAS, g);
});
check('Getsuga Tensho fires one 60-damage wave on frame 16; blocking stops it; 150-frame cooldown', () => {
  ichigoVs('rip', 350); ichigoSpecial();
  assert(p1.state === 'ichigoGetsuga' && p1.cooldowns.special === ICHIGO.getsugaCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < ICHIGO.getsugaFrames + 50; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'ichigoGetsuga') seen.add(pr); }
  assert(seen.size === 1, 'one wave: ' + seen.size);
  assert(p2.hp === MAX_HP - ICHIGO.getsugaDamage, 'hits once for 60: ' + p2.hp);
  ichigoVs('rip', 350); press('Quote'); step(); ichigoSpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  ichigoVs(); ichigoSpecial(); step(ICHIGO.getsugaAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'ichigoGetsuga'), 'nothing before frame 16');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'ichigoGetsuga'), 'interrupted cast spawns nothing');
});
check('Flash Step lands behind the opponent on frame 10, deals no damage and costs 300 frames; at a wall it lands in front', () => {
  ichigoVs('rip', 300); p2.facing = -1; ichigoSpecial('down');
  assert(p1.state === 'ichigoFlash' && p1.cooldowns.downSpecial === ICHIGO.flashCooldown, 'opens');
  step(ICHIGO.flashAt);
  assert(Math.abs(p1.x - (p2.x + ICHIGO.behind)) < 1 && p1.facing === -1, 'behind the opponent: ' + p1.x);
  assert(p2.hp === MAX_HP, 'no damage');
  ichigoVs(); p1.x = 300; p2.reset(WALL_L + HALF_W + 5, 1); ichigoSpecial('down'); step(ICHIGO.flashAt);
  assert(p1.x >= WALL_L + HALF_W - 1 && Math.abs(p1.x - p2.x) >= 50, 'not inside the wall: ' + p1.x);
});
check('Steel Uppercut leaps into a 75-damage launcher and is punishable on whiff', () => {
  ichigoVs('rip', 110); ichigoSpecial('up');
  assert(p1.moveName === 'steel' && p1.cooldowns.upSpecial === ICHIGO.steelCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ICHIGO.steelDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  ichigoVs('rip', 600); ichigoSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Vasto Lorde is his domain: +20% damage and +15% speed for its duration; nobody else benefits', () => {
  ichigoVs(); assert(p1.kit.damageScale(p1) === 1 && p1.kit.speedScale(p1) === 1, 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'ichigo', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(ichigoHollow(p1) && p1.ultimate === 0, 'active and the meter is spent');
  assert(p1.kit.damageScale(p1) === ICHIGO.hollowDamage && p1.kit.speedScale(p1) === ICHIGO.hollowSpeed, 'buffs apply to Ichigo');
  assert(p2.kit?.damageScale?.(p2) !== ICHIGO.hollowDamage, 'not the opponent');
  drawIchigoSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!ichigoHollow(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
});
check('CPU Ichigo picks sensible specials and the mirror match uses the alternate palette sheet', () => {
  ichigoVs(); assert(p1.kit.cpuChoice(p1, p2, 500) === 'downSpecial', 'flash step at range');
  p1.cooldowns.downSpecial = 5; assert(p1.kit.cpuChoice(p1, p2, 300) === 'special', 'getsuga');
  setup(); p1.setCharacter('ichigo'); p2.setCharacter('ichigo', true);
  assert(p2.stats.color === CHARACTERS.ichigo.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawIchigoSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
