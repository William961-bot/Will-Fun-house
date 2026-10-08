function nullVs(index=0,facing=1,gap=180,opponent='rip') {
  setup();const att=fighters[index],def=fighters[1-index];att.setCharacter('null');def.setCharacter(opponent);
  att.reset(640,facing);def.reset(640+gap*facing,-facing);g.popups=[];
  return {att,def,special:index===0?'KeyT':'Semicolon',up:index===0?'KeyW':'ArrowUp'};
}
function nullZoomInput(pair) {press(pair.up);tap(pair.special);release(pair.up);}
function readyNullZoom(att) {stepUntil(()=>att.moveName==='nullZoom'&&att.moveHit&&att.stateFrame>=att.move.startup+att.move.active,60);}

check('Null is selectable on either player, supports mirrors and all normals in the expanded roster',()=>{
  const chars=g.characters.slice();
  try {
    assert(ROSTER.includes('null')&&ROSTER.length===13,'roster');pickCharacters(['null','null']);
    assert(p1.kit===NULL_ABILITIES&&p2.stats.color===CHARACTERS.null.altColor,'mirror palette');
    openCharacterSelect();assert(charSelect.cursor.every(n=>ROSTER[n]==='null'),'selection');
    assert(CHARACTERS.null.home.u>0&&CHARACTERS.null.home.u<1&&CHARACTERS.null.home.v>0&&CHARACTERS.null.home.v<1,'map');
    for(const facing of [-1,1])for(const name of Object.keys(MOVES)) {
      const {att}=nullVs(0,facing);att.startAttack(name);
      for(let frame=0;frame<=att.move.startup+att.move.active+att.move.recovery;frame+=.5)
        assert(poseIsFinite(attackAnim(att,frame)),'normal '+name+'/'+frame);
    }
  } finally {g.characters=chars;setup();}
});

check('Null Spear Throw starts from both keyboard layouts and controller RB with one projectile per owner',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=nullVs(index,facing,500);tap(pair.special);assert(pair.att.state==='nullSpearWindup','input');
    step(NULL.spearStartup-1);assert(g.projectiles.length===0,'no early shot');step();
    assert(g.projectiles.length===1&&g.projectiles[0].vx===NULL.spearSpeed*facing,'shot and direction');
    assert(!nullSpear(pair.att,g),'one projectile');stepUntil(()=>pair.att.state==='idle',40);
    tap(pair.special);assert(pair.att.state==='idle'&&pair.att.cooldowns.special>0,'cooldown');
  }
  const old=navigator.getGamepads;
  try {
    const {att}=nullVs(0,1,500),pad=testPad(2,'Null pad');navigator.getGamepads=()=>[null,null,pad];
    att.input=new PlayerInput(0,{type:'pad',slot:2,id:pad.id});pad.buttons[5].pressed=true;step();pad.buttons[5].pressed=false;
    assert(att.state==='nullSpearWindup','RB');
  } finally {navigator.getGamepads=old;setup();}
});

check('Spear marks only a damaging hit; blocks, high parries, phased targets and decoys prevent the mark',()=>{
  for(const defense of ['idle','block','parry','phased','decoy']) {
    const {att,def}=nullVs(0,1,150,defense==='phased'?'gooner':'rip');
    if(defense==='block')def.enter('block');
    if(defense==='parry'){def.startParry('high');def.stateFrame=0;}
    if(defense==='phased')def.untouchable=120;
    if(defense==='decoy'){const decoy=new Fighter(CHARACTERS.haze,new PlayerInput(1),1);decoy.reset(def.x,-1);g.clouds.push({owner:1,decoy,framesLeft:120});}
    nullSpear(att,g);for(let i=0;i<12;i++)updateProjectiles(g);
    assert(!!att.nullMark===(defense==='idle'),defense+' mark');
    assert((def.hp<MAX_HP)===(defense==='idle'),defense+' damage');
    if(defense==='idle'){near(MAX_HP-def.hp,55);near(def.guard,100);assert(att.nullMark.target===def.index&&att.nullMark.left===240,'four seconds');}
    if(defense==='block')near(def.guard,92);
  }
  setup();
});

check('Null Zoom travels visibly, hits once, passes through and finishes facing the victim for either player and facing',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=nullVs(index,facing),{att,def}=pair;nullZoomInput(pair);const start=att.x;
    step(NULL.zoomStartup-1);near(att.x,start);step();near(att.x-start,NULL.zoomSpeed*facing);
    readyNullZoom(att);assert(def.combo===1&&def.hp===940,'single 60-damage hit');
    assert((att.x-def.x)*facing>0&&att.facing===-facing,'through then turns');
    assert(att.cooldowns.upSpecial>0&&!att.nullMark,'unmarked cooldown');
    assert(!att.invincible,'dash has no invincibility');
    step(8);assert(def.combo<=1,'no repeat hits during travel/recovery');
  }
  setup();
});

