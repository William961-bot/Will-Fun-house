check('Burst refills in 1800 active ticks, carries across rounds and starts full on a new match', () => {
  setup(); p1.reset(300,1); p2.reset(900,-1); p1.burstMeter = 0;
  step(1799); assert(p1.burstMeter === 1799, 'early refill'); step();
  assert(p1.burstMeter === BURST.rechargeFrames, 'full recharge'); step(10);
  assert(p1.burstMeter === BURST.rechargeFrames, 'overfilled');
  p1.burstMeter = 123; startRound(); assert(p1.burstMeter === 123, 'round refills charge');
  startMatch(); assert(fighters.every(f => f.burstMeter === BURST.rechargeFrames), 'new match');
});

check('Burst recharge freezes during pause, hit-stop, intros, KO and ultimate openers', () => {
  for (const freeze of ['pause','hitstop','intro','ko','domain']) {
    setup(); p1.burstMeter = 400;
    if (freeze === 'pause') g.paused = true;
    if (freeze === 'hitstop') g.hitstopLeft = 5;
    if (freeze === 'intro') { g.phase = 'intro'; g.phaseTimer = 20; g.inputLocked = true; }
    if (freeze === 'ko') { g.phase = 'ko'; g.phaseTimer = 20; g.inputLocked = true; }
    if (freeze === 'domain') { p1.ultimate = 100; activateDomain(p1,g); }
    tick(); assert(p1.burstMeter === 400, freeze);
  }
  startMatch(true); g.phase = 'fight'; g.inputLocked = false; g.practice.infinite = true;
  p1.burstMeter = 0; step(); assert(p1.burstMeter === BURST.rechargeFrames, 'practice infinite');
});

check('Controller Block + RT bursts at zero ultimate; A remains Medium and cannot Burst', () => {
  const old = navigator.getGamepads;
  try {
    setup(); const pad = testPad(2,'Burst pad'); navigator.getGamepads = () => [null,null,pad];
    p1.input = new PlayerInput(0,{type:'pad',slot:2,id:pad.id});
    p1.ultimate = 0; p1.enter('hitstun'); p1.hitstun = 20;
    pad.buttons[4].pressed = pad.buttons[0].pressed = true; step();
    assert(p1.state === 'hitstun' && p1.burstMeter === BURST.rechargeFrames, 'Medium triggered Burst');
    pad.buttons[0].pressed = false; pad.buttons[7].pressed = true; step();
    assert(p1.state === 'burst' && p1.burstMeter === 0 && p1.ultimate === 0, 'RT chord');
  } finally { navigator.getGamepads = old; }
});
