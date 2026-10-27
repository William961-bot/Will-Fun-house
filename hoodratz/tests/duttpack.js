// Duttpack: Free Kick, Hype Shuffle, Pigeon Strut, Slam Dunk and COOKIEEEEEEE (On the Beat).
// Uses helpers from milestone5.js, character-select.js, animation.js, grabs.js and lancer.js.
function duttVs(opponent = 'rip', gap = 60) { rosterVs('duttpack', opponent); p1.reset(600, 1); p2.reset(600 + gap, -1); }
const STUB_CANVAS = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : STUB_CANVAS, apply: () => STUB_CANVAS, set: () => true });
function beatFrame(n, offset = 0) { return Math.round(g.domain.startFrame - DUTTPACK.beatOffset + n * framesPerBeat() + offset); }

check('Duttpack joins the roster with mirror colours and every per-character table entry',()=>{
  assert(ROSTER.includes('duttpack')&&CHARACTERS.duttpack.home.label&&THROWS.duttpack&&DOMAIN_NAMES.duttpack==='COOKIEEEEEEE','roster');
  pickCharacters(['duttpack','duttpack']);assert(p1.kit===DUTTPACK_ABILITIES&&p2.stats.color===CHARACTERS.duttpack.altColor,'mirror');
  assert(CHARACTER_GUARDS.duttpack&&GUARD_RECOIL.duttpack&&CHARACTER_RUNS.duttpack,'tables');
  for(const n of ['light','low','overhead','heavy','air'])assert(SIGNATURE_TIMELINES['duttpack_'+n],'timeline '+n);
});
check('Duttpack: every normal, movement, defense and kit state gives finite poses in both facings',()=>{
  for(const facing of [1,-1]) {
    for(const name of Object.keys(MOVES)) {
      duttVs();p1.facing=facing;if(MOVES[name].air){p1.y=FLOOR-90;p1.vy=-2;}
      p1.startAttack(name);
      for(let f=0;f<=p1.move.startup+p1.move.active+p1.move.recovery;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),`${name} ${f}`);}
    }
    duttVs();p1.facing=facing;p1.momentum=MOVE.maxMomentum;p1.startAttack('light');
    for(let f=0;f<=18;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),'bicycle '+f);}
    for(const [state,extra] of [['idle'],['walk'],['run'],['dash'],['backdash'],['jumpsquat'],['air'],['land',{landTime:6}],['slide'],['roll'],
        ['parry',{parryDir:'high'}],['parry',{parryDir:'low'}],['parry',{parryDir:'overhead'}],['deflect',{animHint:'pushblock',timer:8}],
        ['hitstun'],['ko'],['burst'],['block'],['blockstun',{timer:8}],['freeKick',{abilityFrames:30}],['hypeShuffle',{abilityFrames:60}]]) {
      duttVs();p1.facing=facing;p1.enter(state);Object.assign(p1,extra||{});
      for(let t=0;t<70;t+=3){p1.stateFrame=t;p1.animationFrame=t*7;assert(poseIsFinite(animatedPose(p1,t,t)),`${state} ${t}`);}
    }
    for(const kit of [['upSpecial'],['downSpecial']]) {
      duttVs();p1.facing=facing;p1.kit[kit[0]](p1,p2,g);
      for(let f=0;f<=60;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),kit[0]+' '+f);}
    }
  }
  duttVs();p1.momentum=MOVE.maxMomentum/2-1;p1.startAttack('light');p1.stateFrame=5;
  const plain=JSON.stringify(animatedPose(p1,5,5));p1.moveMomentum=MOVE.maxMomentum/2;assert(plain!==JSON.stringify(animatedPose(p1,5,5)),'bicycle kick only when running');
});
check('Duttpack idle: hands above his head at the peak of the hype bounce, looping every beat',()=>{
  duttVs();p1.enter('idle');p1.animationFrame=0;
  for(let t=0;t<200;t++)assert(poseIsFinite(hypeHands(t)),'finite '+t);
  const top=hypeHands(0);assert(top.hF[1]<top.head[1]-50&&top.hB[1]<top.head[1]-50,'arms up in the V');
  near(hypeHands(0).hip[1],hypeHands(DUTTPACK.idleBeat*2).hip[1]);
  p1.animationFrame=KEEPY.every-10;assert(keepyFrame(p1)>=0,'keepy-uppy cycle');p1.animationFrame=10;assert(keepyFrame(p1)<0,'normal bounce');
});
check('Free Kick: curve picked during the wind-up hits high, overhead or low for 50; one ball; 4 s cooldown',()=>{
  for(const [key,height] of [[null,'high'],['KeyW','overhead'],['KeyS','low']]) {
    duttVs('rip',380);ability();assert(p1.state==='freeKick'&&p1.cooldowns.special===DUTTPACK.kickCooldown,'wind-up');
    if(key)press(key);stepUntil(()=>g.projectiles.length>0,20);if(key)release(key);
    const ball=g.projectiles[0];assert(ball.kind==='soccerBall'&&ball.move.height===height,'curve '+height+' '+ball.move.height);
    assert(!p1.kit.special(p1,p2,g),'one ball at a time');
    stepUntil(()=>p2.hp<MAX_HP||!g.projectiles.length,80);near(MAX_HP-p2.hp,DUTTPACK.kickDamage);
  }
  duttVs('rip',380);press('KeyW');ability();release('KeyW');assert(p1.state==='attack'&&p1.moveName==='pigeonStrut','Up + Special is still Pigeon Strut');
  duttVs('rip',380);press('Quote');step(2);ability();stepUntil(()=>!g.projectiles.length&&p1.stateFrame>DUTTPACK.kickStartup,90);release('Quote');
  near(p2.hp,MAX_HP);assert(p2.guard<GUARD.max,'blocked: guard only');
  duttVs('rip',380);p2.enter('knockdown');ability();stepUntil(()=>g.projectiles.length>0,20);   // knocked down: can't be hit
  stepUntil(()=>!g.projectiles.length,90);assert(!g.projectiles.length&&p2.hp===MAX_HP,'despawns at the wall');
});
check('Hype Shuffle: strikes in frames 4-36 miss and get a 60-damage counter; grabs and projectiles still hit',()=>{
  for(const name of ['light','low','medium','overhead','heavy']) {
    duttVs('rip',70);ability('downSpecial');assert(p1.state==='hypeShuffle'&&p1.cooldowns.downSpecial===DUTTPACK.shuffleCooldown,'shuffle');
    p1.stateFrame=DUTTPACK.shuffleFrom+3;incoming(name);assert(p1.hp===MAX_HP&&p1.shuffleCounter,'avoided '+name);
    p2.x=p1.x+70;stepUntil(()=>p1.moveName==='shuffleKick',12);stepUntil(()=>p2.hp<MAX_HP,14);near(MAX_HP-p2.hp,DUTTPACK.shuffleDamage);
  }
  for(const frame of [DUTTPACK.shuffleFrom-1,DUTTPACK.shuffleThrough+1]){duttVs('rip',70);ability('downSpecial');p1.stateFrame=frame;incoming('light');assert(p1.hp<MAX_HP,'outside the window '+frame);}
  duttVs('rip',70);ability('downSpecial');p1.stateFrame=10;incoming('grab');assert(p1.state==='thrown','grab beats it');
  duttVs('teo',300);ability('downSpecial');p1.stateFrame=10;
  spawnProjectile(g,{kind:'test',owner:1,x:p1.x+30,y:p1.y-110,facing:-1,vx:-6,framesLeft:20,box:{w:20,h:20},move:{...MOVES.light,fixedDamage:30}});
  updateProjectiles(g);assert(p1.hp<MAX_HP,'projectile hits');g.projectiles=[];
  duttVs('rip',300);ability('downSpecial');step(DUTTPACK.shuffleFrames+DUTTPACK.shuffleWhiff-2);assert(p1.state==='hypeShuffle','open after a whiff');step(3);assert(p1.state==='idle','recovers');
});
check('Pigeon Strut: four pecks for 15/15/15/35, travelling forward; blocked pecks cost guard; grabs beat the start-up',()=>{
  duttVs('rip',70);const x=p1.x;ability('upSpecial');assert(p1.moveName==='pigeonStrut'&&p1.cooldowns.upSpecial===DUTTPACK.strutCooldown,'strut');
  const hits=[];let last=p2.hp;
  for(let i=0;i<60&&p1.state==='attack';i++){step();p2.x=Math.max(p2.x,p1.x+60);if(p2.hp<last){hits.push(last-p2.hp);last=p2.hp;}}
  // Base 15/15/15/35, with the game's normal combo damage scaling on the later pecks.
  const expected=[15,15,15,35].map((d,i)=>Math.round(d*COMBO_SCALE[Math.min(i,COMBO_SCALE.length-1)]));
  assert(JSON.stringify(hits)===JSON.stringify(expected),'pecks '+hits+' vs '+expected);assert(p1.x>x+150,'travels '+(p1.x-x));
  duttVs('rip',70);press('Quote');step(2);ability('upSpecial');for(let i=0;i<40;i++){step();p2.x=Math.max(p2.x,p1.x+60);}release('Quote');
  near(p2.hp,MAX_HP);assert(p2.guard<GUARD.max,'blocked pecks drain guard');
  duttVs('rip',60);ability('upSpecial');p1.stateFrame=2;incoming('grab');assert(p1.state==='thrown','grab in start-up');
  rosterVs('duttpack','rip');p1.reset(WALL_R-80,1);p2.reset(WALL_L+100,1);ability('upSpecial');step(40);assert(p1.x<=WALL_R-HALF_W,'stops at the wall');
});
check('Slam Dunk: lifts both fighters to a hoop with room, dunks for 90, escapable, no domain mid-throw',()=>{
  for(const [x,facing] of [[600,1],[WALL_R-90,1],[WALL_L+90,-1]]) {
    rosterVs('duttpack','rip');p1.reset(x,facing);p2.reset(x+60*facing,-facing);tap('KeyJ');stepUntil(()=>p1.state==='throw',12);
    assert(p1.throwKind==='duttpack'&&p1.throwEscape,'normal escape window');
    p1.ultimate=ULTIMATE_MAX;assert(!activateDomain(p1,g),'no domain mid-throw');
    let peak=FLOOR;
    while(p1.state==='throw'){
      assert(poseIsFinite(throwPose(p1,'att',p1.stateFrame))&&poseIsFinite(throwPose(p1,'def',p1.stateFrame)),'poses '+p1.stateFrame);
      assert(p1.x>=WALL_L+HALF_W-1&&p1.x<=WALL_R-HALF_W+1&&p2.x>=WALL_L+HALF_W-1&&p2.x<=WALL_R-HALF_W+1,'inside the arena');
      peak=Math.min(peak,p1.y);step();
    }
    near(MAX_HP-p2.hp,90);assert(peak<FLOOR-THROWS.duttpack.jumpHeight+10,'he jumps for the dunk');
  }
  duttVs();tap('KeyJ');stepUntil(()=>p1.state==='throw',12);tap('KeyL');step();assert(p1.state!=='throw'&&p2.hp===MAX_HP,'escapable');
});
check('COOKIEEEEEEE: on-beat hits do 1.5x; the opponent\'s off-beat attacks start 4 frames late; MOVES untouched',()=>{
  duttVs('rip',60);beginDomain(0,g,'duttpack');assert(g.domain.startFrame===g.frame,'beat grid starts');
  near(g.domain.framesLeft,DOMAIN.activeFrames);
  g.frame=beatFrame(3);assert(onBeat(),'on beat');g.frame=beatFrame(3,Math.round(framesPerBeat()/2));assert(!onBeat(),'between beats');
  const hitAt=frame=>{duttVs('rip',60);beginDomain(0,g,'duttpack');g.frame=frame();p1.startAttack('light');p1.stateFrame=p1.move.startup;applyHit(p1,p2,{x:p2.x,y:p2.y-100},g);return MAX_HP-p2.hp;};
  const on=hitAt(()=>beatFrame(4)),off=hitAt(()=>beatFrame(4,13));near(on,Math.round(off*DUTTPACK.beatBonus));
  duttVs('rip',60);beginDomain(0,g,'duttpack');g.frame=beatFrame(2,13);p2.startAttack('light');near(p2.move.startup,MOVES.light.startup+DUTTPACK.offBeatDelay);
  near(MOVES.light.startup,5);g.frame=beatFrame(5);p2.startAttack('light');near(p2.move.startup,MOVES.light.startup);
  g.frame=beatFrame(2,13);p1.startAttack('light');near(p1.move.startup,MOVES.light.startup);   // never slows its owner
  duttVs('rip',60);beginDomain(0,g,'duttpack');step(DOMAIN.activeFrames);assert(!g.domain,'ends');g.frame+=13;p2.enter('idle');p2.startAttack('light');near(p2.move.startup,5);
  duttVs('rip',60);beginDomain(0,g,'duttpack');startRound();assert(!duttBeatDomain()&&offBeatDelay(p2)===0,'round reset');
});
check('COOKIEEEEEEE: his song waits for the beat drop; the domain and its fade draw without errors',()=>{
  duttVs();p1.ultimate=ULTIMATE_MAX;assert(activateDomain(p1,g)&&g.domainSequence.kind==='cutscene','cutscene');
  for(let k=0;k<DOMAIN.cutsceneFrames;k++){
    const elapsed=DOMAIN.cutsceneFrames-g.domainSequence.framesLeft;
    assert(music.want(g)===(elapsed>=15?'duttpack':null),'song at '+elapsed);
    assert(poseIsFinite(duttpackCutscenePose()),'cutscene pose');drawDuttpackFx(STUB_CANVAS,g);step();
  }
  assert(g.domain?.type==='duttpack'&&music.want(g)==='duttpack','song through the domain');
  for(let i=0;i<DOMAIN.activeFrames+DOMAIN.fadeFrames+2;i++){drawDomainAtmosphere(STUB_CANVAS,g);drawDuttpackFx(STUB_CANVAS,g);drawDuttpackMeter(STUB_CANVAS,p1);step();}
  assert(!g.domain&&!g.domainFade&&music.want(g)===null,'ends and fades');
  rosterVs('haze','rip');p1.ultimate=ULTIMATE_MAX;activateDomain(p1,g);assert(music.want(g)==='haze','Haze still starts at frame 0');
});
check('CPU Duttpack uses his specials and every level still fights',()=>{
  const used=new Set();
  for(const level of [3,5]) {
    startMatch(false,[{type:'keyboard',layout:0},{type:'cpu',level}],['haze','duttpack']);g.phase='fight';g.inputLocked=false;keysDown.clear();
    for(let i=0;i<2400;i++){
      step();for(const s of ['freeKick','hypeShuffle'])if(p2.state===s)used.add(s);if(p2.moveName==='pigeonStrut')used.add('strut');
      if(g.phase!=='fight'){g.phase='fight';g.inputLocked=false;p1.hp=p2.hp=MAX_HP;p1.koed=p2.koed=false;}
    }
  }
  assert(used.has('freeKick')&&used.has('strut'),'CPU specials '+[...used]);
});
check('Siglarp copies Free Kick and Hype Shuffle, and larping COOKIEEEEEEE plays the song',()=>{
  rosterVs('siglarp','duttpack');p1.reset(600,1);p2.reset(670,-1);
  p1.siglarpCopy={id:'duttpack',key:'downSpecial'};ability();assert(p1.state==='hypeShuffle','copied shuffle');
  p1.stateFrame=10;incoming('light');assert(p1.hp===MAX_HP,'copied counter avoids');
  for(let f=0;f<60;f++){p1.stateFrame=f;assert(poseIsFinite(animatedPose(p1,f,f)),'pose '+f);}
  stepUntil(()=>p2.hp<MAX_HP,20);
  rosterVs('siglarp','duttpack');p1.reset(500,1);p2.reset(880,-1);p1.siglarpCopy={id:'duttpack',key:'special'};ability();
  assert(p1.state==='freeKick','copied kick');stepUntil(()=>g.projectiles.some(p=>p.kind==='soccerBall'&&p.owner===0),20);
  rosterVs('siglarp','duttpack');beginDomain(0,g,'duttpack');assert(music.want(g)==='duttpack'&&duttBeatDomain()?.owner===0,'larped domain music and beat');
});
check('CPU levels 4-5 time their attacks to the beat inside COOKIEEEEEEE',()=>{
  startMatch(false,[{type:'keyboard',layout:0},{type:'cpu',level:5}],['duttpack','rip']);g.phase='fight';g.inputLocked=false;keysDown.clear();
  p1.reset(600,1);p2.reset(660,-1);beginDomain(0,g,'duttpack');let offStarts=0,starts=0;
  for(let i=0;i<300;i++){step();if(p2.state==='attack'&&p2.stateFrame===1){starts++;if(p2.move.startup>MOVES[p2.moveName]?.startup)offStarts++;}}
  assert(starts>0&&offStarts<=starts/3,'mostly on beat: '+offStarts+'/'+starts);
});

