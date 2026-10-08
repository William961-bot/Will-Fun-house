function sombraVs(index=0,facing=1,gap=60,opponent='rip') {
  setup();const att=fighters[index],def=fighters[1-index];att.setCharacter('sombra');def.setCharacter(opponent);
  att.reset(600,facing);def.reset(600+gap*facing,-facing);
  return {att,def,light:index?'Comma':'KeyF',medium:index?'KeyK':'KeyV',special:index?'Semicolon':'KeyT',
    up:index?'ArrowUp':'KeyW',down:index?'ArrowDown':'KeyS',grab:index?'KeyL':'KeyJ'};
}
function sombraSpecial(pair,key='special') {
  const dir=key==='upSpecial'?pair.up:key==='downSpecial'?pair.down:null;
  if(dir)press(dir);press(pair.special);tick();release(pair.special);if(dir)release(dir);
}
function activeUntil(test,limit=100) {
  for(let n=0;n<limit&&!test();n++)tick();assert(test(),'active timing timeout');
}
check('Somhack controller RB routes Hack, stick-Up Virus, Down beacon/recast, X+RB domain pulse and fifteen actual hits',()=>{
  const original=navigator.getGamepads;
  try {
    for(const index of [0,1]) {
      const pad=testPad(2,'Somhack controller');navigator.getGamepads=()=>[null,null,pad];
      const pair=sombraVs(index,index?-1:1,250),{att}=pair;
      att.input=new PlayerInput(index,{type:'pad',slot:pad.index,id:pad.id});
      const tap=(button)=>{pad.buttons[button].pressed=true;tick();pad.buttons[button].pressed=false;};
      tap(5);assert(att.moveName==='hackPulse','neutral RB Hack');
      activeUntil(()=>att.state==='idle');pad.axes[1]=-1;tap(5);pad.axes[1]=0;
      assert(att.state==='virusWindup','stick Up + RB Virus');activeUntil(()=>att.state==='idle');
      pad.buttons[13].pressed=true;tap(5);pad.buttons[13].pressed=false;
      assert(att.state==='beaconWindup'&&att.cooldowns.downSpecial===0,'Down + RB places without cooldown');activeUntil(()=>att.state==='idle');
      pad.buttons[13].pressed=true;tap(5);pad.buttons[13].pressed=false;
      assert(att.state==='teleportRecover'&&!att.beacon&&att.cooldowns.downSpecial===SOMBRA.beaconCooldown,'fresh recast starts teleport cooldown');
      activeUntil(()=>att.state==='idle');att.ultimate=100;pad.buttons[2].pressed=true;tap(5);pad.buttons[2].pressed=false;
      assert(g.domainSequence?.kind==='hackDomainWindup','X + RB domain pulse');
      fifteenRoute('sombra',index?-1:1,index,15,pad);
    }
  } finally { navigator.getGamepads=original; }
});
check('Somhack selection, mirror colours, thirteen portraits and 900-health round/practice resets',()=>{
  assert(CHARACTERS.sombra.name==='SOMHACK','renamed fighter label');
  pickCharacters(['sombra','sombra']);assert(p1.kit===SOMBRA_ABILITIES&&p2.stats.color===CHARACTERS.sombra.altColor,'mirror');
  near(p1.hp,900);near(p2.hp,900);openCharacterSelect();assert(charSelect.cursor.every(i=>ROSTER[i]==='sombra'),'selected');
  assert(ROSTER.length===13&&CHARACTERS.sombra.home.label,'roster');
  startMatch(true,undefined,['rip','sombra']);g.phase='fight';g.inputLocked=false;p2.hp=1;
  strike('light');assert(p2.hp===900&&!p2.koed&&p2.combo===0,'practice refill uses fighter health');
  p2.hacked=80;p2.beacon={x:900,y:FLOOR,vx:0,vy:0};p2.stealthed=true;startRound();
  assert(p2.hp===900&&!p2.hacked&&!p2.beacon&&!p2.stealthed,'round reset');
});
check('Somhack Hack cooldown starts only on damage; failed and interrupted attempts can retry after recovery',()=>{
  for(const index of [0,1])for(const defense of ['miss','block','parry','invincible','interrupt','hit']) {
    const pair=sombraVs(index,index?-1:1,defense==='miss'?400:60),{att,def}=pair;
    sombraSpecial(pair);assert(att.cooldowns.special===0,'no cooldown on activation');
    if(defense==='block')def.enter('block');
    if(defense==='parry')def.startParry('high');
    if(defense==='invincible')def.enter('burst');
    if(defense==='miss') {
      activeUntil(()=>att.state==='idle');
      assert(!def.hacked&&att.cooldowns.special===0,'whiff pays only recovery');
      sombraSpecial(pair);assert(att.moveName==='hackPulse'&&att.stateFrame===0,'whiff can retry');
      continue;
    }
    if(defense==='interrupt')incoming('light',def,att);
    else {att.stateFrame=SOMBRA.hackStartup;applyHit(att,def,{x:def.x,y:FLOOR-110},g);}
    if(defense==='hit') {
      assert(def.hacked&&att.cooldowns.special===SOMBRA.hackCooldown,'four seconds from contact');
      att.enter('idle');sombraSpecial(pair);assert(att.state==='idle','successful Hack cannot immediately repeat');
    } else {
      assert(!def.hacked&&att.cooldowns.special===0,defense+' has no cooldown');
      activeUntil(()=>att.state==='idle',140);
      sombraSpecial(pair);assert(att.moveName==='hackPulse'&&att.stateFrame===0,defense+' permits fresh retry');
    }
  }
});
check('Somhack stealth boosts real walk/backwalk/run/dash/air travel by 35%, ending on reveal or Hack',()=>{
  for(const index of [0,1])for(const state of ['walk','run','dash','air'])for(const direction of [-1,1]) {
    const {att,def}=sombraVs(index,1,450);att.x=500;def.x=1100;
    att.enter(state);if(state==='air')att.y-=180;att.vx=direction*4;att.stealthed=false;
    const origin=att.x;att.physics(g);const normal=att.x-origin;
    att.x=origin;att.vx=direction*4;att.stealthed=true;att.physics(g);
    near(att.x-origin,normal*SOMBRA.stealthSpeed);
    att.startAttack('light');assert(!att.stealthed&&rosterSpeed(att)===1,'attack immediately ends speed bonus');
    att.enter('idle');att.stealthed=true;incoming('light',def,att);
    assert(!att.stealthed&&rosterSpeed(att)===1,'taking damage ends bonus');
    att.enter('walk');att.stealthed=true;att.hacked=30;near(rosterSpeed(att),1);
  }
  const pair=sombraVs(0,1,450);step(SOMBRA.stealthAfter);const origin=pair.att.x;
  press('KeyD');tick();release('KeyD');near(pair.att.x-origin,pair.att.stats.walk*SOMBRA.stealthSpeed);
  assert(pair.att.stealthed,'real movement keeps stealth');
});
check('SMG Medium, Low Medium and Air Medium land exactly two scaled contacts for both players and facings',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const name of ['medium','lowMedium','airMedium']) {
    const pair=sombraVs(index,facing),{att,def}=pair;
    if(name==='airMedium'){att.y=def.y=FLOOR-180;att.vy=def.vy=-5;att.enter('air');}
    const dir=name==='lowMedium'?pair.down:null;if(dir)press(dir);press(pair.medium);tick();release(pair.medium);if(dir)release(dir);
    let contacts=0,previous=def.hp;
    for(let n=0;n<55&&att.state==='attack';n++){tick();if(def.hp<previous)contacts++;previous=def.hp;}
    assert(contacts===2&&att.smgSecond&&def.guard===100,`${name}/${index}/${facing} exactly two damage events`);
    assert(MAX_HP-def.hp===59,'damage split and second-hit scaling');
  }
});
check('SMG bursts can be blocked/parried, missed shots cannot cancel, and a ten-hit cap stops the second bullet',()=>{
  let pair=sombraVs();press('Quote');pair.def.enter('block');press(pair.medium);tick();release(pair.medium);
  activeUntil(()=>pair.att.smgSecond&&pair.att.stateFrame>=pair.att.move.startup+pair.att.move.active);
  assert(pair.def.hp===MAX_HP&&pair.def.guard===90,'two blocks cost ten guard');release('Quote');
  pair=sombraVs();pair.def.startParry('high');pair.att.startAttack('medium');pair.att.stateFrame=pair.att.move.startup;
  applyHit(pair.att,pair.def,{x:pair.def.x,y:FLOOR-110},g);assert(pair.att.state==='stagger'&&pair.def.hp===MAX_HP,'parry interrupts burst');
  pair=sombraVs(0,1,400);press(pair.medium);tick();release(pair.medium);step(16);sombraSpecial(pair);
  assert(pair.att.moveName==='medium'&&!pair.att.moveHit,'whiff cannot cancel to Hack');
  pair=sombraVs();pair.def.enter('hitstun');pair.def.combo=9;pair.def.hitstun=60;pair.def.comboAttacker=0;
  pair.def.y-=80;pair.def.vy=-7;press(pair.medium);tick();release(pair.medium);
  activeUntil(()=>pair.def.combo===10);const hp=pair.def.hp;
  while(!pair.att.smgSecond)tick();assert(pair.def.hp===hp,'second shot cannot bypass cap before recovery');
});
check('Hack and domain pulse lock new specials/ultimate but preserve normals, block, parry and independent Burst',()=>{
  for(const id of ROSTER) {
    const pair=sombraVs(0,1,60,id);sombraSpecial(pair);activeUntil(()=>pair.def.hacked>0);
    assert(pair.def.hacked===SOMBRA.hackFrames,'hack hit duration');
    pair.def.enter('idle');pair.def.input.pressedAt.special=pair.def.input.frame;
    assert(!pair.def.trySpecial(pair.def.input)&&!pair.def.cooldowns.special,'special locked '+id);
    pair.def.ultimate=100;assert(!activateDomain(pair.def,g),'ultimate locked '+id);
    pair.def.startAttack('light');assert(pair.def.state==='attack','normals available');
    assert(pair.def.startParry('high'),'parry available');pair.def.enter('block');assert(pair.def.state==='block','block available');
    pair.def.enter('hitstun');pair.def.hitstun=40;pair.def.ultimate=23;
    press('Quote');press('Period');step();release('Quote');release('Period');
    assert(pair.def.state==='burst'&&pair.def.burstMeter===0&&pair.def.ultimate===23,'Burst works while hacked');
  }
});
check('Hack respects blocks/parries/misses and startup interruption; clean contact reopens Light',()=>{
  for(const defense of ['block','parry','miss','interrupt']) {
    const pair=sombraVs(0,1,defense==='miss'?400:60);
    sombraSpecial(pair);
    if(defense==='block'){press('Quote');pair.def.enter('block');}
    if(defense==='parry'){pair.def.enter('parry');pair.def.parryDir='high';pair.def.stateFrame=0;pair.def.timer=99;}
    if(defense==='interrupt')incoming('light',pair.def,pair.att);
    if(defense==='parry') {pair.att.stateFrame=SOMBRA.hackStartup;applyHit(pair.att,pair.def,{x:pair.def.x,y:FLOOR-110},g);}
    else step(12);
    assert(!pair.def.hacked,defense+' denies Hack');release('Quote');
  }
  const pair=sombraVs();press(pair.light);tick();release(pair.light);
  activeUntil(()=>pair.att.moveHit&&!g.hitstopLeft&&pair.att.stateFrame>=7);
  sombraSpecial(pair);activeUntil(()=>pair.def.combo===2&&!g.hitstopLeft&&pair.att.stateFrame>=10);
  press(pair.light);tick();release(pair.light);activeUntil(()=>pair.def.combo===3);
  assert(pair.att.moveName==='light'&&pair.def.hacked,'Light → Hack → Light true combo');
});
check('Virus is an aerial-capable high projectile, stronger only on hacked targets, and links into normals',()=>{
  for(const hacked of [false,true]) {
    const pair=sombraVs(0,1,60);pair.def.hacked=hacked?90:0;
    sombraSpecial(pair,'upSpecial');activeUntil(()=>pair.def.hp<MAX_HP);
    assert(MAX_HP-pair.def.hp===(hacked?75:50),'Virus bonus at contact');near(pair.def.guard,100);
    activeUntil(()=>!g.hitstopLeft&&pair.att.abilityLink&&pair.att.stateFrame>=pair.att.abilityLink.contact+3);
    press(pair.light);tick();release(pair.light);activeUntil(()=>pair.def.combo===2);
    assert(pair.att.cooldowns.upSpecial>0,'normal link preserves cooldown');
  }
  const pair=sombraVs(1,-1,260);pair.att.y=pair.def.y=FLOOR-180;pair.att.enter('air');
  sombraSpecial(pair,'upSpecial');assert(pair.att.state==='virusWindup'&&pair.att.y<FLOOR,'air Virus');
  activeUntil(()=>g.projectiles.some(p=>p.kind==='virus'));const virus=g.projectiles.find(p=>p.kind==='virus');
  assert(virus.vx<0&&virus.move.height==='high','level high projectile');
});
check('Virus blocking, high parry, phased targets and cooldown deny free damage or cancels',()=>{
  for(const defense of ['block','parry','phased']) {
    const pair=sombraVs(0,1,80,defense==='phased'?'gooner':'rip');
    if(defense==='block')pair.def.enter('block');
    if(defense==='parry')pair.def.startParry('high');
    if(defense==='phased'){pair.def.enter('bulletTime');pair.def.stateFrame=GOONER.bulletDodgeFrom;}
    pair.att.kit.upSpecial(pair.att,pair.def,g);sombraVirus(pair.att,g);updateProjectiles(g);
    assert(pair.def.hp===pair.def.maxHp&&!pair.att.abilityLink,'defense protects '+defense);
  }
  const pair=sombraVs();pair.att.cooldowns.upSpecial=60;sombraSpecial(pair,'upSpecial');
  assert(pair.att.state!=='virusWindup','Virus cooldown');
});
check('Translocator places one moving beacon then teleports on a fresh recast, with vulnerable recovery and cooldown',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=sombraVs(index,facing,220);sombraSpecial(pair,'downSpecial');
    activeUntil(()=>pair.att.state==='idle');assert(pair.att.beacon&&pair.att.cooldowns.downSpecial===0,'placement has no cooldown');
    const start=pair.att.x;for(let n=0;n<8;n++)tick();const target={...pair.att.beacon};
    sombraSpecial(pair,'downSpecial');assert(!pair.att.beacon&&pair.att.state==='teleportRecover','recast consumes beacon');
    assert(Math.abs(pair.att.x-start)>100&&Math.abs(pair.att.x-target.x)<=PUSH_W,'teleports to own beacon, allowing body separation');
    assert(!pair.att.invincible&&pair.att.cooldowns.downSpecial===SOMBRA.beaconCooldown,'vulnerable and cooldown');
    incoming('light',pair.def,pair.att);assert(pair.att.state==='hitstun','teleport recovery can be punished');
  }
});
check('Beacon persists until teleport with no expiry or placement cooldown; teleport starts five seconds and blocks new placement',()=>{
  for(const index of [0,1])for(const aerial of [false,true]) {
    const pair=sombraVs(index,index?-1:1,450),{att,def}=pair;
    if(aerial){att.y-=180;att.enter('air');}
    sombraSpecial(pair,'downSpecial');assert(att.cooldowns.downSpecial===0,'windup is free');
    incoming('light',def,att);assert(!att.beacon&&att.cooldowns.downSpecial===0,'interrupted placement is free');
    activeUntil(()=>att.state==='idle',150);
    sombraSpecial(pair,'downSpecial');activeUntil(()=>!!att.beacon);
    assert(att.cooldowns.downSpecial===0,'spawn does not start cooldown');
    const beacon=att.beacon;step(1800);
    assert(att.beacon===beacon&&att.beacon.y===FLOOR&&att.cooldowns.downSpecial===0,'same beacon stays ready after thirty seconds');
    sombraSpecial(pair,'downSpecial');assert(att.cooldowns.downSpecial===SOMBRA.beaconCooldown,'full five seconds begin on teleport');
    const remaining=att.cooldowns.downSpecial;g.paused=true;tick();g.paused=false;
    g.hitstopLeft=2;tick();tick();near(att.cooldowns.downSpecial,remaining);
    activeUntil(()=>att.state==='idle',150);
    step(att.cooldowns.downSpecial-2);sombraSpecial(pair,'downSpecial');
    assert(att.cooldowns.downSpecial===1&&!att.beacon&&att.state!=='beaconWindup','new beacon blocked until final cooldown tick');
    sombraSpecial(pair,'downSpecial');assert(att.state==='beaconWindup'&&att.cooldowns.downSpecial===0,'ready exactly at zero');
  }
});
check('Air Translocator, persistent mirror beacons, wall clamp and Hack restrictions preserve beacon ownership',()=>{
  const pair=sombraVs(0,1,260);pair.att.y-=260;pair.att.vy=-7;pair.att.enter('air');sombraSpecial(pair,'downSpecial');
  activeUntil(()=>pair.att.state==='air');assert(pair.att.beacon&&pair.att.cooldowns.downSpecial===0,'air placement has no cooldown');sombraSpecial(pair,'downSpecial');
  assert(pair.att.y<FLOOR&&!pair.att.beacon&&pair.att.cooldowns.downSpecial===SOMBRA.beaconCooldown,'air teleport starts cooldown');
  pickCharacters(['sombra','sombra']);p1.beacon={x:5000,y:FLOOR,vx:0,vy:0};p2.beacon={x:100,y:FLOOR,vx:0,vy:0};
  p1.kit.update(p1,p2,g);assert(p1.beacon&&p2.beacon,'independent persistent beacons');
  p1.kit.downSpecial(p1,p2,g);assert(p1.x===WALL_R-HALF_W&&!p1.beacon&&p2.beacon,'clamp and consume only own beacon');
  p2.hacked=30;p2.input.pressedAt.special=p2.input.frame;p2.input.specialDirection='downSpecial';
  assert(!p2.trySpecial(p2.input)&&p2.beacon,'Hack prevents teleport but keeps beacon');
});
check('Placed beacon HUD has a ready prompt without any timer; a five-second timer appears only after teleport',()=>{
  for(const index of [0,1]) {
    const pair=sombraVs(index,index?-1:1,450);sombraSpecial(pair,'downSpecial');activeUntil(()=>pair.att.state==='idle');
    const texts=[],recording=new Proxy({fillText:text=>texts.push(text)}, {get:(target,key)=>target[key]??(()=>{})});
    drawCooldowns(recording,pair.att,g);drawSombraWorld(recording,g);
    assert(texts.includes('TELEPORT READY · DOWN + SPECIAL')&&texts.includes(`P${index+1} BEACON · READY`),'ready labels');
    assert(!texts.some(text=>/\d+(?:\.\d+)?s\b/.test(text)),'no expiry or cooldown seconds while placed');
    texts.length=0;sombraSpecial(pair,'downSpecial');drawCooldowns(recording,pair.att,g);
    assert(texts.includes('5.0s')&&!texts.includes('TELEPORT READY · DOWN + SPECIAL'),'timer appears on teleport only');
  }
});
check('Stealth after two neutral seconds is only camouflage; attacks, hits and Hack reveal her',()=>{
  const pair=sombraVs(0,1,450);step(SOMBRA.stealthAfter-1);assert(!pair.att.stealthed,'not early');step();
  assert(pair.att.stealthed&&!pair.att.invincible&&!pair.att.phased,'camouflage, not immunity');
  press(pair.light);step();release(pair.light);assert(!pair.att.stealthed&&pair.att.stealthCharge===0,'attack reveals');
  pair.att.enter('idle');pair.att.sombraReveal=0;step(SOMBRA.stealthAfter);assert(pair.att.stealthed,'recloak');
  incoming('light',pair.def,pair.att);assert(!pair.att.stealthed,'hit reveals');
  pair.att.enter('idle');pair.att.sombraReveal=0;pair.att.hacked=150;step(120);assert(!pair.att.stealthed,'Hack prevents cloak');
});
check('domain pulse uses the existing ultimate chord, freezes its opener, damages once, hacks and refreshes Translocator',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=sombraVs(index,facing,180);pair.att.ultimate=100;pair.att.cooldowns.downSpecial=180;
    press(pair.light);press(pair.special);tick();release(pair.light);release(pair.special);
    assert(g.domainSequence?.kind==='hackDomainWindup'&&pair.att.ultimate===0,'domain pulse chord');
    const sf=pair.def.stateFrame;for(let n=0;n<SOMBRA.empOpener-2;n++)tick();near(pair.def.stateFrame,sf);
    activeUntil(()=>pair.def.hacked>0);assert(pair.def.hp===MAX_HP-SOMBRA.empDamage&&pair.def.combo===1,'one domain pulse hit');
    assert(pair.def.hacked===SOMBRA.empHack&&pair.att.cooldowns.downSpecial===0,'domain pulse effect');
    step(25);assert(pair.def.hp===MAX_HP-SOMBRA.empDamage,'no repeat explosion');
  }
});
check('domain pulse respects range, block/parry and Burst invincibility, and coexists with arena domains',()=>{
  for(const defense of ['range','block','parry','burst']) {
    const pair=sombraVs(0,1,defense==='range'?500:180);
    pair.att.ultimate=100;assert(activateDomain(pair.att,g),'start domain pulse');
    for(let n=0;n<SOMBRA.empOpener;n++)updateDomainSequence(g);
    if(defense==='block')pair.def.enter('block');
    if(defense==='parry')pair.def.startParry('high');
    if(defense==='burst')pair.def.enter('burst');
    pair.att.stateFrame=1;resolveCombat(pair.att,pair.def,g);
    assert(pair.def.hp===MAX_HP&&!pair.def.hacked,defense+' protects');
  }
  const pair=sombraVs();g.domain={owner:1,type:'rip',framesLeft:300};pair.att.ultimate=100;
  assert(activateDomain(pair.att,g)&&g.domain.type==='rip'&&g.domainSequence.kind==='hackDomainWindup','pulse does not replace arena');
});
check('Somhack clocks freeze on pause, hitstop and cinematics; throws retain escape and finite poses',()=>{
  const pair=sombraVs();pair.att.hacked=40;pair.att.beacon={x:800,y:500,vx:5,vy:0};pair.att.cooldowns.special=80;
  g.paused=true;tick();g.paused=false;g.hitstopLeft=2;tick();tick();
  g.domainSequence={kind:'hackDomainWindup',owner:0,framesLeft:20};tick();
  assert(pair.att.hacked===40&&pair.att.beacon.x===800&&pair.att.beacon.y===500&&pair.att.cooldowns.special===80,'frozen clocks and beacon motion');g.domainSequence=null;
  pair.att.hacked=0;pair.att.startAttack('grab');startThrow(pair.att,pair.def,g,'');
  assert(pair.att.throwKind==='sombra'&&pair.att.throwEscape,'ordinary throw');
  pair.def.input.pressSerial.grab++;updateThrowEscapes(g);assert(pair.def.state==='deflect'&&pair.def.hp===MAX_HP,'throw escape');
  for(const state of ['idle','walk','block','blockstun','virusWindup','beaconWindup','teleportRecover']) {
    pair.att.enter(state);pair.att.abilityFrames=30;pair.att.timer=20;
    for(let frame=0;frame<40;frame+=.5)assert(poseIsFinite(animatedPose(pair.att,frame,frame)),state+' finite');
  }
});
check('Somhack domain blanks only enemy HUD, expires after eight active seconds and restores on KO/round reset',()=>{
  for(const index of [0,1]) {
    const {att,def}=sombraVs(index,1,450);att.ultimate=100;assert(activateDomain(att,g),'domain starts');
    assert(g.hackDomains.length===0,'no disruption before opener completes');
    for(let n=0;n<SOMBRA.empOpener;n++)updateDomainSequence(g);
    assert(!somhackHudBlocked(att,g)&&somhackHudBlocked(def,g),'only opposing player');
    assert(!def.hacked&&def.hp===def.maxHp,'HUD failure does not bypass pulse range to damage or silence');
    att.ultimate=100;assert(!activateDomain(att,g)&&att.ultimate===100,'active owner cannot stack domains');
    const remaining=g.hackDomains[0].framesLeft;g.paused=true;tick();g.paused=false;
    g.hitstopLeft=2;tick();tick();g.domainSequence={kind:'hackDomainWindup',owner:att.index,framesLeft:20};tick();
    near(g.hackDomains[0].framesLeft,remaining);g.domainSequence=null;
    for(let n=0;n<SOMBRA.hudHackFrames-1;n++)updateSomhackDomains(g);
    assert(somhackHudBlocked(def,g),'last active frame');updateSomhackDomains(g);
    assert(!somhackHudBlocked(def,g)&&!g.hackDomains.length,'exact expiry');
    g.hackDomains=[{owner:index,framesLeft:120}];g.onKO();assert(!g.hackDomains.length,'KO restores HUD');
    g.hackDomains=[{owner:index,framesLeft:120}];startRound();assert(!g.hackDomains.length,'round clears effect');
  }
  pickCharacters(['sombra','sombra']);g.hackDomains=[{owner:0,framesLeft:120},{owner:1,framesLeft:60}];
  assert(fighters.every(f=>somhackHudBlocked(f,g)),'mirror domains corrupt both opponents independently');
});
check('Somhack corrupted HUD draws ERROR without reading victim health, guard, resources or device labels',()=>{
  for(const index of [0,1]) {
    const pair=sombraVs(index,1,450);g.hackDomains=[{owner:index,framesLeft:120}];
    const texts=[];const recording=new Proxy({measureText:text=>({width:text.length*10}),fillText:text=>texts.push(text)},
      {get:(target,key)=>target[key]??(()=>{})});
    const readFields=['hp','maxHp','hpShown','guard','guardBroken','ultimate','burstMeter','momentum','cooldowns'];
    const originals=Object.getOwnPropertyDescriptors(pair.def);
    for(const field of readFields)Object.defineProperty(pair.def,field,{configurable:true,get(){throw new Error('corrupted HUD read '+field);}});
    try {drawHud(recording,g,fighters);drawInputOwnership(recording,g);}
    finally {
      for(const field of readFields) {
        if(originals[field])Object.defineProperty(pair.def,field,originals[field]);else delete pair.def[field];
      }
    }
    assert(texts.filter(text=>text.includes('ERROR')).length>=6,'repeated errors');
    assert(texts.includes('SOMHACK')&&!texts.includes('RIP'),'owner name shown, enemy name hidden');
  }
});
check('Somhack CPU tactics use Hack, Virus and beacon recasts; full matches complete against all fighters',()=>{
  const pair=sombraVs(0,1,100);assert(pair.att.kit.cpuChoice(pair.att,pair.def,100)==='special','close Hack');
  assert(pair.att.kit.cpuChoice(pair.att,pair.def,250)==='upSpecial','ranged Virus');
  pair.att.beacon={x:800,y:FLOOR,vx:0,vy:0};assert(pair.att.kit.cpuChoice(pair.att,pair.def,40)==='downSpecial','teleport choice');
  pair.att.hacked=20;assert(pair.att.kit.cpuChoice(pair.att,pair.def,100)===null,'CPU respects Hack');
  for(const id of ROSTER) {
    pickCharacters(['sombra',id]);
    for(let round=0;round<2;round++) {
      p2.hp=1;p1.startAttack('light');applyHit(p1,p2,{x:p2.x,y:FLOOR-110},g);
      assert(g.phase==='ko'&&p2.koed,'KO '+id);g.phaseTimer=1;step();
      if(round===0){assert(g.phase==='intro'&&p1.hp===900,'next round');g.phase='fight';g.inputLocked=false;}
    }
    assert(g.phase==='matchOver','match complete '+id);
  }
});
check('Somhack throw suspends through seven visual bullet beats then releases one 90-damage Hack blast on either side/player',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const wall of [false,true]) {
    const pair=sombraVs(index,facing),{att,def}=pair;
    if(wall){att.x=facing>0?WALL_R-HALF_W-60:WALL_L+HALF_W+60;def.x=att.x+54*facing;}
    press(pair.grab);tick();release(pair.grab);activeUntil(()=>att.state==='throw');
    assert(att.throwEscape?.left===10,'normal escape window');
    let damageHits=0,shots=0,suspended=false,previousHp=def.hp;
    const previousSound=g.sound;g.sound=function(name){if(name==='smg')shots++;previousSound.call(this,name);};
    try {
      for(let n=0;n<180&&att.state==='throw';n++) {
        tick();if(def.hp<previousHp)damageHits++;previousHp=def.hp;
        assert(att.x>=WALL_L+HALF_W&&att.x<=WALL_R-HALF_W&&def.x>=WALL_L+HALF_W&&def.x<=WALL_R-HALF_W,'positions clamped');
        if(att.state==='throw') {
          assert(def.hp===def.maxHp&&def.guard===100&&!def.hacked&&def.combo===0,'bullets/charge add no damage or Hack');
          if(att.stateFrame>=THROWS.sombra.floatAt){assert(def.y<FLOOR-85,'actual suspended position');suspended=true;}
        }
      }
    } finally {g.sound=previousSound;}
    assert(suspended&&shots===THROWS.sombra.shots.length&&damageHits===1,'seven visual beats, one actual damage event');
    assert(def.maxHp-def.hp===MOVES.grab.dmg&&def.combo===1&&def.state==='hitstun','normal ninety damage and one combo hit');
    assert((def.vx*facing>0||def.wallBounced)&&def.vy<0&&!def.hacked&&att.cooldowns.special===0,'blast launches or wall-bounces with no extra status or cooldown');
  }
});
check('Somhack bullet throw freezes its float/timeline on pause and hitstop, and both cinematic poses stay finite',()=>{
  const {att,def}=beginEscapeThrow('sombra');activeUntil(()=>att.stateFrame>=30&&!g.hitstopLeft);
  const frame=att.stateFrame,y=def.y,hp=def.hp;
  g.paused=true;tick();g.paused=false;g.hitstopLeft=3;tick();tick();tick();
  near(att.stateFrame,frame);near(def.y,y);near(def.hp,hp);
  for(const facing of [-1,1])for(const who of ['att','def'])for(let at=0;at<=THROWS.sombra.frames;at+=.5) {
    att.facing=facing;assert(poseIsFinite(sombraThrowPose(att,who,at)),'finite '+who+'/'+at);
  }
});

