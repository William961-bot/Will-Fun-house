check('home navigation opens Practice, preserves Play selection, and Quit stops simulation until returning', () => {
  showTitle(); press('ArrowDown'); release('ArrowDown'); press('Enter'); release('Enter');
  assert(g.phase === 'charSelect' && charSelect.practice, 'practice menu option');
  press('Enter'); release('Enter'); assert(g.practice && g.phase === 'intro', 'practice starts');
  showTitle(); press('ArrowUp'); release('ArrowUp'); press('Enter'); release('Enter');
  assert(g.phase === 'quit' && g.inputLocked, 'quit option');
  const frame = g.frame, x = p1.x, timer = g.phaseTimer; step(20);
  assert(g.frame === frame && p1.x === x && g.phaseTimer === timer, 'quit must freeze the game');
  press('Escape'); release('Escape'); assert(g.phase === 'title' && homeMenu.selected === 0, 'return to Play');
  homeMenuClick(20, 20); assert(g.phase === 'title', 'background does not start a match');
  homeMenuClick(640, 410); assert(g.phase === 'charSelect' && charSelect.practice, 'practice click');
  showTitle(); press('Enter'); release('Enter'); assert(g.phase === 'charSelect' && !charSelect.practice, 'Play still works');
  showTitle();
});
check('controller home menu uses direction edges, starts Practice, and returns after Quit', () => {
  const original = navigator.getGamepads;
  const pad = { index: 0, id: 'Home menu test', connected: true, axes: [0, 0], buttons: Array.from({length:16},()=>({pressed:false})) };
  navigator.getGamepads = () => [pad]; deviceMenu.previous.clear();
  try {
    showTitle(); pad.axes[1] = 1; tick(); tick(); assert(homeMenu.selected === 1, 'held direction only moves once');
    pad.axes[1] = 0; tick(); pad.buttons[0].pressed = true; tick();
    assert(g.phase === 'charSelect' && charSelect.practice, 'controller Practice');
    pad.buttons[0].pressed = false; showTitle(); tick();
    selectHomeItem(2); pad.buttons[0].pressed = true; tick(); assert(g.phase === 'quit', 'controller Quit');
    pad.buttons[0].pressed = false; tick(); pad.buttons[1].pressed = true; tick(); assert(g.phase === 'title', 'controller exit return');
  } finally { navigator.getGamepads = original; deviceMenu.previous.clear(); showTitle(); }
});
check('title starts fights and practice; dummy modes stand, parry, cycle, light, grab, heavy', () => {
  showTitle(); assert(g.phase === 'title', 'no title'); press('Enter'); release('Enter'); assert(g.phase === 'charSelect', 'player selection'); press('Enter'); release('Enter'); assert(g.phase === 'intro' && !g.practice, 'fight selection');
  showTitle(); press('KeyP'); release('KeyP'); press('Enter'); release('Enter'); press('Enter'); release('Enter'); assert(g.practice && p2.input instanceof PracticeInput, 'practice selection');
  g.phase = 'fight'; g.inputLocked = false; step(); assert(p2.state === 'idle', 'standing dummy');
  for (const [mode, dir] of [[2, 'high'], [3, 'low']]) {
    press('Digit' + mode); release('Digit' + mode); step(); assert(p2.state === 'parry' && p2.parryDir === dir, 'parry mode ' + mode);
  }
  press('Digit4'); release('Digit4');
  for (const direction of ['high', 'low', 'overhead', 'high']) { p2.enter('idle'); step(); assert(p2.parryDir === direction, 'cycle ' + direction); }
  press('Digit5'); release('Digit5'); step(); assert(p2.moveName === 'light' && p2.state === 'attack', 'light dummy');
  press('Digit6'); release('Digit6'); p1.x = 300; p2.x = 900; step(); assert(p2.state === 'idle', 'out of range grab');
  p2.x = p1.x + 60; step(2); assert(p2.moveName === 'grab' && p2.state === 'attack', 'grab dummy');
  press('Digit7'); release('Digit7'); step(11); assert(p2.moveName === 'heavy' && p2.state === 'attack', 'heavy dummy');
  press('F2'); release('F2'); assert(g.phase === 'title' && !g.practice && p2.input instanceof PlayerInput, 'title return');
});

