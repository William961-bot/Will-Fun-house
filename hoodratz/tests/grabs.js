// Dedicated grab / heavy buttons, character throws and Rip's Fong Cream. Uses helpers from milestone5.js,
// character-select.js and animation.js.
function versus(a, b, gap = 60) {
  pickCharacters([a, b]);
  p1.reset(600, 1); p2.reset(600 + gap, -1);
}
function tap(code) { press(code); step(); release(code); }
function stepUntil(test, limit = 200) {
  for (let i = 0; i < limit && !test(); i++) step();
  assert(test(), 'timed out');
}
// Grab with the dedicated button and play the whole throw out, checking poses on the way.
function landThrow() {
  tap('KeyJ');
  stepUntil(() => p1.state === 'throw', 20);
  assert(p2.state === 'thrown' && p2.hp === MAX_HP, 'damage waits for the release');
  while (p1.state === 'throw') {
    assert(poseIsFinite(animatedPose(p1, g.frame, p1.stateFrame)) && poseIsFinite(animatedPose(p2, g.frame, p2.stateFrame)), 'throw poses');
    step();
  }
  assert(p2.hp === MAX_HP - Math.round(MOVES.grab.dmg * p1.stats.dmg) && p2.state === 'hitstun', 'grab damage on release');
}

check('dedicated buttons: J grabs instantly, H is a heavy with a 1.5 s cooldown (also when chained)', () => {
  versus('haze', 'rip', 600);
  tap('KeyJ'); assert(p1.state === 'attack' && p1.moveName === 'grab', 'grab button');
  versus('haze', 'rip', 600);
  tap('KeyH'); assert(p1.state === 'attack' && p1.moveName === 'heavy' && p1.cooldowns.heavy === MOVE.heavyCooldown, 'heavy button');
  stepUntil(() => p1.state === 'idle');
  tap('KeyH'); assert(p1.state === 'idle' && p1.cooldowns.heavy > 0, 'heavy on cooldown');
  stepUntil(() => p1.cooldowns.heavy === 0);
  tap('KeyH'); assert(p1.moveName === 'heavy' && p1.state === 'attack', 'heavy back');
  versus('haze', 'rip'); p1.cooldowns.heavy = 30;
  strike(); p1.stateFrame = MOVES.light.startup + MOVES.light.active;
  tap('KeyH'); assert(p1.moveName === 'light', 'chained heavy respects the cooldown');
});

check('Haze throw: smoke in the face, then they cough and move at half speed for a second', () => {
  versus('haze', 'rip'); landThrow();
  assert(p2.choking === THROWS.coughFrames, 'coughing');
  stepUntil(() => p2.state === 'idle');
  p2.x = 640;   // away from the wall it was thrown into
  p2.enter('walk'); p2.vx = 4; let x = p2.x; p2.physics(g);
  near(p2.x - x, 4 * THROWS.coughSlow); assert(p2.slowed, 'slowed');
  p2.choking = 0; p2.vx = 4; x = p2.x; p2.physics(g); near(p2.x - x, 4);
});

check('Rip throw: face to his backside until they pass out; knocked down, untouchable, then back up', () => {
  versus('rip', 'haze'); landThrow();
  assert(p2.passOut, 'passing out');
  stepUntil(() => p2.state === 'knockdown');
  assert(p2.invincible && !p2.passOut, 'out cold');
  p1.x = p2.x - 60; p1.facing = 1; p1.startAttack('light'); p1.stateFrame = MOVES.light.startup;
  assert(!hitPoint(p1, p2), 'no hitting a knocked-down opponent');
  for (let i = 0; i <= THROWS.passOutFrames; i++) assert(poseIsFinite(animatedPose(p2, g.frame, p2.stateFrame)), 'knockdown pose'), step();
  assert(p2.state === 'idle', 'got up');
});

check('GoonerPrime throw: the code ghost scares their soul out; XP for the hit and the scare', () => {
  versus('gooner', 'rip'); landThrow();
  assert(p1.xp === GOONER.xpHit + THROWS.xpGrab, `xp ${p1.xp}`);
});

check('nobody pops a domain mid-throw; the throw ends cleanly if the victim is freed', () => {
  versus('haze', 'rip'); tap('KeyJ'); stepUntil(() => p1.state === 'throw', 20);
  p2.ultimate = ULTIMATE_MAX; p1.ultimate = ULTIMATE_MAX;
  assert(!activateDomain(p2, g) && !activateDomain(p1, g), 'domain locked');
  p2.enter('idle'); step(); assert(p1.state === 'idle', 'thrower let go');
});

check('Fong Cream: Up + Special drops one puddle; the opponent moves at half speed in it, Rip does not', () => {
  versus('rip', 'haze', 300);
  press('KeyW'); tap('KeyT'); release('KeyW');
  assert(p1.state === 'creamDeploy' && p1.cooldowns.upSpecial > 0, 'deploying');
  stepUntil(() => g.creams.length === 1, RIP.creamDropFrame + 1);
  const cream = g.creams[0];
  assert(cream.owner === 0 && Math.abs(cream.x - p1.x) < 1, 'puddle at his feet');
  p2.x = cream.x + 10; p2.enter('walk'); p2.vx = -4; let x = p2.x; p2.physics(g);
  near(p2.x - x, -4 * RIP.creamSlow); assert(p2.slowed, 'opponent slowed');
  p2.y = FLOOR - 50; p2.enter('air'); p2.vx = -4; p2.vy = 0; x = p2.x; p2.physics(g); near(p2.x - x, -4);
  p1.enter('walk'); p1.vx = 4; x = p1.x; p1.physics(g); near(p1.x - x, 4);
  dropCream(p1, g); assert(g.creams.length === 1, 'one puddle at a time');
  stepUntil(() => !g.creams.length, RIP.creamFrames + 2);
  for (let i = 0; i <= RIP.creamDeployFrames; i++) { p1.enter('creamDeploy'); p1.stateFrame = i; assert(poseIsFinite(animatedPose(p1, 0, i)), 'deploy pose'); }
});
