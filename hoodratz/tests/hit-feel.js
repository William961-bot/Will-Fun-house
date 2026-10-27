// Hit feel (render.js hitJolt, combat.js landHit): layered hit sounds, attacker recoil and victim shake. Presentation only.
check('Hit feel: crack-layered hit sounds, the attacker bounces back, the victim shakes only during the freeze, logic untouched',()=>{
  const heard=[],orig=g.sound;g.sound=n=>heard.push(n);
  try{
    rosterVs('haze','rip');p1.reset(500,1);p2.reset(560,-1);const x1=p1.x,x2=p2.x;
    incoming('light',p1,p2);assert(heard.includes('hit')&&SOUND_LAYERS.hit.every(l=>SOUND_EVENTS[l]),'light hit sound + crack');
    assert(p1.recoil?.dir===-1&&p1.recoil.size===HIT_FEEL.recoil&&p2.jolt?.size===HIT_FEEL.shake,'recoil and jolt recorded');
    assert(p1.x===x1&&p2.x===x2,'no logic movement from the effects');
    g.hitstopLeft=4;assert(hitJolt(p1,g)<0,'attacker pushed back, away from the hit');assert(Math.abs(hitJolt(p2,g))===HIT_FEEL.shake,'victim shakes in the freeze');
    g.hitstopLeft=0;g.frame++;assert(hitJolt(p2,g)===0,'no shake once the game runs again');assert(hitJolt(p1,g)<0,'recoil eases out');
    g.frame+=HIT_FEEL.recoilFrames;assert(hitJolt(p1,g)===0,'recoil done');
    heard.length=0;rosterVs('haze','rip');p1.reset(500,1);p2.reset(560,-1);p1.facing=-1;p1.x=620;incoming('heavy',p1,p2);
    assert(heard.includes(MOVES.heavy.hitstop>=HIT_FEEL.heavyHitstop?'hitHeavy':'hit'),'heavy sound '+heard);
    assert(p1.recoil.dir===1,'recoil follows facing');
    const x=p1.x;g.hitstopLeft=3;drawFighter(STUB_CANVAS,p1,0,16,g);drawFighter(STUB_CANVAS,p2,0,16,g);assert(p1.x===x&&!p1.jolting,'draw restores position');
    rosterVs('duttpack','rip');p1.reset(300,1);p2.reset(600,-1);launchFreeKick(p1,g);for(let i=0;i<40&&p2.hp===MAX_HP;i++)step();
    assert(p2.hp<MAX_HP&&!p1.recoil,'a projectile hit does not recoil the distant thrower');
  }finally{g.sound=orig;g.hitstopLeft=0;}
});
check('Domain meter lock: the owner builds no ultimate from cutscene to end; the opponent still does',()=>{
  rosterVs('haze','rip');p1.reset(500,1);p2.reset(560,-1);
  try{
    g.domainSequence={kind:'cutscene',owner:0,type:'haze',framesLeft:DOMAIN.cutsceneFrames};
    gainMeter(p1,METER_GAIN.hit);assert(p1.ultimate===0,'locked during the cutscene');
    g.domainSequence=null;beginDomain(0,g);
    incoming('light',p1,p2);gainMeter(p1,METER_GAIN.perfectParry);
    assert(p1.ultimate===0,'locked while the domain runs: '+p1.ultimate);assert(p2.ultimate>0,'the opponent still gains');
    g.domain.framesLeft=1;updateDomain(g);assert(!g.domain,'domain ended');gainMeter(p1,METER_GAIN.hit);assert(p1.ultimate===METER_GAIN.hit,'gains again once it ends');
  }finally{g.domain=null;g.domainSequence=null;}
});
