check('Every CPU tier activates every supported ultimate through real inputs in matches and practice',()=>{
  try {
    for(const practice of [false,true])for(const id of ROSTER)for(let level=1;level<=5;level++) {
      if(practice){practiceCpuMatch(level,id);p2.x=400;p1.x=950;}
      else cpuMatch(level,id);
      p2.ultimate=ULTIMATE_MAX;p2.input.random=()=>0;tick();
      if(p2.kit.ultimate==='none')assert(!g.domainSequence&&p2.ultimate===ULTIMATE_MAX,'unsupported ultimate stays absent');
      else assert(g.domainSequence&&p2.input.rawPressedAt.attack===0&&p2.input.rawPressedAt.special===0,`${id}/${level}/${practice}: actual domain chord`);
    }
  } finally {finishThreePlayerTest();}
});
check('CPU domains respect meter, hack, broken guard and unsafe states without spending resources',()=>{
  try {
    for(const lock of ['meter','hacked','guardBroken','hitstun','thrown','stagger']) {
      cpuMatch(5);p2.ultimate=lock==='meter'?99:100;p2.input.random=()=>0;
      if(lock==='hacked'||lock==='guardBroken')p2[lock]=60;
      if(['hitstun','thrown','stagger'].includes(lock)){p2.enter(lock);p2.hitstun=p2.timer=60;}
      p2.input.poll(0);tryDomains(g);
      assert(!g.domainSequence&&p2.ultimate===(lock==='meter'?99:100),lock);
      assert(!(p2.input.held.attack&&p2.input.held.special),'no illegal domain chord');
    }
  } finally {finishThreePlayerTest();}
});
check('Infinite practice resources do not restart a CPU domain or repeatedly play its opener',()=>{
  try {
    practiceCpuMatch(1,'rip');p2.x=400;p1.x=950;g.practice.infinite=true;
    p2.ultimate=100;p2.input.random=()=>0;tick();assert(g.domainSequence,'opener');
    step(DOMAIN.cutsceneFrames);const domain=g.domain;assert(domain?.owner===1,'CPU domain active');
    step(120);assert(g.domain===domain&&!g.domainSequence&&domain.framesLeft<DOMAIN.activeFrames,'same active domain');
    assert(p2.ultimate===100&&p2.input.nextDomain>=600,'infinite resources and attempt spacing');
  } finally {finishThreePlayerTest();}
});
check('CPUs mash in their own domain clash at their difficulty rate and remain frozen in other openers',()=>{
  try {
    for(const level of [1,5]) {
      cpuMatch(level);beginDomain(0,g);p2.ultimate=100;p2.input.random=()=>0;tick();
      assert(g.domainSequence?.kind==='clash','CPU challenges an enemy domain');
      const boundary=g.domainSequence.boundary,serial=p2.input.pressSerial.attack;
      step(36);assert(g.domainSequence.boundary<boundary&&p2.input.pressSerial.attack>serial,'clash button edges');
      g.domainSequence={kind:'cutscene',owner:0,type:'haze',framesLeft:60};
      p2.input.poll(g.frame);assert(BUTTONS.every(b=>!p2.input.held[b]),'cutscene stays frozen');
    }
  } finally {finishThreePlayerTest();}
});
check('The third CPU can start its own domain and only actual CPU clash participants mash',()=>{
  try {
    threePlayerSetup(['haze','rip','null'],[{type:'keyboard',layout:0},{type:'cpu',level:3},{type:'cpu',level:5}]);
    p3.ultimate=100;p3.input.random=()=>0;tick();assert(g.domainSequence?.owner===2,'third-slot domain');
    g.domainSequence=null;beginDomain(0,g);p2.ultimate=100;p2.input.random=()=>0;p2.input.nextDecision=0;
    tick();assert(g.domainSequence?.challenger===1,'second CPU challenges');
    const serial=p3.input.pressSerial.attack;step(36);assert(p3.input.pressSerial.attack===serial,'spectator does not mash');
  } finally {finishThreePlayerTest();}
});
check('CPU Siglarp uses the borrowed ultimate during Complete Larp without waiting for another meter',()=>{
  try {
    cpuMatch(5,'siglarp');p2.ultimate=100;p2.input.random=()=>0;tick();
    step(DOMAIN.cutsceneFrames-1);assert(p2.siglarpCopiedUltimate,'borrowed ultimate available');
    for(let n=0;n<100&&p2.siglarpCopiedUltimate;n++)step();
    assert(!p2.siglarpCopiedUltimate&&!p2.siglarpLarp&&p2.ultimate===0,'used free borrowed domain');
    assert(g.domainSequence?.type==='haze'||g.domain?.type==='haze','copied real opponent domain');
  } finally {finishThreePlayerTest();}
});
check('Practice CPU Halfslip keeps watching his domain instead of starting the corner combo route',()=>{
  try {
    practiceCpuMatch(5,'halfslip');beginDomain(1,g);p2.input.random=()=>0;
    step(120);assert(halfslipWatching(p2)&&!p2.input.comboRoute,'lets the squad fight');
  } finally {finishThreePlayerTest();}
});
