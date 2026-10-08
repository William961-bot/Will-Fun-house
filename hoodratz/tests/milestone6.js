// Milestone 6 checks use the helpers and result list from milestone5.js.
check('only blocked hits drain guard: clean hits and grabs preserve it at both corner boundaries', () => {
  setup(); strike(); near(p2.guard, 100);
  setup(); strike('grab'); near(p2.guard, 100);
  for (const side of [-1, 1]) for (const distance of [80, 81]) {
    setup(); p2.x = side < 0 ? WALL_L + distance : WALL_R - distance;
    strike(); near(p2.guard, 100);
    setup(); p2.x = side < 0 ? WALL_L + distance : WALL_R - distance;
    strike('grab'); near(p2.guard, 100);
    setup(); p2.x = side < 0 ? WALL_L + distance : WALL_R - distance;
    p2.enter('block'); strike(); near(p2.guard, distance === 80 ? 86 : 90); near(p2.hp, MAX_HP);
  }
});

check('Guard recovers after one quiet second: 10 per second nearby, 20 at distance', () => {
  setup(); p1.x = 100; p2.x = 1100; p2.guard = 50;
  step(59); near(p2.guard, 50); step(); near(p2.guard, 50 + 1 / 3);
  step(59); near(p2.guard, 70);
  p2.guard = 99.9; step(); near(p2.guard, 100);
  setup(); p1.x = 400; p2.x = p1.x + (WALL_R - WALL_L) * 0.4; p2.guard = 50;
  step(59); near(p2.guard, 50); step(); near(p2.guard, 50 + 1 / 6);
  step(59); near(p2.guard, 60);
  p2.x += 1; step(); near(p2.guard, 60 + 1 / 3);
  strike(); p2.enter('idle'); p2.vx = 0;
  const guard = p2.guard; step(59); near(p2.guard, guard); step(); near(p2.guard, guard + 1 / 3);
  for (const state of ['block','blockstun','hitstun','thrown','knockdown']) {
    setup(); p2.guard = 50; p2.framesSinceHit = GUARD.recoveryDelay; p2.state = state;
    p2.updateGuard(p1,g); near(p2.guard,50); near(p2.framesSinceHit,0);
  }
  setup(); p2.guard = 50; p2.framesSinceHit = GUARD.recoveryDelay; p2.input.held.block = true;
  p2.updateGuard(p1,g); near(p2.guard,50); near(p2.framesSinceHit,0);
});

check('guard break lasts 90 logic frames, resets to 50 and does not retrigger', () => {
  setup(); p2.guard = 8; p2.enter('block'); strike();
  assert(p2.guardBroken === 90 && p2.guard === 0, 'break start');
  near(p2.hp, MAX_HP); // The hit causing the break was successfully blocked.
  assert(g.hitstopLeft === 16 && g.shakeMag === 10 && g.shards.length === 20, 'break effects');
  assert(g.popups.some(p => p.text === 'BREAK'), 'break popup');
  near(p1.ultimate, 10); near(p2.ultimate, 0);
  guardDrain(p2, 25); assert(p2.guardBroken === 90 && g.shards.length === 20, 'break retrigger');
  step(89); assert(p2.guardBroken === 1 && p2.guard === 0, 'break length');
  assert(!p2.startParry('high'), 'parry before expiry');
  step(); assert(p2.guardBroken === 0 && p2.guard === 50, 'break reset');
  assert(p2.startParry('high'), 'parry after expiry');
});

check('guard break blocks parry, forward/back dash and slide; walk/attack/jump remain', () => {
  for (const [key, expected] of [['KeyG', 'idle'], ['KeyD', 'walk'], ['KeyA', 'walk'], ['KeyF', 'attack'], ['KeyW', 'jumpsquat']]) {
    setup(); guardDrain(p1, 100); p1.lastTap = { dir: key === 'KeyA' ? 'left' : 'right', frame: g.frame - 2 };
    press(key); step(); release(key); assert(p1.state === expected, `${key}: ${p1.state}`);
  }
  setup(); guardDrain(p1, 100); p1.enter('run'); press('KeyD'); press('KeyS'); step();
  release('KeyD'); release('KeyS'); assert(p1.state === 'run', 'slide while broken');
  setup(); p1.enter('jumpsquat'); guardDrain(p1, 100); press('KeyG'); step(); release('KeyG');
  assert(p1.state === 'jumpsquat', 'overhead parry while broken');
  for (const state of ['parry', 'dash', 'backdash', 'slide', 'rebound']) {
    setup(); p1.enter(state); guardDrain(p1, 100);
    assert(!['parry', 'dash', 'backdash', 'slide', 'rebound'].includes(p1.state), 'active dodge/parry survived break');
  }
});

