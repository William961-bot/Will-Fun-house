function cpuMatch(level, character = 'rip') {
  startMatch(false, [{ type: 'keyboard', layout: 0 }, { type: 'cpu', level }], ['haze', character]);
  g.phase = 'fight'; g.inputLocked = false; g.frame = 0; keysDown.clear();
}
check('CPU levels 1–5 select directly while retaining 1P/2P picks and local mode', () => {
  for (let level = 1; level <= 5; level++) {
    openCharacterSelect(); characterSelectKey('Digit' + level);
    characterSelectKey('KeyF'); characterSelectKey('KeyD'); const cpuPick = charSelect.cursor[1];
    characterSelectKey('ArrowRight'); assert(charSelect.cursor[1] === cpuPick, 'human 2P ignored in solo');
    characterSelectKey('KeyF'); assert(g.phase === 'intro' && p2.input instanceof CpuInput && p2.input.level === level, 'CPU start ' + level);
  }
  openCharacterSelect(); characterSelectKey('Digit0'); characterSelectKey('Enter');
  assert(!(p2.input instanceof CpuInput) && !g.practice, 'local two-player mode');
  charSelect.cpuLevel = 5; openCharacterSelect(true); confirmCharacters(); assert(p2.input instanceof PracticeInput, 'practice is separate');
  charSelect.cpuLevel = 0;
});
check('each CPU level closes distance and deals damage with every roster fighter', () => {
  for (const id of ROSTER) for (let level = 1; level <= 5; level++) {
    cpuMatch(level, id); const stats = p2.stats; step(1200);
    assert(p1.hp < MAX_HP || g.wins[1] > 0, id + ' level ' + level + ' attacks');
    assert(p2.stats === stats && p2.hp <= MAX_HP && !g.practice, 'normal combat stats');
  }
});
check('higher CPU levels react sooner to committed attacks, without reading held human buttons', () => {
  for (const level of [1, 5]) {
    cpuMatch(level); p1.reset(600, 1); p2.reset(660, -1); p2.input.random = () => 0;
    press('KeyF'); p2.input.poll(0); assert(!p2.input.held.parry, 'no uncommitted input read'); release('KeyF');
    p1.startAttack('light'); p2.input.poll(1); p2.input.poll(3);
    assert(p2.input.held.parry === (level === 5), 'reaction delay ' + level);
  }
  for (let i = 1; i < CPU_LEVELS.length; i++) assert(CPU_LEVELS[i].reaction < CPU_LEVELS[i - 1].reaction && CPU_LEVELS[i].decision < CPU_LEVELS[i - 1].decision && CPU_LEVELS[i].defend > CPU_LEVELS[i - 1].defend, 'tier progression');
});
check('CPU input freezes during intro, pause, hit-stop and ultimate openers; rematches keep level', () => {
  cpuMatch(4); const input = p2.input;
  for (const lock of ['intro', 'paused', 'hitstop', 'opener']) {
    g.phase = lock === 'intro' ? 'intro' : 'fight'; g.paused = lock === 'paused'; g.hitstopLeft = lock === 'hitstop' ? 3 : 0;
    g.domainSequence = lock === 'opener' ? { kind: 'montageOpener' } : null;
    const seed = input.seed; input.poll(20); assert(input.seed === seed && BUTTONS.every(b => !input.held[b]), 'freeze ' + lock);
  }
  g.domainSequence = null; g.paused = false; g.hitstopLeft = 0; g.phase = 'matchOver';
  press('Enter'); release('Enter'); assert(p2.input instanceof CpuInput && p2.input.level === 4 && p2.stats.id === 'rip', 'rematch');
  startRound(); assert(p2.input.pressSerial.attack === 0 && p2.hp === MAX_HP, 'per-round reset');
});
check('CPU Yitty times legal re-grips and a high-level CPU victim can mash out', () => {
  cpuMatch(5, 'yitty'); p1.reset(660, -1); p2.reset(600, 1); p2.input.random = () => 0;
  p2.startAttack('grab'); applyHit(p2, p1, { x: p1.x, y: FLOOR - 100 }, g);
  for (let i = 0; i < 300 && p1.hp > 745; i++) { tick(); }
  assert(p1.hp === 745 && !p2.suplex.chainMissed, 'three correctly timed CPU slams');
  startMatch(false, [{ type: 'keyboard', layout: 0 }, { type: 'cpu', level: 5 }], ['yitty', 'rip']);
  g.phase = 'fight'; g.inputLocked = false; p1.reset(600, 1); p2.reset(660, -1);
  beginYittyThrow(); slamYitty(); assert(p1.suplex.mashed >= YITTY.mashThresholds[0], 'CPU mash edges');
  chainYitty(); assert(p2.state === 'deflect', 'CPU escapes');
});
check('CPU matches complete through normal KO, rounds and rematch flow', () => {
  cpuMatch(3); p2.input = new PlayerInput(1, { type: 'cpu', level: 3 });
  p1.input = new CpuInput(0, 5);
  for (let frame = 0; frame < 20000 && g.phase !== 'matchOver'; frame++) step();
  assert(g.phase === 'matchOver' && g.wins.some(w => w === ROUND.winsNeeded), 'whole AI match');
});
check('CPU decisions and outcomes are deterministic regardless of effect randomness', () => {
  const original = Math.random;
  const run = effectRandom => {
    Math.random = () => effectRandom; cpuMatch(5, 'yitty'); step(900);
    return JSON.stringify({ hp: fighters.map(f => f.hp), x: fighters.map(f => f.x), state: fighters.map(f => f.state), wins: g.wins, seed: p2.input.seed });
  };
  try { assert(run(.1) === run(.9), 'replay differs'); } finally { Math.random = original; charSelect.cpuLevel = 0; showTitle(); }
});
