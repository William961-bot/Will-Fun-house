// Exercise real input, physics and combat rather than only raising the combo counter.
check('Down + Medium uses both keyboards and controller A; airborne input stays Air Medium', () => {
  for (const [index, down, key] of [[0,'KeyS','KeyV'],[1,'ArrowDown','KeyK'],[1,'ArrowDown','Numpad4']]) {
    setup(); press(down); tap(key); release(down);
    assert(fighters[index].moveName === 'lowMedium', key+' grounded low medium');
    setup(); const f = fighters[index]; f.y -= 120; f.vy = -4; f.enter('air');
    press(down); tap(key); release(down);
    assert(f.moveName === 'airMedium', key+' airborne medium');
  }
  const originalPads = navigator.getGamepads;
  try {
    const pad = testPad(2,'low medium pad'); navigator.getGamepads = () => [null,null,pad];
    for (const direction of ['stick','dpad']) {
      startMatch(false,[{type:'pad',slot:2,id:pad.id},{type:'keyboard',layout:1}],['haze','rip']);
      g.phase='fight';g.inputLocked=false;
      pad.axes[1]=direction==='stick'?1:0;pad.buttons[13].pressed=direction==='dpad';pad.buttons[0].pressed=true;
      step(); assert(p1.moveName==='lowMedium',direction+' + A');
      assert(!p1.input.held.attack && !p1.input.held.parry,'no remapping of A');
      pad.axes[1]=0;pad.buttons[13].pressed=false;pad.buttons[0].pressed=false;
    }
  } finally { navigator.getGamepads=originalPads; setup(); }
});

function lowMediumRoute(id, facing, index=0) {
  setup(); const att=fighters[index], def=fighters[1-index];
  att.setCharacter(id); def.setCharacter('rip'); att.reset(640,facing); def.reset(640+facing*60,-facing);
  const keys=index===0?{light:'KeyF',medium:'KeyV',down:'KeyS',up:'KeyW'}:{light:'Comma',medium:'KeyK',down:'ArrowDown',up:'ArrowUp'};
  const route=[['light',keys.light],['medium',keys.medium],['lowMedium',keys.medium,keys.down],['overhead',keys.light,keys.up]];
  for (let i=0;i<route.length;i++) {
    const [name,button,direction]=route[i];
    if(direction)press(direction);tap(button);if(direction)release(direction);
    assert(att.moveName===name,`${id}/${index}/${facing} starts ${name}`);
    stepUntil(()=>att.moveHit && att.stateFrame>=att.move.startup+att.move.active-1,40);
    const expected=id==='sombra'?[1,3,5,6][i]:i+1;
    assert(def.combo===expected,`${id}/${index}/${facing} true combo ${name}: ${def.combo}`);
  }
  assert(def.overheadLaunched && def.guard===100,'launch and no guard loss on clean hits');
}
check('All fighters chain Light → Medium → Low Medium → Overhead for both players and facings', () => {
  for(const id of ROSTER)for(const facing of [-1,1])for(const index of [0,1])lowMediumRoute(id,facing,index);
  setup();
});

check('Low Medium has its own chain slot, cannot repeat, and whiffs cannot cancel', () => {
  setup();strike('medium');p1.stateFrame=MOVES.medium.startup+MOVES.medium.active-1;
  press('KeyS');tap('KeyV');release('KeyS');assert(p1.moveName==='lowMedium','distinct from medium');
  stepUntil(()=>p1.moveHit && p1.stateFrame>=p1.move.startup+p1.move.active-1,40);
  const frame=p1.stateFrame;press('KeyS');tap('KeyV');release('KeyS');
  assert(p1.moveName==='lowMedium' && p1.stateFrame>frame,'cannot repeat low medium');
  tap('KeyV');assert(p1.moveName==='lowMedium','cannot repeat used standing medium');
  setup();p2.x=1100;press('KeyS');tap('KeyV');release('KeyS');step(MOVES.lowMedium.startup+MOVES.lowMedium.active-1);
  tap('KeyF');assert(p1.moveName==='lowMedium' && !p1.moveHit,'miss has full recovery');
  setup();strike('lowMedium');p1.stateFrame=MOVES.lowMedium.startup+MOVES.lowMedium.active-1;
  tap('KeyV');assert(p1.moveName==='medium','low medium into standing medium');
});

check('Low Medium is blockable, low-parryable, punishable by wrong parries, and Burst can escape', () => {
  setup();p2.enter('block');strike('lowMedium');
  assert(p2.hp===MAX_HP && p2.state==='blockstun' && p2.guard===100-BLOCK.guardDrain,'normal low block');
  setup();p2.startParry('low');strike('lowMedium');
  assert(p2.hp===MAX_HP && p1.state==='stagger','low perfect parry');
  for(const dir of ['high','overhead']) {
    setup();p2.startParry(dir);strike('lowMedium');assert(p2.hp<MAX_HP && p2.state==='hitstun','wrong direction '+dir);
  }
  setup();strike('lowMedium');const hp=p2.hp;press('Quote');tap('Period');release('Quote');
  assert(p2.state==='burst' && p2.hp===hp && p2.combo===0,'own-meter burst');
});

