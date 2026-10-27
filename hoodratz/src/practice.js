class PracticeInput extends PlayerInput {
  constructor(index) { super(index); this.parryCycle = 0; this.mixFor = null; }
  poll(frame) {
    this.frame = frame;
    for (const key of BUTTONS) this.held[key] = false;
    const f = fighters[this.index], opp = opponentOf(f), mode = g.practice.mode;
    if (mode === 8) { this.held.block = !f.guardBroken; return; }
    // Modes 3-4 react to your attacks, so they read the committed move a couple of frames before it lands.
    const incoming = opp.state === 'attack' && opp.move && !opp.move.grab && opp.stateFrame < opp.move.startup + opp.move.active;
    const landing = incoming && opp.stateFrame >= opp.move.startup - 2;
    if (mode === 4 && incoming && !f.guardBroken) {
      const id = opp.animationFrame - opp.stateFrame;   // one choice per attack
      if (this.mixFor !== id) { this.mixFor = id; this.parryCycle++; }
      if (this.parryCycle % 2 === 0) { this.held.block = true; if (!['idle', 'walk', 'block', 'blockstun'].includes(f.state)) return; }
    }
    if (!['idle', 'walk', 'run', 'skid'].includes(f.state)) return;
    const press = key => { this.held[key] = true; this.pressedAt[key] = frame; this.rawPressedAt[key] = frame; };
    // Parry has no direction: 2 parries constantly, 3 parries perfectly on your hit, 4 alternates parry and block.
    if (mode === 2 && !f.guardBroken) press('parry');
    else if ((mode === 3 || (mode === 4 && this.parryCycle % 2 === 1)) && landing && !f.guardBroken) press('parry');
    else if (mode === 5) press('attack');
    else if (mode === 6 && Math.abs(f.x - opp.x) <= MOVES.grab.box.x + MOVES.grab.box.w + HURT_HALF_W) press('grab');
    else if (mode === 7) press('heavy');
  }
}

function preparePractice(g) {
  if (!g.practice) return;
  if (g.practice.infinite) for (const f of fighters) f.burstMeter = BURST.rechargeFrames;
  if (g.practice.infinite) for (const f of fighters) { f.ultimate = ULTIMATE_MAX; f.cooldowns.special = 0; f.cooldowns.downSpecial = 0; f.cooldowns.upSpecial = 0; f.cooldowns.heavy = 0; f.high = 0; }
  if (g.practice.infinite) for (const f of fighters) if (f.bells !== undefined) f.bells = TONKA.bellsMax;
  if (g.practice.infinite) for (const f of fighters) if (f.abilityCooldowns) for (const key of Object.keys(f.abilityCooldowns)) f.abilityCooldowns[key] = 0;
  if(g.practice.infinite)for(const f of fighters)if(isSiglarp(f)) {
    for(const bank of Object.values(f.siglarpBanks))for(const key of Object.keys(bank))bank[key]=0;
    if(f.siglarpBaseCooldowns)for(const key of Object.keys(f.siglarpBaseCooldowns))f.siglarpBaseCooldowns[key]=0;
  }
}

function actionRemaining(f) {
  if (f.state === 'attack') return Math.max(0, f.move.startup + f.move.active + f.move.recovery - f.stateFrame);
  if (f.state === 'stagger' || f.state === 'deflect' || f.state === 'blockstun') return Math.max(0, f.timer - f.stateFrame);
  return 0;
}

function recordFrameData(att, def, kind, g) {
  if (!g.practice) return;
  const advantage = kind === 'hit' ? def.hitstun - actionRemaining(att) : actionRemaining(att) - actionRemaining(def);
  g.practice.lastEvent = { move: att.moveName, startup: att.move.startup, kind,
    advantage: advantage * (kind === 'hit' ? att.index === 0 ? 1 : -1 : def.index === 0 ? 1 : -1) };
}

function showTitle() {
  startRound(); g.phase = 'title'; g.practice = null; g.paused = false; g.showHelp = false; g.inputLocked = true;
  g.popups = []; g.flashAlpha = 0; g.hitstopLeft = 0; g.slowmoLeft = 0;
  for (const f of fighters) f.input = new PlayerInput(f.index);
  selectHomeItem(0); sound.setVolume(sound.volume); syncHomeMenu();
}
