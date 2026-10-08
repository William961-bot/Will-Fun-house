check('Teo loot: normal, medium, air and heavy hits fill at most three bottles',()=>{
  for(const name of ['light','medium','air','airMedium','heavy','airHeavy']){
    rosterVs('teo');incoming(name,p1,p2);near(p1.bottles,1);p2.enter('idle');incoming(name,p1,p2);p2.enter('idle');incoming(name,p1,p2);p2.enter('idle');incoming(name,p1,p2);near(p1.bottles,3);
  }
});
check('Teo stages: Buzzed speed/damage, Drunk armor and wobble, ground and air heavies bypasses, overhead cannot launch',()=>{
  rosterVs('teo');p1.tipsy=25;near(rosterSpeed(p1),1.1);incoming('medium',p1,p2);near(MAX_HP-p2.hp,72);
  for(const name of ['light','medium','overhead','heavy','airHeavy']){
    rosterVs('teo');p1.tipsy=60;incoming(name);assert((p1.state==='hitstun')===!!MOVES[name].unblockable,'armor '+name);
    if(name==='overhead')assert(p1.vy===0&&!p1.overheadLaunched,'no launch');
  }
  rosterVs('teo');p1.tipsy=60;p1.startAttack('medium');g.frame=10;assert(attackWobble(p1)!==0,'ground wobble');p1.startAttack('airMedium');near(attackWobble(p1),0);
});
check('Teo blackout: one hundred opens forty frames, resets fifty, no armor; no idle drain with a bottle',()=>{
  rosterVs('teo');addTipsy(p1,100,g);step();assert(p1.state==='blackout'&&p1.tipsy===50,'blackout');assert(!teoDrunk(p1),'unarmored');
  step(39);assert(p1.state==='blackout','full forty');step();assert(p1.state==='idle','recovery');
  p1.bottles=1;p1.tipsy=50;step(60);near(p1.tipsy,50);p1.bottles=0;step(60);near(p1.tipsy,46);
});
check('Teo Chug: bottle requirement, open windup, +twenty-five tipsy; interrupt consumes bottle without reward',()=>{
  rosterVs('teo');ability();assert(p1.state==='idle','no bottle');p1.bottles=1;ability();assert(p1.state==='chug'&&p1.bottles===0,'chug');step(20);assert(p1.tipsy>=24.9,'tipsy');
  rosterVs('teo');p1.bottles=1;ability();incoming('light');step(25);near(p1.tipsy,0);near(p1.bottles,0);
});
check('Teo slots keep individual cooldowns across stage changes and practice infinite clears all',()=>{
  rosterVs('teo');p1.bottles=3;ability();step(20);assert(p1.abilityCooldowns.chug>0,'chug cooldown');
  p1.tipsy=60;p1.enter('idle');ability();assert(p1.state==='bottleWindup'&&p1.abilityCooldowns.bottle>=179,'other ability available');
  p1.tipsy=25;p1.enter('idle');ability();assert(p1.state==='idle','cannot bypass original cooldown');
  g.practice={infinite:true};preparePractice(g);near(p1.abilityCooldowns.chug,0);near(p1.abilityCooldowns.bottle,0);g.practice=null;
});
check('Teo Bottle Throw: tumbling high projectile, one in flight, parry/block, shatter puddle and owner immunity',()=>{
  rosterVs('teo');p1.tipsy=60;p1.bottles=2;ability();step(12);assert(g.projectiles[0]?.kind==='bottle','bottle');
  p1.abilityCooldowns.bottle=0;assert(!p1.kit.special(p1,p2,g),'one bottle');stepUntil(()=>p1.puddles.length>0,100);
  const x=p1.puddles[0].x;p2.x=x;p2.y=FLOOR;p2.vy=0;near(rosterSpeed(p2),.75);p1.x=x;near(rosterSpeed(p1),1);
  for(const defense of ['parry','block']){
    rosterVs('teo');p1.tipsy=60;p1.bottles=1;p2.x=620;ability();step(11);p2.enter(defense);p2.parryDir='high';
    if(defense==='block')press('Quote');stepUntil(()=>!g.projectiles.length&&p1.stateFrame>12,80);release('Quote');near(p2.hp,MAX_HP);
    if(defense==='block')assert(p2.guard<=94.01,'six guard');
  }
});
check('Teo Pickpocket: low hit steals fifteen meter and one bottle, block/parry protect meter',()=>{
  for(const defense of ['idle','block','parry']){
    rosterVs('teo');p2.x=565;p2.ultimate=50;p2.enter(defense);p2.parryDir='low';if(defense==='block')press('Quote');
    ability('downSpecial');step(8);release('Quote');near(p2.hp,MAX_HP);
    if(defense==='idle'){near(p2.ultimate,35);near(p1.bottles,1);near(p1.ultimate,15);}
    else {near(p2.ultimate,defense==='parry'?55:50);near(p1.bottles,0);}
  }
});
check('Teo Stumble Dodge: frames three to fourteen dodge high/low then counter; heavies and grabs connect',()=>{
  for(const name of ['light','low','heavy','grab']){
    rosterVs('teo');p1.tipsy=60;p1.kit.downSpecial(p1);p1.stateFrame=3;incoming(name);
    assert((p1.hp===MAX_HP)===(name!=='heavy'),'damage '+name);
    if(['light','low'].includes(name)){assert(p1.dodged,'dodged');p1.stateFrame=15;p1.kit.update(p1,p2,g);assert(p1.moveName==='stumbleCounter','counter');}
    if(name==='grab')assert(p1.state==='thrown','grab bypass');
  }
  rosterVs('teo');p1.tipsy=60;ability('downSpecial');step(32);assert(p1.state==='stumbleDodge','whiff open');step(2);assert(p1.state==='idle','whiff recovery');
});
check('Teo Smoke Break: thirty open frames recover twenty guard and freeze idle drain for four seconds',()=>{
  rosterVs('teo');p1.tipsy=40;p1.guard=20;p1.framesSinceHit=0;ability('upSpecial');step(30);near(p1.guard,40);assert(p1.smokeHold===240,'hold');step(239);near(p1.tipsy,40);step(2);assert(p1.tipsy<40,'drain resumes');assert(g.clouds.length===0,'no Haze cloud');
});
check('Teo Bellow: cone, high defense, twelve block guard and larger knockback at ninety',()=>{
  for(const tipsy of [60,90]){
    rosterVs('teo');p1.tipsy=tipsy;p2.x=700;ability('upSpecial');stepUntil(()=>p2.hp<MAX_HP,30);assert(p2.vx>15,'push');
    if(tipsy===90)assert(p2.vx>25,'extra push');
  }
  rosterVs('teo');p1.tipsy=60;p2.x=700;press('Quote');ability('upSpecial');step(24);release('Quote');near(p2.hp,MAX_HP);near(p2.guard,88);
});
check('Teo bottle-bash throw: exact ninety, twenty tipsy and one bottle, locked domains',()=>{
  rosterVs('teo');p2.x=560;newThrow();p1.ultimate=p2.ultimate=100;assert(!activateDomain(p1,g)&&!activateDomain(p2,g),'lock');
  stepUntil(()=>p1.state==='throwRecover',90);near(p2.hp,910);near(p1.tipsy,20);near(p1.bottles,1);
});
check('Last Call: Drunk power without blackout, opponent sway/wobble/parry penalty, fifty on expiry or lost clash',()=>{
  rosterVs('teo');beginDomain(0,g);assert(teoDrunk(p1)&&p1.tipsy===60,'domain drunk');addTipsy(p1,100,g);assert(p1.tipsy===99&&!p1.blackoutPending,'no blackout');
  const x=p2.x;g.frame=12;p2.physics(g);assert(p2.x!==x,'sway');near(perfectWindow(p2),3);p2.startAttack('medium');assert(attackWobble(p2)!==0,'wobble');
  g.domain.framesLeft=1;updateDomain(g);near(p1.tipsy,50);
  beginDomain(0,g);beginDomain(1,g);near(p1.tipsy,50);
});

