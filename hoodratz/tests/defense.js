// Block, pushblock, roll and burst.
function blockSetup() {
  setup();
  p1.reset(600, 1); p2.reset(680, -1);
  press('KeyR'); step(1);
}
function releaseAll() { for (const code of ['KeyR', 'KeyG', 'KeyD', 'KeyA', 'KeyF']) release(code); }

check('Every fighter air-blocks real air hits on either keyboard and both controller block buttons; heavies still break through',()=>{
  const original=navigator.getGamepads;
  try {
    for(const id of ROSTER)for(const index of [0,1])for(const device of ['keyboard',4,6])for(const name of ['air','airMedium','airHeavy']) {
      setup();const def=fighters[index],att=fighters[1-index];
      def.setCharacter(id);att.setCharacter('haze');def.reset(650,1);att.reset(710,-1);
      def.y=att.y=FLOOR-200;def.vy=att.vy=0;def.enter('air');att.enter('air');
      if(device==='keyboard'){navigator.getGamepads=original;press(index?'Quote':'KeyR');}
      else {
        const pad=testPad(2,'Air guard');navigator.getGamepads=()=>[null,null,pad];
        def.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});pad.buttons[device].pressed=true;
      }
      step();assert(def.state==='block'&&!def.grounded,id+' enters airborne guard');
      att.startAttack(name);att.stateFrame=att.move.startup;
      const pt=hitPoint(att,def);assert(pt,id+' real air collision');
      const hp=def.hp,guard=def.guard;applyHit(att,def,pt,g);
      if(name==='airHeavy')assert(def.hp<hp&&def.state==='hitstun',id+' heavy remains unblockable');
      else {near(def.hp,hp);near(def.guard,guard-BLOCK.guardDrain);assert(def.state==='blockstun',id+' air blockstun');}
    }
  } finally {navigator.getGamepads=original;}
});

check('Air block keeps gravity, cannot ground-roll or reset air attacks, recovers through landing and respects guard break',()=>{
  for(const id of ROSTER) {
    setup();p1.setCharacter(id);p2.setCharacter('haze');p1.reset(600,1);p2.reset(900,-1);
    p1.y=FLOOR-200;p1.vy=-3;p1.vx=2;p1.enter('air');p1.airMovesUsed.add('air');
    press('KeyR');step();assert(p1.state==='block'&&p1.y<FLOOR-200,'guard keeps jump arc');near(p1.vx,2);
    press('KeyD');step();release('KeyD');assert(p1.state==='block','no aerial ground roll');
    release('KeyR');step();assert(p1.state==='air'&&p1.airMovesUsed.has('air'),'release preserves air budget');
    p1.y=FLOOR-300;p1.vy=0;press('KeyR');step();p1.enter('blockstun');p1.timer=2;step(2);
    assert(p1.state==='block'&&!p1.grounded,'held block after airborne stun');
    p1.enter('blockstun');p1.timer=2;release('KeyR');step(2);assert(p1.state==='air','released block after airborne stun');
    p1.guardBroken=30;press('KeyR');step();assert(p1.state==='air','broken guard cannot air block');
    p1.guardBroken=0;step();assert(p1.state==='block','recovered guard can air block');
    g.paused=true;const y=p1.y,sf=p1.stateFrame;tick();near(p1.y,y);near(p1.stateFrame,sf);g.paused=false;
    p1.y=FLOOR-1;p1.vy=4;step();assert(p1.grounded&&p1.state==='block','landing keeps held guard');
    release('KeyR');step();assert(p1.state==='idle','release after landing');
  }
});

check('holding block stops normal attacks from any height: no health loss, guard drains, blockstun', () => {
  for (const name of ['light', 'low', 'overhead']) {
    blockSetup();
    assert(p1.state === 'block', 'enters block');
    const guard = p1.guard;
    p2.startAttack(name); p2.stateFrame = p2.move.startup;
    applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
    assert(p1.hp === MAX_HP, `${name}: no damage`);
    assert(p1.state === 'blockstun', `${name}: blockstun`);
    near(p1.guard, guard - BLOCK.guardDrain);
    assert(p1.timer === Math.round(MOVES[name].hitstun * BLOCK.stunScale), 'blockstun length');
    releaseAll();
  }
});

