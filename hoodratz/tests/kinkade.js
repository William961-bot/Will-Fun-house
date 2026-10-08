function kinkadeVs(index=0,facing=1,gap=350) {
  setup();const f=fighters[index],opp=fighters[1-index];f.setCharacter('kinkade');opp.setCharacter('rip');
  f.reset(500,facing);opp.reset(500+gap*facing,-facing);
  return {f,opp,up:index?'ArrowUp':'KeyW',special:index?'Semicolon':'KeyT'};
}
function kinkadeDrink(pair,frames) {press(pair.up);press(pair.special);step(frames);}
function kinkadeRelease(pair) {release(pair.up);release(pair.special);step(KINKADE.recovery+1);}
check('Kinkade joins both selection slots, mirror palettes, finite normals and the thirteen-fighter roster',()=>{
  pickCharacters(['kinkade','kinkade']);assert(ROSTER.length===13&&p1.kit===KINKADE_ABILITIES,'roster');
  assert(p2.stats.color===CHARACTERS.kinkade.altColor&&p1.hp===1000,'mirror/health');
  openCharacterSelect();assert(charSelect.cursor.every(i=>ROSTER[i]==='kinkade'),'selection');
  for(const name of Object.keys(MOVES)) {
    const {f}=kinkadeVs();f.startAttack(name);
    for(let at=0;at<=f.move.startup+f.move.active+f.move.recovery;at+=.5)assert(poseIsFinite(attackAnim(f,at)),name);
  }
  for(const state of ['preworkoutDrink','preworkoutRecover','idle','run','block']) {
    const {f}=kinkadeVs();f.enter(state);f.preworkout=80;
    for(let at=0;at<140;at+=.5)assert(poseIsFinite(animatedPose(f,at,at)),state);
  }
});
check('Pre-Workout starts through both real keyboard inputs, stands still, requires startup and recovers on either release',()=>{
  for(const index of [0,1])for(const releaseKey of ['up','special']) {
    const pair=kinkadeVs(index),{f}=pair;kinkadeDrink(pair,1);
    assert(f.state==='preworkoutDrink'&&f.preworkout===0&&f.y===FLOOR,'drink replaces jump');
    step(KINKADE.drinkStartup-2);near(f.preworkout,0);step(35);
    assert(f.preworkout>0&&f.preworkout<KINKADE.over&&f.vx===0&&f.y===FLOOR,'safe dose/stationary');
    release(pair[releaseKey]);step();assert(f.state==='preworkoutRecover','release');
    release(pair.up);release(pair.special);step(KINKADE.recovery);assert(f.state==='idle','recovers');
  }
});
check('Safe Pre-Workout reduces real health damage by twenty percent without armor, stun immunity or extra guard drain',()=>{
  for(const index of [0,1])for(const name of ['light','medium','heavy'])for(const dose of [0,30,80]) {
    const {f,opp}=kinkadeVs(index,1,60);f.preworkout=dose;
    opp.startAttack(name);opp.stateFrame=opp.move.startup;const hp=f.hp,guard=f.guard;
    applyHit(opp,f,{x:f.x,y:f.y-100},g);
    near(hp-f.hp,Math.round(MOVES[name].dmg*opp.stats.dmg*(dose===0?1:dose<60?.8:1.2)));
    assert(f.state==='hitstun'&&f.combo===1&&f.guard===guard,'normal hit reactions/resources');
  }
});
check('Overstimulation replaces protection with thirty percent movement speed and twenty percent extra damage taken',()=>{
  const pair=kinkadeVs(),{f}=pair;kinkadeDrink(pair,110);
  assert(kinkadeOver(f)&&takenDamageScale(f)===1.2&&rosterSpeed(f)===1.3,'tradeoff');
  assert(g.popups.some(p=>p.text==='OVERSTIMULATED!'),'threshold cue');step(100);near(f.preworkout,100);
  kinkadeRelease(pair);f.preworkout=80;f.enter('run');f.vx=10;const x=f.x;f.physics(g);near(f.x-x,13);
  f.enter('idle');f.preworkout=KINKADE.over+KINKADE.drain/2;step();
  assert(!kinkadeOver(f)&&takenDamageScale(f)===.8&&rosterSpeed(f)===1,'drops back to safe dose');
  f.preworkout=KINKADE.drain/2;step();assert(f.preworkout===0&&takenDamageScale(f)===1,'fully wears off');
});
check('Pre-Workout drains once per active world tick, survives interruption and freezes during pause, hitstop, intros and openers',()=>{
  const pair=kinkadeVs(),{f,opp}=pair;kinkadeDrink(pair,45);const dose=f.preworkout;
  for(const mode of ['pause','hitstop','opener']) {
    if(mode==='pause')g.paused=true;if(mode==='hitstop')g.hitstopLeft=2;
    if(mode==='opener')g.domainSequence={kind:'cutscene',owner:1,type:'rip',framesLeft:30};
    tick();near(f.preworkout,dose);g.paused=false;g.hitstopLeft=0;g.domainSequence=null;
  }
  release(pair.up);release(pair.special);f.enter('idle');g.phase='intro';g.phaseTimer=100;g.inputLocked=true;tick();near(f.preworkout,dose);
  g.phase='fight';g.inputLocked=false;g.domain={type:'haze',owner:opp.index,framesLeft:200};step(6);near(f.preworkout,dose-6*KINKADE.drain);
  g.domain=null;kinkadeDrink(pair,20);opp.startAttack('light');opp.stateFrame=opp.move.startup;
  applyHit(opp,f,{x:f.x,y:f.y-100},g);const interrupted=f.preworkout;step(5);
  assert(f.state==='hitstun'&&f.preworkout<interrupted,'hit interrupts the drink');release(pair.up);release(pair.special);
});
check('Pre-Workout scales ordinary throws, Yitty slams and Goon Su explosions, preserving ordinary throw escapes',()=>{
  for(const dose of [30,80]) {
    const scale=dose<60?.8:1.2;
    let pair=kinkadeVs(1,-1,60),{f,opp}=pair;opp.setCharacter('curtis');f.preworkout=dose;
    opp.startAttack('grab');startThrow(opp,f,g,'');const hp=f.hp;releaseThrow(opp,f,g);near(hp-f.hp,Math.round(90*scale));
    pair=kinkadeVs(1,-1,60);f=pair.f;opp=pair.opp;opp.setCharacter('yitty');f.preworkout=dose;
    opp.startAttack('grab');startThrow(opp,f,g,'');opp.stateFrame=YITTY.slamAt;updateSuplex(opp,f,g);
    near(f.maxHp-f.hp,Math.round(YITTY.suplexDamage[0]*scale));
    pair=kinkadeVs(1,-1,60);f=pair.f;opp=pair.opp;opp.setCharacter('gooner');f.preworkout=dose;
    goonExplosion(opp,f,g);near(f.maxHp-f.hp,Math.round(GOONER.explosionDamage*scale));
  }
  const {att,def,key}=beginEscapeThrow('kinkade');assert(att.throwKind==='kinkade'&&att.throwEscape.left===10,'ordinary grab');
  tap(key);assert(def.hp===def.maxHp&&att.state==='deflect','escape works');
});
check('Blocking costs normal guard and no health with either dose; drinking is vulnerable and Hack prevents it',()=>{
  for(const dose of [30,80]) {
    const {f,opp}=kinkadeVs(0,1,60);f.preworkout=dose;f.enter('block');const hp=f.hp;
    opp.startAttack('light');opp.stateFrame=opp.move.startup;applyHit(opp,f,{x:f.x,y:f.y-100},g);
    near(f.hp,hp);near(f.guard,GUARD.max-BLOCK.guardDrain);
  }
  const pair=kinkadeVs();pair.f.hacked=100;kinkadeDrink(pair,20);
  assert(pair.f.state!=='preworkoutDrink'&&pair.f.preworkout===0,'Hack prevents special');release(pair.up);release(pair.special);
  pair.f.hacked=0;pair.f.y=FLOOR-100;pair.f.enter('air');kinkadeDrink(pair,1);
  assert(pair.f.state!=='preworkoutDrink','drink is grounded');release(pair.up);release(pair.special);
});
check('Controllers hold D-pad or stick Up plus RB to drink for either player and release to recover',()=>{
  const original=navigator.getGamepads;
  try {
    for(const index of [0,1])for(const stick of [false,true]) {
      const {f}=kinkadeVs(index);const pad=testPad(2,'Pre-workout controller');navigator.getGamepads=()=>[null,null,pad];
      f.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});pad.buttons[5].pressed=true;
      if(stick)pad.axes[1]=-1;else pad.buttons[12].pressed=true;step(110);
      assert(f.state==='preworkoutDrink'&&kinkadeOver(f),'controller drinking');
      pad.buttons[5].pressed=false;step(KINKADE.recovery+1);assert(f.state==='idle','controller release');
    }
  } finally {navigator.getGamepads=original;}
});
check('CPU levels one through five drink at distance, release near threats and choose safe or overstimulated doses',()=>{
  for(const level of [1,2,3,4,5]) {
    const {f,opp}=kinkadeVs(1,-1,400);f.input=new CpuInput(1,level);f.enter('preworkoutDrink');step(120);
    assert(f.preworkout>(level>=4?60:20),'CPU dose '+level);assert(f.state!=='preworkoutDrink','CPU stops '+level);
    f.enter('preworkoutDrink');opp.x=f.x-80;step();assert(f.state==='preworkoutRecover','release near enemy');
  }
});
check('Siglarp copies and keeps Pre-Workout effects after drinking, while Complete Larp preserves dose and ends without a fake ultimate',()=>{
  const pair=siglarpVs('kinkade'),{f,opp}=pair;siglarpObserve(opp,'upSpecial');press(pair.special);step(110);release(pair.special);
  step(KINKADE.recovery+1);assert(f.stats.id==='siglarp'&&kinkadeOver(f)&&rosterSpeed(f)===1.3&&takenDamageScale(f)===1.2,'copied effects');
  const before=f.preworkout;step(10);near(f.preworkout,before-10*KINKADE.drain);
  opp.preworkout=35;siglarpLarp(pair);assert(f.preworkout===35&&!f.siglarpCopiedUltimate&&takenDamageScale(f)===.8,'full copy');
  assert(!activateDomain(f,g)&&f.siglarpLarp,'no invented ultimate');g.domain.framesLeft=1;step();assert(f.stats.id==='siglarp'&&f.preworkout===0,'expiry');
});
check('Pre-Workout resets on rounds and fighter changes, and unassigned specials/ultimate never spend resources or lock inputs',()=>{
  const pair=kinkadeVs(),{f}=pair;f.preworkout=80;f.ultimate=100;assert(!activateDomain(f,g)&&f.ultimate===100,'no unassigned ultimate');
  press(pair.up);press(pair.special);step();assert(f.state==='preworkoutDrink'&&!f.domainPending,'full meter directional input');
  release(pair.up);release(pair.special);f.reset(500,1);near(f.preworkout,0);f.preworkout=80;f.setCharacter('rip');near(f.preworkout,0);
  f.setCharacter('kinkade');f.preworkout=80;startRound();near(f.preworkout,0);
});
check('Pump earns three distinct damaging normals, ignores repeats, blocks, parries and grabs, and persists until spent',()=>{
  for(const index of [0,1]) {
    const {f,opp}=kinkadeVs(index,1,60);
    for(const [name,defense] of [['light','idle'],['light','idle'],['medium','block'],['low','parry'],['medium','idle'],['lowMedium','idle']]) {
      opp.enter(defense);opp.parryDir='low';opp.stateFrame=0;opp.combo=0;
      f.startAttack(name);f.stateFrame=f.move.startup;applyHit(f,opp,{x:opp.x,y:opp.y-100},g);
    }
    assert(kinkadePumpReady(f)&&f.pumpNormals.size===3&&!f.pumpNormals.has('low'),'distinct clean hits only');
    assert(g.popups.filter(p=>p.text==='PUMP READY!').length===1,'ready cue once');
    const size=f.pumpNormals.size;f.enter('idle');opp.reset(950,-1);step(100);near(f.pumpNormals.size,size);
    KINKADE_ABILITIES.onHit(f,opp,90,'grab',g);near(f.pumpNormals.size,3);
  }
  const {f,opp}=kinkadeVs();f.startAttack('light');step(20);near(f.pumpNormals.size,0);
  KINKADE_ABILITIES.onHit(f,opp,90,'grab',g);KINKADE_ABILITIES.onHit(f,opp,65,'benchPress',g);near(f.pumpNormals.size,0);
});
check('Pump survives Pre-Workout and denied specials, spends on an accepted Bench even on a miss, and resets with fighter/round',()=>{
  const pair=kinkadeVs(),{f}=pair;f.pumpNormals=new Set(['light','medium','low']);kinkadeDrink(pair,30);
  assert(kinkadePumpReady(f),'drink preserves ready');kinkadeRelease(pair);
  for(const reason of ['cooldown','hack','air']) {
    f.cooldowns.special=reason==='cooldown'?20:0;f.hacked=reason==='hack'?30:0;
    if(reason==='air'){f.y=FLOOR-100;f.enter('air');}
    tap(pair.special);assert(kinkadePumpReady(f),'denied '+reason);
  }
  f.hacked=0;f.cooldowns.special=0;f.y=FLOOR;f.enter('idle');tap(pair.special);
  assert(f.moveName==='benchPress'&&f.benchPumped&&f.pumpNormals.size===0,'spends');step(45);near(pair.opp.hp,MAX_HP);
  f.pumpNormals.add('light');f.setCharacter('rip');near(f.pumpNormals.size,0);
  f.setCharacter('kinkade');f.pumpNormals.add('light');startRound();near(f.pumpNormals.size,0);
});
check('Bench Press starts on either keyboard, reaches medium range and deals one actual hit with a three-second cooldown',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=kinkadeVs(index,facing,180),{f,opp}=pair;tap(pair.special);assert(f.moveName==='benchPress','input');
    step(12);assert(opp.combo===1&&opp.hp===MAX_HP-65,'medium-range contact');
    assert(f.cooldowns.special>160,'cooldown');step(40);near(opp.hp,MAX_HP-65);
    tap(pair.special);assert(f.state!=='attack','cooldown blocks repeat');
  }
});
check('Pumped Bench delivers two real hits and cancels into Light or Medium without dropping the combo on either side',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const follow of ['light','medium']) {
    const pair=kinkadeVs(index,facing,80),{f,opp}=pair;f.pumpNormals=new Set(['light','medium','low']);
    tap(pair.special);step(12);assert(opp.combo===1&&opp.hp===MAX_HP-78,'boosted first');
    step(7);assert(opp.combo===2&&opp.hp<MAX_HP-78&&f.benchSecond,'second actual damage');
    step(3);tap(index?(follow==='light'?'Comma':'KeyK'):(follow==='light'?'KeyF':'KeyV'));
    assert(f.moveName===follow,'cancel '+follow);stepUntil(()=>opp.combo===3,20);
    assert(opp.combo===3&&opp.state==='hitstun','true three-hit combo '+index+'/'+facing+'/'+follow);
  }
});
check('Pumped Bench has a dead gap; both pulses block normally and parrying or interrupting the first stops the second',()=>{
  for(const defense of ['block','parry','interrupt']) {
    const pair=kinkadeVs(0,1,80),{f,opp}=pair;f.pumpNormals=new Set(['light','medium','low']);tap(pair.special);
    step(10);if(defense!=='interrupt'){opp.enter(defense);opp.parryDir='high';opp.stateFrame=0;if(defense==='block')press('Quote');}
    else{opp.startAttack('light');opp.stateFrame=opp.move.startup;applyHit(opp,f,{x:f.x,y:f.y-100},g);}
    step(12);
    if(defense==='block'){near(opp.hp,MAX_HP);near(opp.guard,GUARD.max-2*BLOCK.guardDrain);assert(!f.pumpNormals.size,'blocks do not build Pump');}
    else{near(opp.hp,MAX_HP);assert(!f.benchSecond,'interrupted second');}
  }
  const {f,opp}=kinkadeVs(0,1,80);f.pumpNormals=new Set(['light','medium','low']);f.kit.special(f);
  for(const at of [15,16,17,18]){f.stateFrame=at;f.moveHit=false;assert(!hitPoint(f,opp),'inactive gap '+at);}
});
check('Controller RB performs normal and pumped Bench Press for either player',()=>{
  const original=navigator.getGamepads;
  try {for(const index of [0,1])for(const pumped of [false,true]) {
    const {f,opp}=kinkadeVs(index,1,80),pad=testPad(2,'Bench controller');navigator.getGamepads=()=>[null,null,pad];
    f.input=new PlayerInput(index,{type:'pad',slot:2,id:pad.id});if(pumped)f.pumpNormals=new Set(['light','medium','low']);
    pad.buttons[5].pressed=true;step();pad.buttons[5].pressed=false;step(22);
    assert(f.moveName==='benchPress'&&opp.combo===(pumped?2:1),'controller damage');
  }}finally{navigator.getGamepads=original;}
});
check('Personal Record lifts overhead, struggles, slams once for normal damage and emits white chalk on both sides near walls',()=>{
  for(const index of [0,1])for(const facing of [-1,1])for(const wall of [false,true]) {
    const {att,def}=beginEscapeThrow('kinkade',index,facing);
    if(wall){att.throwOrigin=facing>0?WALL_R-HALF_W-35:WALL_L+HALF_W+35;}
    step(30);near(def.y,FLOOR-145);near(def.hp,MAX_HP);assert(att.throwCommitted,'escaped window finished');
    for(let frame=0;frame<=86;frame+=.5)for(const who of ['att','def'])assert(poseIsFinite(kinkadeThrowPose(att,who,frame)),'finite lift');
    step(31);near(def.hp,MAX_HP);near(def.y,FLOOR-145);assert(def.x>=WALL_L+HALF_W&&def.x<=WALL_R-HALF_W,'bounds');
    step(25);near(def.hp,MAX_HP-90);assert(def.combo===1&&att.state==='throwRecover','one release');
    assert(g.smokePuffs.some(p=>p.color==='245,242,229'),'chalk cloud');near(att.pumpNormals.size,0);
  }
});
check('Personal Record uses the standard ten-frame escape and freezes the lift during hitstop and pause',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    let pair=beginEscapeThrow('kinkade',index,facing);step(9);tap(pair.key);
    assert(pair.att.state==='deflect'&&pair.def.hp===MAX_HP&&!g.smokePuffs.length,'last-frame escape no chalk');
    pair=beginEscapeThrow('kinkade',index,facing);step(40);const y=pair.def.y,frame=pair.att.stateFrame;
    g.paused=true;tick();near(pair.att.stateFrame,frame);near(pair.def.y,y);g.paused=false;g.hitstopLeft=2;tick();near(pair.att.stateFrame,frame);near(pair.def.y,y);
  }
});
check('Siglarp builds his own copied Pump, performs both Bench shoves and Complete Larp clones the meter without sharing it',()=>{
  const pair=siglarpVs('kinkade',0,1,80),{f,opp}=pair;siglarpObserve(opp,'special');
  for(const name of ['light','medium','low']){opp.enter('idle');opp.combo=0;f.startAttack(name);applyHit(f,opp,{x:opp.x,y:opp.y-100},g);}
  assert(kinkadePumpReady(f)&&opp.pumpNormals.size===0,'own meter');opp.reset(f.x+80,-1);f.enter('idle');
  tap(pair.special);step(19);assert(opp.combo===2&&f.pumpNormals.size===0,'copied pumped bench');
  const next=siglarpVs('kinkade');next.opp.pumpNormals=new Set(['light','medium','low']);siglarpLarp(next);
  assert(kinkadePumpReady(next.f)&&next.f.pumpNormals!==next.opp.pumpNormals,'clone Set');
  next.f.pumpNormals.clear();assert(kinkadePumpReady(next.opp),'enemy unaffected');
});
check('Light, Medium and Low Medium earn Pump through real inputs and link straight into both Bench shoves as five continuous hits',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=kinkadeVs(index,facing,75),{f,opp}=pair;
    for(const [n,name] of ['light','medium','lowMedium'].entries()) {
      if(name==='lowMedium')press(index?'ArrowDown':'KeyS');
      tap(index?(name==='light'?'Comma':'KeyK'):(name==='light'?'KeyF':'KeyV'));
      if(name==='lowMedium')release(index?'ArrowDown':'KeyS');
      stepUntil(()=>opp.combo===n+1,20);
      stepUntil(()=>f.stateFrame>=f.move.startup+f.move.active-1,10);
    }
    assert(kinkadePumpReady(f),'earned three distinct hits');tap(pair.special);
    stepUntil(()=>opp.combo===5,35);assert(opp.combo===5&&opp.state==='hitstun'&&f.benchPumped,'five continuous hits');
  }
});
check('Bench respects combo caps, Burst escape, vulnerable recovery and frozen move/cooldown clocks',()=>{
  for(const mode of ['cap','burst','recovery']) {
    const pair=kinkadeVs(0,1,80),{f,opp}=pair;f.pumpNormals=new Set(['light','medium','low']);
    tap(pair.special);if(mode==='cap'){opp.combo=9;opp.comboAttacker=f.index;}
    step(12);const hp=opp.hp;
    if(mode==='burst'){press('Quote');tap('Period');release('Quote');assert(opp.burstMeter===0,'real Burst');}
    step(7);if(mode!=='recovery')near(opp.hp,hp);
    else {step(5);opp.startAttack('light');opp.stateFrame=opp.move.startup;const before=f.hp;applyHit(opp,f,{x:f.x,y:f.y-100},g);assert(f.hp<before&&f.state==='hitstun','recovery punish');}
  }
  const pair=kinkadeVs(),{f}=pair;tap(pair.special);step(5);const frame=f.stateFrame,cd=f.cooldowns.special;
  g.paused=true;tick();near(f.stateFrame,frame);near(f.cooldowns.special,cd);g.paused=false;
  g.hitstopLeft=2;tick();near(f.stateFrame,frame);near(f.cooldowns.special,cd);
});
