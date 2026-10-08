// Shared regression checks: run in a browser or with node tests/run.cjs.
const testResults = [];
function check(name, run) {
  try { run(); testResults.push({ name, passed: true }); }
  catch (error) { testResults.push({ name, passed: false, error: error.message }); }
}
function assert(ok, message) { if (!ok) throw new Error(message); }
function near(a, b) { assert(Math.abs(a - b) < 0.00001, `${a} != ${b}`); }
function setup() {
  keysDown.clear();
  for (const f of fighters) f.input = new PlayerInput(f.index);
  startMatch(); g.phase = 'fight'; g.inputLocked = false;
  g.popups = [];
  g.paused = false; g.hitstopLeft = 0; g.slowmoLeft = 0;
  g.flashAlpha = 0; g.shakeMag = 0;
  p1.reset(800, 1); p2.reset(880, -1);
}
function step(n = 1) { for (let i = 0; i < n; i++) { g.hitstopLeft = 0; tick(); } }
function press(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); }
function release(code) { window.dispatchEvent(new KeyboardEvent('keyup', { code })); }
function strike(name = 'light') {
  p1.startAttack(name); p1.stateFrame = p1.move.startup; p1.vx = 0;
  // A throw holds the victim at arm's length: stand there so the victim stays where the test put them.
  if (p1.move.grab) p1.x = p2.x - THROWS[throwKind(p1)].distance * p1.facing;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  finishThrow();
}
// Skips a connected grab's throw animation straight to its release (damage, knockback, twist).
function finishThrow() {
  for (const f of fighters) if (f.state === 'throw') releaseThrow(f, fighters[1 - f.index], g);
}

check('run, dash and slide rebound at either wall; threshold and speed', () => {
  for (const state of ['run', 'dash', 'slide']) for (const away of [-1, 1]) {
    setup(); p1.enter(state); p1.momentum = 50; p1.facing = -away;
    p1.x = away > 0 ? WALL_L + HALF_W + 1 : WALL_R - HALF_W - 1;
    p1.vx = -away * 10; p1.physics(g);
    assert(p1.state === 'rebound', state); near(p1.vx, away * 8);
    assert(p1.facing === away && p1.momentum === 50, 'facing / momentum');
    assert(g.hitstopLeft === 10 && g.shakeMag === 5 && g.wallCracks.length === 1, 'FX');
  }
  setup(); p1.enter('run'); p1.momentum = 49; p1.x = WALL_R - HALF_W; p1.vx = 10; p1.physics(g);
  assert(p1.state === 'run' && p1.vx === 0, 'below threshold');
});

check('six-frame window permits attack, parry, grab, jump and dash', () => {
  for (const frame of [1, 6]) for (const [key, state] of [['KeyF', 'attack'], ['KeyG', 'parry'], ['KeyJ', 'attack'], ['KeyH', 'attack'], ['KeyW', 'jumpsquat'], ['KeyD', 'dash']]) {
    setup(); p1.enter('rebound'); p1.stateFrame = frame - 1; p1.vx = 8; p1.momentum = 70;
    if (key === 'KeyD') p1.lastTap = { dir: 'right', frame: g.frame - 2 };
    press(key); step(); release(key);
    assert(p1.state === state, `${key} frame ${frame}: ${p1.state}`);
    assert(p1.momentum >= 70, 'lost momentum'); near(p1.vx, 8);
  }
  setup(); p1.enter('rebound'); p1.vx = 8; p1.momentum = 70; step(6);
  assert(p1.state === 'skid', 'window did not close'); near(p1.vx, 8); near(p1.momentum, 70);
  setup(); p1.enter('rebound'); p1.vx = 8; press('KeyW'); step(); release('KeyW'); step(3);
  assert(p1.state === 'air' && p1.y < FLOOR, 'jump did not leave ground'); near(p1.vx, 8);
});

check('hitstun bounce is once per combo and resets when the combo ends', () => {
  setup(); strike('heavy'); p2.x = WALL_R - HALF_W; const speed = p2.vx, stun = p2.hitstun;
  p2.physics(g); assert(p2.wallBounced, 'no bounce'); near(p2.vx, -speed * 0.7);
  near(p2.vy, -6); assert(p2.hitstun === stun + 12, 'bonus stun');
  p2.x = WALL_L + HALF_W; p2.vx = -12; p2.physics(g);
  near(p2.vx, 0); assert(g.wallCracks.length === 1, 'second bounce');
  p2.enter('idle'); assert(!p2.wallBounced && p2.combo === 0, 'combo reset');
  strike('heavy'); p2.x = WALL_R - HALF_W; p2.physics(g); assert(p2.wallBounced, 'new combo bounce');
});

check('post-bounce damage scales down; five follow-ups cap the combo', () => {
  setup(); strike('heavy'); p2.x = WALL_R - HALF_W; p2.physics(g);
  const hp = p2.hp; strike(); assert(hp - p2.hp === 16, 'first follow-up scaling');
  const hp2 = p2.hp; strike(); assert(hp2 - p2.hp === 14, 'second follow-up scaling');
  const hp3 = p2.hp; strike(); assert(hp3 - p2.hp === 11, 'third follow-up scaling');
  strike(); strike();
  assert(p2.comboCapped && p2.bounceHits === 5, 'post-bounce cap');
  p1.x = p2.x - 60; p1.startAttack('light'); p1.stateFrame = 5;
  assert(hitPoint(p1, p2) === null, 'extra hit allowed');
  p2.y = FLOOR - 1; p2.vy = 2; p2.physics(g);
  assert(p2.state === 'idle' && p2.combo === 0 && !p2.comboCapped, 'landing escape');
});

