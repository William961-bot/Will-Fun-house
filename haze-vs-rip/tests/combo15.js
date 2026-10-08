function fifteenRoute(id='haze',facing=1,index=0,stop=15,pad=null,openingSpecial=null) {
  setup();const att=fighters[index],def=fighters[1-index];att.setCharacter(id);def.setCharacter('rip');
  const crosses=openingSpecial&&['null','lancer'].includes(id);
  att.reset((facing>0)!==!!crosses?1000:280,facing);def.reset(att.x+60*facing,-facing);
  const k=index?{a:'Comma',m:'KeyK',h:'Slash',up:'ArrowUp',down:'ArrowDown',fwd:facing>0?'ArrowRight':'ArrowLeft'}:
    {a:'KeyF',m:'KeyV',h:'KeyH',up:'KeyW',down:'KeyS',fwd:facing>0?'KeyD':'KeyA'};
  if(pad)att.input=new PlayerInput(index,{type:'pad',slot:pad.index,id:pad.id});
  const padKeys={[k.a]:2,[k.m]:0,[k.h]:3,[k.up]:12,[k.down]:13,
    [index?'ArrowLeft':'KeyA']:14,[index?'ArrowRight':'KeyD']:15};
  const specialKey=index?'Semicolon':'KeyT';padKeys[specialKey]=5;
  const routePress=code=>pad?pad.buttons[padKeys[code]].pressed=true:press(code);
  const routeRelease=code=>pad?pad.buttons[padKeys[code]].pressed=false:release(code);
  const opening=id==='sombra'?['medium','overhead']:openingSpecial?['light',openingSpecial,'light','medium','overhead']:['light','low','medium','lowMedium','overhead'];
  const finish=id==='sombra'?['light','low','medium','overhead']:['light','low','medium','lowMedium','overhead'];
  const route=[...opening,'jump','air','airMedium','extend','air','airMedium','airHeavy','chase',...finish];
  let hits=0,current='';
  const advance=()=>tick();
  const until=(test,limit=90)=>{for(let n=0;n<limit&&!test();n++)advance();assert(test(),`${id}/${index}/${facing}/${current}/${hits}: ${att.state}/${att.moveName}/${att.stateFrame}, victim ${def.state}/${def.combo}, gap ${Math.round(def.x-att.x)}, height ${Math.round(att.y-def.y)}`);};
  const tapReal=key=>{routePress(key);advance();routeRelease(key);};
  for(const name of route) {
    current=name;
    while(g.hitstopLeft)advance();
    if(name==='chase') {
      let held=null;
      for(let n=0;n<120;n++) {
        if(['idle','walk','run','skid','taunt'].includes(att.state)&&att.grounded&&Math.abs(att.x-def.x)<=100&&def.y>=att.y-115)break;
        // Let the rebound travel back to us before pursuing; running into the wall overshoots it.
        if(!att.grounded||def.y<att.y-115){advance();continue;}
        const dir=def.x>att.x?(index?'ArrowRight':'KeyD'):(index?'ArrowLeft':'KeyA');
        if(held!==dir){if(held)routeRelease(held);held=dir;routePress(held);}
        advance();
      }
      if(held)routeRelease(held);
      // Direction cancels Gooner's celebration; allow the next tick to face the returning victim.
      if(att.state==='taunt'){tapReal(def.x>att.x?(index?'ArrowRight':'KeyD'):(index?'ArrowLeft':'KeyA'));advance();}
      assert(att.grounded&&Math.abs(att.x-def.x)<=100,'chase into range');continue;
    }
    if(name==='jump'||name==='extend'){tapReal(k.up);assert(att.state==='air',name+' starts');continue;}
    if(name==='upSpecial'||name==='downSpecial') {
      const dir=name==='upSpecial'?k.up:k.down;routePress(dir);tapReal(specialKey);routeRelease(dir);
      until(()=>att.moveHit,65);hits++;assert(def.combo===hits,'special stays connected');
      if(att.state==='attack')until(()=>att.stateFrame>=att.move.startup+att.move.active-1);
      else until(()=>att.abilityLink&&att.stateFrame>=att.abilityLink.contact+3);
      continue;
    }
    const dir=['low','lowMedium'].includes(name)?k.down:name==='overhead'?k.up:null;
    if(dir)routePress(dir);tapReal(['medium','lowMedium','airMedium'].includes(name)?k.m:name==='airHeavy'?k.h:k.a);if(dir)routeRelease(dir);
    assert(att.moveName===name,'starts '+name);
    until(()=>att.moveHit&&(!att.move.burst||att.smgSecond),65);hits+=att.move.burst?2:1;
    assert(def.combo===hits,`${id}/${index}/${facing}: true combo ${name}: ${def.combo}/${hits}`);
    if(hits===stop)return {att,def,k};
    if(name==='airHeavy')until(()=>def.wallBounced);
    else until(()=>att.stateFrame>=att.move.startup+att.move.active-1);
  }
  assert(def.combo===15&&def.comboCapped&&def.bounceHits===5&&def.comboAirExtended,'fifteen-hit limit');
  return {att,def,k};
}
check('Fifteen real hits with timed air extension and one bounce for every fighter, player and side',()=>{
  for(const id of ROSTER)for(const facing of [-1,1])for(const index of [0,1])fifteenRoute(id,facing,index);
});
check('Fifteen-hit ability routes with Null Zoom, Lancer Flash Slash and Yitty Tackle on either player and side',()=>{
  for(const [id,special] of [['null','upSpecial'],['lancer','upSpecial'],['yitty','downSpecial']])
    for(const facing of [-1,1])for(const index of [0,1])fifteenRoute(id,facing,index,15,null,special);
});

