function special(down = false) {
  if (down) press('KeyS'); press('KeyT'); step(); release('KeyT'); release('KeyS');
}

check('Mirror Step is invincible only on frames 2–14, including heavies and grabs', () => {
  for (const frame of [1, 2, 5, 14, 15]) for (const move of ['light', 'heavy', 'grab']) {
    setup(); p1.reset(800, 1); p2.reset(860, -1); HAZE_ABILITIES.special(p1, p2, g); p1.stateFrame = frame;
    p2.startAttack(move); p2.stateFrame = p2.move.startup;
    const pt = hitPoint(p2, p1), invincible = frame >= 2 && frame <= 14;
    assert(!!pt !== invincible, `${move} on ${frame}`);
    applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g); finishThrow();
    assert((p1.hp === MAX_HP) === invincible, 'damage window');
  }
});

check('Mirror Step passes through, shoves active attacks with momentum and movement direction', () => {
  for (const momentum of [0, 60, 100]) for (const direction of [-1, 1]) {
    setup(); p1.reset(800, 1); p2.reset(808, -1);
    p2.startAttack('heavy'); p2.stateFrame = MOVES.heavy.startup; p2.momentum = momentum; p2.vx = direction * 2;
    special();
    assert(p1.mirrorPassed && p2.state === 'hitstun', 'no crossing shove');
    near(p2.vx, direction * (6 + momentum * 0.12)); near(p2.hitstun, 14);
    assert(p2.mirrorBounce === (momentum >= 60), 'forced bounce flag');
    near(p1.hp, MAX_HP); near(p2.hp, MAX_HP);
    assert(Math.abs(p1.x - p2.x) < PUSH_W, 'body collision prevented passing');
  }
});

check('Mirror Step does not shove wind-ups and has 10-frame recovery on a miss', () => {
  setup(); p1.reset(800, 1); p2.reset(808, -1); p2.startAttack('heavy');
  special(); assert(p1.mirrorPassed && p2.state === 'attack', 'wind-up shoved');
  setup(); p1.reset(800, 1); p2.reset(808, -1); p2.y = FLOOR - 220;
  p2.startAttack('air'); p2.stateFrame = MOVES.air.startup; special();
  assert(!p1.mirrorPassed && p2.state === 'attack', 'shoved opponent overhead without passing through');
  setup(); p1.reset(300, 1); p2.reset(900, -1); special(); step(19);
  assert(p1.state === 'mirrorStep', 'step ended early'); step(); assert(p1.state === 'abilityRecover', 'missing miss recovery');
  press('KeyF'); step(); release('KeyF'); assert(p1.state === 'abilityRecover', 'cancelled recovery');
  step(8); assert(p1.state === 'abilityRecover', 'recovery too short'); step(); assert(p1.state === 'idle', 'recovery too long');
});

check('60+ momentum Mirror shove wall-bounces even below the normal speed threshold', () => {
  setup(); p1.reset(1160, 1); p2.reset(1168, -1);
  p2.startAttack('heavy'); p2.stateFrame = MOVES.heavy.startup; p2.vx = 2; p2.momentum = 60;
  special(); assert(p2.mirrorBounce, 'shove flag');
  step(8); assert(p2.wallBounced, 'shove did not bounce'); near(p1.ultimate, 5);
  const meter = p1.ultimate; p2.x = WALL_L + HALF_W; p2.vx = -10; p2.physics(g); near(p1.ultimate, meter);
  p2.enter('idle'); assert(!p2.mirrorBounce, 'shove flag leaked to next combo');
});

check('Smoke Screen dashes 200 pixels in held direction or backward, clamps at walls', () => {
  for (const [key, x] of [[null, 300], ['KeyD', 700], ['KeyA', 300]]) {
    setup(); p1.reset(500, 1); p2.reset(1000, -1); if (key) press(key);
    special(true); if (key) release(key);
    near(p1.x, x); assert(g.clouds.length === 1 && g.clouds[0].decoy.x === 500, 'spawn origin');
    near(g.clouds[0].radius, 140); near(g.clouds[0].framesLeft, 180);
  }
  setup(); p1.reset(100, 1); special(true); near(p1.x, WALL_L + HALF_W);
});

check('decoy absorbs exactly one enemy move without damage, guard or meter gains', () => {
  setup(); p1.reset(600, 1); p2.reset(670, -1); special(true);
  p1.x = 610; p1.enter('idle'); p2.startAttack('light'); p2.stateFrame = MOVES.light.startup;
  resolveCombat(p1, p2, g);
  assert(!g.clouds[0].decoy && p2.moveHit && p2.moveAbsorbed, 'decoy not consumed');
  near(p1.hp, MAX_HP); near(p1.guard, 100); near(p2.ultimate, 0);
  resolveCombat(p1, p2, g); near(p1.hp, MAX_HP);
  p2.startAttack('light'); p2.stateFrame = MOVES.light.startup; resolveCombat(p1, p2, g);
  assert(p1.hp < MAX_HP, 'second move absorbed');
});