check('Marked Zoom consumes one mark, resets immediately and permits a real second Zoom combo; second dash has normal cooldown',()=>{
  for(const index of [0,1])for(const facing of [-1,1]) {
    const pair=nullVs(index,facing),{att,def}=pair;att.nullMark={target:def.index,left:240};nullZoomInput(pair);
    stepUntil(()=>att.moveHit,40);assert(!att.nullMark&&att.cooldowns.upSpecial===0,'one reset');
    readyNullZoom(att);nullZoomInput(pair);assert(att.moveName==='nullZoom'&&att.stateFrame===0,'fresh second Zoom');
    stepUntil(()=>att.moveHit,35);assert(def.combo===2&&att.cooldowns.upSpecial>0,'second connects without another reset');
    readyNullZoom(att);tap(index===0?'KeyF':'Comma');assert(att.moveName==='light','normal follow-up');
    stepUntil(()=>att.moveHit,20);assert(def.combo===3,'three-hit route');
  }
  setup();
});

check('Blocked, parried, missed and expired-mark Zooms keep cooldown; landing a new spear never clears an existing cooldown',()=>{
  for(const defense of ['block','parry','miss','expired']) {
    const pair=nullVs(0,1,defense==='miss'?500:60),{att,def}=pair;att.nullMark={target:1,left:defense==='expired'?1:240};
    nullZoomInput(pair);step(NULL.zoomStartup-1);
    if(defense==='block'){press('Quote');step();release('Quote');}
    else if(defense==='parry')tap('Period');else step();
    step(12);assert(att.cooldowns.upSpecial>0,defense+' no reset');
    if(defense==='block'||defense==='parry')assert(att.nullMark&&def.hp===MAX_HP,defense+' keeps mark');
    if(defense==='parry')assert(att.state==='stagger','punishable parry');
  }
  const {att,def}=nullVs(0,1,150);att.cooldowns.upSpecial=120;nullSpear(att,g);for(let i=0;i<12;i++)updateProjectiles(g);
  assert(att.nullMark&&att.cooldowns.upSpecial===120,'mark does not reset cooldown');
  att.nullMark.left=20;def.enter('idle');nullSpear(att,g);for(let i=0;i<12;i++)updateProjectiles(g);
  assert(att.nullMark.left===240&&att.cooldowns.upSpecial===120,'refresh mark, not cooldown');setup();
});

check('Null marks and cooldowns freeze during pause, hit-stop and cinematic intros; mirrors own separate marks; rounds clear them',()=>{
  const {att,def}=nullVs();att.nullMark={target:def.index,left:240};att.cooldowns.upSpecial=300;
  for(const mode of ['pause','hitstop','intro','cinematic']) {
    const mark=att.nullMark.left,cd=att.cooldowns.upSpecial;
    if(mode==='pause')g.paused=true;
    if(mode==='hitstop')g.hitstopLeft=10;
    if(mode==='intro')g.phase='intro';
    if(mode==='cinematic'){g.phase='fight';g.domainSequence={kind:'cutscene',owner:0,type:'null',framesLeft:60};}
    for(let i=0;i<5;i++)tick();near(att.nullMark.left,mark);near(att.cooldowns.upSpecial,cd);
    g.paused=false;g.hitstopLeft=0;g.domainSequence=null;g.phase='fight';g.inputLocked=false;
  }
  step(239);assert(att.nullMark?.left===1,'last marked tick');step();assert(!att.nullMark,'expires');
  def.setCharacter('null');def.reset(820,-1);att.nullMark={target:1,left:100};def.nullMark={target:0,left:150};
  att.kit.onHit(att,def,60,'nullZoom',g);assert(!att.nullMark&&def.nullMark.left===150,'mirror ownership');
  startRound();assert(!att.nullMark&&!def.nullMark&&att.zoomTrail.length===0,'round cleanup');setup();
});

check('Null startup can be interrupted; Zoom misses jumping, respects walls, and clean hits still allow Burst',()=>{
  for(const move of ['spear','zoom']) {
    const pair=nullVs(0,1,60);if(move==='spear')tap(pair.special);else nullZoomInput(pair);
    incoming('light',pair.def,pair.att);step(25);
    assert(!g.projectiles.length&&pair.def.hp===MAX_HP,'startup punish '+move);
  }
  let pair=nullVs(0,1,60);pair.def.y=FLOOR-270;pair.def.vy=-4;pair.def.enter('air');nullZoomInput(pair);step(20);
  assert(pair.def.hp===MAX_HP&&!pair.att.moveHit,'jump avoids');
  for(const facing of [-1,1]) {
    pair=nullVs(0,facing,500);pair.att.x=facing===1?WALL_R-HALF_W-50:WALL_L+HALF_W+50;nullZoomInput(pair);step(20);
    assert(pair.att.x>=WALL_L+HALF_W&&pair.att.x<=WALL_R-HALF_W,'wall clamp');
  }
  pair=nullVs(0,1,120);nullZoomInput(pair);stepUntil(()=>pair.att.moveHit,30);
  press('Quote');tap('Period');release('Quote');assert(pair.def.state==='burst'&&pair.att.state==='hitstun','burst escape');setup();
});

