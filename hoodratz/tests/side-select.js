function testPad(index, id) { return { index, id, connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }; }
check('automatic inputs keep 1P WASD and 2P arrows without a side-selection screen', () => {
  const original = navigator.getGamepads; navigator.getGamepads = () => [];
  try {
    charSelect.cpuLevel = 0; openCharacterSelect(); confirmCharacters();
    assert(g.phase === 'intro', 'direct match start');
    press('KeyD'); p1.input.poll(10); p2.input.poll(10);
    assert(p1.input.held.right && !p2.input.held.right, '1P keyboard'); release('KeyD');
    press('ArrowLeft'); p1.input.poll(11); p2.input.poll(11);
    assert(p2.input.held.left && !p1.input.held.left, '2P keyboard'); release('ArrowLeft');
    openCharacterSelect(true); confirmCharacters(); assert(p2.input instanceof PracticeInput, 'practice stays automatic');
  } finally { navigator.getGamepads = original; showTitle(); }
});
check('automatic controllers retain browser slots and hold play on disconnect', () => {
  const original = navigator.getGamepads, a = testPad(0, 'A'), b = testPad(2, 'B');
  let pads = [a, null, b]; navigator.getGamepads = () => pads;
  try {
    startMatch(false, automaticSources());
    assert(p1.input.source.slot === 0 && p2.input.source.slot === 2, 'stable assignments');
    b.buttons[2].pressed = true; press('KeyF'); p1.input.poll(1); p2.input.poll(1);
    assert(!p1.input.held.attack && p2.input.held.attack, 'exclusive input'); release('KeyF');
    pads = [null, null, b]; const time = g.phaseTimer; tick(); near(g.phaseTimer, time);
    assert(missingSources().length === 1, 'disconnect holds');
    pads = [a, null, b]; tick(); near(g.phaseTimer, time - 1);
    pads = [testPad(0, 'Different pad'), null, b]; assert(missingSources().length === 1, 'identity retained');
  } finally { navigator.getGamepads = original; showTitle(); }
});
check('controller menu edges pick characters, change CPU level and start directly', () => {
  const original = navigator.getGamepads, pad = testPad(3, 'Menu pad');
  navigator.getGamepads = () => [null, null, null, pad]; deviceMenu.previous.clear();
  try {
    charSelect.cpuLevel = 0; showTitle(); pad.buttons[0].pressed = true; tick();
    assert(g.phase === 'charSelect', 'title entry'); tick(); assert(!charSelect.locked[0], 'held A does not lock');
    pad.buttons[0].pressed = false; tick(); pad.buttons[5].pressed = true; tick();
    assert(charSelect.cpuLevel === 1, 'RB selects CPU'); tick(); assert(charSelect.cpuLevel === 1, 'one mode edge');
    pad.buttons[5].pressed = false; tick(); pad.buttons[0].pressed = true; tick();
    assert(charSelect.locked[0], '1P pick'); pad.buttons[0].pressed = false; tick(); pad.buttons[0].pressed = true; tick();
    assert(g.phase === 'intro' && p2.input instanceof CpuInput && p1.input.source.slot === 3, 'direct CPU fight');
  } finally { charSelect.cpuLevel = 0; navigator.getGamepads = original; showTitle(); }
});