check('Every Low Medium animation stays finite through startup, strike and recovery on either side', () => {
  for(const id of ROSTER)for(const facing of [-1,1]) {
    setup();p1.setCharacter(id);p1.reset(640,facing);p1.startAttack('lowMedium');
    for(let frame=0;frame<=p1.move.startup+p1.move.active+p1.move.recovery;frame+=.5)
      assert(poseIsFinite(attackAnim(p1,frame)),`${id}/${facing}/${frame}`);
  }
  setup();
});

check('Medium maps to both keyboards and A; RT parries with exclusive controller inputs', () => {
  for (const [index, key] of [[0, 'KeyV'], [1, 'KeyK'], [1, 'Numpad4']]) {
    setup(); const setting = g.settings.impactFrames;
    press(key); step(); release(key);
    assert(fighters[index].moveName === 'medium', key);
    assert(g.settings.impactFrames === setting, 'medium toggles settings');
  }
  const old = navigator.getGamepads;
  try {
    const pad = testPad(2, 'medium pad'); pad.buttons[0].pressed = true;
    navigator.getGamepads = () => [null, null, pad];
    const input = new PlayerInput(0, {type:'pad',slot:2,id:pad.id}); input.poll(1);
    assert(input.held.medium && !input.held.parry && !input.held.attack && !input.held.block && !input.held.heavy, 'A exclusive medium');
    pad.buttons[0].pressed = false; pad.buttons[7].pressed = true; input.poll(2);
    assert(input.held.parry && !input.held.medium && !input.held.attack && !input.held.block, 'RT exclusive parry');
  } finally { navigator.getGamepads = old; }
});

check('Heavy presses always start the original wall launcher; holding or releasing makes no difference', () => {
  for (const id of ROSTER) for (const facing of [-1, 1]) for (const held of [false, true]) {
    setup(); p1.setCharacter(id); p1.reset(640, facing); p2.reset(640 + facing * 60, -facing);
    press('KeyH'); step(); if (!held) release('KeyH');
    assert(p1.moveName === 'heavy' && p1.stateFrame === 0 && p1.move.startup === 28, 'full heavy starts on press');
    stepUntil(() => p1.moveHit, 50); release('KeyH');
    assert(p1.moveName === 'heavy', 'same heavy after release or hold');
    assert(p2.hp < MAX_HP && p1.cooldowns.heavy > 0, 'damage and cooldown');
    assert(Math.abs(p2.vx) >= 8 && p2.vy < 0, 'original launch');
  }
  for (const held of [false, true]) {
    setup(); p1.reset(640,1); p2.reset(700,-1);
    for (const f of fighters) { f.y -= 100; f.vy = -4; f.enter('air'); }
    press('KeyH'); step(); if (!held) release('KeyH');
    assert(p1.moveName === 'airHeavy' && p1.stateFrame === 0, 'full air heavy starts on press');
    stepUntil(() => p1.moveHit, 25); release('KeyH');
    assert(p1.moveName === 'airHeavy', 'same air heavy after release or hold');
    assert(Math.abs(p2.vx) >= 8, 'air heavy knockback');
  }
  setup(); p2.reset(1100,-1); press('KeyH'); step(5); const frame = p1.stateFrame;
  g.paused = true; tick(); assert(p1.stateFrame === frame && p1.moveName === 'heavy', 'pause freezes heavy');
  g.paused = false; release('KeyH'); step(); assert(p1.moveName === 'heavy', 'release preserves full heavy');
  assert(!g.popups.some(p => p.text === 'CHARGED'), 'no charge feedback');
  setup(); strike('light'); p1.stateFrame = MOVES.light.startup + MOVES.light.active;
  tap('KeyH'); assert(p1.moveName === 'heavy' && p1.stateFrame === MOVE.heavyCancelSkip, 'original hit-cancel startup skip');
  for (const key of ['Slash', 'Numpad3']) { setup(); press(key); step(); release(key); assert(p2.moveName === 'heavy', '2P full heavy '+key); }
  const originalPads = navigator.getGamepads;
  try {
    const pad = testPad(2, 'heavy pad'); navigator.getGamepads = () => [null,null,pad];
    startMatch(false, [{type:'pad',slot:2,id:pad.id},{type:'keyboard',layout:1}], ['haze','rip']);
    g.phase = 'fight'; g.inputLocked = false; pad.buttons[3].pressed = true; step(); pad.buttons[3].pressed = false; step();
    assert(p1.moveName === 'heavy' && p1.state === 'attack', 'controller Y tap starts full heavy');
  } finally { navigator.getGamepads = originalPads; }
});