check('smoke and cooldowns expire on exact logic frames; freeze and reset correctly', () => {
  setup(); special(); p1.enter('idle'); special(); assert(p1.state === 'idle', 'Mirror reused during cooldown');
  setup(); special(true); p1.enter('idle'); special(true); assert(g.clouds.length === 1, 'Smoke reused during cooldown');
  setup(); p1.reset(500, 1); p2.reset(1000, -1); special(); near(p1.cooldowns.special, 90);
  g.paused = true; tick(); near(p1.cooldowns.special, 90); g.paused = false;
  g.hitstopLeft = 2; tick(); near(p1.cooldowns.special, 90);
  step(89); near(p1.cooldowns.special, 1); step(); near(p1.cooldowns.special, 0);
  setup(); special(true); near(p1.cooldowns.downSpecial, 540); step(179);
  assert(g.clouds.length === 1 && g.clouds[0].framesLeft === 1, 'cloud early expiry');
  step(); assert(g.clouds.length === 0, 'cloud late expiry'); step(359); near(p1.cooldowns.downSpecial, 1);
  step(); near(p1.cooldowns.downSpecial, 0);
  special(true); startRound(); assert(g.clouds.length === 0 && g.smokePuffs.length === 0, 'round objects leaked');
  near(p1.cooldowns.downSpecial, 0);
});

check('specials activate from allowed grounded states, end chains and cannot cancel out', () => {
  for (const state of ['idle', 'walk', 'run', 'skid', 'dash']) {
    setup(); p1.enter(state); p1.stateFrame = state === 'dash' ? 3 : 0;
    special(); assert(p1.state === 'mirrorStep', state);
    press('KeyF'); step(); release('KeyF'); assert(p1.state === 'mirrorStep', 'cancelled step');
  }
  for (const state of ['air', 'land', 'jumpsquat', 'hitstun', 'stagger']) {
    setup(); p1.enter(state); p1.hitstun = 30; p1.timer = 30;
    if (state === 'air') { p1.y = FLOOR - 100; p1.vy = -5; }
    special(); assert(p1.state !== 'mirrorStep', state + ' special'); near(p1.cooldowns.special, 0);
  }
  setup(); p1.enter('dash'); special(); assert(p1.state === 'dash', 'early dash cancel');
  setup(); strike(); p1.stateFrame = MOVES.light.startup + MOVES.light.active - 1;
  special(); assert(p1.state === 'mirrorStep', 'hit chain did not cancel');
  setup(); p1.startAttack('light'); p1.stateFrame = 7; special(); assert(p1.state === 'attack', 'whiff chain cancel');
  setup(); guardDrain(p1, 100); special(); assert(p1.state !== 'mirrorStep', 'guard-broken dodge');
});

check('Exhale gives Haze perfect parries 15 extra stagger, but not early parries or Rip', () => {
  setup(); p1.startParry('high'); p2.startAttack('light'); p2.stateFrame = 5;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 120 }, g);
  near(p2.timer, 45); near(p1.ultimate, 15); assert(g.smokePuffs.length > 0, 'no Exhale puff');
  setup(); p1.startParry('high'); p1.stateFrame = 5; p2.startAttack('light');
  applyHit(p2, p1, { x: p1.x, y: p1.y - 120 }, g); near(p2.timer, 14); assert(g.smokePuffs.length === 0, 'early Exhale');
  setup(); p2.startParry('high'); strike(); near(p1.timer, 30); assert(g.smokePuffs.length === 0, 'Rip Exhale');
});

check('only Haze is obscured inside a smoke cloud; leaving restores visibility', () => {
  setup(); p1.reset(600, 1); p2.reset(850, -1); special(true);
  assert(!inSmoke(p1, g), 'dash stayed obscured'); p1.x = 600; assert(inSmoke(p1, g), 'Haze not obscured');
  p2.x = 600; assert(!inSmoke(p2, g), 'Rip obscured'); p1.x = 741; assert(!inSmoke(p1, g), 'outside cloud');
});

// Smoke cloud, decoy, Haze silhouette and cooldowns in one view.
setup(); p1.reset(600, 1); p2.reset(960, -1); special(true);
p1.x = 690; p1.enter('idle'); g.shakeMag = 0;
if (typeof document !== 'undefined' && document.body) {
  render(ctx, g, fighters, STEP);
  document.getElementById('test-report').textContent = testResults.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n');
}