check('practice hitboxes, unlimited resources, frame advantage and health/timer behavior', () => {
  startMatch(true); g.phase = 'fight'; g.inputLocked = false;
  press('KeyB'); release('KeyB'); press('KeyI'); release('KeyI');
  p1.cooldowns.special = 90; p2.cooldowns.downSpecial = 300; step();
  assert(g.practice.boxes && g.practice.infinite, 'practice toggles'); near(p1.ultimate, 100); near(p2.ultimate, 100);
  near(p1.cooldowns.special, 0); near(p2.cooldowns.downSpecial, 0);
  const time = g.roundTime; step(100); assert(g.roundTime === time, 'practice timer advanced');
  press('Digit5'); release('Digit5'); step(); assert(p2.state === 'attack' && p2.moveName === 'light', 'infinite meter stalled dummy');
  press('Digit1'); release('Digit1');
  press('KeyI'); release('KeyI'); p1.ultimate = 0; p1.reset(800, 1); p2.reset(860, -1); strike();
  assert(g.practice.lastEvent.startup === 5 && g.practice.lastEvent.advantage === 3, 'hit frame advantage');
  p1.enter('idle'); p2.enter('idle'); p1.startParry('high'); p2.startAttack('light');
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g); near(g.practice.lastEvent.advantage, 45);
  p2.hp = 1; p2.enter('idle'); strike('heavy'); assert(g.phase === 'fight' && !p2.koed && p2.hp === MAX_HP, 'practice KO');
});

check('hitbox overlay uses the same geometry as real collision, facing either direction', () => {
  for (const facing of [-1, 1]) {
    setup(); p1.reset(600, facing); p2.reset(600 + facing * 80, -facing); p1.startAttack('light'); p1.stateFrame = 5;
    const box = attackBox(p1), hurt = hurtBox(p2), point = hitPoint(p1, p2);
    assert(point && point.x >= box.x && point.x <= box.x + box.w && point.x >= hurt.x && point.x <= hurt.x + hurt.w, 'overlay collision');
    p2.x = facing > 0 ? box.x + box.w + HURT_HALF_W + 1 : box.x - HURT_HALF_W - 1;
    assert(!hitPoint(p1, p2), 'hit beyond overlay');
  }
});

check('synthesized voices connect and schedule; mute and volume clamp the master gain', () => {
  const saved = { context: sound.context, master: sound.master, muted: sound.muted, volume: sound.volume, Context: window.AudioContext };
  let scheduled = 0;
  const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { assert(v > 0, 'bad audio ramp'); this.value = v; } });
  const node = () => ({ gain: param(), frequency: param(), connect() {}, disconnect() {}, start() { scheduled++; }, stop() {} });
  window.AudioContext = class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 1000; this.destination = {}; }
    createGain() { return node(); } createOscillator() { return node(); } createBiquadFilter() { return node(); }
    createBufferSource() { return node(); } createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  };
  try {
    sound.context = null; sound.master = null; sound.muted = false; sound.unlock(); sound.setVolume(0.4);
    for (const name of Object.keys(SOUND_EVENTS)) sound.play(name);
    assert(scheduled >= Object.keys(SOUND_EVENTS).length, 'unscheduled voices'); near(sound.master.gain.value, 0.4);
    press('KeyM'); release('KeyM'); near(sound.master.gain.value, 0); const before = scheduled; sound.play('heavy'); near(scheduled, before);
    press('KeyM'); release('KeyM'); near(sound.master.gain.value, 0.4);
    sound.setVolume(2); near(sound.volume, 1); sound.setVolume(-1); near(sound.volume, 0);
  } finally { Object.assign(sound, { context: saved.context, master: saved.master, muted: saved.muted, volume: saved.volume }); window.AudioContext = saved.Context; }
});

check('impact tuning matches light, heavy, perfect parry and guard break requirements', () => {
  setup(); strike(); near(g.hitstopLeft, 3); near(g.shakeMag, 0);
  setup(); strike('heavy'); near(g.hitstopLeft, 8); near(g.shakeMag, 5); assert(g.lines.length, 'heavy speed lines');
  setup(); p2.startParry('high'); strike(); near(g.hitstopLeft, 12); near(g.slowmoLeft, 20); near(g.flashAlpha, 0.5);
  setup(); guardDrain(p2, 100); near(g.hitstopLeft, 16); near(g.shakeMag, 10);
});

check('full three-round match completes through actual combat and round/KO transitions', () => {
  setup();
  for (const winner of [0, 1, 0]) {
    assert(g.phase === 'fight', 'round not fighting');
    const att = fighters[winner], def = fighters[1 - winner];
    att.reset(600, 1); def.reset(660, -1); def.hp = 1;
    att.startAttack('heavy'); att.stateFrame = MOVES.heavy.startup;
    resolveCombat(p1, p2, g); assert(g.phase === 'ko', 'no KO'); step(ROUND.koFrames);
    if (g.phase === 'intro') step(ROUND.introFrames);
  }
  assert(g.phase === 'matchOver' && g.result === 'HAZE' && g.wins[0] === 2 && g.wins[1] === 1, 'best of three result');
  press('Enter'); release('Enter'); assert(g.phase === 'intro' && g.round === 1 && g.wins.every(w => w === 0), 'rematch');
});