check('new roster: finite normals, custom states, cinematic poses and mirror colors for both sides',()=>{
  const states={lancer:['crescentWindup','maskToggle'],cheese:['vanishFade','vanished','trapDeploy','phoneCall','vanishRecover','phoneRecover'],teo:['chug','bottleWindup','stumbleDodge','smokeBreak','blackout']};
  for(const id of ['lancer','cheese','teo']){
    rosterVs(id,id);assert(p2.stats.color===CHARACTERS[id].altColor,'palette');
    for(const name of Object.keys(MOVES)){p1.startAttack(name);for(let sf=0;sf<80;sf+=.5)assert(poseIsFinite(attackAnim(p1,sf)),id+' '+name);}
    for(const state of states[id]){p1.enter(state);p1.abilityFrames=30;for(let sf=0;sf<100;sf+=.5){p1.stateFrame=Math.floor(sf);assert(poseIsFinite(animatedPose(p1,sf,sf)),id+' '+state);}}
    p1.enter('idle');newThrow();for(let sf=0;sf<p1.throwFrames;sf+=.5)for(const who of ['att','def'])assert(poseIsFinite(throwPose(p1,who,sf)),id+' throw '+who);
    assert(poseIsFinite(rosterDomainPose(p1)),id+' cutscene');
  }
});
check('new arena domains: full meter cutscene, all arena pairings clash and expire after eight seconds',()=>{
  for(const id of ['lancer','cheese','teo'])for(const opp of ['haze','rip','lancer','cheese','teo']){
    rosterVs(id,opp);p1.ultimate=100;assert(activateDomain(p1,g),'activate');step(60);assert(g.domain?.type===id,'cutscene complete');
    p2.ultimate=100;assert(activateDomain(p2,g)&&g.domainSequence.kind==='clash','clash');g.domainSequence.boundary=0;step(180);assert(g.domain?.owner===1,'winner');
    for(let i=0;i<480;i++)updateDomain(g);assert(!g.domain,'expiry');
  }
});
check('new fighters Burst preserves kit meters and practice/round reset clears all temporary kit state',()=>{
  for(const id of ['lancer','cheese','teo']){
    rosterVs(id);p1.mask=60;p1.masked=true;p1.tipsy=70;p1.bottles=2;p1.dread=50;
    p2.enter('hitstun');p2.hitstun=20;const meter=p2.ultimate;press('Quote');press('Period');step();release('Quote');release('Period');
    assert(p2.state==='burst'&&p1.state==='hitstun','Burst bypass armor');near(p1.mask,60- (id==='lancer'?100/360:0));near(p1.tipsy,70);near(p2.ultimate,meter);
    startRound();if(id==='lancer')assert(!p1.masked&&p1.mask===0,'mask reset');if(id==='teo')assert(p1.tipsy===0&&p1.bottles===0&&!p1.puddles.length,'teo reset');if(id==='cheese')assert(!p1.traps.length,'trap reset');
  }
});
check('new CPU tactics choose waves/masks, vanish/traps and stage-appropriate Teo abilities',()=>{
  rosterVs('lancer');assert(p1.kit.cpuChoice(p1,p2,500)==='special','ranged wave');p1.mask=70;assert(p1.kit.cpuChoice(p1,p2,200)==='downSpecial','mask');p2.enter('attack');assert(p1.kit.cpuChoice(p1,p2,200)!=='downSpecial','not into attack');
  rosterVs('cheese');assert(p1.kit.cpuChoice(p1,p2,500)==='downSpecial','trap');assert(p1.kit.cpuChoice(p1,p2,200)==='special','vanish');
  rosterVs('teo');p1.bottles=1;assert(p1.kit.cpuChoice(p1,p2,300)==='special','chug');p1.tipsy=70;assert(p1.kit.cpuChoice(p1,p2,400)==='special','throw');p2.startAttack('light');assert(p1.kit.cpuChoice(p1,p2,100)==='downSpecial','dodge');
});
check('new roster: full two-win matches versus every fighter using real hits and round transitions',()=>{
  for(const id of ['lancer','cheese','teo'])for(const opponent of ROSTER){
    rosterVs(id,opponent);
    for(let round=0;round<2;round++){
      for(let attempt=0;attempt<30&&g.phase==='fight';attempt++){p1.enter('idle');p2.enter('idle');p1.x=500;p2.x=560;incoming('heavy',p1,p2);}
      assert(g.phase==='ko',id+' vs '+opponent+' KO');step(ROUND.koFrames);if(round===0)step(ROUND.introFrames);
    }
    assert(g.phase==='matchOver'&&g.wins[0]===2,id+' vs '+opponent+' match');
  }
});
check('new CPU kits have repeatable match outcomes at levels one, three and five',()=>{
  const run=(id,level)=>{
    keysDown.clear();startMatch(false,[{type:'cpu',level:3},{type:'cpu',level}],['rip',id]);g.frame=0;g.phase='fight';g.inputLocked=false;
    step(1000);return JSON.stringify({phase:g.phase,wins:g.wins,domain:g.domain?.type,players:fighters.map(f=>({x:f.x,hp:f.hp,state:f.state,mask:f.mask,tipsy:f.tipsy,dread:f.dread,bottles:f.bottles,cooldowns:f.cooldowns}))});
  };
  for(const id of ['lancer','cheese','teo'])for(const level of [1,3,5])assert(run(id,level)===run(id,level),id+' CPU '+level);
});
