// Sirnivas: the $SIRN stock, Slot Machine / Invest / Buy the Dip, Slot Machine Slam, ALL IN and seeded gambling.
// Uses helpers from milestone5.js, character-select.js, animation.js, grabs.js, lancer.js, duttpack.js (STUB_CANVAS) and tonka.js (hitsTaken).
function sirnVs(opponent = 'rip', gap = 350) { rosterVs('sirnivas', opponent); p1.reset(500, 1); p2.reset(500 + gap, -1); }
const sirnCoins = (owner = 0) => g.projectiles.filter(p => (p.kind === 'slotCoin' || p.kind === 'jackpotCoin') && p.owner === owner);
function forceSlot(result) { p1.slot = { result, reels: result === 'jackpot' ? ['coin', 'coin', 'coin'] : result === 'bust' ? ['skull', 'skull', 'skull'] : ['coin', 'coin', 'arrow'] }; }
function lightDamage() { sirnVs('rip', 60); incoming('light', p1, p2); return MAX_HP - p2.hp; }

check('Sirnivas joins the roster with mirror colours, every per-character table and finite poses',()=>{
  assert(ROSTER.includes('sirnivas')&&CHARACTERS.sirnivas.home.label==='TRADING FLOOR · NEW YORK'&&THROWS.sirnivas,'roster');
  pickCharacters(['sirnivas','sirnivas']);assert(p1.kit===SIRNIVAS_ABILITIES&&p2.stats.color===CHARACTERS.sirnivas.altColor,'mirror');
  assert(CHARACTER_GUARDS.sirnivas&&GUARD_RECOIL.sirnivas&&CHARACTER_RUNS.sirnivas&&DOMAIN_NAMES.sirnivas==='ALL IN'&&!DOMAIN_MUSIC.sirnivas,'tables');
  for(const n of ['light','low','overhead','heavy','air'])assert(SIGNATURE_TIMELINES['sirnivas_'+n],'timeline '+n);
  for(const facing of [1,-1]) {
    for(const name of Object.keys(MOVES)) {
      sirnVs();p1.facing=facing;if(MOVES[name].air){p1.y=FLOOR-90;p1.vy=-2;}
      p1.startAttack(name);
      for(let f=0;f<=p1.move.startup+p1.move.active+p1.move.recovery;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),`${name} ${f}`);}
    }
    for(const [state,frames] of [['slotPull',46],['investBuy',10],['dipStance',40]]) {
      sirnVs();p1.facing=facing;p1.enter(state);p1.abilityFrames=frames;forceSlot('win');
      for(let f=0;f<=frames;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),state+' '+f);drawSirnivasBody(STUB_CANVAS,p1,animatedPose(p1,f,f),f);}
    }
    for(const state of ['idle','walk','run','block']) for(let t=0;t<120;t+=13){sirnVs();p1.facing=facing;p1.enter(state);p1.animationFrame=t;p1.stateFrame=t;assert(poseIsFinite(animatedPose(p1,t,t)),state+' '+t);}
  }
  sirnVs();p1.stockMoveAt=g.frame-SIRNIVAS.reactFrames/2;p1.stockMoveDir=1;assert(sirnivasIdle(p1,0).hF[1]<-150,'fist pump on a tick up');
  p1.stockMoveDir=-1;assert(sirnivasIdle(p1,0).hF[1]<-130&&sirnivasIdle(p1,0).hF[0]<20,'facepalm on a tick down');
  p1.stockMoveAt=-9999;assert(sirnivasIdle(p1,0).hB[1]>-120,'checking the phone');
  drawSirnivasMeter(STUB_CANVAS,p1);drawSirnivasPortrait(STUB_CANVAS,0,0,80,CHARACTERS.sirnivas);
});
check('$SIRN: +6 landed, −8 taken, half when blocked, drifts back to 50, Bull and Bear change damage and speed, resets each round',()=>{
  sirnVs('rip',60);incoming('light',p1,p2);near(p1.stock,56);p2.enter('idle');incoming('light');near(p1.stock,48);
  sirnVs('rip',60);p2.enter('block');incoming('light',p1,p2);near(p1.stock,53);
  sirnVs('rip',60);p1.enter('block');incoming('light');near(p1.stock,46);
  sirnVs();p1.stock=60;p1.stockQuietAt=g.frame-SIRNIVAS.driftDelay;step(60);assert(Math.abs(p1.stock-59)<.05,'drift '+p1.stock);
  sirnVs();p1.stock=40;p1.stockQuietAt=g.frame;step(60);near(p1.stock,40);
  for(const [stock,dmg,speed] of [[70,SIRNIVAS.bullDamage,SIRNIVAS.bullSpeed],[50,1,1],[30,SIRNIVAS.bearDamage,SIRNIVAS.bearSpeed]]) {
    sirnVs();p1.stock=stock;near(damageScale(p1,p2),dmg);near(rosterSpeed(p1),speed);
  }
  const base=lightDamage();sirnVs('rip',60);p1.stock=90;incoming('light',p1,p2);const bull=MAX_HP-p2.hp;
  sirnVs('rip',60);p1.stock=10;incoming('light',p1,p2);const bear=MAX_HP-p2.hp;assert(bull>base&&bear<base,`bull ${bull} base ${base} bear ${bear}`);
  sirnVs();step(SIRNIVAS.historyEvery*40);assert(p1.stockHistory.length===SIRNIVAS.historyLength,'history buffer');
  p1.stock=90;startRound();near(p1.stock,SIRNIVAS.stockStart);
});
check('Slot Machine: seeded results, Bull/Bear odds, jackpot 90 / win 45 / bust can\'t KO, one coin at a time, cooldown, Siglarp\'s own seed',()=>{
  sirnVs();p1.luckSeed=12345;const a=[];for(let i=0;i<30;i++)a.push(rollSlots(p1).result);
  p1.luckSeed=12345;for(let i=0;i<30;i++)assert(rollSlots(p1).result===a[i],'repeatable '+i);
  for(const [stock,zone] of [[50,'neutral'],[90,'bull'],[10,'bear']]) {
    sirnVs();p1.stock=stock;p1.luckSeed=777;const n=6000,count={jackpot:0,win:0,bust:0};
    for(let i=0;i<n;i++){const r=rollSlots(p1);count[r.result]++;
      if(r.result==='win')assert(new Set(r.reels).size===2,'two matching');else assert(new Set(r.reels).size===1,'three of a kind');}
    assert(Math.abs(count.jackpot/n-SIRNIVAS.odds[zone].jackpot)<.02&&Math.abs(count.bust/n-SIRNIVAS.odds[zone].bust)<.02,zone+' '+JSON.stringify(count));
  }
  sirnVs();ability();assert(p1.state==='slotPull'&&p1.cooldowns.special===SIRNIVAS.slotCooldown&&p1.slot,'pull');forceSlot('jackpot');
  const jackpot=hitsTaken(p2,90);near(jackpot[0],SIRNIVAS.jackpotDamage);
  sirnVs();ability();forceSlot('win');step(SIRNIVAS.slotFire);assert(sirnCoins().length===1&&!p1.kit.special(p1,p2,g),'one coin at a time');
  near(hitsTaken(p2,60)[0],SIRNIVAS.coinDamage);
  sirnVs();ability();forceSlot('bust');stepUntil(()=>p1.state==='stagger',SIRNIVAS.slotFire+2);
  near(p1.hp,MAX_HP-SIRNIVAS.bustDamage);near(p1.stock,SIRNIVAS.stockStart-SIRNIVAS.bustStock);assert(!sirnCoins().length,'no coin');
  stepUntil(()=>p1.state==='idle',SIRNIVAS.bustStagger+2);
  sirnVs();p1.hp=10;ability();forceSlot('bust');step(SIRNIVAS.slotFire+1);assert(p1.hp===1&&!p1.koed,'bust can\'t KO');
  rosterVs('siglarp','sirnivas');p1.reset(500,1);p2.reset(850,-1);const seed=p2.luckSeed;
  p1.siglarpCopy={id:'sirnivas',key:'special'};ability();assert(p1.state==='slotPull'&&p1.slot&&p2.luckSeed===seed,'copy rolls its own seed');
  stepUntil(()=>p1.state!=='slotPull',60);
});
check('Invest: pays 50 up front (refused at 60 HP or less), cashes out +50 and heals on the next landed hit, liquidates when hit first or after 4 s',()=>{
  const light=lightDamage();
  sirnVs('rip',60);ability('downSpecial');assert(p1.state==='investBuy'&&p1.position,'bought');near(p1.hp,MAX_HP-SIRNIVAS.investCost);
  near(p1.cooldowns.downSpecial,SIRNIVAS.investCooldown);step(SIRNIVAS.investFrames+1);
  incoming('light',p1,p2);near(MAX_HP-p2.hp,light+SIRNIVAS.investBonus);near(p1.hp,MAX_HP);assert(!p1.position,'closed');
  near(p1.stock,SIRNIVAS.stockStart+SIRNIVAS.stockHit+SIRNIVAS.investStock);
  sirnVs('rip',60);p1.hp=SIRNIVAS.investMinHp;ability('downSpecial');assert(p1.state!=='investBuy'&&p1.hp===SIRNIVAS.investMinHp&&!p1.cooldowns.downSpecial,'refused');
  sirnVs('rip',60);ability('downSpecial');step(SIRNIVAS.investFrames+1);p2.enter('block');incoming('light',p1,p2);assert(p1.position,'a blocked hit leaves it open');
  sirnVs('rip',60);ability('downSpecial');step(SIRNIVAS.investFrames+1);p2.enter('idle');incoming('light');
  assert(!p1.position&&p1.hp<MAX_HP-SIRNIVAS.investCost,'liquidated, the 50 stays gone');near(p1.stock,SIRNIVAS.stockStart-SIRNIVAS.stockTaken-SIRNIVAS.investStock);
  sirnVs();ability('downSpecial');step(SIRNIVAS.investLife+2);assert(!p1.position&&p1.hp===MAX_HP-SIRNIVAS.investCost,'expired');
  sirnVs();ability('downSpecial');startRound();assert(!p1.position,'round reset');
  keysDown.clear();startMatch(true,undefined,['sirnivas','rip']);g.phase='fight';g.inputLocked=false;g.practice.infinite=true;p1.reset(500,1);p2.reset(850,-1);step();
  ability('downSpecial');assert(p1.state==='investBuy'&&p1.hp===MAX_HP-SIRNIVAS.investCost,'practice: still costs health');
});
check('Buy the Dip: strikes and projectiles in frames 3-20 are countered for 40 + (100 − stock) × 0.6; frames 2 and 21 and grabs are not',()=>{
  for(const stock of [0,50,100]) {
    sirnVs('rip',80);ability('upSpecial');stepUntil(()=>p1.state==='dipStance',4);p1.stock=stock;p1.stateFrame=6;
    incoming('light');assert(p1.hp===MAX_HP&&p1.dipCounter,'countered at '+stock);near(p1.stock,Math.min(100,stock+SIRNIVAS.dipStock));
    step();assert(p1.state==='attack'&&p1.moveName==='dipUppercut','uppercut');
    stepUntil(()=>p2.hp<MAX_HP,20);near(MAX_HP-p2.hp,dipDamage(stock));
  }
  near(dipDamage(100),40);near(dipDamage(50),70);near(dipDamage(0),100);
  for(const frame of [2,21]){sirnVs('rip',80);ability('upSpecial');stepUntil(()=>p1.state==='dipStance',4);p1.stateFrame=frame;incoming('light');assert(p1.hp<MAX_HP,'not countered at '+frame);}
  sirnVs('rip',80);ability('upSpecial');stepUntil(()=>p1.state==='dipStance',4);p1.stateFrame=8;incoming('heavy');assert(p1.hp===MAX_HP,'heavies are strikes too');
  sirnVs('rip',60);ability('upSpecial');stepUntil(()=>p1.state==='dipStance',4);p1.stateFrame=8;incoming('grab');assert(p1.state==='thrown','grabs beat it');
  sirnVs('rip',300);ability('upSpecial');stepUntil(()=>p1.state==='dipStance',4);p1.stateFrame=5;
  spawnProjectile(g,{kind:'football',owner:1,x:p1.x+20,y:p1.y-100,facing:-1,vx:-1,framesLeft:30,box:{w:30,h:30},name:'test',move:{...MOVES.light,fixedDamage:30}});
  step();assert(p1.hp===MAX_HP,'projectile countered');
  sirnVs();ability('upSpecial');stepUntil(()=>p1.state==='dipStance',4);near(p1.cooldowns.upSpecial,SIRNIVAS.dipCooldown);
  step(SIRNIVAS.dipThrough+4);assert(p1.state==='dipStance','still sadly refreshing');stepUntil(()=>p1.state==='idle',SIRNIVAS.dipWhiff);
  rosterVs('siglarp','sirnivas');p1.reset(600,1);p2.reset(680,-1);p1.siglarpCopy={id:'sirnivas',key:'upSpecial'};ability();
  assert(p1.state==='dipStance','copied stance');p1.stateFrame=6;incoming('light');assert(p1.hp===MAX_HP,'copied counter');
});
check('Slot Machine Slam: stuffed in the machine on the side with room, head in the reels, JACKPOT eject for 90, escapable, stock +6',()=>{
  for(const [x,facing] of [[600,1],[WALL_R-90,1],[WALL_L+90,-1]]) {
    rosterVs('sirnivas','rip');p1.reset(x,facing);p2.reset(x+60*facing,-facing);tap('KeyJ');stepUntil(()=>p1.state==='throw',12);
    assert(p1.throwKind==='sirnivas'&&p1.throwEscape,'normal escape window');
    p1.ultimate=ULTIMATE_MAX;assert(!activateDomain(p1,g),'no domain mid-throw');
    let hidden=false;
    while(p1.state==='throw'){
      assert(poseIsFinite(throwPose(p1,'att',p1.stateFrame))&&poseIsFinite(throwPose(p1,'def',p1.stateFrame)),'poses');
      assert(p2.x>=WALL_L+HALF_W-1&&p2.x<=WALL_R-HALF_W+1,'inside');hidden ||= sirnivasHidesVictim(p2);drawSirnivasFx(STUB_CANVAS,g);step();
    }
    near(MAX_HP-p2.hp,90);assert(hidden,'inside the machine');near(p1.stock,SIRNIVAS.stockStart+SIRNIVAS.stockHit);
    const m=p1.sirnMachine;assert(m&&m.x>=WALL_L+HALF_W-1&&m.x<=WALL_R-HALF_W+1,'machine in the arena');step(20);assert(!p1.sirnMachine,'machine fades');
  }
  sirnVs('rip',60);tap('KeyJ');stepUntil(()=>p1.state==='throw',12);tap('KeyL');step();assert(p1.state!=='throw'&&p2.hp===MAX_HP,'escapable');
  rosterVs('siglarp','sirnivas');p1.reset(600,1);p2.reset(660,-1);tap('KeyJ');stepUntil(()=>p1.state==='throw',12);assert(p1.throwKind==='sirnivas','Siglarp plays the slam');
  stepUntil(()=>p1.state!=='throw',100);near(MAX_HP-p2.hp,90);
});
check('ALL IN: pays 40% (never below 1) only when it begins, stock pinned at 100, their damage and speed crash to ×0.7, cash out or liquidate, KO, fade',()=>{
  sirnVs();p1.hp=800;p1.ultimate=ULTIMATE_MAX;assert(activateDomain(p1,g),'cutscene');near(p1.hp,800);
  for(let i=0;i<DOMAIN.cutsceneFrames;i++){drawSirnivasFx(STUB_CANVAS,g);step();}
  assert(allInDomain()?.owner===0&&p1.hp===480&&g.domain.paid===320,'paid '+p1.hp);near(p1.stock,100);
  near(marketCrash(p1),1);assert(marketCrash(p2)>.99,'starts at x1');
  sirnVs();p1.hp=1;beginDomain(0,g,'sirnivas');assert(p1.hp===1&&g.domain.paid===0,'never below 1');
  rosterVs('sirnivas','haze');beginDomain(1,g,'haze');p1.ultimate=ULTIMATE_MAX;activateDomain(p1,g);assert(g.domainSequence?.kind==='clash','clash');
  step(DOMAIN.clashFrames+1);assert(g.domain?.type==='haze'&&p1.hp===MAX_HP,'a lost clash costs nothing');
  sirnVs('rip',60);beginDomain(0,g,'sirnivas');incoming('light');near(p1.stock,100);
  sirnVs();beginDomain(0,g,'sirnivas');step(DOMAIN.activeFrames-1);
  assert(Math.abs(marketCrash(p2)-SIRNIVAS.crashFloor)<.01&&Math.abs(rosterSpeed(p2)-SIRNIVAS.crashFloor)<.01&&Math.abs(damageScale(p2,p1)-SIRNIVAS.crashFloor)<.01,'crashed to x0.7');
  sirnVs('rip',60);beginDomain(0,g,'sirnivas');const afterPay=p1.hp,paid=g.domain.paid;
  while(g.domain.dealt<paid){p2.enter('idle');p2.combo=0;incoming('heavy',p1,p2);p2.hp=MAX_HP;}
  g.domain.framesLeft=1;step();assert(!g.domain&&p1.hp===afterPay+paid,'cashed out');
  sirnVs();beginDomain(0,g,'sirnivas');const kept=p1.hp;g.domain.framesLeft=1;step();assert(p1.hp===kept,'liquidated');
  sirnVs('rip',60);beginDomain(0,g,'sirnivas');p2.hp=5;incoming('light',p1,p2);assert(p2.koed&&g.popups.some(p=>p.text==='ALL IN · WON IT ALL!'),'won it all');
  sirnVs('rip',60);beginDomain(0,g,'sirnivas');p1.hp=5;incoming('light');assert(p1.koed&&g.domain?.settled,'KO\'d: nothing back');
  sirnVs();beginDomain(0,g,'sirnivas');startRound();assert(!g.domain&&p1.hp===MAX_HP&&p1.stock===SIRNIVAS.stockStart&&marketCrash(p2)===1,'round reset');
  sirnVs();beginDomain(0,g,'sirnivas');
  for(let i=0;i<DOMAIN.activeFrames;i++){drawDomainAtmosphere(STUB_CANVAS,g);drawSirnivasFx(STUB_CANVAS,g);step();}
  assert(!g.domain&&g.domainFade?.type==='sirnivas'&&g.domainFade.owner===0,'fade keeps its owner');
  for(let i=0;i<DOMAIN.fadeFrames;i++){drawDomainAtmosphere(STUB_CANVAS,g);step();}
  assert(!g.domainFade,'fade finished');
  rosterVs('siglarp','sirnivas');p1.reset(500,1);p2.reset(850,-1);beginDomain(0,g,'sirnivas');assert(p1.hp===600&&allInDomain()?.owner===0,'Siglarp larps it and pays');
  step(240);assert(marketCrash(p2)<1,'and crashes the opponent');
});
check('CPU Sirnivas uses Slot Machine, Invest and Buy the Dip, and skips ALL IN when low at levels 4-5',()=>{
  const used=new Set();
  for(const level of [3,5]) {
    startMatch(false,[{type:'cpu',level:5},{type:'cpu',level}],['rip','sirnivas']);g.phase='fight';g.inputLocked=false;keysDown.clear();
    for(let i=0;i<8000&&used.size<3;i++){
      step();for(const s of ['slotPull','investBuy','dipStance'])if(p2.state===s)used.add(s);
      if(g.phase!=='fight'){g.phase='fight';g.inputLocked=false;p1.hp=p2.hp=MAX_HP;p1.koed=p2.koed=false;}
    }
  }
  assert(used.size===3,'CPU abilities '+[...used]);
  sirnVs();p1.hp=150;assert(SIRNIVAS_ABILITIES.cpuDomainOk(p1,5)===false&&SIRNIVAS_ABILITIES.cpuDomainOk(p1,3)===true,'domain choice');
});
check('Determinism: the same match twice gives identical slot results and health',()=>{
  const run=()=>{
    g.frame=0;startMatch(false,[{type:'cpu',level:4},{type:'cpu',level:5}],['sirnivas','sirnivas']);g.phase='fight';g.inputLocked=false;keysDown.clear();
    const log=[];
    for(let i=0;i<1500;i++){step();for(const f of fighters)if(f.state==='slotPull'&&f.stateFrame===1)log.push(f.index+f.slot.result);
      if(g.phase!=='fight'){g.phase='fight';g.inputLocked=false;p1.hp=p2.hp=MAX_HP;p1.koed=p2.koed=false;}}
    return JSON.stringify([log,p1.hp,p2.hp,p1.stock,p2.stock]);
  };
  const a=run(),b=run();assert(a===b,a+' vs '+b);
});
