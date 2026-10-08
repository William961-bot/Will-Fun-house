check('Blue Cheese dread: distance, proximity, vanish, hits, missed normals and wrong parry gains',()=>{
  rosterVs('cheese');p2.dread=40;for(let i=0;i<60;i++)updateRosterWorld(g);near(p2.dread,43);
  p2.x=600;for(let i=0;i<60;i++)updateRosterWorld(g);near(p2.dread,37);
  p1.enter('vanished');for(let i=0;i<60;i++)updateRosterWorld(g);near(p2.dread,52);
  p1.enter('idle');incoming('light',p1,p2);near(p2.dread,57);
  p2.enter('idle');p2.x=900;p2.startAttack('medium');step(13);assert(p2.dread>=63,'whiff');
  p2.enter('parry');p2.parryDir='low';const before=p2.dread;incoming('light',p1,p2);near(p2.dread-before,11);
});
check('Blue Cheese dread: thresholds slow movement and shrink perfect parry; scare waits for a free victim',()=>{
  rosterVs('cheese');p2.dread=33;near(rosterSpeed(p2),.92);p2.dread=66;near(perfectWindow(p2),3);
  p2.enter('hitstun');p2.hitstun=10;addDread(p2,40);updateRosterWorld(g);assert(p2.state==='hitstun'&&p2.dreadQueued,'wait');
  p2.enter('idle');p2.x=570;updateRosterWorld(g);assert(p2.state==='stagger'&&p2.timer===45&&g.scareLeft===3,'scare');near(p2.dread,40);
  startRound();near(p2.dread,0);assert(!p2.dreadQueued&&!g.scareLeft,'reset');
});
check('Blue Cheese Vanish: fade, invincible gone, recovery behind opponent, attack returns with launcher',()=>{
  rosterVs('cheese');ability();step(10);assert(p1.state==='vanished'&&p1.invincible,'gone');
  incoming('heavy');near(p1.hp,MAX_HP);assert(!activateDomain(p1,g),'no action while gone');
  step(50);assert(p1.state==='vanishRecover'&&Math.abs(p1.x-p2.x)===70&&p1.facing===Math.sign(p2.x-p1.x),'behind');
  step(8);assert(p1.state==='idle'&&p1.cooldowns.special>0,'recover');
  rosterVs('cheese');ability();step(12);press('KeyF');step();release('KeyF');
  assert(p1.moveName==='overhead','early swing');stepUntil(()=>p2.hp<MAX_HP,35);assert(p2.overheadLaunched,'launcher');
});
check('Blue Cheese traps: two max, exact floor hit, jump avoids, owner safe, round reset',()=>{
  rosterVs('cheese');p2.x=1000;
  for(let i=0;i<3;i++){p1.cooldowns.downSpecial=0;ability('downSpecial');step(16);p1.x+=100;}
  assert(p1.traps.length===2,'two traps');const x=p1.traps[0].x;p2.x=x;p2.y=FLOOR-70;p2.vy=-1;updateRosterWorld(g);near(p2.hp,MAX_HP);
  p2.y=FLOOR;p2.vy=0;p2.enter('walk');const dread=p2.dread;updateRosterWorld(g);
  near(MAX_HP-p2.hp,40);assert(p2.hitstun===24,'stun');assert(p2.dread>=dread+9.8,'dread');
  p1.x=p1.traps[0].x;updateRosterWorld(g);near(p1.hp,MAX_HP);
  startRound();assert(!p1.traps.length,'clear');
});
check('Blue Cheese Phone Call: neutral fail staggers, any parry or block ignores, no damage',()=>{
  for(const ignored of [false,'parry','block']){
    rosterVs('cheese');p2.x=650;ability('upSpecial');step(24);const dread=p2.dread;
    if(ignored){p2.enter(ignored);p2.parryDir='low';if(ignored==='block')press('Quote');}
    step(12);release('Quote');near(p2.hp,MAX_HP);assert(p1.state==='phoneRecover','open');
    assert((p2.state==='stagger')===!ignored,'answer');if(!ignored)assert(p2.dread>dread+18,'dread');
  }
});
check('Blue Cheese stab throw: five comic beats, ninety damage, thirty dread and walk-away recovery',()=>{
  rosterVs('cheese');p2.x=560;newThrow();p1.ultimate=100;assert(!activateDomain(p1,g),'locked');
  for(const sf of [18,25,31,36,40])THROW_EVENTS.cheese(p1,p2,sf,g);near(p2.dread,10);
  p1.stateFrame=THROWS.cheese.frames;placeVictim(p1,p2);releaseThrow(p1,p2,g);
  near(p2.hp,910);near(p2.dread,30);near(Math.abs(p1.x-p2.x),140);assert(p1.throwRecovery===26&&p2.passOut,'recovery');
});
check('Final Girl Chase: ordinary armor, heavy vulnerability, walk cap, fear pressure, slow and wall escape',()=>{
  rosterVs('cheese');beginDomain(0,g);p1.enter('run');p1.vx=20;p1.physics(g);near(p1.vx,3.2);assert(p1.state==='walk','walk');
  incoming('overhead');assert(p1.state==='walk'&&p1.vy===0,'armor');incoming('heavy');assert(p1.state==='hitstun','heavy');
  near(rosterSpeed(p2),.8);const dread=p2.dread;updateRosterWorld(g);assert(p2.dread>dread,'domain dread');
  p2.x=g.domain.escapeWall;updateDomain(g);assert(!g.domain&&g.popups.some(p=>p.text==='ESCAPED!'),'escape');
});
