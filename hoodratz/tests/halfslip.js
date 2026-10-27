function halfslipSetup(index=0,three=false) {
  keysDown.clear();
  const ids=three?['halfslip','rip','null']:index?['rip','halfslip']:['halfslip','rip'];
  startMatch(false,ids.map((_,layout)=>({type:'keyboard',layout})),ids);
  g.phase='fight';g.inputLocked=false;g.frame=0;
  const f=fighters[index],opp=fighters[index?0:1];f.reset(400,1);opp.reset(800,-1);
  if(three)p3.reset(1100,-1);
  return {f,opp,special:index?'Semicolon':'KeyT',up:index?'ArrowUp':'KeyW',down:index?'ArrowDown':'KeyS'};
}
function halfslipCheck(name,run) { check(name,()=>{try{run();}finally{finishThreePlayerTest();}}); }
halfslipCheck('Halfslip is selectable in every slot with the full visible roster and distinct mirror colours',()=>{
  assert(ROSTER.length===19&&ROSTER.includes('halfslip')&&ROSTER.at(-1)==='wolf','roster');
  for(const three of [false,true]) {
    const ids=Array(three?3:2).fill('halfslip');startMatch(false,ids.map((_,layout)=>({type:'keyboard',layout})),ids);
    assert(fighters.every(f=>f.kit===HALFSLIP_ABILITIES),'slots');
    assert(p2.stats.color===CHARACTERS.halfslip.altColor,'mirror');
    openCharacterSelect();selectPlayerCount(three?3:2);
    const any=new Proxy(function(){},{get:(o,k)=>k===Symbol.toPrimitive?()=>0:any,apply:()=>any,set:()=>true});
    drawCharacterSelect(any,STEP);
    const portraits=charSelect.hits.filter(h=>typeof h.index==='number');
    assert(portraits.length===19&&portraits.every(h=>h.x>=0&&h.x+h.w<=W),'all portraits onscreen');
  }
});
halfslipCheck('Plus One uses real keyboard and controller Special, respects startup, single-clone limit and cooldown',()=>{
  for(const index of [0,1]) {
    const {f,opp,special}=halfslipSetup(index);tap(special);
    assert(f.state==='halfslipSummon'&&!halfslipClones(f).length,'startup');
    step(HALFSLIP.summonStartup+HALFSLIP.summonRecovery);
    assert(halfslipClones(f).length===1&&f.cooldowns.special>0,'summoned');
    f.cooldowns.special=0;tap(special);assert(halfslipClones(f).length===1,'one normal clone');
    assert(!halfslipClones(opp).length,'ownership');
  }
  const old=navigator.getGamepads,pad=testPad(3,'Halfslip pad');
  try {
    navigator.getGamepads=()=>[null,null,null,pad];
    startMatch(false,[{type:'pad',slot:3,id:pad.id},{type:'keyboard',layout:1}],['halfslip','rip']);g.phase='fight';g.inputLocked=false;
    pad.buttons[5].pressed=true;step();pad.buttons[5].pressed=false;step(40);
    assert(halfslipClones(p1).length===1,'controller RB summon');
  } finally { navigator.getGamepads=old; }
});
halfslipCheck('Fighting clones chase and damage independently, obey shared combo budgets and never earn owner ultimate',()=>{
  for(const index of [0,1]) {
    const {f,opp}=halfslipSetup(index);const c=spawnHalfslipClone(f,480,opp);
    f.ultimate=12;const before=opp.hp;
    for(let i=0;i<300&&opp.hp===before;i++)step();
    assert(opp.hp<before&&c.x>480,'independent pursuit');
    assert(before-opp.hp<=Math.ceil(MOVES.medium.dmg*.25),'reduced damage');
    assert(f.ultimate===12&&opp.comboAttacker===f.index,'owner credit without meter');
    opp.combo=COMBO_LIMIT.beforeBounce-1;opp.comboCapped=false;opp.enter('hitstun');opp.hitstun=30;
    c.x=opp.x-65;c.facing=1;c.startAttack('light');c.stateFrame=c.move.startup;resolveHalfslipClones(g);
    assert(opp.comboCapped&&opp.combo===COMBO_LIMIT.beforeBounce,'shared cap');
    const hp=opp.hp;c.startAttack('medium');c.stateFrame=c.move.startup;resolveHalfslipClones(g);assert(opp.hp===hp,'no extra hit at cap');
  }
});
halfslipCheck('One melee hit or projectile destroys a clone without damaging its owner; grabs cannot hold clones',()=>{
  let {f,opp}=halfslipSetup();f.x=200;opp.x=600;let c=spawnHalfslipClone(f,535,opp);
  opp.startAttack('light');opp.stateFrame=opp.move.startup;resolveHalfslipClones(g);
  assert(c.dead&&f.hp===MAX_HP&&opp.moveHit,'one melee hit');
  opp.enter('idle');c=spawnHalfslipClone(f,535,opp);opp.startAttack('grab');opp.stateFrame=opp.move.startup;
  resolveHalfslipClones(g);assert(!c.dead&&opp.state==='attack'&&f.state==='idle','grab misses illusion');
  c.x=500;opp.enter('idle');
  spawnProjectile(g,{owner:opp.index,x:500,y:FLOOR-100,vx:0,facing:-1,framesLeft:30,kind:'wave',name:'crescent',
    box:{w:30,h:90},move:{...MOVES.light,dmg:55},blockGuard:8});
  updateProjectiles(g);assert(c.dead&&!g.projectiles.length&&f.hp===MAX_HP,'projectile absorbed by clone');
});
halfslipCheck('Clone attacks block and parry normally; Pushblock and Burst remove nearby clones without punishing the remote owner',()=>{
  for(const defense of ['block','parry','pushblock','burst']) {
    const {f,opp}=halfslipSetup();f.x=200;opp.x=700;const c=spawnHalfslipClone(f,635,opp);
    c.startAttack('light');c.stateFrame=c.move.startup;
    if(defense==='parry'){opp.startParry('high');opp.stateFrame=0;}
    else if(defense!=='burst')opp.enter('block');
    resolveHalfslipClones(g);
    if(defense==='block')assert(opp.hp===MAX_HP&&opp.guard<GUARD.max&&f.ultimate===0,'block');
    if(defense==='parry')assert(opp.hp===MAX_HP&&c.state==='stagger'&&f.state==='idle','parry staggers only clone');
    if(defense==='pushblock'){pushblock(opp,opponentOf(opp),g);assert(c.dead&&f.state==='idle','pushblock hits real pressure source');}
    if(defense==='burst') {
      press('Quote');press('Period');opp.input.poll(g.frame);
      assert(opp.tryBurst(opp.input),'burst input');assert(c.dead&&f.state==='idle'&&opp.burstMeter===0,'Burst removes clones and leaves distant owner');
    }
  }
});
halfslipCheck('Slip Switch trades real positions with its owned clone after a vulnerable windup and fails without a clone',()=>{
  for(const index of [0,1]) {
    const {f,opp,down,special}=halfslipSetup(index);
    assert(!HALFSLIP_ABILITIES.downSpecial(f),'no clone requirement');const c=spawnHalfslipClone(f,1000,opp);
    press(down);tap(special);release(down);assert(f.state==='halfslipSwitch'&&f.x===400&&!f.invincible,'telegraph');
    c.input.poll=frame=>{c.input.frame=frame;for(const b of BUTTONS){c.input.held[b]=false;c.input.pressedAt[b]=-999;}};
    c.enter('idle');c.vx=0;step(HALFSLIP.switchStartup);
    assert(f.halfslipSwitched&&f.x>900&&c.x<500,`owned position swap: ${f.x}/${c.x}/${f.stateFrame}/${f.halfslipSwitched}`);
    assert(f.cooldowns.downSpecial>0&&!f.invincible,'recovery and cooldown');
  }
});
halfslipCheck('Clone Catapult launches both fighters and Halfslip gets exactly one clone-assisted second jump per landing',()=>{
  for(const index of [0,1]) {
    const {f,opp,up,special}=halfslipSetup(index);opp.x=f.x+70;
    press(up);tap(special);release(up);step(18);
    assert(f.moveName==='halfslipUpper'&&opp.hp<MAX_HP&&opp.overheadLaunched&&!f.grounded,'rising launcher');
    const pair=halfslipSetup(index);tap(pair.up);step(7);assert(!pair.f.grounded,'first jump');
    tap(pair.up);assert(pair.f.halfslipJumpUsed&&pair.f.animHint==='halfslipBoost','second jump');
    const vy=pair.f.vy;tap(pair.up);assert(pair.f.vy>vy,'no third jump');
    step(100);assert(pair.f.grounded&&!pair.f.halfslipJumpUsed,'landing refresh');
  }
});
halfslipCheck('Clone Volley has normal throw damage and a fresh ten-frame escape window with finite clone-assisted poses',()=>{
  for(const index of [0,1])for(const escape of [false,true]) {
    const {f,opp}=halfslipSetup(index);opp.x=f.x+50;f.startAttack('grab');f.stateFrame=f.move.startup;resolveCombat(f,opp,g);
    assert(f.state==='throw'&&f.throwKind==='halfslip'&&f.throwEscape.left===10,'throw');
    for(let frame=0;frame<=THROWS.halfslip.frames;frame+=.5)for(const who of ['att','def'])assert(poseIsFinite(halfslipThrowPose(f,who,frame)),'throw pose');
    if(escape){tap(index?'KeyJ':'KeyL');assert(f.state!=='throw'&&opp.hp===MAX_HP,'escape');}
    else {step(THROWS.halfslip.frames+20);assert(opp.hp===MAX_HP-90,'normal damage once');}
  }
});
halfslipCheck('Catapult confirms into a real air Light or Medium on either side without requiring another jump',()=>{
  for(const index of [0,1])for(const button of ['attack','medium']) {
    const {f,opp,up,special}=halfslipSetup(index);opp.x=f.x+70;
    press(up);tap(special);release(up);
    for(let i=0;i<50&&f.stateFrame<14;i++)step();
    assert(f.moveHit&&!f.grounded&&opp.state==='hitstun','confirmed launcher');
    tap(index?(button==='attack'?'Comma':'KeyK'):(button==='attack'?'KeyF':'KeyV'));
    step(14);
    assert(opp.combo>=2,`air follow-up ${index}/${button}: ${f.moveName}/${opp.combo}`);
    assert(f.cooldowns.upSpecial>0&&!f.halfslipJumpUsed,'cooldown and second jump retained');
  }
});
halfslipCheck('Catapult respects block and parry, leaves recovery on a miss and also rises from midair',()=>{
  for(const defense of ['block','parry','miss','air']) {
    const {f,opp,up,special}=halfslipSetup();opp.x=f.x+(defense==='miss'?400:70);
    if(defense==='block'){opp.input.held.block=true;press('Quote');opp.enter('block');}
    if(defense==='air'){f.y=opp.y=FLOOR-100;f.enter('air');opp.enter('air');}
    press(up);tap(special);release(up);
    if(defense==='parry'){step(8);opp.startParry('overhead');opp.stateFrame=0;}
    for(let i=0;i<18;i++)step();
    if(defense==='block'||defense==='parry')assert(opp.hp===MAX_HP,defense);
    if(defense==='parry')assert(f.state==='stagger','parry punishes catapult');
    if(defense==='miss'){
      step(5);tap('KeyF');assert(f.moveName==='halfslipUpper'&&f.state==='attack','no whiff cancel');
    }
    if(defense==='air')assert(f.halfslipCatapulted&&!f.grounded&&f.vy<0,'air catapult');
  }
});
halfslipCheck('Clone Volley lifts, volleys and slams its real victim, with one damage event and safe wall placement',()=>{
  for(const dir of [-1,1]) {
    const {f,opp}=halfslipSetup();f.x=dir<0?WALL_L+100:WALL_R-100;f.facing=dir;opp.x=f.x+50*dir;
    f.startAttack('grab');f.stateFrame=f.move.startup;resolveCombat(f,opp,g);
    for(const frame of [18,36,48,60,70,83]) {
      f.stateFrame=frame;f.throwCommitted=true;placeVictim(f,opp);
      assert(opp.hp===MAX_HP&&opp.x>=WALL_L+HALF_W&&opp.x<=WALL_R-HALF_W,'held inside arena, no extra damage');
      if(frame===36||frame===60)assert(opp.y===FLOOR-THROWS.halfslip.liftHeight,'actual lift');
      const views=halfslipHelperViews(f,frame,frame);assert(views.length===(frame>=56?3:2),'volley helpers');
      for(const v of views)assert(Number.isFinite(v.x)&&Number.isFinite(v.y)&&poseIsFinite(v.p),'finite helpers');
    }
    f.stateFrame=THROWS.halfslip.frames;updateThrow(f,opp,g);
    assert(opp.hp===MAX_HP-90&&opp.state==='hitstun'&&opp.y===FLOOR,'single slam release');
  }
});
halfslipCheck('Handle My Light Work spends ultimate, freezes its opener and creates exactly four independent clones while the original watches',()=>{
  const {f,opp}=halfslipSetup();f.ultimate=100;
  assert(activateDomain(f,g),'activate');step(DOMAIN.cutsceneFrames-1);assert(!halfslipClones(f).length,'opener frozen');step();
  assert(halfslipWatching(f)&&f.ultimate===0&&halfslipClones(f).length===4,'four clones');
  const before=opp.hp;step(100);assert(opp.hp<before&&f.state!=='attack','squad fights');
  f.x=opp.x-65;opp.startAttack('heavy');opp.stateFrame=opp.move.startup;resolveCombat(opp,f,g);
  assert(f.hp<MAX_HP&&halfslipWatching(f),'original remains vulnerable');
});
halfslipCheck('Domain clones split between both free-for-all enemies, retarget a knockout and respect the original leaving his domain',()=>{
  const {f}=halfslipSetup(0,true);f.ultimate=100;beginDomain(f.index,g,'halfslip');
  assert(halfslipClones(f).filter(c=>c.cloneTarget===1).length===2&&halfslipClones(f).filter(c=>c.cloneTarget===2).length===2,'two per opponent');
  p2.hp=0;p2.koed=true;g.onKO();assert(g.phase==='fight','first elimination');
  assert(halfslipClones(f).every(c=>halfslipTarget(f,c)===p3),'retarget living enemy');
  f.startAttack('light');assert(!g.domain&&!halfslipClones(f).length&&f.state==='attack','attack ends watch');
});
halfslipCheck('Clone lifetime, AI and domain clocks freeze during pause, hitstop and openers; expiry, KO and reset clear the squad',()=>{
  const {f,opp}=halfslipSetup();const c=spawnHalfslipClone(f,600,opp);const life=c.life,x=c.x;
  g.paused=true;tick();g.paused=false;g.hitstopLeft=4;tick();
  assert(c.life===life&&c.x===x,'pause and hitstop');g.hitstopLeft=0;
  opp.ultimate=100;activateDomain(opp,g);tick();assert(c.life===life,'opener freezes clone');
  g.domainSequence=null;beginDomain(f.index,g,'halfslip');const domainLife=g.domain.framesLeft;
  g.paused=true;tick();g.paused=false;assert(g.domain.framesLeft===domainLife,'domain pause');
  g.domain.framesLeft=1;updateDomain(g);assert(!g.domain&&!halfslipClones(f).length,'expiry');
  spawnHalfslipClone(f,600,opp);f.hp=0;f.koed=true;g.onKO();assert(!halfslipClones(f).length,'owner KO');
  halfslipSetup();spawnHalfslipClone(p1,600,p2);startRound();assert(!allHalfslipClones().length,'round reset');
});
halfslipCheck('Halfslip domain clashes use normal owner rules and CPUs keep watching instead of immediately dismissing their squad',()=>{
  const {f,opp}=halfslipSetup();f.ultimate=100;beginDomain(f.index,g,'halfslip');opp.ultimate=100;
  activateDomain(opp,g);assert(g.domainSequence.kind==='clash','normal clash');
  g.domainSequence.boundary=W/2-10;g.domainSequence.framesLeft=1;updateDomainSequence(g);
  assert(g.domain.type==='rip'&&!halfslipClones(f).length,'lost clash clears clones');
  halfslipSetup();p1.input=new CpuInput(0,5);beginDomain(0,g,'halfslip');step(120);
  assert(halfslipWatching(p1)&&p1.state!=='attack','CPU stays watching');
});
halfslipCheck('Siglarp copies summons and switches with independent clone ownership and borrows the four-clone domain safely',()=>{
  const pair=siglarpVs('halfslip'),{f,opp}=pair;spawnHalfslipClone(opp,900,f);siglarpObserve(opp,'special');
  tap(pair.special);step(45);assert(halfslipClones(f).length===1&&halfslipClones(opp).length===1,'independent copies');
  siglarpObserve(opp,'downSpecial');f.cooldowns.special=0;tap(pair.special);step(35);assert(f.halfslipSwitched,'copied switch');
  f.enter('idle');f.ultimate=100;siglarpLarp(pair);assert(f.stats.id==='halfslip','full identity');
  assert(useSiglarpUltimate(f,g),'borrowed ultimate');step(DOMAIN.cutsceneFrames);
  assert(g.domain.type==='halfslip'&&g.domain.owner===f.index&&halfslipClones(f).length===4,'borrowed squad');
  f.startAttack('light');assert(!g.domain&&!halfslipClones(f).length,'borrowed domain dismissal');
});
halfslipCheck('Every Halfslip action has finite helper animations and drawing helpers never change hitboxes, damage or clone count',()=>{
  const {f,opp}=halfslipSetup();const any=new Proxy(function(){},{get:(o,k)=>k===Symbol.toPrimitive?()=>0:any,apply:()=>any,set:()=>true});
  const states=['idle','walk','run','dash','backdash','slide','skid','rebound','jumpsquat','air','land','block','blockstun','parry',
    'roll','rollRecover','burst','hitstun','stagger','deflect','knockdown','ko','halfslipSummon','halfslipSwitch'];
  for(const state of states) {
    f.reset(500,1);f.enter(state);f.timer=20;f.landTime=4;f.parryDir='high';
    for(let frame=0;frame<30;frame+=.5) {
      f.stateFrame=frame;assert(poseIsFinite(animatedPose(f,frame,frame)),state);
      for(const h of halfslipHelperViews(f,frame,frame))assert(poseIsFinite(h.p)&&Number.isFinite(h.alpha),state+' helper');
      drawFighter(any,f,frame,STEP,g);
    }
  }
  for(const name of Object.keys(MOVES)) {
    f.reset(500,1);f.startAttack(name);const box=JSON.stringify(attackBox(f)),hp=opp.hp;
    for(let frame=0;frame<f.move.startup+f.move.active+f.move.recovery;frame+=.5) {
      f.stateFrame=frame;drawFighter(any,f,frame,STEP,g);
      for(const h of halfslipHelperViews(f,frame,frame))assert(poseIsFinite(h.p),name+' helper');
    }
    assert(JSON.stringify(attackBox(f))===box&&opp.hp===hp&&!halfslipClones(f).length,'helpers are visual '+name);
  }
});
halfslipCheck('Complete three-CPU matches with two Halfslips finish deterministically through summons, domains, eliminations and rematch',()=>{
  const outcomes=[];
  for(let run=0;run<2;run++) {
    startMatch(false,[4,4,5].map(level=>({type:'cpu',level})),['halfslip','rip','halfslip']);g.frame=0;
    for(let n=0;n<40000&&g.phase!=='matchOver';n++)tick();
    assert(g.phase==='matchOver','full match: '+g.phase+' '+fighters.map(f=>f.hp).join(','));
    outcomes.push(JSON.stringify({wins:g.wins,result:g.result,round:g.round,hp:fighters.map(f=>f.hp)}));
    startMatch(false,g.inputSources);assert(fighters.length===3&&fighters.filter(f=>f.stats.id==='halfslip').length===2&&!allHalfslipClones().length,'rematch resets all clones');
  }
  assert(outcomes[0]===outcomes[1],'deterministic match');
});
halfslipCheck('A clone delivering the final knockout stops remaining combat and projectiles on that tick',()=>{
  const {f,opp}=halfslipSetup();f.hp=10;opp.hp=1;
  const c=spawnHalfslipClone(f,opp.x-65,opp);c.startAttack('light');c.stateFrame=c.move.startup;
  spawnProjectile(g,{owner:opp.index,x:f.x,y:FLOOR-100,vx:0,facing:-1,framesLeft:30,kind:'wave',name:'crescent',
    box:{w:30,h:90},move:{...MOVES.light,dmg:1000},blockGuard:8});
  tick();assert(g.phase==='ko'&&opp.koed&&f.hp===10,'round stopped before lethal projectile');
  assert(g.projectiles[0].framesLeft===30,'remaining projectile simulation frozen');
});

