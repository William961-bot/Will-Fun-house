function nullAirVs(index=0,facing=1,gap=180) {
  const pair=nullVs(index,facing,gap);
  for(const f of [pair.att,pair.def]){f.y=FLOOR-310;f.vy=0;f.enter('air');}
  return pair;
}

check('Null can use Spear Throw and Zoom well after takeoff on both keyboards, players and facings',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const move of ['spear','zoom']) {
    const pair=nullVs(index,facing,450),{att}=pair;press(pair.up);step(12);release(pair.up);step();
    assert(att.state==='air'&&g.frame-att.jumpStartedAt>BUFFER,'real jump beyond chord grace');const height=att.y;
    if(move==='spear')tap(pair.special);else nullZoomInput(pair);
    assert(att.y<FLOOR&&att.y<=height+20,'stays airborne');
    if(move==='spear'){assert(att.state==='nullSpearWindup'&&att.cooldowns.special>0,'Air Spear');step(NULL.spearStartup);assert(g.projectiles.length===1&&g.projectiles[0].y<FLOOR-110,'air projectile');}
    else assert(att.moveName==='nullZoom'&&att.move.air&&att.zoomAir&&att.cooldowns.upSpecial>0,'Air Zoom');
  }
  const old=navigator.getGamepads;
  try {
    for(const index of [0,1])for(const move of ['spear','zoom']) {
      const {att}=nullAirVs(index),pad=testPad(2,'Air Null');navigator.getGamepads=()=>[null,null,pad];
      att.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});pad.buttons[5].pressed=true;
      if(move==='zoom')pad.axes[1]=-1;step();
      assert(move==='spear'?att.state==='nullSpearWindup':att.moveName==='nullZoom'&&att.zoomAir,'RB / Up+RB in air');
    }
  }finally{navigator.getGamepads=old;setup();}
});

check('Air Zoom holds height only during travel, crosses once, resets marked hits and chains into air attacks',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const marked of [false,true]) {
    const pair=nullAirVs(index,facing),{att,def}=pair;if(marked)att.nullMark={target:def.index,left:240};
    nullZoomInput(pair);step(NULL.zoomStartup);const dashHeight=att.y;near(att.vy,0);
    stepUntil(()=>att.moveHit||att.state!=='attack',30);assert(att.moveHit,`first dash ${index}/${facing}/${marked}: ${att.y}/${def.y}`);near(att.y,dashHeight);assert(def.hp===940&&def.combo===1,'one hit');
    assert(marked?att.cooldowns.upSpecial===0&&!att.nullMark:att.cooldowns.upSpecial>0,'mark reset rules');
    readyNullZoom(att);const recState=[att.stateFrame,att.move.active,att.y,def.y,def.vy,def.hitstun];assert((att.x-def.x)*facing>0&&att.facing===-facing,'crosses and faces victim');
    tap(index===0?'KeyF':'Comma');assert(att.moveName==='air'&&att.move.air,'real Air Light follow-up');
    step(12);assert(att.moveHit&&def.combo===2,`Air Light ${index}/${facing}/${marked}: ${att.x}/${def.x}, ${att.y}/${def.y}, ${def.combo} rec=${recState}`);
    step(60);assert(att.grounded&&['idle','land'].includes(att.state),'gravity and landing resume');
  }
  const pair=nullAirVs(0,1,500);nullZoomInput(pair);step(NULL.zoomStartup+NULL.zoomActive);
  assert(pair.att.vy>0,'miss recovery falls');step(60);assert(pair.att.grounded,'miss lands');setup();
});

check('Air Spear can mark an airborne target, stays level in flight and recovers into air or grounded idle',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=nullAirVs(index,facing),{att,def}=pair;tap(pair.special);step(NULL.spearStartup-1);
    assert(!g.projectiles.length,'startup');step();const shot=g.projectiles[0];assert(shot&&shot.y<FLOOR-110,'air release height');
    const level=shot.y;stepUntil(()=>!!att.nullMark,30);near(shot.y,level);assert(def.hp===945&&att.nullMark.target===def.index,'air mark');
    stepUntil(()=>att.state!=='nullSpearWindup',40);assert(['air','idle','land'].includes(att.state),'recovery returns to movement');
    assert(att.cooldowns.special>0,'same cooldown');
  }
  let pair=nullAirVs(0,1,500);pair.att.y=-100;pair.att.vy=0;tap(pair.special);step(NULL.spearStartup+NULL.spearRecovery);
  assert(pair.att.state==='air'&&!pair.att.grounded,'high throw returns to air');
  assert(!nullSpear(pair.att,g),'single projectile still enforced');
  pair=nullAirVs(0,1,500);pair.att.y=FLOOR-10;pair.att.vy=8;tap(pair.special);step(NULL.spearStartup+NULL.spearRecovery);
  assert(pair.att.grounded&&pair.att.state==='idle','landing during throw recovers normally');setup();
});

