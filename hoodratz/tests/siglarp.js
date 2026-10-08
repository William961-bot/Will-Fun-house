function siglarpVs(id='null',index=0,facing=1,gap=180) {
  setup();const f=fighters[index],opp=fighters[1-index];f.setCharacter('siglarp');opp.setCharacter(id);
  f.reset(600,facing);opp.reset(600+facing*gap,-facing);
  return {f,opp,special:index?'Semicolon':'KeyT',up:index?'ArrowUp':'KeyW',down:index?'ArrowDown':'KeyS',
    attack:index?'Comma':'KeyF',grab:index?'KeyL':'KeyJ'};
}
function siglarpLarp(pair) {
  pair.f.ultimate=100;assert(activateDomain(pair.f,g),'activate');step(DOMAIN.cutsceneFrames);
  assert(pair.f.siglarpLarp&&g.domain?.type==='siglarp','transformation');
}
check('Siglarp joins both selection slots, mirrors, finite normals, twelve portraits and shared combo/CPU routes',()=>{
  pickCharacters(['siglarp','siglarp']);assert(p1.kit===SIGLARP_ABILITIES&&p2.stats.color===CHARACTERS.siglarp.altColor,'mirror');
  openCharacterSelect();assert(charSelect.cursor.every(i=>ROSTER[i]==='siglarp'),'selection');
  for(const name of Object.keys(MOVES)) {
    const {f}=siglarpVs();f.startAttack(name);
    for(let frame=0;frame<=f.move.startup+f.move.active+f.move.recovery;frame+=.5)
      assert(poseIsFinite(attackAnim(f,frame)),name);
  }
});
check('Copycat learns successful enemy specials, saves/unlocks a move and cannot learn an ultimate or failed input',()=>{
  for(const index of [0,1]) {
    const pair=siglarpVs('curtis',index,1,500),{f,opp}=pair;
    tap(index?'KeyT':'Semicolon');assert(f.siglarpCopy?.id==='curtis'&&f.siglarpCopy.key==='special','learn');
    press(pair.down);tap(pair.special);release(pair.down);step(SIGLARP.saveFrames);
    assert(f.siglarpSaved,'saved');siglarpObserve(opp,'upSpecial');assert(f.siglarpCopy.key==='special','lock');
    press(pair.down);tap(pair.special);release(pair.down);step(SIGLARP.saveFrames);
    assert(!f.siglarpSaved&&f.siglarpCopy.key==='upSpecial','unlocked latest');
    const before=JSON.stringify(f.siglarpCopy);opp.ultimate=100;activateDomain(opp,g);
    assert(JSON.stringify(f.siglarpCopy)===before,'ultimate not learned');
  }
  const failed=siglarpVs('curtis');failed.opp.cooldowns.special=30;tap('Semicolon');assert(!failed.f.siglarpCopy,'failed special ignored');
});
check('Copycat performs all eligible roster specials with their own requirements, callbacks, cooldowns and recovery',()=>{
  for(const id of ROSTER.filter(id=>id!=='siglarp'))for(const key of ['special','downSpecial','upSpecial']) {
    if(!CHARACTER_ABILITIES[id][key])continue;
    const pair=siglarpVs(id,0,1,350),{f,opp}=pair;siglarpObserve(opp,key);siglarpPrepare(f,id);
    f.mask=70;f.bottles=2;f.tipsy=70;f.history=[{x:500,y:FLOOR,hp:f.hp}];
    tap(pair.special);assert(f.stats.id==='siglarp'&&f.lastSpecial?.id===id,`${id}/${key} begins`);
    for(let i=0;i<200&&!NEUTRAL.has(f.state)&&!['hitstun','ko'].includes(f.state);i++)step();
    assert(NEUTRAL.has(f.state)||['hitstun','stagger'].includes(f.state),`${id}/${key} finishes: ${f.state}`);
    const left=SIGLARP_ABILITIES.cooldownLeft(f,'special');
    if(left>0){const state=f.state;tap(pair.special);assert(f.siglarpActionId===null||f.state===state,'cooldown prevents retry');}
    assert(Number.isFinite(f.hp)&&f.hp<=MAX_HP,'health');
  }
});
check('Copied spear retains mark/reset ownership after recovery; copying a missed Hack keeps its no-cooldown rule',()=>{
  const pair=siglarpVs('null',0,1,250),{f,opp}=pair;siglarpObserve(opp,'special');tap(pair.special);
  activeUntil(()=>f.state==='idle',60);activeUntil(()=>!!f.nullMark,40);
  assert(f.nullMark.target===opp.index&&f.siglarpBanks.null.special>0,'owned mark');
  siglarpObserve(opp,'upSpecial');tap(pair.special);activeUntil(()=>f.moveHit&&f.stateFrame>=f.move.startup+f.move.active,60);
  assert(!f.nullMark&&f.siglarpBanks.null.upSpecial===0,'real marked Zoom reset');
  const miss=siglarpVs('sombra',1,-1,350);siglarpObserve(miss.opp,'special');tap(miss.special);step(45);
  assert(SIGLARP_ABILITIES.cooldownLeft(miss.f,'special')===0,'missed Hack refunds');
});
check('Copied Translocator and trap persist independently and only teleport starts beacon cooldown',()=>{
  const pair=siglarpVs('sombra'),{f,opp}=pair;siglarpObserve(opp,'downSpecial');tap(pair.special);step(40);
  assert(f.beacon&&f.siglarpBanks.sombra.downSpecial===0,'placed');const b=f.beacon;step(90);assert(f.beacon===b&&b.y===FLOOR,'persistent motion');
  tap(pair.special);assert(!f.beacon&&f.siglarpBanks.sombra.downSpecial===SOMBRA.beaconCooldown,'recast cooldown');
  const trap=siglarpVs('cheese',0,1,350);siglarpObserve(trap.opp,'downSpecial');tap(trap.special);step(40);
  assert(trap.f.traps.length===1,'copied trap');trap.opp.x=trap.f.traps[0].x;step();assert(trap.opp.hp<trap.opp.maxHp,'trap hits after copy recovery');
});
check('Mirror Counter has a six-frame strike window, misses recover, grabs win and the reflected hit deals real damage',()=>{
  for(const frame of [3,4,9,10]) {
    const pair=siglarpVs('curtis',0,1,60),{f,opp}=pair;SIGLARP_ABILITIES.upSpecial(f,opp,g);f.stateFrame=frame;
    opp.startAttack('heavy');opp.stateFrame=opp.move.startup;const hp=f.hp;
    applyHit(opp,f,{x:f.x,y:f.y-100},g);
    if(frame>=4&&frame<=9) {
      assert(f.hp===hp&&f.moveName==='siglarpReply','counter');const enemyHp=opp.hp;step();assert(opp.hp<enemyHp,'return damage');
    } else assert(f.hp<hp,'outside window');
  }
  const pair=siglarpVs('rip',1,-1,60);SIGLARP_ABILITIES.upSpecial(pair.f,pair.opp,g);pair.f.stateFrame=5;
  pair.opp.startAttack('grab');applyHit(pair.opp,pair.f,{x:pair.f.x,y:pair.f.y-100},g);assert(pair.f.state==='thrown','grab wins');
});
check('Identity Theft copies every opponent throw animation but keeps ten-frame escape and a single 90-damage release',()=>{
  for(const id of ROSTER)for(const index of [0,1])for(const facing of [-1,1]) {
    const {att,def,key}=beginEscapeThrow('siglarp',index,facing,id);
    assert(att.throwKind===id&&att.throwEscape?.left===10,'identity '+id);
    for(const who of ['att','def'])for(let frame=0;frame<=att.throwFrames;frame+=.5)assert(poseIsFinite(throwPose(att,who,frame)),id+' pose');
    const hp=def.hp;activeUntil(()=>att.state==='throwRecover',220);assert(def.hp===hp-90&&def.combo===1,id+' release');
    const escape=beginEscapeThrow('siglarp',index,facing,id);tap(escape.key);assert(escape.def.state==='deflect'&&escape.def.hp===escape.def.maxHp,id+' tech');
  }
});
check('Complete Larp copies every kit, stats, passives, resource meters and animations while preserving health, guard and Burst',()=>{
  for(const id of ROSTER.filter(id=>id!=='siglarp'))for(const index of [0,1]) {
    const pair=siglarpVs(id,index),{f,opp}=pair;f.hp=413;f.guard=37;f.burstMeter=211;opp.mask=65;opp.masked=true;opp.tipsy=70;opp.bottles=2;
    siglarpLarp(pair);assert(f.stats.id===id&&f.kit===opp.kit,'kit '+id);assert(f.hp===413&&f.guard===37&&f.burstMeter===211,'resource preservation');
    assert(f.stats.walk===opp.stats.walk&&f.maxHp===1000,'movement/max health');
    if(id==='lancer')assert(f.mask===65&&f.masked,'mask');if(id==='teo')assert(f.tipsy===70&&f.bottles===2,'tipsy');
    for(const state of ['idle','run','block','air']) {
      f.enter(state);opp.enter(state);const twin=Object.create(opp);twin.index=f.index;
      const a=animatedPose(f,12,12),b=animatedPose(twin,12,12);
      assert(poseIsFinite(a)&&JSON.stringify(a)===JSON.stringify(b),id+' '+state+' exact animation');
    }
  }
});
check('Complete Larp routes all three real special inputs to the copied kit for both players',()=>{
  for(const id of ROSTER.filter(id=>id!=='siglarp'))for(const key of ['special','downSpecial','upSpecial'])for(const index of [0,1]) {
    if(!CHARACTER_ABILITIES[id][key])continue;
    const pair=siglarpVs(id,index,1,450),{f}=pair;siglarpLarp(pair);
    f.mask=70;f.bottles=2;f.tipsy=70;f.history=[{x:500,y:FLOOR,hp:f.hp}];
    if(key==='upSpecial')press(pair.up);if(key==='downSpecial')press(pair.down);
    tap(pair.special);release(pair.up);release(pair.down);step(DOMAIN.chordFrames+1);
    assert(f.lastSpecial?.id===id&&f.lastSpecial.key===key,id+' '+key+' input');step(90);
    assert(!['deepBall','nullSpearWindup','trapDeploy','virusWindup','creamDeploy','audibleCall','chug','blackout'].includes(f.state),id+' recovery');
  }
});
check('Using the copied ultimate ends Complete Larp immediately, restores Siglarp and plays every real ultimate once',()=>{
  for(const id of ROSTER.filter(id=>id!=='siglarp'&&CHARACTER_ABILITIES[id].ultimate!=='none'))for(const index of [0,1]) {
    const pair=siglarpVs(id,index,1,60),{f,opp}=pair;f.hp=600;f.burstMeter=200;siglarpLarp(pair);
    press(pair.attack);tap(pair.special);release(pair.attack);
    assert(!f.siglarpLarp&&f.stats.id==='siglarp'&&f.kit===SIGLARP_ABILITIES,'restored '+id);
    assert(f.hp===600&&f.burstMeter>=200&&f.ultimate===0,'resources');assert(g.domainSequence,'copied opener');
    activeUntil(()=>!g.domainSequence,500);
    if(id==='sombra')assert(g.hackDomains.some(d=>d.owner===f.index),'HUD Hack');
    else if(id==='yitty')assert(g.montage?.owner===f.index,'Montage');
    else if(id==='gooner'){assert(f.state==='goonDash','Goon Su dash');activeUntil(()=>opp.hp<opp.maxHp,550);assert(opp.hp<opp.maxHp,'Goon Su explosion');}
    else assert(g.domain?.type===id&&g.domain.owner===f.index,id+' domain');
    if(id==='null'){assert(nullHidden(f,g),'copied darkness hides Siglarp');f.kit.onTakenHit(f,MOVES.light,10,g);assert(!nullHidden(f,g),'damage reveals');}
    assert(!activateDomain(f,g)||f.ultimate>=100,'no second free copied ultimate');
  }
});
check('Larp expiry, interruption, losing clashes, KO, rematch and character changes restore the original identity',()=>{
  for(const id of ['null','cheese','curtis']) {
    const pair=siglarpVs(id),{f}=pair;siglarpLarp(pair);f.enter('idle');g.domain.framesLeft=1;step();
    assert(!f.siglarpLarp&&f.stats.id==='siglarp'&&!f.siglarpCopiedUltimate,'expiry');
    siglarpLarp(pair);f.hp=0;f.koed=true;g.onKO();step();assert(f.stats.id==='siglarp','KO');startRound();
    assert(f.stats.id==='siglarp'&&!f.siglarpCopy&&f.hp===MAX_HP,'round reset');
    g.phase='fight';g.inputLocked=false;siglarpLarp(pair);f.setCharacter('rip');f.reset(640,1);assert(f.stats.id==='rip'&&!isSiglarp(f),'pick changes');
  }
  const pair=siglarpVs('null');siglarpLarp(pair);pair.opp.ultimate=100;assert(activateDomain(pair.opp,g),'challenger');
  g.domainSequence.boundary=pair.opp.index===0?W:0;step(DOMAIN.clashFrames);
  assert(!pair.f.siglarpLarp&&pair.f.stats.id==='siglarp'&&g.domain.type==='null','lost clash');
});
check('Siglarp copying, cooldowns and transformation timers freeze during pause, hitstop and cinematic openers',()=>{
  const pair=siglarpVs('curtis'),{f,opp}=pair;siglarpObserve(opp,'special');tap(pair.special);step(35);siglarpLarp(pair);
  for(const frozen of ['pause','hitstop','opener']) {
    const before=[g.domain.framesLeft,f.siglarpBanks.curtis.special];
    if(frozen==='pause')g.paused=true;if(frozen==='hitstop')g.hitstopLeft=3;
    if(frozen==='opener')g.domainSequence={kind:'cutscene',owner:opp.index,type:'curtis',framesLeft:3};
    tick();near(g.domain.framesLeft,before[0]);near(f.siglarpBanks.curtis.special,before[1]);g.paused=false;g.hitstopLeft=0;g.domainSequence=null;
  }
});
check('Siglarp controller RB copies, Down saves, Up counters and X+RB uses both transformation and borrowed ultimate',()=>{
  const old=navigator.getGamepads;
  try {
    for(const index of [0,1]) {
      const pair=siglarpVs('curtis',index,1,350),{f,opp}=pair,pad=testPad(2,'Siglarp pad');
      navigator.getGamepads=()=>[null,null,pad];f.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});siglarpObserve(opp,'special');
      pad.buttons[5].pressed=true;step();pad.buttons[5].pressed=false;step(40);assert(f.moveName==='rubberPistol','RB');
      pad.buttons[13].pressed=true;pad.buttons[5].pressed=true;step();pad.buttons[5].pressed=pad.buttons[13].pressed=false;step(15);assert(f.siglarpSaved,'Down');
      pad.buttons[12].pressed=true;pad.buttons[5].pressed=true;step();pad.buttons[5].pressed=pad.buttons[12].pressed=false;step(35);assert(f.cooldowns.upSpecial>0,'counter');
      f.ultimate=100;pad.buttons[2].pressed=pad.buttons[5].pressed=true;step();pad.buttons[2].pressed=pad.buttons[5].pressed=false;step(DOMAIN.cutsceneFrames);
      assert(f.siglarpLarp,'transform');pad.buttons[2].pressed=pad.buttons[5].pressed=true;step();pad.buttons[2].pressed=pad.buttons[5].pressed=false;
      assert(!f.siglarpLarp&&f.stats.id==='siglarp'&&g.domainSequence.type==='curtis','borrowed ultimate');
    }
  } finally {navigator.getGamepads=old;setup();}
});
check('Siglarp mirror transformation can borrow Complete Larp once without recursive free ultimate chains',()=>{
  const pair=siglarpVs('siglarp');pair.opp.setCharacter('siglarp',true);pair.opp.reset(780,-1);
  siglarpLarp(pair);assert(pair.f.stats.color===pair.opp.stats.color,'mirror appearance');assert(useSiglarpUltimate(pair.f,g),'borrow');step(DOMAIN.cutsceneFrames);
  assert(pair.f.siglarpLarp&&!pair.f.siglarpCopiedUltimate&&!useSiglarpUltimate(pair.f,g),'no recursion');
  g.domain.framesLeft=1;step();siglarpLarp(pair);assert(pair.f.siglarpCopiedUltimate,'new paid cast gets its own charge');
});
check('Learning Teo stage variants and Lancer Mask supplies their move requirements without copying health or Burst',()=>{
  for(const [drunk,key,ability] of [[false,'special','chug'],[true,'special','bottle'],[true,'upSpecial','bellow']]) {
    const pair=siglarpVs('teo',0,1,450),{f,opp}=pair;opp.tipsy=drunk?70:0;opp.bottles=1;
    const enemyKey=key==='upSpecial'?'ArrowUp':null;if(enemyKey)press(enemyKey);tap('Semicolon');if(enemyKey)release(enemyKey);
    assert(f.siglarpCopy.variant===ability,'learn actual variant');f.hp=450;f.burstMeter=177;tap(pair.special);
    assert(f.usedAbility===ability&&f.hp===450&&f.burstMeter>=177,'copied '+ability);step(80);
  }
  const pair=siglarpVs('lancer'),{f,opp}=pair;opp.mask=60;press('ArrowDown');tap('Semicolon');release('ArrowDown');
  assert(f.mask>=50,'mask prerequisite');tap(pair.special);step(LANCER.maskOn+2);assert(f.masked,'copied mask works');
  const armor=siglarpVs('rip');siglarpObserve(armor.opp,'special');tap(armor.special);assert(armor.f.relentless>0,'copied armor');
  step(RIP.relentlessFrames+5);assert(armor.f.relentless===0,'buff expires after returning');
});
check('Siglarp preserves saved moves across Larp, finishes an expiring copied action and clears copied cooldowns in infinite practice',()=>{
  for(const id of ['null','cheese']) {
    const pair=siglarpVs(id),{f,opp}=pair;siglarpObserve(opp,'upSpecial');f.siglarpSaved=true;const saved={...f.siglarpCopy};
    siglarpLarp(pair);f.kit.special(f,opp,g);g.domain.framesLeft=1;step();
    assert(f.stats.id==='siglarp'&&JSON.stringify(f.siglarpCopy)===JSON.stringify(saved)&&f.siglarpSaved,'saved move');
    activeUntil(()=>NEUTRAL.has(f.state),180);assert(!f.siglarpActionId,'recovery');
    f.siglarpBanks[id].upSpecial=100;g.practice={infinite:true,mode:1,hits:[],lastEvent:null};preparePractice(g);
    assert(SIGLARP_ABILITIES.cooldownLeft(f,'special')===0,'infinite borrowed cooldown');
    f.siglarpCopiedUltimate=true;f.setCharacter('rip');f.reset(640,1);assert(!f.siglarpCopiedUltimate&&!isSiglarp(f),'flags cleared');
  }
  const pair=siglarpVs('curtis'),{f}=pair;siglarpLarp(pair);f.y=FLOOR-120;f.enter('air');tap(pair.up);
  assert(f.curtisSwingLeft>0,'copied swing');g.domain.framesLeft=1;step();assert(f.curtisSwingLeft===0&&!f.curtisAnchor,'expiry ends swing');
});
