// Real input edges and shared throw timing, including the player-2 update order.
function beginEscapeThrow(id='haze',index=0,facing=1,opponent='rip',held=false) {
  setup(); const att=fighters[index],def=fighters[1-index];
  att.setCharacter(id);def.setCharacter(opponent);att.reset(640,facing);def.reset(640+facing*60,-facing);
  if(held) { press(def.index===0?'KeyJ':'KeyL');def.input.poll(g.frame); }
  att.startAttack('grab');att.stateFrame=MOVES.grab.startup;att.vx=0;
  applyHit(att,def,{x:def.x,y:def.y-100},g);
  return {att,def,key:def.index===0?'KeyJ':'KeyL'};
}

check('Ordinary throws escape on active frames one through ten for every thrower, side and player; eleven is late',()=>{
  const chars=g.characters.slice();
  try {
    for(const id of ROSTER.filter(id=>id!=='yitty'))for(const index of [0,1])for(const facing of [-1,1])for(const at of [1,10,11]) {
      const {att,def,key}=beginEscapeThrow(id,index,facing);step(at-1);tap(key);
      if(at<=10) {
        assert(att.state==='deflect'&&def.state==='deflect',`${id}/${index}/${facing}/${at} escape`);
        assert(def.thrownBy===null&&att.throwEscape===null&&!att.barrage,'release lock');
        assert(def.hp===MAX_HP&&def.guard===100&&att.ultimate===0&&def.ultimate===0,'no damage, guard or meter');
        assert(!def.choking&&!def.passOut&&att.xp===0&&(att.stats.id!=='teo'||att.bottles===0),'no throw effects '+id);
        assert(att.vx*facing<0&&def.vx*facing>0,'shove apart');
        assert(g.popups.some(p=>p.text==='THROW ESCAPE'),'feedback');
      } else assert(att.state==='throw'&&def.state==='thrown'&&att.throwCommitted,'late cannot escape');
    }
  } finally {g.characters=chars;setup();}
});

check('Throw escape requires a fresh Grab edge; held or pre-contact presses cannot escape',()=>{
  let pair=beginEscapeThrow('haze',0,1,'rip',true);step(3);
  assert(pair.att.state==='throw','held before contact fails');release(pair.key);step();tap(pair.key);
  assert(pair.def.state==='deflect','release then press escapes');
  pair=beginEscapeThrow('haze',0,1,'rip',true);step(THROWS.escapeWindow+2);
  assert(pair.att.state==='throw'&&!pair.att.throwEscape,'holding never breaks free');release(pair.key);
  for(const key of ['Comma','KeyK','Period','Quote','KeyH']) {
    pair=beginEscapeThrow();tap(key);assert(pair.def.state==='thrown','other buttons do not escape '+key);
  }
  setup();
});

check('Controller B escapes throws on either player; A, X, RT and Block do not',()=>{
  const old=navigator.getGamepads;
  try {
    for(const index of [0,1])for(const button of [0,1,2,4,7]) {
      const {att,def}=beginEscapeThrow('cheese',index),pad=testPad(2,'throw escape pad');
      navigator.getGamepads=()=>[null,null,pad];def.input=new PlayerInput(def.index,{type:'pad',slot:2,id:pad.id});
      pad.buttons[button].pressed=true;step();
      assert(def.state===(button===1?'deflect':'thrown'),'button '+button+' player '+def.index);
      assert(button===1?!att.throwEscape:!!att.throwEscape,'correct escape button');
    }
  } finally {navigator.getGamepads=old;setup();}
});

check('Escape windows freeze during pause and hit-stop, queue frozen Grab edges, and stay ten ticks under slow domains',()=>{
  let {att,def,key}=beginEscapeThrow();g.paused=true;for(let i=0;i<20;i++)tick();
  assert(att.throwEscape.left===10,'pause freezes window');g.paused=false;
  g.hitstopLeft=4;press(key);for(let i=0;i<4;i++)tick();release(key);
  assert(att.throwEscape.left===10&&def.state==='thrown','hit-stop freezes window');tick();
  assert(def.state==='deflect','hit-stop edge queued');
  for(const index of [0,1]) {
    ({att,def,key}=beginEscapeThrow('rip',index,1,'haze'));beginDomain(def.index,g);step(9);
    assert(att.throwEscape.left===1,'same clock while thrower slowed');tap(key);assert(def.state==='deflect','last slow-domain tick');
    ({att,def}=beginEscapeThrow('rip',index,1,'haze'));beginDomain(def.index,g);step(10);
    assert(!att.throwEscape&&att.throwCommitted,'ten active ticks, not slowed animation frames');
  }
  setup();
});

