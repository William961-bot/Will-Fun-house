// Tonka: Bell meter, Unbothered, Bell Drop / Truck Ram / Green Swarm, Car Toss, three random domains, songs and stages.
// Uses helpers from milestone5.js, character-select.js, animation.js, grabs.js, lancer.js and duttpack.js (STUB_CANVAS).
function tonkaVs(opponent = 'rip', gap = 350) { rosterVs('tonka', opponent); p1.reset(500, 1); p2.reset(500 + gap, -1); }
const tonkaShots = (kind, owner = 0) => g.projectiles.filter(p => p.kind === kind && p.owner === owner);
function hitsTaken(victim, frames) { const out = []; let hp = victim.hp; for (let i = 0; i < frames; i++) { step(); if (victim.hp < hp) { out.push(hp - victim.hp); hp = victim.hp; } } return out; }

check('Tonka joins the roster with mirror colours, every per-character table and finite poses',()=>{
  assert(ROSTER.includes('tonka')&&CHARACTERS.tonka.home.label&&THROWS.tonka&&STAGES.tonkaCity,'roster');
  pickCharacters(['tonka','tonka']);assert(p1.kit===TONKA_ABILITIES&&p2.stats.color===CHARACTERS.tonka.altColor,'mirror');
  assert(CHARACTER_GUARDS.tonka&&GUARD_RECOIL.tonka&&CHARACTER_RUNS.tonka,'tables');
  for(const n of ['light','low','overhead','heavy','air'])assert(SIGNATURE_TIMELINES['tonka_'+n],'timeline '+n);
  for(const facing of [1,-1]) {
    for(const name of Object.keys(MOVES)) {
      tonkaVs();p1.facing=facing;if(MOVES[name].air){p1.y=FLOOR-90;p1.vy=-2;}
      p1.startAttack(name);
      for(let f=0;f<=p1.move.startup+p1.move.active+p1.move.recovery;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),`${name} ${f}`);}
    }
    for(const [state,frames] of [['bellCall',24],['truckCall',34],['swarmCall',28]]) {
      tonkaVs();p1.facing=facing;p1.enter(state);p1.abilityFrames=frames;
      for(let f=0;f<=frames;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),state+' '+f);}
    }
    for(const state of ['idle','walk','run','block']) for(let t=0;t<TONKA.steepleEvery;t+=13){tonkaVs();p1.facing=facing;p1.enter(state);p1.animationFrame=t;p1.stateFrame=t;assert(poseIsFinite(animatedPose(p1,t,t)),state+' '+t);}
  }
  tonkaVs();p1.animationFrame=TONKA.steepleEvery-TONKA.steepleFrames/2;const sign=tonkaIdle(p1,0);assert(sign.hF[1]<-130,'steepled hands up');
  p1.animationFrame=5;const pockets=tonkaIdle(p1,0);assert(pockets.hF[1]>-90,'hands in pockets');
  drawTonkaBody(STUB_CANVAS,p1,animatedPose(p1,0,0),0);drawTonkaMeter(STUB_CANVAS,p1);drawTonkaPortrait(STUB_CANVAS,0,0,80,CHARACTERS.tonka);
});
check('Bell meter: +1 per landed hit, -1 when hit, empowers his next special at three, clears on use and on a new round',()=>{
  tonkaVs('rip',60);incoming('light',p1,p2);near(p1.bells,1);p2.enter('idle');incoming('light',p1,p2);p2.enter('idle');incoming('light',p1,p2);near(p1.bells,3);
  p2.enter('idle');incoming('light',p1,p2);near(p1.bells,3);
  p1.enter('attack');incoming('heavy');near(p1.bells,2);
  p1.enter('idle');p1.bells=3;p1.cooldowns.upSpecial=0;ability('upSpecial');stepUntil(()=>p1.state==='swarmCall',4);assert(p1.tonkaEmp&&p1.bells===0,'empowered and spent');
  p1.bells=2;startRound();near(p1.bells,0);
});
check('Unbothered: one light hit absorbed while idle or walking, recharging after 3 s; overheads, heavies and grabs always land',()=>{
  tonkaVs('rip',60);incoming('light');assert(p1.state==='idle'&&p1.hp<MAX_HP,'absorbed, damage still taken');
  p2.enter('idle');incoming('light');assert(p1.state==='hitstun','second hit inside the recharge flinches');
  tonkaVs('rip',60);p1.startAttack('light');incoming('low');assert(p1.state==='hitstun','not while attacking');
  for(const name of ['overhead','heavy']){tonkaVs('rip',60);incoming(name);assert(p1.state==='hitstun','no armor vs '+name);}
  tonkaVs('rip',60);incoming('grab');assert(p1.state==='thrown','grab');
  tonkaVs('rip',60);p1.tonkaHitAt=g.frame-TONKA.unbotheredRecharge;incoming('medium');assert(p1.state==='idle','recharged');
});
check('Bell Drop: a bell falls where they stood for 70 overhead, rings a low shockwave, one at a time; empowered drops three',()=>{
  tonkaVs();const target=p2.x;ability();assert(p1.state==='bellCall'&&p1.cooldowns.special===TONKA.bellCooldown,'cast');
  step(TONKA.bellStartup);const bell=tonkaShots('tonkaBell')[0];assert(bell&&Math.abs(bell.x-target)<1&&bell.move.height==='overhead','aimed at their spot');
  assert(!p1.kit.special(p1,p2,g),'one bell at a time');
  const hits=hitsTaken(p2,30);near(hits[0],TONKA.bellDamage);
  assert(g.projectiles.some(p=>p.kind==='tonkaRing'&&p.move.height==='low')||p1.tonkaSinks.length,'shockwave and sink');
  tonkaVs();p2.enter('knockdown');p1.bells=3;ability();step(TONKA.bellStartup);
  const xs=tonkaShots('tonkaBell').map(b=>Math.round(b.x-p2.x)).sort((a,b)=>a-b);assert(JSON.stringify(xs)===JSON.stringify([-TONKA.bellSpread,0,TONKA.bellSpread]),'three bells '+xs);
});
check('Truck Ram: crosses the whole screen behind-to-front for 80, jumpable, blockable, never hits him; empowered is faster and comes back',()=>{
  tonkaVs();ability('downSpecial');assert(p1.state==='truckCall','cast');step(TONKA.truckStartup);
  const truck=tonkaShots('tonkaTruck')[0];assert(truck&&truck.x<WALL_L&&truck.vx===TONKA.truckSpeed,'from behind him');
  const hp=p1.hp,hits=hitsTaken(p2,80);near(hits[0],TONKA.truckDamage);near(p1.hp,hp);
  tonkaVs();ability('downSpecial');step(TONKA.truckStartup);const t2=tonkaShots('tonkaTruck')[0];t2.x=p2.x;p2.y=FLOOR-125;   // mid-jump
  assert(!boxesOverlap(projectileBox(t2),{x:p2.x-HURT_HALF_W,y:p2.y-MOVE.standingHeight,w:HURT_HALF_W*2,h:MOVE.standingHeight}),'a jump clears it');
  tonkaVs();press('Quote');step(2);ability('downSpecial');for(let i=0;i<70;i++)step();release('Quote');near(p2.hp,MAX_HP);assert(p2.guard<GUARD.max,'blocked');
  tonkaVs();p2.enter('knockdown');p1.bells=3;ability('downSpecial');step(TONKA.truckStartup);
  const emp=tonkaShots('tonkaTruck')[0];assert(emp.vx===TONKA.empTruckSpeed&&emp.move.dmg===TONKA.empTruckDamage&&emp.returns,'empowered');
  let back=false;for(let i=0;i<120&&!back;i++){step();back=tonkaShots('tonkaTruck')[0]?.vx<0;}assert(back,'drives back');
});
check('Green Swarm: three 20-damage hits, clashes with an enemy projectile; empowered is twice the size with five hits',()=>{
  tonkaVs();ability('upSpecial');const hits=hitsTaken(p2,90);
  const expected=[0,1,2].map(i=>Math.round(TONKA.swarmDamage*COMBO_SCALE[i]));
  assert(JSON.stringify(hits)===JSON.stringify(expected),'hits '+hits+' vs '+expected);
  tonkaVs();p1.bells=3;ability('upSpecial');step(TONKA.swarmStartup);const big=tonkaShots('tonkaSwarm')[0];assert(big.big===2&&big.hitsLeft===TONKA.empSwarmHits,'empowered');
  const many=hitsTaken(p2,100);near(many.length,TONKA.empSwarmHits);
  tonkaVs('duttpack');ability('upSpecial');step(TONKA.swarmStartup);const s=tonkaShots('tonkaSwarm')[0];
  spawnProjectile(g,{kind:'soccerBall',owner:1,curve:'high',x:s.x,y:s.y,facing:-1,vx:-1,vy:0,framesLeft:30,box:{w:26,h:26},move:{...MOVES.light}});
  updateTonkaWorld(g);assert(s.dead&&g.projectiles.filter(p=>!p.dead).length===0,'clash');
});
check('Car Toss: into the SUV, off-screen crash, thrown back near him for 90; escapable; always lands inside the arena',()=>{
  for(const [x,facing] of [[600,1],[WALL_R-90,1],[WALL_L+90,-1]]) {
    rosterVs('tonka','rip');p1.reset(x,facing);p2.reset(x+60*facing,-facing);tap('KeyJ');stepUntil(()=>p1.state==='throw',12);
    assert(p1.throwKind==='tonka'&&p1.throwEscape,'normal escape window');
    p1.ultimate=ULTIMATE_MAX;assert(!activateDomain(p1,g),'no domain mid-throw');
    let hidden=false;
    while(p1.state==='throw'){
      assert(poseIsFinite(throwPose(p1,'att',p1.stateFrame))&&poseIsFinite(throwPose(p1,'def',p1.stateFrame)),'poses');
      assert(p2.x>=WALL_L+HALF_W-1&&p2.x<=WALL_R-HALF_W+1,'inside');hidden ||= tonkaHidesVictim(p2);drawTonkaFx(STUB_CANVAS,g);step();
    }
    near(MAX_HP-p2.hp,90);assert(hidden,'inside the car for a while');assert(Math.abs(p2.x-p1.x)<200,'lands near him');
  }
  tonkaVs('rip',60);tap('KeyJ');stepUntil(()=>p1.state==='throw',12);tap('KeyL');step();assert(p1.state!=='throw'&&p2.hp===MAX_HP,'escapable');
});
check('Domains: a seeded random variant each time, each with its own song, hazard, name and fade-out',()=>{
  tonkaVs();const seen=new Set(),seq1=[];for(let i=0;i<60;i++)seen.add(tonkaPickVariant(p1));assert(seen.size===3,'all three');
  tonkaVs();const seed=p1.tonkaSeed;for(let i=0;i<6;i++)seq1.push(tonkaPickVariant(p1));p1.tonkaSeed=seed;for(let i=0;i<6;i++)assert(tonkaPickVariant(p1)===seq1[i],'deterministic');
  tonkaVs();p1.ultimate=ULTIMATE_MAX;assert(activateDomain(p1,g),'cutscene');const v=g.domainSequence.variant;
  assert(TONKA_VARIANTS.includes(v)&&music.want(g)==='tonka_'+v&&domainName('tonka',v)===TONKA_DOMAINS[v].name,'song and name from frame 0');
  step(DOMAIN.cutsceneFrames);assert(g.domain?.variant===v&&music.want(g)==='tonka_'+v,'same variant in the domain');
  for(const variant of TONKA_VARIANTS) {
    tonkaVs('rip',300);beginDomain(0,g,'tonka');g.domain.variant=variant;const hp=p1.hp;
    const hits=hitsTaken(p2,TONKA.horseEvery*2+40);assert(hits.length>0,'hazard hits '+variant);near(p1.hp,hp);
    for(let i=0;i<DOMAIN.activeFrames+DOMAIN.fadeFrames;i++){drawDomainAtmosphere(STUB_CANVAS,g);drawTonkaFx(STUB_CANVAS,g);drawTonkaProjectiles(STUB_CANVAS,g);step();}
    assert(!g.domain&&!g.domainFade,'ends and fades '+variant);
  }
  tonkaVs('rip',60);beginDomain(0,g,'tonka');g.domain.variant='bellCity';p1.tonkaHitAt=g.frame;incoming('light');assert(p1.state==='idle','Bell City: armor always ready');
  tonkaVs();beginDomain(0,g,'tonka');g.domain.variant='farmhouse';p1.cooldowns.special=100;step(10);assert(p1.cooldowns.special<=80,'Farmhouse: double recharge');
  tonkaVs();beginDomain(0,g,'tonka');startRound();assert(!g.domain,'round reset');
  rosterVs('haze','rip');p1.ultimate=ULTIMATE_MAX;activateDomain(p1,g);assert(music.want(g)==='haze','Haze unchanged');
});
check('Stages: matches with Tonka pick one of his two stages at random; others keep the normal arena; drawing falls back cleanly',()=>{
  const picked=new Set();
  for(let i=0;i<12;i++){pickCharacters(i%2?['rip','tonka']:['tonka','haze']);assert(STAGES[g.stage],'a stage');picked.add(g.stage);}
  assert(picked.size===2,'both stages');pickCharacters(['haze','rip']);assert(g.stage===null,'no Tonka, no stage');
  pickCharacters(['tonka','rip']);assert(!drawStage(STUB_CANVAS,g,0,0,W,H),'no image yet: normal arena');
  stageImages[g.stage]={complete:true,naturalWidth:1254,naturalHeight:1254};
  try{assert(drawStage(STUB_CANVAS,g,-100,-40,W+100,H+40),'draws the stage');const L=stageLayout(stageImages[g.stage],STAGES[g.stage].floor,-100,-40,W+100,H+40);
    near(Math.round(L.y+STAGES[g.stage].floor*L.h),FLOOR);assert(L.x<=-100&&L.x+L.w>=W+100&&L.y<=-40,'covers the arena');}
  finally{delete stageImages[g.stage];}
});
check('CPU Tonka uses all three summons',()=>{
  const used=new Set();
  for(const level of [3,5]) {
    startMatch(false,[{type:'keyboard',layout:0},{type:'cpu',level}],['haze','tonka']);g.phase='fight';g.inputLocked=false;keysDown.clear();
    for(let i=0;i<3000;i++){
      step();for(const s of ['bellCall','truckCall','swarmCall'])if(p2.state===s)used.add(s);
      if(g.phase!=='fight'){g.phase='fight';g.inputLocked=false;p1.hp=p2.hp=MAX_HP;p1.koed=p2.koed=false;}
    }
  }
  assert(used.size===3,'CPU summons '+[...used]);
});
check('Bell Drop plays the recorded bell (assets/sfx/) once per cast, and the synth bell if the file is missing',()=>{
  const saved={context:sound.context,files:sound.files,Audio:globalThis.Audio},played=[],synth=[];
  class FakeAudio{constructor(src){this.src=src;this.currentTime=0;}addEventListener(){}play(){played.push(this.src);return Promise.resolve();}}
  const fakeCtx={state:'running',currentTime:0,createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}),
    createOscillator:()=>({frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}})};
  try{
    globalThis.Audio=FakeAudio;sound.context=fakeCtx;sound.files={};
    tonkaVs();p1.bells=3;ability();step(TONKA.bellStartup);
    assert(played.length===1&&played[0]===SOUND_FILES.tonkaBell.file,'one clip for three empowered bells: '+played);
    sound.files.tonkaBell.broken=true;const before=played.length;const orig=sound.context.createOscillator;
    sound.context.createOscillator=()=>{synth.push(1);return orig();};
    sound.play('tonkaBell');assert(played.length===before&&synth.length===1,'falls back to the synth bell');
  }finally{sound.context=saved.context;sound.files=saved.files;globalThis.Audio=saved.Audio;}
});
