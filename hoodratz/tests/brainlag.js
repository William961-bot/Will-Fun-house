// Brainlag: fakes, Lag Spike, Decoy Body, Sawed in Half, Possession and Complete Hypnosis.
// Uses helpers from milestone5.js, character-select.js, animation.js, grabs.js and lancer.js.
function brainlagVs(opponent = 'rip', gap = 60) {
  rosterVs('brainlag', opponent); p1.reset(600, 1); p2.reset(600 + gap, -1);
}
function hypnosis(owner = 0) {
  fighters[owner].ultimate = 0; beginDomain(owner, g, 'brainlag');
  step();   // the next tick turns the opponent around
}
check('Brainlag joins the roster with his own guard, run, medium, low medium and grab reach poses',()=>{
  assert(ROSTER.length===13&&ROSTER.at(-1)==='brainlag'&&CHARACTERS.brainlag.home.label,'roster');
  pickCharacters(['brainlag','brainlag']);assert(p1.kit===BRAINLAG_ABILITIES&&p2.stats.color===CHARACTERS.brainlag.altColor,'mirror colours');
  assert(CHARACTER_GUARDS.brainlag&&GUARD_RECOIL.brainlag&&CHARACTER_RUNS.brainlag,'per-character tables');
  for(const name of ['light','low','overhead','medium','lowMedium','heavy','grab','air','airMedium','airHeavy']) {
    brainlagVs();if(['air','airMedium','airHeavy'].includes(name)){p1.y=FLOOR-80;p1.vy=-2;}
    p1.startAttack(name);
    for(let f=0;f<=p1.move.startup+p1.move.active+p1.move.recovery;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),`${name} ${f}`);}
  }
});
check('Fakes: Block + attack looks like the real move, has no hitbox or rewards, half recovery, and chains into a real hit',()=>{
  for(const name of ['light','low','overhead','medium','lowMedium','heavy']) {
    brainlagVs();press('KeyR');step();p1.startAttack(name);release('KeyR');
    const real=MOVES[name];
    assert(p1.fake&&p1.move.startup===real.startup&&p1.move.active===real.active&&p1.move.unblockable===real.unblockable,'same move '+name);
    near(p1.move.recovery,Math.max(1,Math.round(real.recovery*BRAINLAG.fakeRecovery)));
    p1.stateFrame=p1.move.startup;assert(!hitPoint(p1,p2),'no hitbox '+name);
    brainlagVs();p1.startAttack(name);p1.stateFrame=p1.move.startup;assert(!p1.fake&&hitPoint(p1,p2),'real hits '+name);
  }
  // Played through with keys: nothing lands, then a real Medium in the chain window does.
  brainlagVs();press('KeyR');step();press('KeyF');step();release('KeyF');release('KeyR');
  assert(p1.state==='attack'&&p1.moveName==='light'&&p1.fake,'fake light');
  stepUntil(()=>p1.stateFrame>=p1.move.startup+p1.move.active,30);
  assert(p2.hp===MAX_HP&&p2.guard===100&&p1.ultimate===0&&p2.ultimate===0&&p2.state!=='hitstun','no rewards');
  assert(p1.moveHit,'chain window open');
  press('KeyV');step();release('KeyV');assert(p1.moveName==='medium'&&!p1.fake,'real follow-up');
  stepUntil(()=>p2.hp<MAX_HP,20);
  assert(g.popups.some(p=>p.text==='FAKE'),'FAKE shows afterwards');
  // A fake heavy still uses the heavy cooldown.
  brainlagVs();press('KeyR');step();press('KeyH');step();release('KeyH');release('KeyR');
  assert(p1.moveName==='heavy'&&p1.fake&&p1.cooldowns.heavy>=MOVE.heavyCooldown-1,'heavy cooldown');
});
check('Parrying a fake finds nothing; blocking one costs no guard; a CPU reacts to a fake like a real attack',()=>{
  brainlagVs();press('KeyR');step();p1.startAttack('light');release('KeyR');p2.startParry('high');
  stepUntil(()=>p2.state==='parryRecover',30);near(p2.hp,MAX_HP);
  brainlagVs();press('Quote');step();press('KeyR');step();p1.startAttack('light');release('KeyR');
  step(p1.move.startup+p1.move.active+2);release('Quote');near(p2.guard,100);near(p2.hp,MAX_HP);
  startMatch(false,[{type:'keyboard',layout:0},{type:'cpu',level:5}],['brainlag','haze']);g.phase='fight';g.inputLocked=false;keysDown.clear();
  p1.reset(600,1);p2.reset(660,-1);p2.input.random=()=>0;
  p1.startAttack('light');p1.fake=true;p2.input.poll(1);p2.input.poll(3);
  assert(p2.input.held.parry||p2.input.held.block,'CPU defends against the fake');
});
check('Lag Spike: he is drawn 18 ticks late for 2.5 s while hits use his real body; the CPU reads the late image',()=>{
  brainlagVs('rip',300);ability();assert(p1.state==='lagSnap'&&p1.cooldowns.special===BRAINLAG.lagCooldown,'snap');
  step(BRAINLAG.lagStartup);near(p1.lagLeft,BRAINLAG.lagFrames-1);   // the world tick already counted one
  stepUntil(()=>p1.state==='idle',20);press('KeyD');
  const positions=[];for(let i=0;i<30;i++){step();positions.push(p1.x);}
  release('KeyD');
  near(brainlagSeen(p1).x,positions[positions.length-1-BRAINLAG.lagDelay]);assert(brainlagSeen(p1).x<p1.x,'image trails');
  p2.x=p1.x+60;p2.startAttack('light');p2.stateFrame=p2.move.startup;assert(hitPoint(p2,p1),'real body is hittable');
  p2.input=new CpuInput(1,5);p2.input.poll(g.frame);near(p2.input.lastSeenNullX,brainlagSeen(p1).x);
  brainlagVs();ability();step(BRAINLAG.lagStartup);step(BRAINLAG.lagFrames);near(p1.lagLeft,0);
  brainlagVs();ability();step(BRAINLAG.lagStartup);incoming('grab');assert(p1.state==='thrown','grabbed');step();near(p1.lagLeft,0);
  brainlagVs();ability();step(BRAINLAG.lagStartup);startRound();near(p1.lagLeft,0);
});
check('Decoy Body: he vanishes, the decoy mirrors his moves; hitting it dazes the attacker; attacks and hits reveal him',()=>{
  brainlagVs('rip',300);ability('downSpecial');assert(p1.state==='decoyVanish'&&p1.cooldowns.downSpecial===BRAINLAG.decoyCooldown,'cast');
  step(BRAINLAG.decoyStartup);const anchor=p1.blDecoy.anchor;assert(decoyHidden(p1),'hidden');
  stepUntil(()=>p1.state==='idle',10);press('KeyA');step(15);release('KeyA');
  near(decoyX(p1),clampArena(2*anchor-p1.x));assert(decoyX(p1)>anchor&&p1.x<anchor,'they drift apart');
  near(brainlagSeen(p1).x,decoyX(p1));
  p2.x=decoyX(p1)+60;p2.startAttack('light');p2.stateFrame=p2.move.startup;resolveCombat(p1,p2,g);
  assert(!p1.blDecoy&&p2.state==='stagger'&&p2.timer===BRAINLAG.decoyDaze&&p1.hp===MAX_HP&&p2.ultimate===0,'decoy dazes');
  brainlagVs('rip',300);ability('downSpecial');step(BRAINLAG.decoyStartup+4);p1.startAttack('light');step();
  assert(p1.blDecoy?.revealing>0,'attacking reveals');step(BRAINLAG.decoyReveal+1);assert(!p1.blDecoy,'fully revealed');
  brainlagVs('rip',300);ability('downSpecial');step(BRAINLAG.decoyStartup+4);incoming('light');step();assert(!p1.blDecoy,'a hit pops it');
  brainlagVs('rip',300);ability('downSpecial');step(BRAINLAG.decoyStartup+BRAINLAG.decoyFrames+1);assert(!p1.blDecoy,'expires');
});
check('Sawed in Half: strikes on frames 2-18 pass through and are countered for 70; grabs beat it; a whiff is open',()=>{
  for(const name of ['light','low','heavy']) {
    brainlagVs();ability('upSpecial');p1.stateFrame=BRAINLAG.sawFrom;incoming(name);
    assert(p1.hp===MAX_HP&&p1.state==='sawStance'&&p1.sawTriggered,'passes through '+name);
    p2.enter('idle');p2.x=p1.x+60;step();assert(p1.state==='sawSplit','split');
    stepUntil(()=>p1.moveName==='tadaPalm',BRAINLAG.sawSplit+2);stepUntil(()=>p2.hp<MAX_HP,12);
    near(p2.hp,MAX_HP-Math.round(BRAINLAG.sawDamage*CHARACTERS.brainlag.dmg));assert(p2.passOut||p2.state==='knockdown','knockdown');
  }
  brainlagVs();ability('upSpecial');p1.stateFrame=5;incoming('grab');assert(p1.state==='thrown','grab beats it');
  brainlagVs();ability('upSpecial');p1.stateFrame=BRAINLAG.sawThrough+1;incoming('light');assert(p1.state==='hitstun','window ends');
  brainlagVs();ability('upSpecial');near(p1.cooldowns.upSpecial,BRAINLAG.sawCooldown);
  step(BRAINLAG.sawThrough+BRAINLAG.sawWhiff-2);assert(p1.state==='sawStance','open after a whiff');step(2);assert(p1.state==='idle','recovers');
});
check('Possession: he pours into their head, they slap and uppercut themself, he steps out behind; 90 on release',()=>{
  brainlagVs();tap('KeyJ');stepUntil(()=>p1.state==='throw',12);
  assert(p1.throwKind==='brainlag'&&p1.throwEscape,'normal escape window');
  p1.ultimate=100;assert(!activateDomain(p1,g),'no domain mid-throw');
  const start=p1.x,spec=THROWS.brainlag;
  for(let f=p1.stateFrame;p1.state==='throw';f++) {
    assert(poseIsFinite(throwPose(p1,'att',p1.stateFrame))&&poseIsFinite(throwPose(p1,'def',p1.stateFrame)),'poses '+p1.stateFrame);
    if(p1.stateFrame===spec.exitFrom+1)assert(Math.sign(p1.x-p2.x)===1&&p1.facing===-1,'behind them');
    step();
  }
  near(p2.hp,MAX_HP-90);assert(start<p2.x,'victim stayed put');
  brainlagVs();tap('KeyJ');stepUntil(()=>p1.state==='throw',12);tap('KeyL');step();assert(p1.state!=='throw'&&p2.hp===MAX_HP,'escapable');
});
check('Complete Hypnosis: left/right, up/down and Light/Heavy swap, parries flip, and they turn their back on him',()=>{
  brainlagVs('rip',250);hypnosis();
  near(g.domain.framesLeft,BRAINLAG.hypnosisFrames-1);assert(p2.facing===-1,'still faces him');
  let x=p2.x;press('ArrowLeft');step(5);release('ArrowLeft');assert(p2.x>x&&p2.facing===-1,'left walks right, still facing him');
  x=p1.x;press('KeyD');step(5);release('KeyD');assert(p1.x>x,'owner unaffected');
  step(10);press('ArrowDown');step();release('ArrowDown');assert(p2.state==='jumpsquat','down jumps');
  brainlagVs('rip',250);hypnosis();press('Comma');step();release('Comma');assert(p2.moveName==='heavy','light is heavy');
  brainlagVs('rip',250);hypnosis();press('Slash');step();release('Slash');assert(p2.moveName==='light','heavy is light');
  for(const [dir,want] of [[null,'low'],['ArrowUp','high'],['ArrowDown','overhead']]) {
    brainlagVs('rip',250);hypnosis();if(dir)press(dir);press('Period');step();release('Period');if(dir)release(dir);
    assert(p2.state==='parry'&&p2.parryDir===want,`parry ${dir} ${p2.parryDir}`);
  }
  brainlagVs('rip',250);hypnosis();x=p2.x;p2.input=new CpuInput(1,1);p2.input.choose=()=>({left:true});step(4);assert(p2.x>x,'CPU inputs reverse too');
});
check('Complete Hypnosis: they face him but their hits come out of their back unless aimed away from him; heights flip',()=>{
  brainlagVs('rip',250);hypnosis();p1.x=p2.x-60;
  p2.startAttack('light');p2.stateFrame=p2.move.startup;assert(p2.facing===-1&&!hitPoint(p2,p1),'a normal swing misses in front');
  p1.x=p2.x+60;assert(hitPoint(p2,p1),'it comes out of their back');
  brainlagVs('rip',250);hypnosis();p1.x=p2.x-60;press('ArrowRight');step();p2.startAttack('light');release('ArrowRight');
  p2.stateFrame=p2.move.startup;assert(p2.hypnoAim&&hitPoint(p2,p1),'aiming away from him lands in front');
  applyHit(p2,p1,{x:p1.x,y:p1.y-100},g);assert(p1.vx<0,'knocked away from them');
  brainlagVs('rip',250);hypnosis();p1.x=p2.x-60;p1.startParry('low');
  p2.startAttack('light');p2.hypnoAim=true;p2.stateFrame=p2.move.startup;applyHit(p2,p1,{x:p1.x,y:p1.y-100},g);assert(p2.state==='stagger','a high hits low');
  brainlagVs('rip',250);hypnosis();
  const spec={kind:'test',owner:1,x:p2.x+50*p2.facing,y:500,facing:p2.facing,vx:10*p2.facing,framesLeft:5,box:{w:10,h:10},move:MOVES.light};
  let shot=spawnProjectile(g,spec);near(shot.x,p2.x-50*p2.facing);near(shot.vx,-10*p2.facing);
  press('ArrowRight');step();shot=spawnProjectile(g,spec);release('ArrowRight');near(shot.vx,10*p2.facing);g.projectiles=[];
  for(const toward of [false,true]) {
    brainlagVs('rip',120);hypnosis();if(toward)press('ArrowLeft');step();press('Quote');step(2);
    p1.startAttack('light');p1.stateFrame=p1.move.startup;applyHit(p1,p2,{x:p2.x,y:p2.y-100},g);
    release('Quote');release('ArrowLeft');
    assert(toward?p2.state==='blockstun'&&p2.hp===MAX_HP:p2.state==='hitstun'&&p2.hp<MAX_HP,'block toward '+toward);
  }
});
check('Complete Hypnosis lasts 6 s (others stay 8), ends cleanly and resets with the round',()=>{
  brainlagVs('rip',250);hypnosis();step(BRAINLAG.hypnosisFrames);assert(!g.domain,'ends');
  step();const x=p2.x;press('ArrowLeft');step(5);release('ArrowLeft');assert(p2.x<x&&p2.facing===-1,'normal again');
  p1.x=p2.x-60;p2.enter('idle');p2.startAttack('light');p2.stateFrame=p2.move.startup;assert(hitPoint(p2,p1),'attacks normal again');
  brainlagVs('rip',250);beginDomain(1,g,'rip');near(g.domain.framesLeft,DOMAIN.activeFrames);
  brainlagVs('rip',250);hypnosis();startRound();assert(!g.domain&&!hypnotized(p2),'round reset');
  brainlagVs('rip',250);hypnosis();p2.ultimate=ULTIMATE_MAX;assert(activateDomain(p2,g)&&g.domainSequence.kind==='clash','clashes');
});
check('Every Brainlag state has finite poses, and a CPU Brainlag throws fakes and uses all three specials',()=>{
  brainlagVs();
  for(const [state,frames] of [['lagSnap',18],['decoyVanish',10],['sawStance',40],['sawSplit',BRAINLAG.sawSplit]]) {
    p1.enter(state);p1.abilityFrames=frames;
    for(let f=0;f<=frames;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),`${state} ${f}`);}
  }
  for(const state of ['idle','walk','run','block'])for(let t=0;t<80;t+=7){p1.enter(state);p1.stateFrame=t;assert(poseIsFinite(animatedPose(p1,t,t)),state);}
  const used=new Set();let fakes=0;
  for(const level of [3,5]) {
    startMatch(false,[{type:'keyboard',layout:0},{type:'cpu',level}],['haze','brainlag']);g.phase='fight';g.inputLocked=false;keysDown.clear();
    for(let i=0;i<2400;i++){
      step();if(p2.state==='attack'&&p2.stateFrame===1&&p2.fake)fakes++;
      for(const s of ['lagSnap','decoyVanish','sawStance'])if(p2.state===s)used.add(s);
      if(g.phase!=='fight'){g.phase='fight';g.inputLocked=false;p1.hp=p2.hp=MAX_HP;p1.koed=p2.koed=false;}
    }
  }
  assert(fakes>0,'CPU fakes');assert(used.has('lagSnap')&&used.has('decoyVanish'),'CPU specials '+[...used]);
});
check('Brainlag effects draw without errors and stay cheap',()=>{
  const canvas=typeof document.createElement==='function'?document.createElement('canvas'):null,c=canvas?.getContext?.('2d');
  if(!c?.arc)return;   // node: no real canvas
  canvas.width=W;canvas.height=H;
  const scenes=[()=>{},()=>{ability();step(BRAINLAG.lagStartup+20);},()=>{ability('downSpecial');step(12);},
    ()=>{ability('upSpecial');p1.stateFrame=4;incoming('light');step(2);},()=>{tap('KeyJ');step(30);},()=>hypnosis()];
  const times=[];
  for(const scene of scenes){brainlagVs();scene();render(c,g,fighters,16.7);const t0=performance.now();for(let i=0;i<10;i++)render(c,g,fighters,16.7);times.push((performance.now()-t0)/10);}
  assert(times.every(t=>t<times[0]*3+4),'frame cost '+times.map(t=>t.toFixed(1)).join(','));
});
check('Complete Hypnosis fades out after it ends without crashing the renderer',()=>{
  // A canvas stand-in that accepts every call, so this runs in node as well as the browser.
  const any=new Proxy(function(){},{get:(o,k)=>k===Symbol.toPrimitive?()=>0:any,apply:()=>any,set:()=>true});
  brainlagVs('rip',250);hypnosis();step(BRAINLAG.hypnosisFrames);
  assert(!g.domain&&g.domainFade?.type==='brainlag'&&g.domainFade.owner===0,'fade keeps its owner');
  for(let i=0;i<DOMAIN.fadeFrames;i++){drawDomainAtmosphere(any,g);drawBrainlagFx(any,g);step();}
  assert(!g.domainFade,'fade finished');
});
