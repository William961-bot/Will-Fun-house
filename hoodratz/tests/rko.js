halfslipCheck('RKO beats grounded/airborne block and parry, joins combos and respects invincibility',()=>{
  for(const air of [false,true])for(const defense of ['block','parry','combo','invincible']) {
    yittyVs('rip',65);if(air){p1.y=FLOOR-60;p2.y=FLOOR-90;p2.vy=-2;p2.enter('air');}
    YITTY_ABILITIES.upSpecial(p1,p2,g);p1.stateFrame=p1.move.startup;
    if(defense==='block')p2.enter('block');
    if(defense==='parry')p2.startParry('overhead');
    if(defense==='combo'){p2.enter('hitstun');p2.hitstun=30;p2.combo=2;p2.comboAttacker=0;}
    if(defense==='invincible')p2.enter('burst');
    const pt=hitPoint(p1,p2);
    if(defense==='invincible'){assert(!pt,'invincible target is safe');continue;}
    assert(pt,'real airborne contact');applyHit(p1,p2,pt,g);
    assert(p1.throwKind==='yittyRko'&&p2.hp===MAX_HP&&p1.throwEscape?.left===10,'catch instead of block damage');
    if(defense==='combo'){assert(p2.combo===2,'combo preserved through catch');step(80);assert(p2.combo===3,'one slam joins combo');}
  }
});
halfslipCheck('Siglarp copies RKO with its real air catch, normal escape and one slam in both slots',()=>{
  for(const index of [0,1]) {
    const pair=siglarpVs('yitty',index,1,80),{f,opp}=pair;
    opp.y=FLOOR-120;opp.vy=-3;opp.enter('air');siglarpObserve(opp,'upSpecial');tap(pair.special);
    stepUntil(()=>f.state==='throw',20);
    assert(f.throwKind==='yittyRko'&&!f.siglarpIdentity&&!f.suplex&&f.throwEscape.left===10,'copied catch');
    step(80);assert(opp.hp===MAX_HP-90&&f.stats.id==='siglarp','normal release and identity');
  }
});
halfslipCheck('Controller RKO in free-for-all catches the actual airborne enemy and freezes its cinematic safely',()=>{
  const old=navigator.getGamepads,pad=testPad(2,'RKO controller');
  try {
    navigator.getGamepads=()=>[null,null,pad];
    threePlayerSetup(['haze','rip','yitty'],[{type:'keyboard',layout:0},{type:'keyboard',layout:1},{type:'pad',slot:2,id:pad.id}]);
    p3.reset(620,-1);p1.reset(950,-1);p2.reset(530,1);p2.y=FLOOR-120;p2.vy=-3;p2.enter('air');
    pad.buttons[12].pressed=pad.buttons[5].pressed=true;step();pad.buttons[12].pressed=pad.buttons[5].pressed=false;
    stepUntil(()=>p3.state==='throw',20);
    assert(p3.throwTarget===1&&p2.thrownBy===2&&p1.hp===MAX_HP,'actual airborne target');
    const snapshot=()=>JSON.stringify([p3.x,p3.y,p3.stateFrame,p2.x,p2.y,p3.throwEscape?.left]);
    const before=snapshot();g.paused=true;tick();assert(snapshot()===before,'pause');g.paused=false;g.hitstopLeft=2;tick();assert(snapshot()===before,'hitstop');
    for(let frame=0;frame<=THROWS.yittyRko.frames;frame+=.5)for(const who of ['att','def'])
      assert(poseIsFinite(rkoThrowPose(p3,who,frame)),'finite cutter and slam');
    tap('KeyL');assert(p2.hp===MAX_HP&&p3.state==='deflect','actual third-slot throw escape');
  } finally {navigator.getGamepads=old;}
});
halfslipCheck('RKO startup is vulnerable and an active strike wins simultaneous contact',()=>{
  for(const frame of [YITTY.rkoStartup-1,YITTY.rkoStartup]) {
    yittyVs('rip',60);YITTY_ABILITIES.upSpecial(p1,p2,g);p1.stateFrame=frame;
    p2.startAttack('light');p2.stateFrame=p2.move.startup;
    assert(!p1.invincible&&hitPoint(p2,p1),'vulnerable hurtbox');
    assert(!!hitPoint(p1,p2)===(frame===YITTY.rkoStartup),'eight-frame startup');
    resolveCombat(p1,p2,g);
    assert(p1.state==='hitstun'&&p1.hp<MAX_HP&&p2.hp===MAX_HP&&p2.state!=='thrown','strike interrupts catch');
  }
});
halfslipCheck('RKO escapes on frame ten, commits on eleven and lands once with room at either wall',()=>{
  for(const facing of [-1,1])for(const at of [10,11]) {
    yittyVs('rip',60);p1.reset(facing>0?WALL_R-HALF_W-65:WALL_L+HALF_W+65,facing);
    p2.reset(p1.x+60*facing,-facing);
    YITTY_ABILITIES.upSpecial(p1,p2,g);p1.stateFrame=p1.move.startup;
    applyHit(p1,p2,hitPoint(p1,p2),g);step(at-1);tap('KeyL');
    if(at===10){assert(p1.state==='deflect'&&p2.hp===MAX_HP,'last escape tick');continue;}
    assert(p1.state==='throw'&&p1.throwCommitted,'eleven is late');
    stepUntil(()=>p1.stateFrame>=THROWS.yittyRko.turnAt,30);
    assert(p1.facing===-facing&&Math.abs(p1.x-p2.x)===THROWS.yittyRko.distance,'turn and headlock spacing');
    for(const f of [p1,p2])assert(f.x>=WALL_L+HALF_W&&f.x<=WALL_R-HALF_W,'arena bounds');
    stepUntil(()=>p1.state==='throwRecover',30);
    assert(p2.hp===MAX_HP-90&&p2.combo===1&&p2.animHint==='rkoSlam','single release');
    assert(p1.y===FLOOR&&p2.y<=FLOOR&&p2.y>=FLOOR-9&&p1.throwRecovery===28,'grounded recovery and victim release launch');
    assert(poseIsFinite(hitAnim(p2))&&hitAnim(p2).head[1]===-28,'faceplant impact');
    step(20);assert(p2.hp===MAX_HP-90,'no extra slam damage');
  }
});
halfslipCheck('Air RKO uses the six-second cooldown, freezes safely and resets each round',()=>{
  yittyVs('rip',400);p1.y=FLOOR-140;p1.vy=-2;p1.enter('air');
  press('KeyW');tap('KeyT');release('KeyW');
  assert(p1.moveName==='rko'&&p1.cooldowns.upSpecial===360,'air input and cooldown');
  const remaining=p1.cooldowns.upSpecial;g.paused=true;tick();near(p1.cooldowns.upSpecial,remaining);
  g.paused=false;g.hitstopLeft=2;tick();near(p1.cooldowns.upSpecial,remaining);
  stepUntil(()=>p1.state==='idle',120);press('KeyW');tap('KeyT');release('KeyW');
  assert(p1.moveName!=='rko'||p1.state!=='attack','cooldown denies reuse');
  startRound();assert(p1.cooldowns.upSpecial===0&&!p1.yittyRkoLaunched&&p2.thrownBy===null,'round clears state');
});