function atAirExtendFrame(sf=10,index=0) {
  const pair=fifteenRoute('haze',1,index,7);
  while(g.hitstopLeft||pair.att.stateFrame<sf)tick();
  return pair;
}
check('Air extension accepts all four timing frames on both keyboards; early and late presses fail',()=>{
  for(const index of [0,1])for(const sf of [9,10,11,12,13,14]) {
    const {att,def,k}=atAirExtendFrame(sf,index);press(k.up);tick();release(k.up);
    const valid=sf>=10&&sf<=13;
    assert(def.comboAirExtended===valid&& (att.state==='air')===valid,`window ${index}/${sf}`);
    if(valid) {
      assert(!att.airMovesUsed.has('air')&&!att.airMovesUsed.has('airMedium'),'restores air normals');
      near(att.vy,-AIR_EXTENSION.hopSpeed+GRAV);
    } else {step(3);assert(!def.comboAirExtended,'early press cannot buffer a hop');}
  }
});
check('Held Up cannot extend; Air Medium must hit an unarmored opponent in this combo',()=>{
  const {att,def,k}=fifteenRoute('haze',1,0,6);
  while(g.hitstopLeft||att.stateFrame<att.move.startup+att.move.active-1)tick();
  press(k.up);press(k.m);tick();release(k.m);
  for(let n=0;n<22;n++)tick();release(k.up);
  assert(!def.comboAirExtended,'held Up is not a fresh second jump');
  for(const denied of ['whiff','armor','recovered','other owner','cap']) {
    const pair=atAirExtendFrame();
    if(denied==='whiff')pair.att.moveHit=false;
    if(denied==='armor')pair.att.moveAbsorbed=true;
    if(denied==='recovered')pair.def.enter('air');
    if(denied==='other owner')pair.def.comboAttacker=pair.def.index;
    if(denied==='cap')pair.def.comboCapped=true;
    press(pair.k.up);tick();release(pair.k.up);
    assert(!pair.def.comboAirExtended&&pair.att.state!=='air',denied);
  }
});
check('Air extension is once per combo, preserves Heavy cooldown, and resets on recovery and new rounds',()=>{
  const {att,def,k}=atAirExtendFrame();att.cooldowns.heavy=70;
  press(k.up);tick();release(k.up);assert(def.comboAirExtended,'first extension');
  near(att.cooldowns.heavy,69);
  att.y=FLOOR;att.vy=0;att.enter('idle');att.y=FLOOR-90;att.startAttack('airMedium');
  att.moveHit=true;att.stateFrame=10;def.hitstun=50;
  tick();press(k.up);tick();release(k.up);
  assert(att.state==='attack'&&def.comboAirExtended,'landing and another Air Medium cannot extend again');
  def.endHitstun();assert(!def.comboAirExtended&&def.combo===0,'recovery restores budget');
  def.comboAirExtended=true;startRound();assert(!def.comboAirExtended,'new round resets');
});
check('Air extension window freezes on pause, hitstop and ultimate cinematics; freeze input survives',()=>{
  const {att,def,k}=atAirExtendFrame();const sf=att.stateFrame;
  g.paused=true;for(let n=0;n<12;n++)tick();near(att.stateFrame,sf);g.paused=false;
  g.domainSequence={kind:'montageOpener',owner:0,framesLeft:12};for(let n=0;n<8;n++)tick();near(att.stateFrame,sf);g.domainSequence=null;
  g.hitstopLeft=3;press(k.up);tick();release(k.up);tick();tick();near(att.stateFrame,sf);
  tick();assert(att.state==='air'&&def.comboAirExtended,'fresh Up during hitstop executes after freeze');
});
check('Controller Air Medium uses A and its timed extension accepts D-pad or stick Up for either player',()=>{
  const original=navigator.getGamepads;
  try {
    for(const index of [0,1])for(const stick of [false,true]) {
      const pad=testPad(2,'air extend pad');navigator.getGamepads=()=>[null,null,pad];
      const {att,def}=fifteenRoute('null',1,index,7,pad);
      while(g.hitstopLeft||att.stateFrame<10)tick();
      if(stick)pad.axes[1]=-1;else pad.buttons[12].pressed=true;
      tick();assert(att.state==='air'&&def.comboAirExtended,'controller Up extends');
      pad.axes[1]=0;pad.buttons[12].pressed=false;tick();pad.buttons[0].pressed=true;tick();pad.buttons[0].pressed=false;
      assert(att.moveName==='airMedium','A starts restored Air Medium');
    }
    for(const index of [0,1]) {
      const pad=testPad(2,'full combo pad');navigator.getGamepads=()=>[null,null,pad];
      fifteenRoute('null',index?-1:1,index,15,pad);
    }
  }finally{navigator.getGamepads=original;}
});
check('Burst ends an extended juggle, restores combo budgets and costs only its own meter',()=>{
  const {att,def,k}=atAirExtendFrame();press(k.up);tick();release(k.up);
  def.ultimate=47;const guard=def.guard;
  press('Quote');press('Period');step();release('Quote');release('Period');
  assert(def.state==='burst'&&att.state==='hitstun'&&def.combo===0&&!def.comboAirExtended&&!def.wallBounced,'Burst breaks route');
  near(def.burstMeter,0);near(def.ultimate,47);near(def.guard,guard);
});
check('The fifteenth hit stops attacks and projectiles, uses low damage and allows recovery',()=>{
  fifteenRoute();const hp=p2.hp,combo=p2.combo;
  p1.startAttack('light');p1.stateFrame=5;assert(hitPoint(p1,p2)===null,'sixteenth normal denied');
  nullSpear(p1,g);const spear=g.projectiles[0];spear.x=p2.x-spear.vx;spear.y=p2.y-110;updateProjectiles(g);
  near(p2.hp,hp);near(p2.combo,combo);near(p2.guard,100);
  near(Math.round(MOVES.overhead.dmg*COMBO_SCALE[14]*COMBO_LIMIT.bounceScale),3);
  for(let n=0;n<90&&p2.state==='hitstun';n++)tick();assert(p2.combo===0&&!p2.comboCapped,'free after cap');
});

