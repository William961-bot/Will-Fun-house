function wolfVs(gap=250){versus('wolf','rip',gap);g.popups=[];}
function wolfSuper(gap=70,index=0,facing=1){
 setup();const f=fighters[index],v=fighters[1-index];f.setCharacter('wolf');v.setCharacter('rip');f.reset(600,facing);v.reset(600+gap*facing,-facing);f.ultimate=100;
 assert(activateDomain(f,g),'activate');step(WOLF.superWindup);assert(f.moveName==='deathblow'&&!g.domainSequence,'opener');return {f,v};
}
function confirmWolfSuper(f,v){f.stateFrame=f.move.startup;const pt=hitPoint(f,v);assert(pt,'contact');applyHit(f,v,pt,g);assert(g.domainSequence?.kind==='wolfFinisher','cinematic');}
check('Wolf uses original Sekiro model parts and recovered motions in every slot and direction',()=>{
 assert(ROSTER.length===19&&ROSTER.at(-1)==='wolf','roster');assert(WOLF_ATLAS.frames>500&&WOLF_ATLAS.clips.finisher.source==='a200_510000','source');
 for(const index of [0,1])for(const facing of [-1,1]){
  setup();const f=fighters[index];f.setCharacter('wolf',index===1);f.reset(600,facing);assert(f.kit.drawSprite&&f.maxHp===MAX_HP,'sprite');
  for(const name of Object.keys(MOVES)){f.startAttack(name);for(const frame of [0,f.move.startup,40])assert(poseIsFinite(attackAnim(f,frame)),'pose '+name);}
 }
});
check('Wolf appearance uses the full body rig, base skin, source cutouts and enough hair transparency depth',()=>{
 assert(WOLF_ATLAS.decodedBones===146&&WOLF_ATLAS.size>=320,'full rig and detailed frames');
 const face=WOLF_ATLAS.materialBindings['P_FC_M_0100_Head_[AO_SSS].mtd'];
 assert(face.albedo==='FC_M_0100_head_a'&&face.alphaMode==='NONE','skin instead of damage, opaque data alpha');
 assert(WOLF_ATLAS.materialBindings['P_FC_M_0100_beard_e_Decal.mtd'].alphaMode==='STRAIGHT','beard alpha');
 assert(WOLF_ATLAS.materialBindings['P_BD_M_9000_body.mtd'].albedo==='FC_A_0000_Hand_a','shared skin texture');
 assert(WOLF_ATLAS.renderSettings.transparentBounces>=64,'avoid opaque hair-card artifacts');
});
check('Shuriken fires once, cancels on interruption, works airborne and respects defenses',()=>{
 for(const air of [false,true]){
  wolfVs(450);if(air){p1.y-=100;p1.enter('air');}tap('KeyT');assert(p1.state==='wolfShuriken'&&p1.cooldowns.special===100,'input');
  step(air?WOLF.airShurikenAt:WOLF.shurikenAt);assert(g.projectiles.length===1&&g.projectiles[0].kind==='wolfShuriken','one tool');step(3);assert(g.projectiles.length===1,'no duplicate');
 }
 wolfVs();tap('KeyT');p1.enter('hitstun');p1.hitstun=30;step(20);assert(!g.projectiles.length,'interrupted');
 for(const defense of ['hit','block','parry']){
  wolfVs(170);tap('KeyT');step(WOLF.shurikenAt);const p=g.projectiles[0];p.x=p2.x-14;
  if(defense==='block')p2.enter('block');if(defense==='parry')p2.startParry();
  const guard=p2.guard;updateProjectiles(g);assert(p2.hp===MAX_HP-(defense==='hit'?40:0),'defense '+defense);
  assert(defense==='block'?p2.guard<guard:p2.guard===guard,'guard only on block');updateProjectiles(g);assert(p2.combo<=1,'one hit');
 }
});
check('Mikiri rewards a timed frontal grounded strike and loses to early, late, rear, low, overhead, grab and projectile attacks',()=>{
 for(const scenario of ['success','heavy','early','late','rear','air','low','overhead','grab','projectile']){
  wolfVs(70);const f=p1,att=p2;f.facing=1;f.kit.downSpecial(f);f.stateFrame=scenario==='early'?2:scenario==='late'?11:5;
  att.startAttack(scenario==='low'?'low':scenario==='overhead'?'overhead':scenario==='grab'?'grab':scenario==='heavy'?'heavy':'light');
  if(scenario==='rear'){att.x=f.x-60;}if(scenario==='air'){att.y-=40;att.move={...att.move,air:true};}
  const proxy=scenario==='projectile'?projectileAttacker({owner:1,x:att.x,y:att.y,facing:-1,move:att.move,name:'test'}):att;
  const guard=f.guard,allowed=['success','heavy'].includes(scenario);assert(f.kit.avoid(f,proxy.move,g,proxy)===allowed,scenario);
  assert(f.guard===guard&&f.hp===MAX_HP,'no guard drain');if(allowed){assert(att.hp===MAX_HP&&f.state==='wolfMikiriHit','captured, no early damage');f.stateFrame=16;f.kit.update(f,att,g);assert(att.hp===MAX_HP-75,'source contact');}
 }
 wolfVs();press('KeyS');tap('KeyT');release('KeyS');assert(p1.cooldowns.downSpecial===240,'cooldown');step(WOLF.counterFrames+5);assert(p1.state==='idle','miss recovers');
});
check('Firecrackers are a single blockable/parryable close stun with punishable recovery',()=>{
 for(const defense of ['hit','block','parry']){
  wolfVs(100);press('KeyW');tap('KeyT');release('KeyW');assert(p1.moveName==='firecrackers'&&p1.cooldowns.upSpecial===300,'directional input');
  p1.stateFrame=p1.move.startup;if(defense==='block')p2.enter('block');if(defense==='parry')p2.startParry();
  const pt=hitPoint(p1,p2);assert(pt,'range');applyHit(p1,p2,pt,g);assert(p2.hp===MAX_HP-(defense==='hit'?30:0),'defense '+defense);
  assert(!hitPoint(p1,p2),'once');
 }
 wolfVs(400);p1.kit.upSpecial(p1);step(20);tap('KeyF');assert(p1.state==='attack'&&p1.moveName==='firecrackers','cannot cancel miss');
});
check('Deathblow holds the recovered timeline and lands one scaled hit in both directions and slots',()=>{
 for(const index of [0,1])for(const facing of [-1,1]){
  const {f,v}=wolfSuper(70,index,facing);confirmWolfSuper(f,v);assert(v.hp===MAX_HP&&v.comboHeld,'no starter damage');
  step(WOLF.finisherFrames-1);assert(v.hp===MAX_HP,'held');step();assert(!g.domainSequence&&!v.comboHeld&&v.hp===MAX_HP-350&&v.combo===1,'one hit');assert(f.state==='deflect'&&f.ultimate===0,'recovery');
 }
 const {f,v}=wolfSuper();v.combo=3;v.comboAttacker=f.index;confirmWolfSuper(f,v);step(WOLF.finisherFrames);assert(v.hp===MAX_HP-Math.round(350*COMBO_SCALE[3]),'scaling');
});
check('Deathblow has counterplay, grounded/meter gates, and full-meter keyboard chord',()=>{
 for(const index of [0,1])for(const defense of ['block','parry','trade']){
  const {f,v}=wolfSuper(60,index);f.stateFrame=f.move.startup;
  if(defense==='block')v.enter('block');if(defense==='parry')v.startParry();
  if(defense==='trade'){v.startAttack('light');v.stateFrame=v.move.startup;resolveCombat(f,v,g);assert(f.hp<MAX_HP,'interrupt');}else applyHit(f,v,hitPoint(f,v),g);
  assert(!g.domainSequence&&v.hp===MAX_HP,'defense '+defense);
 }
 const {f,v}=wolfSuper(500);step(60);assert(!g.domainSequence&&v.hp===MAX_HP&&f.ultimate===0,'miss');
 wolfVs();p1.ultimate=100;p1.y-=40;assert(!activateDomain(p1,g)&&p1.ultimate===100,'air gate');
 wolfVs();p1.ultimate=99;assert(!activateDomain(p1,g),'meter gate');p1.ultimate=100;press('KeyF');tap('KeyT');release('KeyF');assert(g.domainSequence?.kind==='wolfWindup','human chord');
});
check('Deathblow freezes spectators and timers, honors pause and hitstop, and resets/KO/practice safely',()=>{
 try{
  threePlayerSetup(['rip','null','wolf']);p3.reset(650,-1);p1.reset(1100,-1);p2.reset(570,1);p3.ultimate=100;activateDomain(p3,g);step(WOLF.superWindup);confirmWolfSuper(p3,p2);
  const snapshot=()=>JSON.stringify([g.domainSequence.frame,p1.x,p2.hp,p3.cooldowns.special]);const before=snapshot();g.paused=true;tick();assert(snapshot()===before,'pause');g.paused=false;g.hitstopLeft=2;tick();assert(snapshot()===before,'hitstop');
  step(WOLF.finisherFrames);assert(p2.hp===MAX_HP-350&&p1.hp===MAX_HP&&p1.x===1100,'actual target');
 }finally{finishThreePlayerTest();}
 let pair=wolfSuper();pair.v.hp=300;confirmWolfSuper(pair.f,pair.v);step(WOLF.finisherFrames);assert(pair.v.koed&&g.phase==='ko','KO');
 pair=wolfSuper();g.practice={mode:1,cpuLevel:0,cpuBestCombo:0,hits:[],boxes:false,infinite:false,lastEvent:null};pair.v.hp=300;confirmWolfSuper(pair.f,pair.v);step(WOLF.finisherFrames);assert(pair.v.hp===MAX_HP&&!pair.v.koed,'practice');
 pair=wolfSuper();confirmWolfSuper(pair.f,pair.v);step(20);startRound();assert(!g.domainSequence&&!pair.v.comboHeld,'reset');
});
check('Wolf grab remains escapable and deals standard grab damage; CPUs and Siglarp can use his kit',()=>{
 let pair=beginEscapeThrow('wolf');tap(pair.key);assert(pair.def.hp===MAX_HP&&pair.def.state==='deflect','escape');
 pair=beginEscapeThrow('wolf');stepUntil(()=>pair.att.state==='throwRecover',200);assert(pair.def.hp===MAX_HP-90,'throw damage');
 const copy=siglarpVs('wolf',0,1,650);siglarpObserve(copy.opp,'special');tap(copy.special);assert(copy.f.state==='wolfShuriken','copy');step(WOLF.shurikenAt);assert(g.projectiles.some(p=>p.kind==='wolfShuriken'),'copied projectile');
 wolfVs(70);p1.input=new CpuInput(0,5);p1.ultimate=100;p1.input.random=()=>0;assert(p1.input.domainChoice(g.frame)?.attack,'CPU requests ultimate');
});
check('Wolf receives the real controller chord and Mikiri resolves through shared combat without draining guard',()=>{
 const old=navigator.getGamepads,pad=testPad(2,'Wolf controller');
 try{
  wolfVs(70);navigator.getGamepads=()=>[null,null,pad];p1.input=new PlayerInput(0,{type:'pad',slot:2,id:pad.id});p1.ultimate=100;
  pad.buttons[2].pressed=pad.buttons[5].pressed=true;step();assert(g.domainSequence?.kind==='wolfWindup','X + RB');
 }finally{navigator.getGamepads=old;setup();}
 wolfVs(65);p1.kit.downSpecial(p1);p1.stateFrame=5;p2.startAttack('heavy');p2.stateFrame=p2.move.startup;
 const pt=hitPoint(p2,p1);assert(pt,'heavy in range');applyHit(p2,p1,pt,g);
 assert(p1.state==='wolfMikiriHit'&&p1.hp===MAX_HP&&p1.guard===GUARD.max&&p2.hp===MAX_HP,'shared counter capture');
 p1.stateFrame=16;p1.kit.update(p1,p2,g);assert(p2.hp===MAX_HP-75,'source counter contact');
});
check('Wolf plays verified tool, counter and locomotion clips at source time with native attack markers',()=>{
 const expected={walk:'a000_000200',run:'a000_000500',shuriken:'a070_400000',firecrackers:'a071_400000',mikiri:'a200_511100',hit:'a000_100102'};
 for(const [key,id] of Object.entries(expected))assert(WOLF_ATLAS.clips[key].source===id,'source '+key);
 wolfVs(500);p1.kit.special(p1);p1.stateFrame=30;let m=wolfMotion(p1);assert(m.key==='shuriken'&&Math.abs(m.progress-30/114)<.001,'source seconds');
 p1.kit.upSpecial(p1);p1.stateFrame=30;m=wolfMotion(p1);assert(m.key==='firecrackers'&&p1.move.startup===66&&p1.move.startup+p1.move.active+p1.move.recovery===152,'firecracker timeline');
 for(const [name,start,frames] of [['light',46,130],['medium',46,130],['heavy',26,116],['air',8,58]]){
  p1.startAttack(name);assert(p1.move.startup===start&&p1.move.startup+p1.move.active+p1.move.recovery===frames,'normal '+name);
 }
 p1.enter('walk');p1.vx=4;p1.animationFrame=60;m=wolfMotion(p1);assert(m.key==='walk'&&Math.abs(m.progress-.375)<.001,'native walk loop');
});
check('Mikiri delays damage to frame 16, hits once, and cleans pending contact on Burst, interruption and reset',()=>{
 for(const cancel of ['none','burst','interrupt','reset']){
  wolfVs(65);p1.kit.downSpecial(p1);p1.stateFrame=5;p2.startAttack('light');p2.stateFrame=p2.move.startup;applyHit(p2,p1,hitPoint(p2,p1),g);
  assert(p2.hp===MAX_HP&&p1.wolfCounterTarget===1,'pending');
  if(cancel==='burst')p2.enter('burst');
  if(cancel==='interrupt'){p1.enter('hitstun');p1.hitstun=20;}
  if(cancel==='reset'){startRound();assert(p1.wolfCounterTarget==null&&p2.wolfCounterHeldBy==null,'reset');continue;}
  p1.stateFrame=15;p1.kit.update(p1,p2,g);assert(p2.hp===MAX_HP,'before marker');
  p1.stateFrame=16;p1.kit.update(p1,p2,g);p1.kit.update(p1,p2,g);
  assert(p2.hp===MAX_HP-(cancel==='none'?75:0),'one marker or cancelled '+cancel);
 }
});
