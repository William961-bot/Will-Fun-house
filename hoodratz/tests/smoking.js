// Haze's Smoke Weed: hold Up + Special to smoke; on release he "feels nothing" (no knockback, no flinch).
function startSmoking() {
  press('KeyW'); press('KeyT'); step(); release('KeyW');
}

check('Up + Special starts smoking from standing (not a jump); Rip gets Fong Cream', () => {
  setup(); startSmoking();
  assert(p1.state === 'smoking', `state ${p1.state}`);
  release('KeyT');
  setup(); press('ArrowUp'); press('Semicolon'); step(); release('ArrowUp'); release('Semicolon');
  assert(p2.state === 'creamDeploy' && !p2.relentless, 'Rip up + special is Fong Cream');
});

check('smoking stands still; release after the minimum grants numb frames scaled by smoke time', () => {
  setup(); startSmoking();
  step(39);
  assert(p1.state === 'smoking' && p1.vx === 0, 'still smoking');
  release('KeyT'); step();
  assert(p1.state === 'idle', 'released');
  assert(p1.numb >= 39 * HAZE.numbPerFrame - 3 && p1.numb <= 40 * HAZE.numbPerFrame, `numb ${p1.numb}`);
  setup(); startSmoking(); step(4); release('KeyT'); step();
  assert(p1.numb === 0, 'too short: no effect');
});

check('feels nothing: normal hits damage health, preserve guard and cause no flinch; heavies and grabs still land', () => {
  setup(); p1.numb = 100; p1.enter('idle');
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.hp < MAX_HP && p1.guard === GUARD.max, 'health damage only');
  assert(p1.state === 'idle' && p1.vx === 0, 'no flinch or knockback');
  setup(); p1.numb = 100;
  p2.startAttack('heavy', MOVES.heavy.startup); p2.vx = 0;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.state === 'hitstun', 'heavy gets through');
  setup(); p1.numb = 100;
  p2.startAttack('grab'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g); finishThrow();
  assert(p1.state === 'hitstun', 'grab gets through');
});

check('getting hit while smoking interrupts it with no reward', () => {
  setup(); startSmoking(); step(20);
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  release('KeyT'); step();
  assert(p1.state === 'hitstun' && p1.numb === 0, 'interrupted');
});

check('high meter: overfilling causes a cough stun; it drains only when not smoking or numb', () => {
  setup(); startSmoking();
  step(Math.ceil(HAZE.highMax / HAZE.highFill) + 1);
  assert(p1.state === 'cough' && p1.numb === 0, `cough (${p1.state})`);
  release('KeyT');
  step(HAZE.coughFrames + 1);
  assert(p1.state === 'idle', 'cough ends');
  setup(); p1.high = 50; p1.numb = 30; step(10);
  near(p1.high, 50);
  p1.numb = 0; step(10);
  assert(p1.high < 50, 'drains when sober');
});

check('Smoke Weed is locked under Malevolent Stench and resets each round', () => {
  setup(); g.domain = { owner: 1, type: 'rip', framesLeft: 100 };
  startSmoking(); release('KeyT');
  assert(p1.state !== 'smoking', 'locked by stench');
  g.domain = null;
  setup(); p1.high = 70; p1.numb = 50; startRound();
  assert(p1.high === 0 && p1.numb === 0, 'round reset');
});