check('ten hits before a bounce; tenth hit may still wall-bounce; fifteen total', () => {
  setup(); for (let i = 0; i < 9; i++) strike(); strike('heavy');
  assert(p2.combo === 10 && p2.comboCapped, 'ten-hit cap');
  p1.startAttack('light'); p1.stateFrame = 5; assert(hitPoint(p1, p2) === null, 'eleventh hit allowed');
  p2.x = WALL_R - HALF_W; p2.physics(g); assert(p2.wallBounced && !p2.comboCapped, 'cap prevented bounce');
  for (let i = 0; i < 5; i++) strike(); assert(p2.combo === 15 && p2.comboCapped, 'fifteen-hit total');
  setup(); for (let i = 0; i < 10; i++) strike(); step();
  assert(p2.state === 'idle' && p2.combo === 0, 'grounded cap escape');
});

check('heavy and grab reach a wall from 300 pixels, for every character', () => {
  for (const name of ['heavy', 'grab']) for (const stats of Object.values(CHARACTERS)) for (const facing of [-1, 1]) {
    setup(); p2.setCharacter(stats.id); p2.reset(880, -1); p1.facing = facing;
    p2.x = facing > 0 ? WALL_R - HALF_W - 300 : WALL_L + HALF_W + 300;
    strike(name);
    for (let i = 0; i < 50 && !p2.wallBounced; i++) p2.update(p1, g);
    assert(p2.wallBounced, `${name} / ${stats.name} / ${facing}`);
  }
  p2.stats = CHARACTERS.rip;
});

check('normal parries, grab priority and strict heavy parries work', () => {
  setup(); p2.startParry('high'); strike(); assert(p1.state === 'stagger' && p2.hp === MAX_HP, 'perfect parry');
  setup(); p2.startParry('high'); p2.stateFrame = 5; strike(); assert(p1.state === 'deflect' && p2.hp === MAX_HP, 'early parry');
  setup(); p2.startParry('high'); strike('grab'); assert(p2.hp < MAX_HP && p2.state === 'hitstun', 'grab vs parry');
  setup(); p2.startParry('high'); strike('heavy'); assert(p1.state === 'stagger' && p2.hp === MAX_HP, 'heavy parry');
  setup(); p2.startParry('high'); p2.stateFrame = 2; strike('heavy'); assert(p2.hp < MAX_HP && p2.state === 'hitstun', 'early heavy parry fails');
});

check('wall cracks fade and clear on round restart', () => {
  setup(); g.wallImpact(WALL_R, 500); for (let i = 0; i < 59; i++) updateFx();
  assert(g.wallCracks.length === 1, 'early fade'); updateFx(); assert(g.wallCracks.length === 0, 'late fade');
  g.wallImpact(WALL_L, 500); startRound(); assert(g.wallCracks.length === 0, 'round cleanup');
});

check('keyboard route: light, low, heavy, wall-bounce, light stays one combo', () => {
  setup(); p1.reset(1000, 1); p2.reset(1060, -1);
  function until(test, limit = 80) {
    for (let i = 0; i < limit && !test(); i++) step();
    assert(test(), `route timeout: ${p1.state}/${p1.moveName}/${p1.stateFrame}, defender ${p2.state}/${p2.combo}, distance ${Math.abs(p2.x - p1.x)}`);
  }
  press('KeyF'); step(); release('KeyF');
  until(() => p1.moveHit && p1.stateFrame >= MOVES.light.startup + MOVES.light.active - 1);
  press('KeyS'); press('KeyF'); step(); release('KeyF'); release('KeyS');
  assert(p1.moveName === 'low', 'low cancel');
  until(() => p1.moveHit && p1.stateFrame >= MOVES.low.startup + MOVES.low.active - 1);
  press('KeyH'); step(); release('KeyH'); assert(p1.moveName === 'heavy', 'heavy cancel starts the full attack');
  until(() => p2.wallBounced);
  assert(p2.combo === 3, 'chain dropped before bounce');
  until(() => p1.state === 'idle'); press('KeyF'); step(); release('KeyF');
  until(() => p1.moveHit);
  assert(p2.combo === 4 && p2.bounceHits === 1, 'follow-up dropped the combo');
});

// Leave a representative impact visible for screenshot verification.
setup(); p1.reset(1080, 1); p2.reset(WALL_R - HALF_W, -1);
strike('heavy'); p2.physics(g); g.shakeMag = 0;
if (typeof document !== 'undefined' && document.body) {
  render(ctx, g, fighters, STEP);
  const report = document.createElement('pre');
  report.id = 'test-report';
  report.style = 'position:absolute;top:740px;left:20px;color:white;background:#10101ddd;padding:12px;font:14px monospace;white-space:pre-wrap';
  report.textContent = testResults.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n');
  document.body.append(report);
}
