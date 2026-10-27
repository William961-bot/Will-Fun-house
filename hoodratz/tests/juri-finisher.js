function juriSuper(gap=75,index=0,facing=1){
  setup();const f=fighters[index],v=fighters[1-index];f.setCharacter('juri');v.setCharacter('rip');
  f.reset(600,facing);v.reset(600+gap*facing,-facing);f.ultimate=100;
  assert(activateDomain(f,g),'super activation');step(JURI.superWindup);
  assert(f.moveName==='fuhazan'&&!g.domainSequence,'opening strike');return {f,v};
}
function confirmJuriSuper(f,v){
  f.stateFrame=f.move.startup;const pt=hitPoint(f,v);assert(pt,'kick contact');applyHit(f,v,pt,g);
  assert(g.domainSequence?.kind==='juriFinisher','cinematic on hit');
}
check('Juri replaces the install with a full-meter human chord, grounded gates and a vulnerable opening kick',()=>{
  for(const lock of ['meter','hacked','guardBroken','air']){
    juriVs();p1.ultimate=lock==='meter'?99:100;if(lock==='air'){p1.y-=100;p1.enter('air');}else if(lock!=='meter')p1[lock]=30;
    const meter=p1.ultimate;assert(!activateDomain(p1,g)&&p1.ultimate===meter&&!g.domainSequence,'gate '+lock);
  }
  juriVs();p1.ultimate=100;press('KeyF');tap('KeyT');release('KeyF');
  assert(g.domainSequence?.kind==='juriWindup'&&p1.ultimate===0&&!g.domain,'human chord');
  step(JURI.superWindup);assert(p1.moveName==='fuhazan'&&!p1.invincible,'vulnerable strike');
  assert(p1.juriFuha===0&&p1.kit.moveFor===undefined&&p1.kit.speedScale===undefined,'no install bonuses');
});
check('Sakkai Fuhazan holds for its recovered timeline and releases one 350-base-damage scaled hit',()=>{
  for(const index of [0,1])for(const facing of [-1,1]){
    const {f,v}=juriSuper(75,index,facing);confirmJuriSuper(f,v);
    assert(v.hp===MAX_HP&&v.combo===0&&v.comboHeld,'no starter or visual-beat damage');
    step(JURI.finisherFrames-1);assert(v.hp===MAX_HP&&g.domainSequence,'held through last pre-impact frame');
    step();assert(!g.domainSequence&&!v.comboHeld&&v.hp===MAX_HP-350&&v.combo===1,'single impact');
    assert(f.ultimate===0&&f.state==='deflect','spent meter and ending recovery');
    step(12);assert(v.hp===MAX_HP-350,'no duplicate hit');
  }
  const {f,v}=juriSuper();v.combo=3;v.comboAttacker=f.index;v.enter('hitstun');v.hitstun=60;
  confirmJuriSuper(f,v);step(JURI.finisherFrames);
  assert(v.hp===MAX_HP-Math.round(350*COMBO_SCALE[3])&&v.combo===4,'shared combo scaling');
});
check('Blocking, parrying, invincibility, misses and simultaneous strikes stop the finisher fairly in either slot',()=>{
  for(const index of [0,1])for(const defense of ['block','parry','invincible','trade']){
    const {f,v}=juriSuper(60,index);f.stateFrame=f.move.startup;
    if(defense==='block')v.enter('block');
    if(defense==='parry')v.startParry();
    if(defense==='invincible'){v.enter('burst');assert(!hitPoint(f,v),'invincibility');continue;}
    if(defense==='trade'){v.startAttack('light');v.stateFrame=v.move.startup;resolveCombat(f,v,g);assert(f.hp<MAX_HP&&f.state==='hitstun','strike wins');}
    else applyHit(f,v,hitPoint(f,v),g);
    assert(!g.domainSequence&&v.hp===MAX_HP&&f.ultimate===(defense==='trade'?METER_GAIN.takenHit:0),'counterplay '+defense+'/'+index);
  }
  const {f,v}=juriSuper(500);step(60);assert(!g.domainSequence&&v.hp===MAX_HP&&f.ultimate===0,'miss spends meter');
});
check('Finisher pause, hitstop and three-player target locking freeze the actual victim and spectator',()=>{
  try{
    threePlayerSetup(['rip','null','juri']);p3.reset(650,-1);p1.reset(1100,-1);p2.reset(570,1);p3.ultimate=100;
    beginDomain(0,g,'rip');const arena=g.domain;p3.ultimate=100;assert(activateDomain(p3,g),'inside another arena');step(JURI.superWindup);
    confirmJuriSuper(p3,p2);assert(g.domainSequence.target===1&&p3.throwTarget===1,'actual third-slot victim');
    const frozen=()=>JSON.stringify([g.domainSequence.frame,g.domainSequence.framesLeft,p1.x,p1.hp,p2.x,p2.hp,p3.cooldowns.special,arena.framesLeft]);
    const before=frozen();g.paused=true;tick();assert(frozen()===before,'pause');g.paused=false;g.hitstopLeft=2;tick();assert(frozen()===before,'hitstop');
    step(JURI.finisherFrames);assert(p2.hp===MAX_HP-350&&p1.hp===MAX_HP&&p1.x===1100,'only caught enemy damaged');
    assert(g.domain===arena,'existing arena resumes without clash');
    startRound();assert(!g.domainSequence&&fighters.every(f=>!f.comboHeld),'reset');
  }finally{finishThreePlayerTest();}
});
check('Finisher can KO, practice refills correctly, and a round reset cancels a pending cinematic cleanly',()=>{
  let pair=juriSuper();pair.v.hp=300;confirmJuriSuper(pair.f,pair.v);step(JURI.finisherFrames);
  assert(pair.v.koed&&pair.v.hp===0&&g.phase==='ko','KO');
  pair=juriSuper();g.practice={mode:1,cpuLevel:0,cpuBestCombo:0,hits:[],boxes:false,infinite:false,lastEvent:null};pair.v.hp=300;confirmJuriSuper(pair.f,pair.v);step(JURI.finisherFrames);
  assert(pair.v.hp===pair.v.maxHp&&!pair.v.koed&&g.phase==='fight','practice refill');
  pair=juriSuper();confirmJuriSuper(pair.f,pair.v);step(35);startRound();
  assert(!g.domainSequence&&!pair.v.comboHeld&&pair.v.hp===pair.v.maxHp,'mid-cutscene reset');
});
check('Controller input and Siglarp borrowed ultimate use the cinematic rather than a Juri arena',()=>{
  const old=navigator.getGamepads,pad=testPad(2,'Juri finisher pad');
  try{
    juriVs(80);navigator.getGamepads=()=>[null,null,pad];p1.input=new PlayerInput(0,{type:'pad',slot:2,id:pad.id});p1.ultimate=100;
    pad.buttons[2].pressed=pad.buttons[5].pressed=true;step();pad.buttons[2].pressed=pad.buttons[5].pressed=false;
    assert(g.domainSequence?.kind==='juriWindup','controller X + RB');
  }finally{navigator.getGamepads=old;setup();}
  const {f,opp}=siglarpVs('juri',0,1,75);beginDomain(f.index,g,'siglarp');
  assert(f.siglarpLarp&&f.siglarpCopiedUltimate,'borrowed super');assert(useSiglarpUltimate(f,g),'use borrowed');
  step(JURI.superWindup);assert(f.moveName==='fuhazan'&&f.siglarpUltimateId==='juri','kept during opening');
  confirmJuriSuper(f,opp);step(JURI.finisherFrames);assert(opp.hp===MAX_HP-350&&f.stats.id==='siglarp','copied release and identity');
});
