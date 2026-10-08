function practiceCpuMatch(level=5,id='haze',facing=1) {
  setup();startMatch(true,undefined,['rip',id]);setPracticeOpponent(level);g.frame=0;
  p2.reset(facing>0?1000:280,facing);p1.reset(p2.x+facing*60,-facing);
}
function runPracticeCombo(id='haze',facing=1) {
  practiceCpuMatch(5,id,facing);
  let peak=0,bounce=false;const moves=[];
  for(let frame=0;frame<500&&peak<10;frame++) {
    tick();peak=Math.max(peak,p1.combo);bounce ||= p1.wallBounced;
    if(p2.state==='attack'&&p2.stateFrame===0&&!g.hitstopLeft)moves.push(p2.moveName);
  }
  assert(peak===10,`${id}/${facing}: peak ${peak}, ${moves.join(',')}; ${p2.state}/${p2.moveName}, victim ${p1.state}, gap ${Math.round(p1.x-p2.x)}`);
  assert(bounce&&!p1.comboCapped&&p1.hp<MAX_HP&&p1.guard===100,'real damaging ten-hit juggle and wall bounce');
  return moves;
}
check('Practice CPU 5 completes ten real hits with every fighter toward either wall',()=>{
  for(const id of ROSTER)for(const facing of [-1,1])runPracticeCombo(id,facing);
});
check('Practice CPU levels 1–4 attack normally with every fighter',()=>{
  for(const id of ROSTER)for(let level=1;level<=4;level++) {
    practiceCpuMatch(level,id);let damaged=false;
    for(let frame=0;frame<1200&&!damaged;frame++){tick();damaged=p1.hp<MAX_HP;}
    assert(damaged,`${id}/${level} attacks`);
    assert(p2.input.level===level&&!p2.input.comboRoute&&g.practice&&g.phase==='fight','normal tier in practice');
  }
});
check('Practice CPU combo stops on block, parry and Burst through real defensive inputs',()=>{
  practiceCpuMatch();press('KeyR');
  for(let frame=0;frame<35;frame++)tick();release('KeyR');
  assert(!p2.input.comboRoute&&p1.combo===0,'block prevents route');
  practiceCpuMatch();tick();tick();tick();press('KeyG');tick();release('KeyG');
  for(let frame=0;frame<20;frame++)tick();
  assert(p2.state==='stagger'&&!p2.input.comboRoute&&p1.hp===MAX_HP,`perfect parry interrupts: ${p2.state}/${p1.state}/${p1.hp}, route ${JSON.stringify(p2.input.comboRoute)}`);
  practiceCpuMatch();
  for(let frame=0;frame<40&&p1.combo<1;frame++)tick();
  assert(p1.combo===1,'first actual hit');press('KeyR');press('KeyG');
  for(let frame=0;frame<20;frame++)tick();release('KeyR');release('KeyG');
  assert(!p2.input.comboRoute&&p1.combo===0&&p1.burstMeter<BURST.rechargeFrames,'burst escapes');
});
check('Practice CPU selection resets combat, keeps practice options and returns to dummy modes',()=>{
  practiceCpuMatch();g.practice.boxes=g.practice.infinite=true;
  p1.hp=123;p2.input.comboRoute={stage:7};g.projectiles.push({owner:1});
  press('KeyC');release('KeyC');
  assert(p2.input instanceof PracticeInput&&g.practice.cpuLevel===0&&p1.hp===MAX_HP&&g.projectiles.length===0,'cycle 5 to dummy resets');
  assert(g.practice.boxes&&g.practice.infinite,'options kept');
  for(let level=1;level<=5;level++){press('KeyC');release('KeyC');assert(p2.input instanceof PracticeCpuInput&&p2.input.level===level,'cycle '+level);}
  press('Digit8');release('Digit8');tick();
  assert(p2.input instanceof PracticeInput&&g.practice.cpuLevel===0&&g.practice.mode===8&&p2.input.held.block,'original blocking dummy');
});
check('Practice CPU 5 earns ten hits with infinite resources without replacing attacks with an ultimate',()=>{
  practiceCpuMatch(5,'null');g.practice.infinite=true;let peak=0;
  for(let frame=0;frame<500&&peak<10;frame++){tick();peak=Math.max(peak,p1.combo);}
  assert(peak===10&&p2.ultimate===ULTIMATE_MAX&&!g.domainSequence,'full meter preserves combo inputs');
});
check('Practice CPU combo decisions freeze during pause, hit-stop and cinematic sequences',()=>{
  practiceCpuMatch();tick();const input=p2.input;
  for(const lock of ['pause','hitstop','cinematic']) {
    g.paused=lock==='pause';g.hitstopLeft=lock==='hitstop'?3:0;g.domainSequence=lock==='cinematic'?{kind:'montageOpener'}:null;
    const snapshot=JSON.stringify({route:input.comboRoute,seed:input.seed,next:input.nextCombo});input.poll(g.frame+10);
    assert(snapshot===JSON.stringify({route:input.comboRoute,seed:input.seed,next:input.nextCombo})&&BUTTONS.every(b=>!input.held[b]),lock);
  }
  g.paused=false;g.hitstopLeft=0;g.domainSequence=null;setup();
});
