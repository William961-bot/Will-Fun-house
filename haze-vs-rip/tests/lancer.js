function rosterVs(id, opponent = 'rip') {
  keysDown.clear(); pickCharacters([id, opponent]); g.paused = false; g.hitstopLeft = 0;
  p1.reset(500,1); p2.reset(850,-1); g.popups = [];
}
function ability(key = 'special') {
  if (key === 'downSpecial') press('KeyS'); if (key === 'upSpecial') press('KeyW');
  press('KeyT'); step(); release('KeyT'); release('KeyS'); release('KeyW');
}
function incoming(name, attacker = p2, victim = p1) {
  attacker.startAttack(name); attacker.vx=0; attacker.stateFrame=attacker.move.startup;
  applyHit(attacker,victim,{x:victim.x,y:victim.y-100},g);
}
function newThrow() { p1.startAttack('grab'); startThrow(p1,p2,g,''); }
check('Lancer wave: windup, traveling high hit, one in flight, normal and masked cooldowns',()=>{
  for (const masked of [false,true]) {
    rosterVs('lancer'); p1.masked=masked;p1.mask=100;ability();
    assert(p1.cooldowns.special === (masked?90:180),'cooldown');step(12);
    const p=g.projectiles[0];assert(p&&p.move.height==='high'&&p.vx===(masked?22.5:18),'wave');
    assert(p.box.h===(masked?165:110),'size');assert(!p1.kit.special(p1,p2,g),'one wave');
    stepUntil(()=>p2.hp<MAX_HP,80);assert(p2.hp<=MAX_HP-(masked?90:55),'damage');near(p2.guard,100);
  }
});
check('Lancer wave: high parry deflects without staggering owner; block drains eight guard',()=>{
  for (const defense of ['parry','block']) {
    rosterVs('lancer');p2.x=620;p2.enter(defense);p2.parryDir='high';p2.stateFrame=0;
    lancerWave(p1,g);updateProjectiles(g);
    while(g.projectiles.length){updateProjectiles(g);}
    assert(p2.hp===MAX_HP,'defense');assert(p1.state==='idle','distant owner safe');
    if(defense==='block')near(p2.guard,92);
  }
});
check('Lancer mask: requires fifty, gains eight on a hit and five when hit, toggle cooldown',()=>{
  rosterVs('lancer');ability('downSpecial');assert(p1.state==='idle'&&!p1.cooldowns.downSpecial,'no bar');
  p2.x=560;strike('light');near(p1.mask,8);p1.enter('idle');incoming('light');near(p1.mask,13);
  p1.enter('idle');p1.mask=50;ability('downSpecial');step(18);assert(p1.masked,'wear mask');
  assert(p1.cooldowns.downSpecial>0,'toggle cooldown');ability('downSpecial');assert(p1.masked,'cannot toggle yet');
});
check('Lancer mask: speed and damage bonuses include medium and air; voluntary removal preserves bar',()=>{
  for(const name of ['medium','air','airMedium','heavy','airHeavy']){
    rosterVs('lancer');p1.masked=true;p1.mask=100;incoming(name,p1,p2);
    assert(MAX_HP-p2.hp===Math.round(MOVES[name].dmg*1.05*1.2),'bonus '+name);
  }
  rosterVs('lancer');p1.masked=true;p1.mask=75;p1.vx=4;p1.physics(g);near(p1.x,505);
  ability('downSpecial');step(12);assert(!p1.masked&&p1.mask>70,'keeps bar');
});
check('Lancer mask: drains over six seconds; ground and air heavies and large hit shatters for thirty frames',()=>{
  for(const name of ['heavy','airHeavy','grab']){
    rosterVs('lancer');p1.masked=true;p1.mask=100;incoming(name);
    if(name==='grab')step(THROWS.escapeWindow);
    assert(!p1.masked&&p1.mask===0,'hard hit '+name);
    if(name!=='grab')assert(p1.state==='stagger'&&p1.timer===30,'stagger '+name);
    else {releaseThrow(p2,p1,g);p1.endHitstun();p1.kit.update(p1,p2,g);assert(p1.state==='stagger','queued after throw');}
  }
  rosterVs('lancer');p1.masked=true;p1.mask=100;p2.x=1000;step(360);
  assert(!p1.masked&&p1.mask===0&&p1.state==='stagger','empty');
});
check('Lancer Flash Slash: keyboard activation, swept single hit and opposite-side landing for both players/facings',()=>{
  for (const owner of [0,1]) for (const facing of [-1,1]) for (const distance of [80,180]) {
    pickCharacters(owner ? ['rip','lancer'] : ['lancer','rip']);
    const f=fighters[owner], opp=fighters[1-owner];
    f.reset(600,facing);opp.reset(600+distance*facing,-facing);
    const up=owner?'ArrowUp':'KeyW', special=owner?'Semicolon':'KeyT';
    press(up);press(special);step();release(up);release(special);
    assert(f.moveName==='flashSlash'&&f.stateFrame===0,'starts on input');
    near(f.cooldowns.upSpecial,LANCER.flashCooldown);step(LANCER.flashStartup-1);
    near(opp.hp,MAX_HP);near(f.x,600);step();
    near(MAX_HP-opp.hp,63);assert((f.x-opp.x)*facing>0&&f.facing===-facing,'crosses and turns');
    near(Math.abs(f.x-opp.x),LANCER.flashBehind);
    assert(opp.combo===1&&opp.vy===0&&!opp.overheadLaunched,'one grounded strike');
    step(5);assert(opp.combo===1,'no repeated hit');
  }
});
check('Lancer Flash Slash: Light and Medium follow-ups connect as real two-hit combos',()=>{
  for(const facing of [-1,1]) for(const name of ['light','medium']) {
    rosterVs('lancer');p1.reset(600,facing);p2.reset(720+(facing<0?-240:0),-facing);
    ability('upSpecial');step(LANCER.flashStartup);
    assert(p2.combo===1,'first slash');tap(name==='light'?'KeyF':'KeyV');
    assert(p1.moveName===name,'cancel into '+name);stepUntil(()=>p2.combo===2,16);
    assert(p2.state==='hitstun'&&p1.facing===-facing,'same combo from behind');
  }
});
check('Lancer Flash Slash: block cannot cancel recovery and defender can punish from the new side',()=>{
  for (const facing of [-1,1]) {
    rosterVs('lancer');p1.reset(600,facing);p2.reset(600+120*facing,-facing);press('Quote');
    ability('upSpecial');step(LANCER.flashStartup);near(p2.hp,MAX_HP);
    assert(p2.state==='blockstun'&&p1.moveAbsorbed&&p1.move.recovery===28,'blocked recovery');
    tap('KeyF');assert(p1.moveName==='flashSlash','cannot cancel block');
    stepUntil(()=>p2.state==='block',25);release('Quote');step();tap('Comma');
    stepUntil(()=>p1.hp<MAX_HP,10);assert(p1.state==='hitstun','punished slash');
  }
});
check('Lancer Flash Slash: fixed-distance miss, jump avoidance, full recovery and no rear hit',()=>{
  for (const distance of [350,-150]) {
    rosterVs('lancer');p1.reset(500,1);p2.reset(850,-1);
    ability('upSpecial');p2.x=500+distance;step(LANCER.flashStartup);near(p1.x,760);near(p2.hp,MAX_HP);
    step(28);assert(p1.state==='attack','still recovering');step();assert(p1.state==='idle','miss recovered');
  }
  rosterVs('lancer');p2.x=620;p2.y=FLOOR-300;p2.enter('air');ability('upSpecial');step(LANCER.flashStartup);
  near(p2.hp,MAX_HP);assert(p1.move.recovery===28,'jump avoids high slash');
});
check('Lancer Flash Slash: interruptible startup/recovery, one-tick blink dodge, no stun escape and cooldown',()=>{
  for(const frame of [3,LANCER.flashStartup,LANCER.flashStartup+1]) {
    rosterVs('lancer');p1.kit.upSpecial(p1);p1.stateFrame=frame;incoming('heavy');
    assert((p1.hp===MAX_HP)===(frame===LANCER.flashStartup),'dodge only during blink');
  }
  for(const state of ['hitstun','stagger','blockstun','thrown']) {
    rosterVs('lancer');p1.enter(state);p1.hitstun=60;p1.timer=60;p1.thrownBy=1;if(state==='thrown')p2.enter('throw');
    p1.input.held.up=true;p1.input.pressedAt.special=g.frame;p1.input.frame=g.frame;
    assert(!p1.trySpecial(p1.input),'cannot escape '+state);
  }
  rosterVs('lancer');p2.x=1000;ability('upSpecial');step(38);ability('upSpecial');
  assert(p1.moveName==='flashSlash'&&p1.state!=='attack'&&p1.cooldowns.upSpecial>0,'cooldown prevents repeat');
});
check('Lancer Flash Slash: high parry, phased targets and invincible targets keep their defenses',()=>{
  for(const defense of ['parry','burst','bulletTime']) {
    rosterVs('lancer',defense==='bulletTime'?'gooner':'rip');p2.x=620;ability('upSpecial');step(7);
    p2.enter(defense);p2.parryDir='high';p2.stateFrame=defense==='bulletTime'?5:0;
    step();near(p2.hp,MAX_HP);
    if(defense==='parry')assert(p1.state==='stagger','parry punishes');
    else assert(p1.move.recovery===28&&p1.moveAbsorbed,'no clean-hit reward');
  }
});
check('Lancer Flash Slash: walls, masked damage, pause/hit-stop, finite poses and CPU choice',()=>{
  for(const facing of [-1,1]) {
    rosterVs('lancer');const wall=facing>0?WALL_R-HALF_W:WALL_L+HALF_W;
    p1.reset(wall-120*facing,facing);p2.reset(wall,-facing);p1.mask=100;p1.masked=true;
    ability('upSpecial');g.paused=true;const before=p1.x;tick();near(p1.x,before);near(p1.stateFrame,0);
    g.paused=false;g.hitstopLeft=2;tick();near(p1.stateFrame,0);step(LANCER.flashStartup+1);
    near(MAX_HP-p2.hp,76);assert((p1.x-p2.x)*facing>0,'corner crossing');
    for(const f of fighters)assert(f.x>=WALL_L+HALF_W&&f.x<=WALL_R-HALF_W,'inside arena');
    for(let sf=0;sf<40;sf+=.5)assert(poseIsFinite(animatedPose(p1,sf,sf)),'flash pose');
  }
  rosterVs('lancer');assert(p1.kit.cpuChoice(p1,p2,120)==='upSpecial','CPU flash at grounded opponent');
  p2.enter('block');assert(p1.kit.cpuChoice(p1,p2,120)!=='upSpecial','CPU avoids known block');
  p1.reset(500,1);assert(p1.flashSlash===null,'round reset clears flash');
});
check('Lancer barrage: deterministic six/fourteen slashes, exact damage, mask cost, opposite side and throw locks',()=>{
  for(const masked of [false,true]){
    rosterVs('lancer');p1.masked=masked;p1.mask=100;p2.x=560;newThrow();
    const order=p1.barrage.slashes.join();near(p1.mask,100);
    for(let i=0;i<THROWS.escapeWindow;i++)updateThrowEscapes(g);
    near(p1.mask,masked?85:100);
    p1.ultimate=p2.ultimate=100;assert(!activateDomain(p1,g)&&!activateDomain(p2,g),'throw locks');
    stepUntil(()=>p1.state==='throwRecover',130);
    assert(p1.barrage.done===(masked?14:6),'slashes');near(MAX_HP-p2.hp,masked?150:90);
    assert(p1.x>p2.x&&p1.facing===-1,'opposite side');
    rosterVs('lancer');p1.masked=masked;p1.mask=100;newThrow();assert(p1.barrage.slashes.join()===order,'repeatable');
  }
});
check('Soul Sky: correct domain, outward drift and one mini wave for both landed and whiffed normals',()=>{
  for(const hit of [false,true]){
    rosterVs('lancer');beginDomain(0,g);assert(DOMAIN_NAMES.lancer==='SOUL SKY'&&!tooChill(p2,g)&&!hotbox(p1,g)&&!stenchActive(g),'type');
    const x=p2.x;p2.vx=0;p2.physics(g);near(p2.x-x,1.5);
    if(hit)p2.x=560;p1.startAttack('medium');step(10);assert(p1.normalWaveSent && (hit ? p2.hp < MAX_HP-68 : g.projectiles[0]?.mini),'mini');
    const count=g.projectiles.length;p1.kit.update(p1,p2,g);assert(g.projectiles.length===count,'one per normal');
    p2.enter('hitstun');p2.vx=0;const locked=p2.x;p2.physics(g);near(p2.x,locked);
  }
});
check('Lancer wave and mask respect Bullet Time, Burst invincibility and hard single hits',()=>{
  rosterVs('lancer','gooner');p1.masked=true;p1.mask=100;p2.x=620;p2.enter('bulletTime');p2.stateFrame=5;
  lancerWave(p1,g);for(let i=0;i<18;i++)updateProjectiles(g);near(p2.hp,MAX_HP);
  rosterVs('lancer');p1.masked=true;p1.mask=100;p2.move={...MOVES.light,fixedDamage:80};p2.moveName='largeHit';p2.moveMomentum=0;
  applyHit(p2,p1,{x:p1.x,y:FLOOR-100},g);assert(!p1.masked&&p1.timer===30,'large hit shatter');
});
