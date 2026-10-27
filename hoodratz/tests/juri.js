function juriVs(gap=250){versus('juri','rip',gap);g.popups=[];}
check('Juri has the recovered Nostalgia atlas, shared normals, all slots and mirror support',()=>{
  assert(ROSTER.length===19&&ROSTER.at(-1)==='wolf','roster');
  assert(JURI_ATLAS.frames===316&&JURI_ATLAS.clips.tensen.source==='JRI_SPA_TENSENRIN_L'&&JURI_ATLAS.clips.finisher.source==='JRI_UCA_FUHAZAN','source clips');
  for(const index of [0,1])for(const facing of [-1,1]){
    setup();const f=fighters[index];f.setCharacter('juri',index===1);f.reset(650,facing);
    assert(f.kit===JURI_ABILITIES&&f.maxHp===MAX_HP&&f.kit.drawSprite,'model renderer');
    for(const name of ['light','low','medium','lowMedium','overhead','heavy','air','airMedium','airHeavy']){
      f.startAttack(name);const before={...MOVES[name]};assert(f.move===MOVES[name],'shared normals');
      for(const frame of [0,f.move.startup,f.move.startup+f.move.active+f.move.recovery]){
        f.stateFrame=frame;const m=juriMotion(f);assert(JURI_ATLAS.clips[m.key]&&Number.isFinite(m.progress),'mapped motion '+name);
      }
      assert(MOVES[name].recovery===before.recovery,'shared data unchanged');
    }
  }
});
check('Fuha storage commits late, interruption prevents stock, release spends one stock and fires once',()=>{
  juriVs();tap('KeyT');assert(p1.moveName==='fuhaStore'&&p1.juriFuha===0,'store input');
  stepUntil(()=>p1.stateFrame===JURI.storeAt-1,40);assert(p1.juriFuha===0,'no early stock');
  step();assert(p1.juriFuha===1,'stored on completion');
  stepUntil(()=>p1.cooldowns.special===0&&p1.state==='idle',80);tap('KeyT');
  assert(p1.state==='juriRelease'&&p1.juriFuha===0&&p1.cooldowns.special===150,'release cost');
  step(JURI.releaseAt);assert(g.projectiles.filter(p=>p.kind==='juriFuha').length===1,'one wave');
  const wave=g.projectiles.find(p=>p.kind==='juriFuha');assert(wave.move.height==='low'&&wave.move.dmg===50,'low wave');
  step(5);assert(g.projectiles.filter(p=>p.kind==='juriFuha').length===1,'does not respawn');
  juriVs();tap('KeyT');step(6);p1.enter('hitstun');p1.hitstun=30;step(35);assert(p1.juriFuha===0,'interrupted store');
});
check('Juri wave respects block, parry, air avoidance and deals one scaled hit',()=>{
  for(const defense of ['hit','block','parry','air']){
    juriVs(150);p1.juriFuha=1;tap('KeyT');step(JURI.releaseAt-1);
    if(defense==='block')press('Quote');
    if(defense==='air'){p2.y=FLOOR-160;p2.vy=-1;p2.enter('air');}
    if(defense==='parry')p2.startParry();
    step(10);
    if(defense==='hit')assert(p2.hp===MAX_HP-50&&p2.combo===1,'one hit');
    else assert(p2.hp===MAX_HP,'counterplay '+defense);
    release('Quote');
  }
});
check('Ryodansatsu and Tensenrin use directional input, launch once and have punishable recovery',()=>{
  for(const [key,name,cooldown] of [['KeyS','ryodan',240],['KeyW','tensen',300]]){
    juriVs(400);press(key);tap('KeyT');release(key);
    assert(p1.moveName===name&&p1.cooldowns[name==='ryodan'?'downSpecial':'upSpecial']===cooldown,'input');
    step(p1.move.startup);assert(!p1.grounded&&p1.juriLaunched&&!p1.invincible,'vulnerable leap');
    const y=p1.y;step(2);assert(p1.y<y,'continues jump');
    stepUntil(()=>p1.state==='land',100);assert(p1.landTime>=23,'landing recovery');
    tap('KeyF');assert(p1.state==='land','miss cannot cancel');
  }
});
check('Juri grab has fresh escape, one standard release, and does not use Yitty chains',()=>{
  let pair=beginEscapeThrow('juri');tap(pair.key);assert(pair.def.hp===MAX_HP&&pair.def.state==='deflect','escape');
  pair=beginEscapeThrow('juri');stepUntil(()=>pair.att.state==='throwRecover',80);
  assert(pair.def.hp===MAX_HP-90&&pair.def.combo===1&&!pair.att.suplex,'single throw');
});
check('Siglarp copies Juri stock and kick specials; the actual third player can select her',()=>{
  const pair=siglarpVs('juri',0,1,250);siglarpObserve(pair.opp,'special');tap(pair.special);
  assert(pair.f.moveName==='fuhaStore','copied store');step(30);assert(pair.f.juriFuha===1,'own copied stock');
  siglarpObserve(pair.opp,'upSpecial');
  threePlayerSetup(['haze','rip','juri']);assert(p3.kit===JURI_ABILITIES,'third player');
  finishThreePlayerTest();
});

