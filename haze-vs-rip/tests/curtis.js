function curtisVs(index=0,facing=1,gap=70) {
  setup();const f=fighters[index],opp=fighters[1-index];f.setCharacter('curtis');opp.setCharacter('rip');
  f.reset(600,facing);opp.reset(600+gap*facing,-facing);
  return {f,opp,up:index?'ArrowUp':'KeyW',block:index?'Quote':'KeyR',special:index?'Semicolon':'KeyT'};
}
function curtisHeavyWall(index=0,away=-1,attacker='rip') {
  const pair=curtisVs(index,-away);const {f,opp}=pair;opp.setCharacter(attacker);
  f.x=away<0?WALL_R-HALF_W-110:WALL_L+HALF_W+110;opp.x=f.x+away*65;opp.facing=-away;
  opp.startAttack('heavy');opp.stateFrame=opp.move.startup;const pt=hitPoint(opp,f);
  assert(pt,'heavy contact');applyHit(opp,f,pt,g);return pair;
}
check('Curtis selection, mirror palette, athletic normals, CPU tiers and fifteen-hit/practice routes join the thirteen-fighter roster',()=>{
  pickCharacters(['curtis','curtis']);assert(ROSTER.length===13&&p1.kit===CURTIS_ABILITIES,'new fighter');
  assert(p2.stats.color===CHARACTERS.curtis.altColor&&p1.hp===MAX_HP,'mirror/health');
  openCharacterSelect();assert(charSelect.cursor.every(i=>ROSTER[i]==='curtis'),'both selection slots');
  for(const name of Object.keys(MOVES)) {
    const {f}=curtisVs();f.startAttack(name);
    for(let at=0;at<f.move.startup+f.move.active+f.move.recovery;at+=.5)assert(poseIsFinite(attackAnim(f,at)),name+' pose');
  }
  startMatch(true,undefined,['curtis','curtis']);g.phase='fight';g.inputLocked=false;g.practice.infinite=true;
  p1.curtisSwings=0;p1.curtisWallUsed=true;startRound();assert(p1.curtisSwings===1&&!p1.curtisWallUsed,'round reset');
});
check('Curtis swings on a fresh second Jump on both keyboards, preserves air attacks, permits air block and resets on landing',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const {f,up,block}=curtisVs(index,facing,400);press(up);step(4);release(up);
    assert(f.state==='air'&&f.curtisSwings===1,'ordinary first jump');step();
    f.airMovesUsed.add('air');const hp=f.hp,guard=f.guard,meter=f.ultimate,y=f.y;
    press(up);step();release(up);assert(f.curtisSwingLeft===CURTIS.swingFrames-1&&f.curtisSwings===0,'second jump swings');
    assert(f.y<y&&f.vx*facing>=CURTIS.swingSpeed&&f.curtisAnchor,'forward/up arc');
    assert(f.airMovesUsed.has('air')&&f.hp===hp&&f.guard===guard&&f.ultimate===meter&&!f.invincible,'no normal/budget/resource reset');
    const left=f.curtisSwingLeft;press(up);step();release(up);assert(f.curtisSwingLeft===left-1,'no third jump');
    press(block);step();assert(f.state==='block'&&!f.grounded,'block during swing');release(block);step();
    f.curtisSwingLeft=0;f.y=FLOOR-1;f.vy=4;step(2);assert(f.curtisSwings===1&&!f.curtisWallUsed,'landing restores jump');
  }
});
check('Curtis controller D-pad and stick Jump give one swing and directional Special keeps its priority',()=>{
  const original=navigator.getGamepads;
  try {
    for(const index of [0,1])for(const useStick of [false,true]) {
      const pair=curtisVs(index,1,350),{f}=pair;const pad=testPad(2,'Curtis athletic pad');navigator.getGamepads=()=>[null,null,pad];
      f.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});f.y=FLOOR-130;f.enter('air');
      if(useStick)pad.axes[1]=-1;else pad.buttons[12].pressed=true;step();
      assert(f.curtisSwings===0&&f.curtisSwingLeft>0,'controller swing');
      if(useStick)pad.axes[1]=0;else pad.buttons[12].pressed=false;step();
      f.reset(600,1);f.y=FLOOR-120;f.enter('air');
      pad.buttons[12].pressed=true;pad.buttons[5].pressed=true;step();
      assert(f.moveName==='rubberRocket'&&f.curtisSwings===1,'Up + Special not a double jump');
    }
  } finally {navigator.getGamepads=original;}
});
check('Curtis can escape a real heavy wall bounce from every opponent, wall and player with a fresh Jump; damage remains',()=>{
  for(const attacker of ROSTER)for(const index of [0,1])for(const away of [-1,1]) {
    const {f,up}=curtisHeavyWall(index,away,attacker);const hp=f.hp,burst=f.burstMeter;
    activeUntil(()=>f.curtisWallWindow>0,35);assert(f.state==='hitstun'&&f.wallBounced,'real heavy bounce');
    press(up);step();release(up);assert(f.state==='air'&&f.vx*away>0&&f.vy<0&&f.curtisWallUsed,'wall kick escape');
    assert(f.hp===hp&&f.combo===0&&f.hitstun===0&&f.burstMeter>=burst&&!f.invincible,'keeps damage, ends combo, costs no Burst');
  }
});
check('Curtis wall escape rejects held/late Jump, normal hits and grabs; passive athletics survive Hack and guard break',()=>{
  for(const mode of ['held','late']) {
    const {f,up}=curtisHeavyWall();if(mode==='held')press(up);
    activeUntil(()=>f.curtisWallWindow>0,35);step(mode==='late'?CURTIS.wallWindow+1:1);
    if(mode==='late')press(up);step();release(up);assert(!f.curtisWallUsed,'invalid '+mode+' input');
  }
  const pair=curtisHeavyWall();activeUntil(()=>pair.f.curtisWallWindow>0,35);
  pair.f.hacked=90;pair.f.guardBroken=60;press(pair.up);step();release(pair.up);
  assert(pair.f.curtisWallUsed&&pair.f.state==='air','passive kick remains available');
  pair.f.enter('hitstun');pair.f.curtisHeavyLaunch=true;pair.f.wallBounced=false;pair.f.vx=20;pair.f.x=WALL_R-HALF_W;
  pair.f.hitWall(-1,g);assert(pair.f.curtisWallWindow===0,'cannot repeat before landing');
  for(const name of ['light','grab']) {
    const {f,opp}=curtisVs();f.enter('hitstun');f.vx=20;f.x=WALL_R-HALF_W;
    f.kit.onTakenHit(f,MOVES[name]);f.hitWall(-1,g);assert(!f.curtisWallWindow,name+' cannot arm escape');
  }
});
check('Curtis swing and wall window freeze on pause, hitstop and domain openers; hits interrupt the rope',()=>{
  const pair=curtisVs(),{f,up}=pair;f.y=FLOOR-150;f.enter('air');press(up);step();release(up);
  for(const mode of ['pause','hitstop','opener']) {
    const state=[f.curtisSwingLeft,f.x,f.y];
    if(mode==='pause')g.paused=true;if(mode==='hitstop')g.hitstopLeft=2;
    if(mode==='opener')g.domainSequence={kind:'cutscene',owner:1,type:'rip',framesLeft:30};
    tick();near(f.curtisSwingLeft,state[0]);near(f.x,state[1]);near(f.y,state[2]);
    g.paused=false;g.hitstopLeft=0;g.domainSequence=null;
  }
  f.kit.onTakenHit(f,MOVES.light);assert(f.curtisSwingLeft===0,'hit cuts swing');
  const wall=curtisHeavyWall();activeUntil(()=>wall.f.curtisWallWindow>0,35);
  const left=wall.f.curtisWallWindow;g.hitstopLeft=2;tick();near(wall.f.curtisWallWindow,left);
});
check('Curtis specials use real defenses, cooldowns, air inputs and finite elastic poses',()=>{
  for(const index of [0,1])for(const direction of ['special','downSpecial','upSpecial'])for(const aerial of [false,true]) {
    const pair=curtisVs(index,1,60),{f,opp}=pair;
    if(aerial){f.y=opp.y=FLOOR-180;f.enter('air');opp.enter('air');}
    const modifier=direction==='upSpecial'?pair.up:direction==='downSpecial'?(index?'ArrowDown':'KeyS'):null;
    if(modifier)press(modifier);press(pair.special);step();release(pair.special);if(modifier)release(modifier);
    assert(f.state==='attack'&&f.moveName.startsWith('rubber')&&f.cooldowns[direction]>0,'real special '+direction);
    for(let at=0;at<=f.move.startup+f.move.active+f.move.recovery;at+=.5)assert(poseIsFinite(curtisPose(f,at,at)),'special pose');
    f.stateFrame=f.move.startup;opp.enter('block');const hp=opp.hp;applyHit(f,opp,{x:opp.x,y:opp.y-105},g);
    near(opp.hp,hp);assert(opp.state==='blockstun','special can block');
  }
});
check('Curtis elastic squeeze keeps throw escape and releases one normal-damage explosion for both players and walls',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const {att,def,key}=beginEscapeThrow('curtis',index,facing);assert(att.throwEscape?.left===10,'ten frame escape');
    const hp=def.hp;let hits=0,previous=hp;
    while(att.state==='throw'){tick();if(def.hp<previous)hits++;previous=def.hp;}
    assert(hits===1&&hp-def.hp===90&&def.combo===1,'one ninety damage pop');
    assert(g.popups.some(p=>p.text==='POP!')&&def.state==='hitstun','explosion releases victim');
    for(const who of ['att','def'])for(let frame=0;frame<=78;frame+=.5)assert(poseIsFinite(curtisThrowPose(att,who,frame)),'finite squeeze');
    const escape=beginEscapeThrow('curtis',index,facing);tap(escape.key);assert(escape.att.state==='deflect'&&escape.def.hp===escape.def.maxHp,'can tech rubber grab');
  }
});
check('Curtis Grand Line lasts eight active seconds, boosts only its owner, grants two swings and expires/reset/clashes normally',()=>{
  const {f,opp}=curtisVs();f.ultimate=100;assert(activateDomain(f,g),'ultimate chord eligibility');
  assert(g.domainSequence.type==='curtis'&&DOMAIN_NAMES.curtis==='GRAND LINE','named domain');step(DOMAIN.cutsceneFrames);
  assert(g.domain?.type==='curtis'&&f.ultimate===0,'domain spends meter');
  step();assert(f.curtisSwings===2&&rosterSpeed(f)===1.2&&damageScale(f,opp)===1.15,'owner benefits');
  near(rosterSpeed(opp),1);near(damageScale(opp,f),1);
  f.cooldowns.special=CURTIS.pistolCooldown;f.kit.onSpecialUsed(f,'special');near(f.cooldowns.special,CURTIS.pistolCooldown/2);
  f.curtisHeavyLaunch=true;f.enter('hitstun');f.kit.onWallBounce(f,-1);near(f.curtisWallWindow,CURTIS.domainWallWindow);
  f.enter('idle');g.domain.framesLeft=1;step();step();assert(!g.domain&&f.curtisSwings===1&&rosterSpeed(f)===1,'expires cleanly');
  g.domain={owner:0,type:'curtis',framesLeft:120};opp.ultimate=100;assert(activateDomain(opp,g)&&g.domainSequence.kind==='clash','ordinary clash');
});