check('grabs and heavies go through block; grabs whiff during blockstun', () => {
  blockSetup();
  p2.startAttack('heavy'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.hp < MAX_HP && p1.state === 'hitstun', 'heavy hits');
  near(p1.guard, GUARD.max);
  releaseAll();
  blockSetup();
  p2.startAttack('grab'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.state === 'thrown', 'grab hits block'); finishThrow();
  assert(p1.hp < MAX_HP && p1.state === 'hitstun', 'thrown after blocking');
  near(p1.guard, GUARD.max);
  releaseAll();
  blockSetup();
  p1.enter('blockstun'); p1.timer = 10;
  p2.x = p1.x + 50; p2.startAttack('grab'); p2.stateFrame = p2.move.startup;
  assert(hitPoint(p2, p1) === null, 'grab whiffs in blockstun');
  releaseAll();
});

check('every fighter preserves low guard on clean normals, air attacks and throws, including at walls', () => {
  const characters = g.characters.slice();
  try { for (const id of ROSTER) for (const name of Object.keys(MOVES)) for (const wall of [false,true]) {
    startMatch(false,undefined,[id,'rip']);g.phase='fight';g.inputLocked=false;
    p1.reset(wall ? WALL_R-HALF_W-60 : 600,1);p2.reset(p1.x+60,-1);p2.guard=1;
    p1.startAttack(name);p1.stateFrame=p1.move.startup;p1.vx=0;
    applyHit(p1,p2,{x:p2.x,y:FLOOR-100},g);
    if (p1.suplex) { p1.stateFrame=YITTY.slamAt;updateSuplex(p1,p2,g);finishSuplex(p1,p2,g); }
    else finishThrow();
    near(p2.guard,1);assert(!p2.guardBroken,id+' '+name+' must not break guard');
    assert(p2.hp<MAX_HP,id+' '+name+' still damages health');
  } } finally { g.characters=characters;setup(); }
});