check('Escaped throws preserve Lancer mask cost, victim mask and Gooner untouchable; committed throws apply them once',()=>{
  let {att,def}=beginEscapeThrow('lancer');att.masked=true;att.mask=100;
  // Re-capture with the mask enabled so the barrage snapshot is masked.
  def.enter('idle');att.startAttack('grab');startThrow(att,def,g,'');
  def.input.pressSerial.grab++;updateThrowEscapes(g);
  assert(att.mask===100&&att.masked&&!att.barrage,'escaped masked barrage costs nothing');
  ({att,def}=beginEscapeThrow('haze',0,1,'lancer'));def.masked=true;def.mask=80;
  def.input.pressSerial.grab++;updateThrowEscapes(g);
  assert(def.mask===80&&def.masked&&!def.maskShatterPending,'escape preserves victim mask');
  ({att,def}=beginEscapeThrow('haze',0,1,'gooner'));def.untouchable=100;
  def.input.pressSerial.grab++;updateThrowEscapes(g);assert(def.untouchable===100,'escape preserves untouchable');
  ({att,def}=beginEscapeThrow('lancer'));att.masked=true;att.mask=100;def.enter('idle');att.startAttack('grab');startThrow(att,def,g,'');
  for(let i=0;i<10;i++)updateThrowEscapes(g);near(att.mask,85);commitThrow(att,def,g);near(att.mask,85);
  setup();
});

check('Missed grabs have thirty recovery frames, cannot cancel, show feedback and allow a real punish',()=>{
  for(const id of ROSTER)for(const facing of [-1,1]) {
    setup();p1.setCharacter(id);p1.reset(640,facing);p2.setCharacter('rip');p2.reset(640+facing*300,-facing);
    tap('KeyJ');step(MOVES.grab.startup+MOVES.grab.active);
    assert(p1.state==='attack'&&!p1.moveHit&&g.popups.some(p=>p.text==='THROW MISSED'),id+' misses');
    for(const key of ['KeyF','KeyV','KeyH','KeyT','KeyG','KeyR','KeyW'])tap(key);
    assert(p1.state==='attack'&&p1.moveName==='grab','cannot cancel recovery');
    p2.x=p1.x+facing*60;tap('Comma');stepUntil(()=>p1.hp<p1.maxHp,15);
    assert(p1.state==='hitstun','actual light punish');
  }
  setup();p2.x=1100;tap('KeyJ');step(MOVES.grab.startup+MOVES.grab.active+MOVES.grab.recovery-1);
  assert(p1.state==='attack','full recovery');step();assert(p1.state==='idle','recovers on final frame');
});

check('Throw escapes resist hits for six frames; both fighters recover without re-grabbing from held input',()=>{
  const {att,def,key}=beginEscapeThrow();press(key);step();
  assert(att.invincible&&def.invincible,'separation protection');
  att.x=500;def.x=900;def.startAttack('light');def.stateFrame=MOVES.light.startup;
  assert(!hitPoint(def,att),'cannot strike escape start');
  def.enter('deflect');def.animHint='throwEscape';def.timer=COMBAT.techStun;
  att.stateFrame=THROWS.escapeInvincibleFrames;assert(!att.invincible,'protection ends at six');
  step(COMBAT.techStun+2);assert(att.state==='idle'&&def.state==='idle','held escape does not re-grab');release(key);
  setup();p1.throwEscape={left:4};p1.reset(640,1);assert(p1.throwEscape===null,'round reset clears window');
});

check('Yitty retains suplex mash escape and Goon Su stays a command grab; ordinary simultaneous grabs still tech',()=>{
  const {att,def,key}=beginEscapeThrow('yitty');tap(key);
  assert(att.state==='throw'&&att.suplex&&def.state==='thrown'&&!att.throwEscape,'Yitty uses existing mash system');
  setup();p1.reset(600,1);p2.reset(660,-1);press('KeyJ');press('KeyL');step(7);release('KeyJ');release('KeyL');
  assert(p1.state==='deflect'&&p2.state==='deflect'&&g.popups.some(p=>p.text==='TECH'),'simultaneous grab tech');
  goonerVsRip();p1.ultimate=100;activateDomain(p1,g);stepUntil(()=>p1.state==='goonHold',180);
  assert(!p1.throwEscape,'command grab unchanged');
  setup();
});

check('All fighters have finite grab-miss and escape poses; CPU escape attempts improve with level',()=>{
  const signatures=new Set();
  for(const id of ROSTER) {
    setup();p1.setCharacter(id);p1.startAttack('grab');
    signatures.add(JSON.stringify(attackAnim(p1,MOVES.grab.startup)));
    for(let frame=0;frame<=39;frame+=.5)assert(poseIsFinite(attackAnim(p1,frame)),id+' grab '+frame);
    p1.enter('deflect');p1.animHint='throwEscape';p1.timer=12;
    for(let frame=0;frame<=12;frame+=.5)assert(poseIsFinite(animatedPose(p1,frame,frame)),id+' escape '+frame);
  }
  assert(signatures.size===ROSTER.length,'distinct character reaches');
  for(const level of [1,2,3,4,5])for(const roll of [0,.5,.99]) {
    const {att,def}=beginEscapeThrow();def.input=new CpuInput(def.index,level);def.input.random=()=>roll;
    for(let i=0;i<10;i++) {g.hitstopLeft=0;def.input.poll(g.frame+i);updateThrowEscapes(g);}
    const expected=roll<[.10,.25,.45,.65,.85][level-1];
    assert((def.state==='deflect')===expected,'CPU escape chance '+level+'/'+roll);
  }
  setup();
});