check('Null System Shock throw keeps timed escape and unique effects without marking or resetting Zoom',()=>{
  let {att,def,key}=beginEscapeThrow('null');tap(key);assert(def.state==='deflect'&&def.hp===MAX_HP,'ordinary escape');
  ({att,def}=beginEscapeThrow('null'));att.cooldowns.upSpecial=100;
  while(att.state==='throw'){assert(poseIsFinite(animatedPose(att,g.frame,att.stateFrame))&&poseIsFinite(animatedPose(def,g.frame,def.stateFrame)),'throw poses');step();}
  assert(def.hp===910&&!att.nullMark&&att.cooldowns.upSpecial>0,'throw rules');
  assert(g.popups.some(p=>p.text==='SYSTEM SHOCK'),'character effect');setup();
});

check('Silent Eclipse spends full meter, hides only its owner, reveals attacks/hits, clashes, expires and resets',()=>{
  for(const index of [0,1]) {
    const {att,def}=nullVs(index);att.ultimate=100;
    assert(activateDomain(att,g),'activate');step(60);assert(g.domain?.type==='null'&&att.ultimate===0,'domain');
    assert(nullHidden(att,g)&&!nullHidden(def,g),'only Null hidden');
    att.startAttack('light');att.stateFrame=MOVES.light.startup-3;assert(!nullHidden(att,g),'attack telegraph');
    att.enter('idle');incoming('light',def,att);assert(!nullHidden(att,g)&&att.nullReveal===45,'damage reveals');
    att.endHitstun();att.nullReveal=0;assert(nullHidden(att,g),'re-hide');
    def.ultimate=100;assert(activateDomain(def,g)&&g.domainSequence.kind==='clash','clash');
    g.domainSequence.boundary=index===0?W:0;step(180);assert(g.domain.owner===index,'wins clash');
    for(let i=0;i<480;i++)updateDomain(g);assert(!g.domain&&!nullHidden(att,g),'expiry');
    startRound();assert(att.nullReveal===0&&!g.domain,'round reset');
  }
  setup();
});

check('Null CPU uses spear at range, Zoom nearby and resets; enemies cannot track hidden movement or react to hidden windup',()=>{
  const {att,def}=nullVs();assert(att.kit.cpuChoice(att,def,500)==='special','spear range');
  assert(att.kit.cpuChoice(att,def,150)==='upSpecial','Zoom range');att.cooldowns.upSpecial=20;assert(att.kit.cpuChoice(att,def,150)==='special','cooldown choice');
  def.input=new CpuInput(def.index,5);def.input.choose(g.frame);const seen=def.input.lastSeenNullX;beginDomain(att.index,g);
  att.x=def.x+400;def.input.choose(g.frame+1);near(def.input.lastSeenNullX,seen);
  att.startAttack('heavy');att.stateFrame=1;def.input.choose(g.frame+2);assert(def.input.threat==='','hidden windup');
  att.stateFrame=27;def.input.choose(g.frame+3);near(def.input.lastSeenNullX,att.x);
  for(const level of [1,3,5]) {
    const run=()=>{keysDown.clear();startMatch(false,[{type:'cpu',level},{type:'cpu',level}],['null','rip']);g.frame=0;g.phase='fight';g.inputLocked=false;step(900);return JSON.stringify({hp:fighters.map(f=>f.hp),x:fighters.map(f=>f.x),mark:p1.nullMark,cd:p1.cooldowns,wins:g.wins});};
    assert(run()===run(),'deterministic CPU '+level);
  }
  setup();
});

check('Null custom states, domain opener, normals and mirror visuals have finite poses through every frame',()=>{
  for(const index of [0,1]) {
    const {att}=nullVs(index);for(const state of ['nullSpearWindup','block','blockstun','idle','walk','run']) {
      att.enter(state);att.timer=18;for(let frame=0;frame<=40;frame+=.5)assert(poseIsFinite(animatedPose(att,frame,frame)),state+'/'+frame);
    }
    att.kit.upSpecial(att);for(let frame=0;frame<=42;frame+=.5)assert(poseIsFinite(animatedPose(att,frame,frame)),'zoom/'+frame);
    g.domainSequence={kind:'cutscene',owner:index,type:'null',framesLeft:30};att.enter('idle');assert(poseIsFinite(animatedPose(att,12,12)),'domain opener');
  }
  setup();
});