check('Heavy and Air Heavy parries require the correct direction within exactly two frames for every fighter',()=>{
  const characters=g.characters.slice();
  try {
    for(const id of ROSTER) for(const name of ['heavy','airHeavy']) for(const frame of [0,1,2,8]) for(const correct of [true,false]) {
      startMatch(false,undefined,['rip',id]);g.phase='fight';g.inputLocked=false;
      p1.reset(600,1);p2.reset(660,-1);p2.guard=37;
      p2.startParry(correct?(name==='airHeavy'?'overhead':'high'):'low');p2.stateFrame=frame;
      p1.startAttack(name);p1.stateFrame=p1.move.startup;p1.vx=0;
      applyHit(p1,p2,{x:p2.x,y:FLOOR-100},g);
      const success=correct&&frame<2;
      assert((p2.hp===p2.maxHp)===success,id+' '+name+' frame '+frame+' direction '+correct);
      near(p2.guard,37);
      if(success) {
        assert(p1.state==='stagger'&&p2.state==='idle'&&p1.timer>=COMBAT.perfectStagger,'punish');
        near(p2.ultimate,15);near(p1.ultimate,0);assert(g.popups.some(p=>p.text==='HEAVY PARRY'),'feedback');
      } else {
        assert(p2.state==='hitstun'&&p1.state==='attack','no early deflect');near(p2.ultimate,2);near(p1.ultimate,3);
      }
    }
  } finally { g.characters=characters;setup(); }
});
check('real keyboard and RT inputs parry ground and air heavies; pause and hit-stop freeze the strict window',()=>{
  const characters=g.characters.slice(), originalPads=navigator.getGamepads;
  try {
    for(const owner of [0,1]) for(const name of ['heavy','airHeavy']) {
      setup();const def=fighters[owner],att=fighters[1-owner];def.reset(600,1);att.reset(660,-1);
      att.startAttack(name);att.stateFrame=att.move.startup-1;att.vx=0;
      const key=owner?'Period':'KeyG',up=owner?'ArrowUp':'KeyW';
      if(name==='airHeavy')press(up);press(key);step();release(key);release(up);
      assert(def.hp===MAX_HP&&att.state==='stagger','keyboard '+owner+' '+name);
    }
    for(const name of ['heavy','airHeavy']) {
      const pad=testPad(0,'heavy parry pad');navigator.getGamepads=()=>[pad];
      startMatch(false,[{type:'pad',slot:0,id:pad.id},{type:'keyboard',layout:1}],['haze','rip']);
      g.phase='fight';g.inputLocked=false;p1.reset(600,1);p2.reset(660,-1);
      p2.startAttack(name);p2.stateFrame=p2.move.startup-1;p2.vx=0;
      pad.buttons[7].pressed=true;pad.buttons[12].pressed=name==='airHeavy';step();
      assert(p1.hp===MAX_HP&&p2.state==='stagger','RT '+name);
      pad.buttons[7].pressed=false;pad.buttons[12].pressed=false;
    }
    navigator.getGamepads=originalPads;setup();p2.startParry('high');p2.stateFrame=1;
    g.paused=true;tick();near(p2.stateFrame,1);g.paused=false;g.hitstopLeft=2;tick();near(p2.stateFrame,1);
    p1.startAttack('heavy');applyHit(p1,p2,{x:p2.x,y:FLOOR-100},g);near(p2.hp,MAX_HP);
  } finally { navigator.getGamepads=originalPads;g.characters=characters;setup(); }
});
check('Debug Mode cannot widen heavy parries; blocking, wrong heights and guard break still lose to heavies',()=>{
  for(const frame of [1,2,5]) {
    setup();p2.debug=100;p2.startParry('low');p2.stateFrame=frame;strike('heavy');
    assert((p2.hp===MAX_HP)===(frame===1),'Debug timing '+frame);
    assert(p2.parryDir==='high','Debug reads ground height');
  }
  for(const name of ['heavy','airHeavy']) for(const defense of ['block','wrong','broken']) {
    setup();p2.guard=50;
    if(defense==='broken')p2.guardBroken=20;
    p2.enter(defense==='block'?'block':'parry');p2.parryDir=name==='heavy'?'overhead':'high';
    strike(name);assert(p2.hp<MAX_HP,'heavy beats '+defense);near(p2.guard,50);
  }
});

check('releasing block returns to idle; blockstun ends back in block while held', () => {
  blockSetup();
  release('KeyR'); step(1);
  assert(p1.state === 'idle', 'release');
  blockSetup();
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  step(p1.timer + 1);
  assert(p1.state === 'block', 'back to block');
  releaseAll();
});

check('guard broken fighters cannot block; a blocked hit can cause the break', () => {
  blockSetup();
  p1.guard = 5;
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.guardBroken > 0, 'break from chip');
  step(p1.timer + 1);
  assert(p1.state === 'idle', 'cannot stay in block');
  releaseAll();
});

check('Pushblock is free even at one guard, shoves the attacker and frees the defender', () => {
  blockSetup();
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  p1.guard = 1;
  const guard = p1.guard, ultimate = p1.ultimate, burst = p1.burstMeter;
  press('KeyG'); step(1);
  assert(p1.state === 'deflect' && p1.timer === BLOCK.pushblockFrames, 'defender recovers');
  assert(p2.state === 'deflect' && p2.timer === BLOCK.pushblockAttackerStun, 'attacker stunned');
  assert(p2.vx > 0, 'attacker pushed away');
  near(p1.guard, guard); near(p1.ultimate, ultimate); near(p1.burstMeter, burst);
  releaseAll();
});

check('block + tap a direction rolls low-profile through the opponent', () => {
  blockSetup();
  press('KeyD'); step(1);
  assert(p1.state === 'roll' && p1.hurtHeight() === MOVE.slideHeight, 'roll');
  release('KeyD');
  step(BLOCK.rollFrames + 1);
  assert(p1.x > p2.x, 'passed through');
  assert(p1.state === 'rollRecover', 'recovery');
  releaseAll();
});

