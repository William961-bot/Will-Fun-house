check('domain chord priority and three-frame window, meter and status requirements', () => {
  for (const gap of [0, 3]) for (const first of ['KeyF', 'KeyT']) {
    setup(); p1.ultimate = 100; press(first); step(); release(first);
    step(Math.max(0, gap - 1)); press(first === 'KeyF' ? 'KeyT' : 'KeyF'); step(); release('KeyF'); release('KeyT');
    assert(g.domainSequence?.kind === 'cutscene', 'missing chord ' + gap);
    near(p1.cooldowns.special, 0); assert(!p1.move, 'plain attack won priority');
  }
  setup(); p1.ultimate = 99; press('KeyF'); press('KeyT'); step(); release('KeyF'); release('KeyT'); assert(!g.domainSequence, 'insufficient meter');
  for (const state of ['hitstun', 'stagger']) { setup(); p1.ultimate = 100; p1.enter(state); assert(!activateDomain(p1, g), state); }
  setup(); p1.ultimate = 100; guardDrain(p1, 100); assert(!activateDomain(p1, g), 'guardBroken domain');
});
check('domain cutscene freezes both fighters, timer, clouds and cooldowns for 60 frames', () => {
  setup(); p1.ultimate = 100; p2.startAttack('heavy'); p2.vx = 10; p1.cooldowns.special = 50;
  activateDomain(p1, g); const time = g.roundTime, x = p2.x, sf = p2.stateFrame;
  step(59); assert(g.domainSequence && !g.domain, 'short cutscene'); near(p2.x, x); near(p2.stateFrame, sf); assert(g.roundTime === time, 'round timer advanced'); near(p1.cooldowns.special, 50);
  applyHit(p2, p1, { x: p1.x, y: p1.y }, g); near(p1.hp, MAX_HP);
  step(); assert(!g.domainSequence && g.domain.type === 'haze', 'long cutscene'); near(g.domain.framesLeft, 480); near(p1.ultimate, 0);
});
check('Infinite Haze slows Rip to 60%, including frame data, and caps momentum', () => {
  setup(); beginDomain(0, g); p2.startAttack('light'); p2.momentum = 100;
  step(8); near(p2.stateFrame, 4); near(p2.animationFrame, 4); assert(p2.momentum <= 30, 'momentum uncapped');
  step(); near(p2.stateFrame, 5); near(p1.animationFrame, 9);
});
check('Stench preserves guard, stops recovery and locks smoke/trails', () => {
  setup(); special(true); assert(g.clouds.length, 'no cloud'); beginDomain(1, g); assert(g.clouds.length === 0, 'cloud survived');
  p1.enter('idle'); p1.cooldowns.downSpecial = 0; p1.x = 100; p2.x = 1100; p1.guard = 50;
  special(true); assert(g.clouds.length === 0 && p1.cooldowns.downSpecial === 0, 'smoke unlocked');
  step(240); near(p1.guard, 50);
  p1.cooldowns.special = 0; special(); assert(g.smokePuffs.length === 0, 'Mirror trail under Stench');
});
check('domain clash responds to attack edges; ties favor defender; winner gets fresh domain', () => {
  for (const masher of [null, 0, 1]) {
    setup(); beginDomain(0, g); p2.ultimate = 100; activateDomain(p2, g);
    const x = p1.x;
    if (masher !== null) { const key = masher === 0 ? 'KeyF' : 'Comma'; press(key); step(); release(key); near(g.domainSequence.boundary, W / 2 + (masher === 0 ? 8 : -8)); step(179); }
    else step(180);
    assert(g.domain.owner === (masher ?? 0) && g.domain.framesLeft === 480 && !g.domainSequence, 'clash winner');
    near(p1.x, x); near(p1.ultimate, 0); near(p2.ultimate, 0);
  }
});
check('domains expire after 480 frames, fade and reset on round restart', () => {
  setup(); beginDomain(0, g); step(479); near(g.domain.framesLeft, 1); step(); assert(!g.domain && g.domainFade, 'no domain cleanup');
  step(30); assert(!g.domainFade, 'fade stuck');
  beginDomain(1, g); startRound(); assert(!g.domain && !g.domainSequence && !g.domainFade, 'round leaked domain');
});
