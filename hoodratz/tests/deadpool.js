// Deadpool: Double Tap, Teleport Belt (and its glitch), Chimichanga Spin, healing factor, Maximum Effort, jokes, sprite lookup.
// Uses helpers from milestone5.js (setup, step, rosterVs/incoming from character tests).
function deadpoolVs(opp = 'rip') {
  setup(); p1.setCharacter('deadpool'); p2.setCharacter(opp); p1.reset(500, 1); p2.reset(760, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function deadpoolSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Deadpool is on the roster and every one of his poses, states and abilities is finite', () => {
  assert(ROSTER.includes('deadpool') && CHARACTERS.deadpool.name === 'DEADPOOL', 'rostered');
  deadpoolVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'deadpoolShoot', 'deadpoolBelt'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    deadpoolVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++)
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
  }
  deadpoolVs(); DEADPOOL_ABILITIES.upSpecial(p1);
  for (let frame = 0; frame < 50; frame++) assert(poseIsFinite(animatedPose(p1, frame, frame)), `spin/${frame}`);
  const lines = []; drawDeadpoolSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawDeadpoolPortrait(STUB_CANVAS, 0, 0, 80); drawDeadpoolProjectiles(STUB_CANVAS, g);
});
check('Double Tap fires two 22-damage shots 10 and 20 frames in; blocking stops them; the cooldown is 2.5 s', () => {
  deadpoolVs(); deadpoolSpecial();
  assert(p1.state === 'deadpoolShoot' && p1.cooldowns.special === DEADPOOL.shootCooldown, 'opens');
  const hp = p2.hp; let shots = 0, seen = new Set();
  for (let i = 0; i < DEADPOOL.shootFrames + 30; i++) {
    step(); for (const pr of g.projectiles) if (pr.kind === 'deadpoolShot' && !seen.has(pr)) { seen.add(pr); shots++; }
  }
  assert(shots === 2, 'two shots: ' + shots);
  assert(hp - p2.hp >= 2 * DEADPOOL.shotDamage - 4 && hp - p2.hp <= 2 * DEADPOOL.shotDamage, 'both hit for ~22 (second one combo-scaled): ' + (hp - p2.hp));
  deadpoolVs(); press('Quote'); step(); press('KeyT'); step(); release('KeyT');
  for (let i = 0; i < 80; i++) step();
  release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing: ' + p2.hp);
});
check('Teleport Belt lands behind the opponent on the right frame; one in five glitches into a short hop and a stumble', () => {
  deadpoolVs(); p2.facing = -1; deadpoolSpecial('down');
  assert(p1.state === 'deadpoolBelt', 'opens');
  const normal = !p1.dpGlitch; const x0 = p1.x;
  for (let i = 0; i < DEADPOOL.beltAt; i++) step();
  step();
  if (normal) assert(Math.abs(p1.x - (p2.x + DEADPOOL.behind)) < 1 && p1.facing === -1, 'behind the opponent: ' + p1.x);
  else assert(Math.abs(p1.x - x0) <= DEADPOOL.glitchHop + 1, 'glitch hop only');
  // The belt's seeded roll is deterministic and glitches about one time in five.
  let glitches = 0, a = [], b = [];
  for (const run of [a, b]) { deadpoolVs(); p1.dpSeed = 4242; for (let i = 0; i < 200; i++) run.push(deadpoolRandom(p1) < DEADPOOL.glitchChance); }
  assert(JSON.stringify(a) === JSON.stringify(b), 'deterministic');
  glitches = a.filter(Boolean).length; assert(glitches > 20 && glitches < 60, 'about one in five: ' + glitches + '/200');
  // Pinned at a wall, the belt lands in front instead of inside the wall.
  deadpoolVs(); p1.x = 300; p2.reset(WALL_L + HALF_W + 5, 1); p1.dpSeed = 7; p1.dpGlitch = false;
  p1.kit.downSpecial(p1); p1.dpGlitch = false; p1.abilityFrames = DEADPOOL.beltFrames;
  for (let i = 0; i < DEADPOOL.beltAt + 1; i++) step();
  assert(p1.x >= WALL_L + HALF_W - 1 && Math.abs(p1.x - p2.x) >= 50, 'not inside the wall: ' + p1.x);
});
check('Chimichanga Spin is a 55-damage launching anti-air on a 6 s cooldown', () => {
  deadpoolVs(); p2.reset(560, -1); deadpoolSpecial('up');
  assert(p1.state === 'attack' && p1.moveName === 'spin' && p1.cooldowns.upSpecial === DEADPOOL.spinCooldown, 'opens as an attack');
  for (let i = 0; i < DEADPOOL.spinStartup + 4; i++) step();
  assert(p2.hp === MAX_HP - DEADPOOL.spinDamage && p2.state === 'hitstun' && p2.vy < 0, 'hits and launches: ' + p2.hp);
});
check('Healing factor refills health after 2 s unhit (capped at 150 per round); being hit restarts it; the cap resets next round', () => {
  deadpoolVs(); p1.hp = 500; p1.dpHitAt = g.frame;
  for (let i = 0; i < DEADPOOL.healDelay - 5; i++) step();
  assert(p1.hp === 500, 'nothing during the delay');
  for (let i = 0; i < 400; i++) step();
  assert(p1.hp > 500 && p1.hp < 500 + 400 * DEADPOOL.healPerFrame + 1, 'heals slowly: ' + p1.hp);
  p1.hp = 100; p1.dpHealLeft = 150; p1.dpHitAt = -9999;
  for (let i = 0; i < 1500; i++) step();
  assert(p1.hp <= 100 + DEADPOOL.healCap && p1.hp >= 100 + DEADPOOL.healCap - 1 && p1.dpHealLeft <= 1, 'capped at 150: ' + p1.hp);
  p1.hp = 400; p1.dpHitAt = g.frame; p1.dpHealLeft = 150;
  for (let i = 0; i < 100; i++) step();
  assert(p1.hp === 400, 'a recent hit blocks healing');
  p1.kit.reset(p1); assert(p1.dpHealLeft === DEADPOOL.healCap, 'cap refilled for a new round');
});
check('Maximum Effort is his domain: it costs the meter, heals three times as fast and fires pistols on its own for 8 s; the meter stays locked', () => {
  deadpoolVs(); p1.ultimate = ULTIMATE_MAX; p1.hp = 300; p1.dpHitAt = -9999;
  press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'deadpool', 'the cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(deadpoolEffort(p1) && g.domain.type === 'deadpool' && p1.ultimate === 0, 'domain is active and the meter is spent');
  gainMeter(p1, 50); assert(p1.ultimate === 0, 'ultimate stays locked while it runs');
  const shots = new Set(); const hpAt = p1.hp;
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'deadpoolShot') shots.add(pr); }
  assert(shots.size >= 4 && shots.size <= 7, 'auto pistols: ' + shots.size);
  assert(!deadpoolEffort(p1), 'ended after 8 s');
  assert(p1.hp > hpAt + 20, 'healed faster: ' + (p1.hp - hpAt));
  gainMeter(p1, 50); assert(p1.ultimate === 50, 'meter works again afterwards');
});
check('Deadpool talks to the player: a hello at the start, a joke when low, and never more often than every 5 s', () => {
  deadpoolVs(); const popups = []; const orig = g.popup; g.popup = (text, ...rest) => { popups.push(text); return orig.call(g, text, ...rest); };
  try {
    step(); assert(popups.includes('HI, PLAYER 2'), 'greets: ' + popups);
    popups.length = 0; p1.dpJokeAt = 0; p1.hp = MAX_HP * .25; p1.kit.onTakenHit(p1);
    assert(popups.includes('THIS IS FINE'), 'low health joke');
    popups.length = 0; for (let i = 0; i < 30; i++) { p1.kit.onTakenHit(p1); step(); }
    assert(popups.filter(t => t !== 'THIS IS FINE').length <= 1, 'jokes are rate limited');
  } finally { g.popup = orig; }
});
check('Deadpool draws the MUGEN sprite clips: every state maps to a clip and the Teleport Belt fades him out', () => {
  deadpoolVs();
  for (const clip of ['idle', 'walk', 'shoot', 'belt', 'spin', 'swordz', 'knife', 'grab', 'hit', 'ko']) assert(DEADPOOL_ATLAS.clips[clip]?.count >= 1, 'clip ' + clip);
  for (const state of ['idle', 'walk', 'run', 'block', 'hitstun', 'ko', 'air', 'deadpoolShoot', 'deadpoolBelt', 'mxShot']) {
    p1.enter(state); p1.abilityFrames = 30; p1.mxClip = 'knife'; p1.stateFrame = 5;
    assert(DEADPOOL_ATLAS.clips[deadpoolMotion(p1).key], 'motion ' + state);
  }
  p1.enter('deadpoolBelt'); p1.dpGlitch = false; p1.stateFrame = DEADPOOL.beltGoneFrom + 1; assert(deadpoolFrameAlpha(p1) === 0, 'invisible mid-teleport');
  p1.stateFrame = 0; assert(deadpoolFrameAlpha(p1) === 1, 'visible before the teleport');
  deadpoolVs(); p1.startAttack('light'); assert(deadpoolMotion(p1).key === 'light', 'normals use their own clips');
});