check('Burst spends only its own full meter, works in hitstun and blows the attacker away', () => {
  setup(); p1.reset(600, 1); p2.reset(680, -1);
  p1.ultimate = 100; p1.burstMeter = 100;
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  press('KeyR'); press('KeyG'); step(1);
  assert(p1.state === 'hitstun', 'not enough meter');
  releaseAll();
  setup(); p1.reset(600, 1); p2.reset(680, -1);
  p1.ultimate = 0;
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  press('KeyR'); press('KeyG'); step(1);
  assert(p1.state === 'burst' && p1.invincible, 'burst');
  assert(p1.ultimate === METER_GAIN.takenHit && p1.burstMeter === 0, 'only Burst meter spent');
  assert(p2.state === 'hitstun' && p2.vx > 0 && p2.vy < 0 && p2.hp === MAX_HP, 'attacker launched away without damage');
  assert(p1.combo === 0, 'combo reset');
  releaseAll();
});

check('practice dummy mode 8 blocks', () => {
  showTitle(); press('KeyP'); release('KeyP'); press('Enter'); release('Enter'); press('Enter'); release('Enter');
  assert(g.practice, 'practice started');
  g.phase = 'fight'; g.inputLocked = false;
  press('Digit8'); release('Digit8'); step(2);
  assert(p2.state === 'block', 'dummy blocks');
  press('F2'); release('F2');
});

check('light, low, overhead chain connects from any gap inside light range; round starts 300 px apart', () => {
  for (const gap of [60, 110, 125]) {
    setup(); p1.reset(500, 1); p2.reset(500 + gap, -1);
    press('KeyF'); step(); release('KeyF'); step(9);
    press('KeyS'); press('KeyF'); step(); release('KeyF'); step(12); release('KeyS');
    press('KeyW'); press('KeyF'); step(); release('KeyF'); release('KeyW'); step(30);
    assert(p2.hp < MAX_HP && p1.chainUsed.size === 3, `gap ${gap}: chain dropped (${p1.chainUsed.size} moves)`);
    assert(p2.x - p1.x <= MOVES.light.box.x + MOVES.light.box.w + HURT_HALF_W, `gap ${gap}: pushed out of reach`);
  }
  startMatch();
  assert(p2.x - p1.x === ROUND.spawnOffset * 2, 'spawn gap');
});

check('corner protection: strings on a cornered defender end with the defender recovering first', () => {
  for (const [x, cornered] of [[WALL_L + HALF_W + 2, true], [640, false]]) {
    setup(); p1.reset(x, 1); p2.reset(x + 80, -1);
    p2.startAttack('overhead'); p2.stateFrame = p2.move.startup; p2.vx = 0;
    applyHit(p2, p1, { x: p1.x, y: p1.y - 120 }, g);
    const attackerLeft = p2.move.active + p2.move.recovery;
    if (cornered) assert(p1.hitstun < attackerLeft, `cornered: defender ${p1.hitstun} vs attacker ${attackerLeft}`);
    else assert(p1.hitstun === MOVES.overhead.hitstun, 'midscreen hitstun unchanged');
  }
  setup(); p1.reset(WALL_L + HALF_W + 2, 1); p2.reset(WALL_L + HALF_W + 90, -1);
  p2.startAttack('heavy', MOVES.heavy.startup); p2.vx = 0;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.hitstun === MOVES.heavy.hitstun, 'heavies keep full hitstun');
});

check('burst launches the attacker roughly 300+ px away', () => {
  setup(); p1.reset(400, 1); p2.reset(480, -1); p1.ultimate = 60;
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  press('KeyR'); press('KeyG'); step(); release('KeyR'); release('KeyG');
  step(60);
  assert(p2.x - p1.x > 300, `only ${Math.round(p2.x - p1.x)} px`);
});