function specialLinkRoute(id,abilityName='upSpecial') {
  setup();p1.setCharacter(id);p2.setCharacter('rip');p1.reset(600,1);p2.reset(660,-1);
  function ready(){for(let n=0;n<70&&(g.hitstopLeft||!p1.moveHit||p1.stateFrame<p1.move.startup+p1.move.active-1);n++)tick();assert(p1.moveHit,'normal contact');}
  function hit(key){press(key);tick();release(key);ready();}
  hit('KeyF');hit('KeyV');assert(p2.combo===2,'opening two hits');
  if(abilityName==='downSpecial')press('KeyS');else if(abilityName==='upSpecial')press('KeyW');
  press('KeyT');tick();release('KeyT');release('KeyW');release('KeyS');
  for(let n=0;n<75&&(g.hitstopLeft||p2.combo<3||
      (p1.state==='attack'?p1.stateFrame<p1.move.startup+p1.move.active-1:!p1.abilityLink||p1.stateFrame<p1.abilityLink.contact+3));n++)tick();
  assert(p2.combo===3,`${id} special stays one combo ${p2.combo}/${p1.state}`);
  hit('KeyF');assert(p2.combo===4,`${id} Light reopens ${p2.combo}`);
  hit('KeyV');assert(p2.combo===5,`${id} Medium reopens ${p2.combo}`);
  return {att:p1,def:p2};
}
check('Null Zoom, Lancer Flash Slash and Yitty Tackle reopen used Light and Medium through real input',()=>{
  for(const [id,name] of [['null','upSpecial'],['lancer','upSpecial'],['yitty','downSpecial']])specialLinkRoute(id,name);
});
check('Close-range spear, wave, football and bottle hits link into Light without changing their cooldowns',()=>{
  for(const id of ['null','lancer','yitty','teo']) {
    setup();p1.setCharacter(id);p2.setCharacter('rip');p1.reset(600,1);p2.reset(670,-1);
    if(id==='teo'){p1.bottles=1;p1.tipsy=70;}
    press('KeyT');tick();release('KeyT');
    for(let n=0;n<70&&(g.hitstopLeft||!p1.abilityLink||p1.stateFrame<p1.abilityLink.contact+3);n++)tick();
    assert(p1.abilityLink&&p2.combo===1,`${id} arms hit link`);
    const left=()=>p1.kit.cooldownLeft?.(p1,'special')??p1.cooldowns.special;
    const cooldown=left();press('KeyF');tick();release('KeyF');
    assert(p1.moveName==='light'&&p1.state==='attack',`${id} cancels recovery`);
    for(let n=0;n<25&&!p1.moveHit;n++)tick();assert(p2.combo===2,`${id} true projectile link`);
    assert(left()>0&&left()<cooldown,'cooldown still counting');
    if(id==='null')assert(p1.nullMark,'spear mark survives normal link');
  }
});
check('Projectile normal links do not arm on blocks, parries, armor or misses',()=>{
  for(const defense of ['block','parry','armor','miss']) {
    setup();p1.setCharacter('null');p1.reset(600,1);p2.reset(defense==='miss'?1000:670,-1);
    if(defense==='block'){press('Quote');p2.enter('block');}
    if(defense==='parry'){p2.enter('parry');p2.parryDir='high';p2.stateFrame=0;}
    if(defense==='armor')p2.relentless=90;
    p1.kit.special(p1,p2,g);p1.stateFrame=NULL.spearStartup;nullSpear(p1,g);updateProjectiles(g);
    assert(!p1.abilityLink,defense+' cannot shorten recovery');release('Quote');
  }
});
check('Yitty slams retain existing combo/bounce counters, scale late hits and release at the limit',()=>{
  for(const bounce of [false,true]) {
    yittyVs('rip');press('KeyS');tap('KeyT');release('KeyS');stepUntil(()=>p1.moveHit,40);
    p2.combo=bounce?14:9;p2.comboAttacker=0;
    p2.wallBounced=bounce;p2.bounceHits=bounce?4:0;p2.comboAirExtended=true;
    beginYittyThrow();const hp=p2.hp;slamYitty();
    assert(p2.combo===(bounce?15:10)&&p2.comboCapped&&p2.wallBounced===bounce&&p2.comboAirExtended,'slam preserves budget');
    assert(p1.state==='throwRecover'&&p2.state==='hitstun','cap ends chain immediately');
    assert(hp-p2.hp===(bounce?28:70),'late slam scaling');
    if(bounce)assert(p2.bounceHits===5,'slam consumes fifth bounce hit');
  }
});
check('Goon Su preserves combo and bounce history throughout its hold and counts its explosion once',()=>{
  setup();p1.setCharacter('gooner');p2.enter('hitstun');p2.combo=14;p2.comboAttacker=0;
  p2.wallBounced=true;p2.bounceHits=4;p2.comboAirExtended=true;
  startGoonHold(p1,p2,g);assert(p2.comboHeld,'cinematic holds counters');
  p2.hitstun=0;p2.physics(g);assert(p2.combo===14&&p2.state==='hitstun','hold cannot recover early');
  goonExplosion(p1,p2,g);g.domainSequence=null;
  assert(!p2.comboHeld&&p2.combo===15&&p2.comboCapped&&p2.bounceHits===5&&p2.wallBounced&&p2.comboAirExtended,'explosion obeys cap');
  near(p2.hp,980);assert(!goonGrabConnects(p1,p2),'cannot grab beyond cap');
});