check('Guard break never increases hit damage, including combo scaling', () => {
  setup(); guardDrain(p2, 100); strike(); near(p2.hp, MAX_HP - 36);
  const hp = p2.hp; strike(); near(hp - p2.hp, 32);
  setup(); guardDrain(p2, 100); p2.state = 'parry'; strike();
  assert(p2.state === 'hitstun' && p2.hp === MAX_HP - 36, 'broken parry intercepted hit');
  for (const name of ['medium','low','overhead','heavy','air','airMedium','airHeavy']) {
    setup(); strike(name); const damage = MAX_HP - p2.hp;
    setup(); guardDrain(p2, 100); strike(name);
    assert(MAX_HP - p2.hp === damage, `${name} guard-break bonus`);
  }
});

check('perfect and early parries grant 15 and 5 without hit/drain rewards', () => {
  for (const [frame, gain] of [[0, 15], [5, 5]]) {
    setup(); p2.startParry('high'); p2.stateFrame = frame; strike();
    near(p2.ultimate, gain); near(p1.ultimate, 0); near(p2.guard, 100);
  }
  setup(); p2.startParry('low'); strike(); near(p1.ultimate, 3); near(p2.ultimate, 2); near(p2.guard, 100);
});

check('combo wall bounce grants attacker 5 once; movement bounce grants none', () => {
  setup(); strike('heavy'); p2.x = WALL_R - HALF_W; p2.physics(g);
  near(p1.ultimate, 8); near(p2.ultimate, 2);
  p2.x = WALL_L + HALF_W; p2.vx = -12; p2.physics(g); near(p1.ultimate, 8);
  setup(); p1.enter('run'); p1.momentum = 60; p1.x = WALL_R - HALF_W; p1.vx = 10;
  p1.physics(g); near(p1.ultimate, 0); near(p2.ultimate, 0);
  setup(); p2.startAttack('heavy'); p2.stateFrame = MOVES.heavy.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  p1.x = WALL_L + HALF_W; p1.physics(g); near(p2.ultimate, 8); near(p1.ultimate, 2);
});

check('ultimate caps at 100, carries to next round, resets on rematch', () => {
  setup(); p1.ultimate = 99; p2.ultimate = 99; strike(); near(p1.ultimate, 100); near(p2.ultimate, 100);
  p2.guard = 0; p2.guardBroken = 20; endRound();
  assert(g.round === 2 && g.wins[0] === 1, 'round transition');
  near(p1.ultimate, 100); near(p2.ultimate, 100); near(p2.guard, 100); near(p2.guardBroken, 0);
  p2.hp = 0; endRound(); assert(g.phase === 'matchOver', 'match end');
  press('Enter'); release('Enter'); near(p1.ultimate, 0); near(p2.ultimate, 0);
});

check('pause, hit-stop and intro freeze guard status; glass fades and round clears it', () => {
  setup(); guardDrain(p1, 100); g.paused = true; tick(); near(p1.guardBroken, 90);
  g.paused = false; const frame = g.frame; tick(); near(p1.guardBroken, 90); near(g.frame, frame);
  assert(g.shards.every(s => s.life === GUARD.shardFrames), 'glass moved during hit-stop');
  g.phase = 'intro'; g.phaseTimer = 20; g.hitstopLeft = 0; tick(); near(p1.guardBroken, 90);
  g.phase = 'fight'; step(); near(p1.guardBroken, 89);
  for (let i = 0; i < GUARD.shardFrames; i++) updateFx(); assert(g.shards.length === 0, 'glass never faded');
  guardDrain(p2, 100); startRound(); assert(g.shards.length === 0, 'glass round cleanup');
});

// Representative HUD and glass burst, advanced a few effect frames to show the shards.
setup(); p1.reset(500, 1); p2.reset(690, -1);
p1.ultimate = 100; p1.guard = 20; p2.ultimate = 55; guardDrain(p2, 100, p1);
g.hitstopLeft = 0; for (let i = 0; i < 4; i++) updateFx(); g.shakeMag = 0;
if (typeof document !== 'undefined' && document.body) {
  render(ctx, g, fighters, STEP);
  document.getElementById('test-report').textContent = testResults.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n');
}
