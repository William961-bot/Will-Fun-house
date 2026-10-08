check('Null Up + Special accepts either keyboard order up to six frames apart on either player',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const order of ['upFirst','specialFirst'])for(const delay of [0,1,3,4,6]) {
    const pair=nullVs(index,facing,450),{att}=pair;
    const first=order==='upFirst'?pair.up:pair.special,second=order==='upFirst'?pair.special:pair.up;
    press(first);if(delay)step(delay);press(second);step();release(first);release(second);
    assert(att.state==='attack'&&att.moveName==='nullZoom',`${index}/${facing}/${order}/${delay}: ${att.state}`);
    if(order==='upFirst'&&delay>MOVE.jumpSquat)assert(att.y<FLOOR&&att.zoomAir,'late chord becomes Air Zoom');
    else {near(att.y,FLOOR);near(att.vy,0);}assert(att.cooldowns.upSpecial>0,'Zoom cooldown');
    near(att.cooldowns.special,0);assert(!g.projectiles.length,'no unintended spear');
  }
  // A genuine jump now uses Air Zoom; a committed spear cannot be rewritten by a much later button.
  let pair=nullVs(0,1,450);press(pair.up);step(7);tap(pair.special);release(pair.up);
  assert(pair.att.moveName==='nullZoom'&&pair.att.zoomAir&&pair.att.y<FLOOR,'late Special uses Air Zoom');
  pair=nullVs(0,1,450);press(pair.special);step(7);press(pair.up);step();release(pair.special);release(pair.up);
  assert(pair.att.state==='nullSpearWindup'&&pair.att.cooldowns.upSpecial===0,'late Up keeps spear');
  step(NULL.spearStartup);assert(g.projectiles.length===1,'plain Special still throws');setup();
});

check('Controller stick or D-pad Up + RB accepts both button orders, including after jump takeoff',()=>{
  const old=navigator.getGamepads;
  try {
    for(const index of [0,1])for(const direction of ['stick','dpad'])for(const order of ['upFirst','specialFirst']) {
      const {att}=nullVs(index,1,450),pad=testPad(2,'Zoom input');navigator.getGamepads=()=>[null,null,pad];
      att.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});
      const up=()=>{if(direction==='stick')pad.axes[1]=-1;else pad.buttons[12].pressed=true;};
      if(order==='upFirst')up();else pad.buttons[5].pressed=true;
      step(5);if(order==='upFirst')pad.buttons[5].pressed=true;else up();step();
      assert(att.moveName==='nullZoom'&&att.state==='attack',`${index}/${direction}/${order}`);
      near(att.cooldowns.special,0);assert(!g.projectiles.length,'no spear');
    }
  } finally {navigator.getGamepads=old;setup();}
});

check('Buffered directional Specials keep their modifier after release, without changing plain Special',()=>{
  for(const id of ['null','lancer','rip','yitty'])for(const key of ['upSpecial','special',...(id==='null'?[]:['downSpecial'])]) {
    const pair=nullVs(0,1,450),{att}=pair;att.setCharacter(id);att.reset(400,1);if(id==='lancer')att.mask=100;
    att.enter('parryRecover');att.stateFrame=MOVE.parryRecovery-2;
    const modifier=key==='upSpecial'?'KeyW':key==='downSpecial'?'KeyS':null;
    if(modifier)press(modifier);press('KeyT');step();if(modifier)release(modifier);release('KeyT');step(2);
    assert(att.cooldowns[key]>0,`${id}/${key}: ${att.state}`);
    if(key!=='special')near(att.cooldowns.special,0);
  }
  const pair=nullVs(0,1,450);pair.att.enter('parryRecover');pair.att.stateFrame=MOVE.parryRecovery-10;
  press(pair.up);press(pair.special);step();release(pair.up);release(pair.special);step(12);
  assert(pair.att.cooldowns.upSpecial===0,'expired input cannot fire later');setup();
});

check('Up + Special grace preserves cooldowns, guard break, committed attacks and ordinary jump timing',()=>{
  let pair=nullVs(0,1,450);pair.att.cooldowns.upSpecial=60;press(pair.up);step(2);tap(pair.special);release(pair.up);
  assert(pair.att.state==='jumpsquat','unavailable Zoom does not cancel jump');step();assert(pair.att.state==='air','normal takeoff');
  assert(pair.att.cooldowns.special===0&&!g.projectiles.length,'no fallback spear');
  for(const locked of ['guard','hitstun','attack']) {
    pair=nullVs(0,1,450);
    if(locked==='guard')pair.att.guardBroken=30;
    if(locked==='hitstun'){pair.att.enter('hitstun');pair.att.hitstun=30;}
    if(locked==='attack')pair.att.startAttack('heavy');
    press(pair.up);tap(pair.special);release(pair.up);
    assert(pair.att.moveName!=='nullZoom'&&!pair.att.cooldowns.upSpecial,locked+' prevents Zoom');
  }
  pair=nullVs(0,1,450);press(pair.up);step();release(pair.up);step(MOVE.jumpSquat-1);assert(pair.att.state==='jumpsquat','jump startup unchanged');
  step();assert(pair.att.state==='air'&&pair.att.y<FLOOR,'three-frame takeoff');
  pair=nullVs(0,1,450);press(pair.special);step();pair.att.cooldowns.upSpecial=60;press(pair.up);step();release(pair.special);release(pair.up);
  assert(pair.att.state==='nullSpearWindup'&&pair.att.cooldowns.special>0,'cannot redirect to unavailable Zoom');setup();
});

check('Directional Special buffers survive hit-stop and slow simulation without spending a second cooldown',()=>{
  for(const frozen of ['hitstop','slow']) {
    const pair=nullVs(0,1,450),{att}=pair;
    if(frozen==='slow'){g.domain={type:'haze',owner:1,framesLeft:480};att.enter('parryRecover');att.stateFrame=MOVE.parryRecovery-2;}
    else {g.hitstopLeft=8;}
    press(pair.up);press(pair.special);tick();release(pair.up);release(pair.special);
    for(let i=0;i<12;i++)tick();
    assert(att.moveName==='nullZoom'&&att.cooldowns.upSpecial>0,frozen+' buffered Zoom');near(att.cooldowns.special,0);
  }
  setup();
});

check('Every fighter Up + Special starts immediately at full ultimate, including the six-frame jump grace',()=>{
  for(const id of ROSTER)for(const index of [0,1])for(const delay of [0,4,6]) {
    const pair=nullVs(index,1,450),{att}=pair;att.setCharacter(id);att.reset(400,1);att.ultimate=100;
    press(pair.up);if(delay)step(delay);press(pair.special);step();release(pair.up);release(pair.special);
    assert(att.cooldowns.upSpecial>0||att.state==='smoking'||att.state==='preworkoutDrink',`${id}/${index}/${delay}: ${att.state}`);
    assert(!g.domainSequence&&!att.domainPending,'directional input skips neutral ultimate wait');near(att.ultimate,100);
    assert(att.kit.airSpecials?.includes('upSpecial')&&delay>MOVE.jumpSquat ? att.y<FLOOR : att.grounded,'Up ability position');near(att.cooldowns.special,0);
  }
  const pair=nullVs(0,1,450);pair.att.ultimate=100;press('KeyT');step();assert(pair.att.domainPending,'neutral chord still waits');
  press('KeyF');step();assert(g.domainSequence?.kind==='cutscene','Special then Attack ultimate');release('KeyT');release('KeyF');setup();
});