check('Air marked Zoom permits a second real dash without resetting again or refreshing used air normals',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=nullAirVs(index,facing,140),{att,def}=pair;att.nullMark={target:def.index,left:240};att.airMovesUsed.add('air');
    nullZoomInput(pair);readyNullZoom(att);nullZoomInput(pair);
    assert(att.moveName==='nullZoom'&&att.stateFrame===0&&att.zoomAir,'second airborne dash');
    step(20);assert(att.moveHit&&def.combo===2&&att.cooldowns.upSpecial>0&&!att.nullMark,`second dash ${index}/${facing}: ${att.x}/${def.x}, ${att.y}/${def.y}, ${def.combo}`);
    assert(att.airMovesUsed.has('air'),'dash does not restore used Air Light');
    readyNullZoom(att);tap(index===0?'KeyV':'KeyK');assert(att.moveName==='airMedium','unused Air Medium follows');
  }
  setup();
});

check('Air abilities respect cooldowns, guard break, interruption, vertical misses, walls and timing freezes',()=>{
  for(const move of ['spear','zoom']) {
    let pair=nullAirVs(0,1,450),{att}=pair;att.cooldowns[move==='spear'?'special':'upSpecial']=60;
    if(move==='spear')tap(pair.special);else nullZoomInput(pair);assert(att.state==='air','cooldown prevents '+move);
    pair=nullAirVs(0,1,450);pair.att.guardBroken=30;
    if(move==='spear')tap(pair.special);else nullZoomInput(pair);assert(pair.att.state==='air','guard break prevents '+move);
    pair=nullAirVs(0,1,60);if(move==='spear')tap(pair.special);else nullZoomInput(pair);
    incoming('air',pair.def,pair.att);step(25);assert(pair.att.moveName!=='nullZoom'||pair.att.state!=='attack','hit interrupts '+move);
    assert(!g.projectiles.length&&pair.def.hp===MAX_HP,'interrupted startup has no hit');
    pair=nullAirVs(0,1,450);if(move==='spear')tap(pair.special);else nullZoomInput(pair);
    const x=pair.att.x,y=pair.att.y,sf=pair.att.stateFrame,cd={...pair.att.cooldowns};g.paused=true;tick();tick();g.paused=false;
    near(pair.att.x,x);near(pair.att.y,y);near(pair.att.stateFrame,sf);near(pair.att.cooldowns[move==='spear'?'special':'upSpecial'],cd[move==='spear'?'special':'upSpecial']);
    g.hitstopLeft=4;for(let i=0;i<4;i++)tick();near(pair.att.y,y);near(pair.att.stateFrame,sf);
  }
  let pair=nullAirVs(0,1,180);pair.def.y=FLOOR;pair.def.enter('idle');pair.att.nullMark={target:pair.def.index,left:240};nullZoomInput(pair);step(25);
  assert(pair.def.hp===MAX_HP&&pair.att.nullMark&&pair.att.cooldowns.upSpecial>0,'above enemy is a miss');
  for(const facing of [-1,1]) {
    pair=nullAirVs(0,facing,500);pair.att.x=facing===1?WALL_R-HALF_W-40:WALL_L+HALF_W+40;nullZoomInput(pair);step(25);
    assert(pair.att.x>=WALL_L+HALF_W&&pair.att.x<=WALL_R-HALF_W,'air wall clamp');
  }
  for(const id of ROSTER.filter(id=>!CHARACTER_ABILITIES[id].airSpecials?.includes('special'))) {
    pair=nullAirVs(0);pair.att.setCharacter(id);pair.att.reset(400,1);pair.att.y=FLOOR-200;pair.att.enter('air');tap(pair.special);
    assert(pair.att.state==='air'&&!pair.att.cooldowns.special,'other kits keep ground specials');
  }
  setup();
});

check('Air Null poses stay finite and CPUs select height-aligned aerial abilities',()=>{
  const pair=nullAirVs(),{att,def}=pair;
  assert(att.kit.cpuChoice(att,def,180)==='upSpecial','air CPU Zoom');att.cooldowns.upSpecial=30;
  assert(att.kit.cpuChoice(att,def,180)==='special','air CPU spear');def.y=FLOOR;assert(!att.kit.cpuChoice(att,def,180),'does not target far below');
  for(const facing of [-1,1])for(const move of ['spear','zoom']) {
    att.facing=facing;att.y=FLOOR-300;att.vy=0;if(move==='spear')att.kit.special(att,def,g);else att.kit.upSpecial(att);
    for(let frame=0;frame<=42;frame+=.5)assert(poseIsFinite(animatedPose(att,frame,frame)),'air pose '+move+'/'+frame);
  }
  startRound();assert(!att.zoomAir&&!att.nullMark,'round clears temporary air state');setup();
});