check('Overhead launches once per combo, block prevents launch and Burst frees an airborne victim', () => {
  setup(); strike('overhead'); assert(p2.vy < 0 && p2.overheadLaunched, 'no launch');
  p2.vy = 2; strike('overhead'); near(p2.vy, 2);
  p2.enter('idle'); strike('overhead'); assert(p2.vy < 0, 'new combo launch');
  setup(); p2.enter('block'); strike('overhead'); assert(p2.vy === 0 && !p2.overheadLaunched, 'blocked launch');
  setup(); strike('overhead'); p2.y -= 30; p2.ultimate = 0;
  press('Quote'); press('Period'); step(); release('Quote'); release('Period');
  assert(p2.state === 'burst' && p2.combo === 0 && !p2.overheadLaunched, 'air Burst');
});

function juggleRoute(facing = 1, stopAtAir = false, id = 'haze') {
  setup(); p1.setCharacter(id); p2.setCharacter('rip'); p1.reset(facing > 0 ? 1000 : 280, facing); p2.reset(p1.x + facing * 60, -facing);
  function step(n = 1) { for (let i=0;i<n;i++) tick(); }
  function tap(code) { press(code); step(); release(code); }
  function stepUntil(test, limit) {
    for (let i=0;i<limit && !test();i++) step();
    assert(test(), `route timeout ${id}/${facing}: ${p1.state}/${p1.moveName}/${p1.stateFrame}; victim ${p2.state}/${p2.combo}; gap ${Math.round(p2.x-p1.x)}, heights ${Math.round(FLOOR-p1.y)}/${Math.round(FLOOR-p2.y)}`);
  }
  function ready() { stepUntil(() => p1.moveHit && p1.stateFrame >= p1.move.startup + p1.move.active - 1, 65); }
  tap('KeyF'); ready(); press('KeyS'); tap('KeyF'); release('KeyS'); ready();
  tap('KeyV'); ready(); press('KeyW'); tap('KeyF'); release('KeyW'); ready();
  const burst=id==='sombra';
  assert(p2.combo === (burst?5:4) && p2.overheadLaunched, 'ground chain');
  tap('KeyW'); assert(p1.state === 'air' && p1.y < FLOOR, 'jump cancel');
  tap('KeyF'); ready(); assert(p2.combo === (burst?6:5), 'air light');
  tap('KeyV'); ready(); assert(p2.combo === (burst?8:6), 'air medium');
  if (stopAtAir) return;
  tap('KeyH'); stepUntil(() => p1.moveHit, 25); assert(p2.combo === (burst?9:7), 'air finisher'); stepUntil(() => p2.wallBounced, 60);
  let held=null;
  for(let n=0;n<100;n++) {
    if(['idle','walk','run','skid','taunt'].includes(p1.state)&&p1.grounded&&Math.abs(p1.x-p2.x)<=100&&p2.y>=p1.y-115)break;
    if(!p1.grounded||p2.y<p1.y-115){step();continue;}
    const dir=p2.x>p1.x?'KeyD':'KeyA';
    if(held!==dir){if(held)release(held);held=dir;press(held);}step();
  }
  if(held)release(held);
  if(p1.state==='taunt'){tap(p2.x>p1.x?'KeyD':'KeyA');step();}
  tap('KeyF'); ready(); assert(p2.combo === (burst?10:8), 'bounce light');
  tap('KeyV'); ready(); assert(p2.combo === (burst?12:9), 'bounce medium');
  press('KeyS'); tap('KeyF'); release('KeyS'); stepUntil(() => p1.moveHit, 30);
  assert(p2.combo === (burst?13:10) && !p2.comboCapped, `route has room to extend ${p2.combo}`);
  return p2.hp;
}
check('Shared single-hit overhead route reaches ten hits through real air attacks and one wall bounce on either side', () => {
  // Sombra's two-shot moves have their own measured fifteen-hit and practice-CPU routes.
  for (const id of ROSTER.filter(id=>id!=='sombra')) for (const facing of [-1, 1]) juggleRoute(facing, false, id);
});

check('A missed juggle gives the airborne victim control when hitstun runs out', () => {
  setup(); strike('overhead'); p2.hitstun = 1; p2.y -= 30; p2.vy = -6; step();
  assert(p2.state === 'air' && p2.combo === 0 && !p2.overheadLaunched, 'airborne recovery');
});

check('Air moves cannot repeat within a jump; landing restores them; every new pose is finite', () => {
  setup(); p1.y -= 120; p1.vy = -8; p1.enter('air'); tap('KeyF');
  p1.moveHit = true; p1.stateFrame = p1.move.startup + p1.move.active - 1;
  tap('KeyF'); assert(p1.moveName === 'air', 'repeated air attack');
  tap('KeyV'); assert(p1.moveName === 'airMedium', 'air medium cancel');
  for (const id of ROSTER) for (const name of ['medium','heavy','airMedium','airHeavy']) {
    p1.setCharacter(id); p1.startAttack(name);
    for (let frame=0; frame < p1.move.startup+p1.move.active+p1.move.recovery; frame++)
      assert(poseIsFinite(attackAnim(p1,frame)), `${id}/${name}/${frame}`);
  }
});
