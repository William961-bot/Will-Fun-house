// Harley Quinn: Pistol Shot, Hyena Call, Flip Kick, Mad Love, sprite clips and poses. Uses helpers from milestone5.js.
function harleyVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('harley'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function harleySpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
function harleyShots(kind, frames) {
  const seen = new Set(); for (let i = 0; i < frames; i++) { step(); for (const pr of g.projectiles) if (pr.kind === kind) seen.add(pr); } return seen.size;
}
check('Harley is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('harley') && CHARACTERS.harley.name === 'HARLEY QUINN' && THROWS.harley, 'rostered');
  harleyVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'harleyShoot', 'harleyHyena'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = harleyMotion(p1); assert(HARLEY_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    harleyVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = harleyMotion(p1); assert(HARLEY_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  harleyVs(); harleySpecial('up');
  for (let frame = 0; frame < 50; frame++) {
    p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), 'flip/' + frame);
    assert(HARLEY_ATLAS.clips[harleyMotion(p1).key], 'flip clip');
  }
  for (const key of Object.keys(HARLEY_ATLAS.clips)) { const c = HARLEY_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= HARLEY_ATLAS.frames, 'atlas ' + key); }
  drawHarleySprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawHarleyPortrait(STUB_CANVAS, 0, 0, 80); drawHarleyProjectiles(STUB_CANVAS, g);
});
check('Pistol Shot fires one 35-damage bullet on frame 12; blocking stops it; 90-frame cooldown', () => {
  harleyVs('rip', 350); harleySpecial();
  assert(p1.state === 'harleyShoot' && p1.cooldowns.special === HARLEY.shootCooldown, 'opens and costs the cooldown');
  assert(harleyShots('harleyBullet', HARLEY.shootFrames + 40) === 1, 'one bullet');
  assert(p2.hp === MAX_HP - HARLEY.shootDamage, 'hits once for 35: ' + p2.hp);
  harleyVs('rip', 350); press('Quote'); step(); harleySpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  harleyVs(); harleySpecial(); step(HARLEY.shootAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'harleyBullet'), 'nothing before frame 12');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'harleyBullet'), 'interrupted shot spawns nothing');
});
check('Hyena Call sends a low 55-damage runner on frame 18: it must be blocked low, and a jump clears it', () => {
  harleyVs('rip', 420); harleySpecial('down');
  assert(p1.state === 'harleyHyena' && p1.cooldowns.downSpecial === HARLEY.hyenaCooldown, 'opens');
  step(HARLEY.hyenaAt); const hyena = g.projectiles.find(pr => pr.kind === 'harleyHyena');
  assert(hyena && hyena.move.height === 'low' && hyena.vx === HARLEY.hyenaSpeed, 'a slow low runner');
  harleyShots('harleyHyena', 150); assert(p2.hp === MAX_HP - HARLEY.hyenaDamage, 'hits once for 55: ' + p2.hp);
  harleyVs('rip', 420); harleySpecial('down'); step(HARLEY.hyenaAt); p2.y = FLOOR - 200; p2.vy = -1; p2.enter('air');
  for (let i = 0; i < 20; i++) { step(); p2.y = FLOOR - 200; p2.vy = -1; }
  assert(p2.hp === MAX_HP, 'an airborne opponent is not hit');
});
check('Flip Kick leaps into a 65-damage launcher and is punishable on whiff', () => {
  harleyVs('rip', 110); harleySpecial('up');
  assert(p1.moveName === 'flip' && p1.cooldowns.upSpecial === HARLEY.flipCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - HARLEY.flipDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  harleyVs('rip', 600); harleySpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Mad Love is her domain: +20% damage and +15% speed for its duration; nobody else benefits', () => {
  harleyVs(); assert(p1.kit.damageScale(p1) === 1 && p1.kit.speedScale(p1) === 1, 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'harley', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(harleyMad(p1) && p1.ultimate === 0, 'active and the meter is spent');
  assert(p1.kit.damageScale(p1) === HARLEY.madDamage && p1.kit.speedScale(p1) === HARLEY.madSpeed, 'buffs apply to Harley');
  assert(p2.kit?.damageScale?.(p2) !== HARLEY.madDamage, 'not the opponent');
  drawHarleySprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!harleyMad(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
});
check('CPU Harley picks sensible specials and the mirror match uses the alternate palette sheet', () => {
  harleyVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'downSpecial', 'hyena at range');
  p1.cooldowns.downSpecial = 5; assert(p1.kit.cpuChoice(p1, p2, 300) === 'special', 'pistol');
  setup(); p1.setCharacter('harley'); p2.setCharacter('harley', true);
  assert(p2.stats.color === CHARACTERS.harley.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawHarleySprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
check('Harley and Ghostface show their grab clip while throwing (the shared throw state keeps its own clip)', () => {
  harleyVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(harleyMotion(p1).key === 'grab', 'Harley grab clip'); p1.enter('idle');
  setup(); p1.setCharacter('ghostface'); p1.state = 'throw'; p1.throwFrames = 54; assert(ghostfaceMotion(p1).key === 'grab', 'Ghostface grab clip'); p1.enter('idle');
});
check('Hyena Call draws her MUGEN hyena sprite from the atlas while it runs', () => {
  assert(HARLEY_ATLAS.clips.hyenaRun && HARLEY_ATLAS.clips.hyenaRun.count === 8, 'hyenaRun clip');
  harleyVs('rip', 420); harleySpecial('down'); step(HARLEY.hyenaAt + 2);
  assert(g.projectiles.some(pr => pr.kind === 'harleyHyena'), 'hyena running'); drawHarleyProjectiles(STUB_CANVAS, g);
});
