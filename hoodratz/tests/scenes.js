// Visual fixtures use the real renderer. Buttons let browser verification select each scene.
let runPreviewTimer=null;
function showScene(name) {
  if(runPreviewTimer!==null){clearInterval(runPreviewTimer);runPreviewTimer=null;}
  setup(); p1.reset(500, 1); p2.reset(820, -1);
  if(name==='Smooth Bench poses'){drawSmoothBenchGallery();return;}
  if(name==='Smooth Bench live') {
    const pair=kinkadeVs(),{f,opp}=pair;f.x=410;opp.x=1050;
    let frames=0;
    runPreviewTimer=setInterval(()=>{
      if(frames%110===0){f.cooldowns.special=0;f.pumpNormals=new Set(['light','medium','low']);press(pair.special);}
      step();release(pair.special);g.shakeMag=0;g.impactLeft=0;render(ctx,g,fighters,STEP);frames++;
    },STEP);render(ctx,g,fighters,STEP);return;
  }
  if (name === 'Fifteen hits') fifteenRoute();
  if (name === 'Air extension window') {
    fifteenRoute('null',1,0,7);
    while (g.hitstopLeft || p1.stateFrame < p1.move.startup + p1.move.active - 1) tick();
  }
  if (name.startsWith('Somhack ')) {
    const pair=sombraVs(0,1,60),{att,def}=pair;att.x=500;def.x=560;
    if(name==='Somhack roster'){g.characters=['sombra','sombra'];openCharacterSelect();}
    if(name==='Somhack SMG'){press(pair.medium);tick();release(pair.medium);activeUntil(()=>att.smgSecond&&att.moveHit);}
    if(name==='Somhack Hack'){sombraSpecial(pair);activeUntil(()=>def.hacked>0);}
    if(name==='Somhack Virus'){def.x=840;sombraSpecial(pair,'upSpecial');activeUntil(()=>g.projectiles.length);step(3);}
    if(name==='Somhack beacon'||name==='Somhack teleport') {
      def.x=980;sombraSpecial(pair,'downSpecial');activeUntil(()=>att.state==='idle');step(8);
      if(name==='Somhack teleport')sombraSpecial(pair,'downSpecial');
    }
    if(name==='Somhack stealth'){def.x=900;step(SOMBRA.stealthAfter);}
    if(name==='Somhack domain'){att.ultimate=100;activateDomain(att,g);step(12);}
    if(name==='Somhack HUD error'){att.ultimate=100;activateDomain(att,g);step(SOMBRA.empOpener+10);}
    if(name==='Somhack fifteen hits')fifteenRoute('sombra');
    if(name==='Somhack throw'){att.startAttack('grab');startThrow(att,def,g,'');step(24);}
    if(name==='Somhack throw Hack'){att.startAttack('grab');startThrow(att,def,g,'');step(62);}
    if(name==='Somhack throw blast'){att.startAttack('grab');startThrow(att,def,g,'');activeUntil(()=>att.state==='throwRecover');}
  }
  if (name === 'Title') showTitle();
  if (name === 'New roster') { g.characters=['lancer','teo']; openCharacterSelect(); }
  if (name.startsWith('Null ')) {
    const pair=name.startsWith('Null air ')?nullAirVs(0,1,220):nullVs(0,1,220),{att,def}=pair;att.x=450;def.x=670;
    if(name==='Null spear windup'){tap(pair.special);step(NULL.spearStartup-3);}
    if(name==='Null punch'){def.x=510;strike('light');}
    if(name==='Null air spear'){def.x=980;tap(pair.special);step(NULL.spearStartup+5);}
    if(name==='Null air Zoom'){nullZoomInput(pair);step(NULL.zoomStartup+4);}
    if(name==='Null air Zoom reset'||name==='Null air double Zoom') {
      nullSpear(att,g);for(let i=0;i<14;i++)updateProjectiles(g);
      nullZoomInput(pair);readyNullZoom(att);
      if(name==='Null air double Zoom'){nullZoomInput(pair);readyNullZoom(att);}
    }
    if(name==='Null roster'){g.characters=['null','null'];openCharacterSelect();}
    if(name==='Null spear'){def.x=980;tap(pair.special);step(NULL.spearStartup+10);}
    if(name==='Null marked'){tap(pair.special);stepUntil(()=>!!att.nullMark,60);stepUntil(()=>att.state==='idle',40);}
    if(name==='Null staggered Zoom') {
      att.ultimate=100;press(pair.up);step(5);tap(pair.special);release(pair.up);step(NULL.zoomStartup+5);
      g.popup('UP → SPECIAL · 5 FRAMES APART',640,300,att.stats.color,24,'inputProof');
    }
    if(name==='Null Zoom reset'||name==='Null double Zoom') {
      tap(pair.special);stepUntil(()=>!!att.nullMark,60);stepUntil(()=>att.state==='idle',40);
      nullZoomInput(pair);readyNullZoom(att);
      if(name==='Null double Zoom'){nullZoomInput(pair);readyNullZoom(att);}
    }
    if(name==='Null Silent Eclipse'||name==='Null Eclipse attack') {
      beginDomain(0,g);
      if(name==='Null Eclipse attack'){nullZoomInput(pair);step(NULL.zoomStartup+4);}
    }
    if(name==='Null throw'){def.x=att.x+50;tap('KeyJ');stepUntil(()=>att.state==='throw',20);step(24);}
  }
  if (/^CPU (Lancer|Cheese|Teo) [135]$/.test(name)) {
    const parts=name.split(' '), id={Lancer:'lancer',Cheese:'cheese',Teo:'teo'}[parts[1]];
    startMatch(false,[{type:'cpu',level:3},{type:'cpu',level:Number(parts[2])}],['rip',id]);
    g.phase='fight';g.inputLocked=false;step(160);
  }
  if (name.startsWith('Lancer ')) {
    rosterVs('lancer');p1.x=420;p2.x=930;
    if(name==='Lancer wave') { lancerWave(p1,g);for(let i=0;i<14;i++)updateProjectiles(g); }
    if(name==='Lancer masked wave') { p1.mask=80;p1.masked=true;lancerWave(p1,g);for(let i=0;i<14;i++)updateProjectiles(g); }
    if(name==='Lancer mask') { p1.mask=70;p1.kit.downSpecial(p1);p1.stateFrame=10; }
    if(name==='Lancer shatter') { p1.mask=70;p1.masked=true;shatterMask(p1,g); }
    if(name==='Lancer Flash Slash') { p2.x=560;ability('upSpecial');step(LANCER.flashStartup+2); }
    if(name==='Lancer barrage'||name==='Lancer masked barrage'){p1.mask=100;p1.masked=name==='Lancer masked barrage';p2.x=480;newThrow();p1.stateFrame=28;THROW_EVENTS.lancer(p1,p2,28,g);p1.barrage.lastAt=28;p1.barrage.lastDirection=2;}
    if(name==='Lancer Soul Sky')beginDomain(0,g);
  }
  if (name.startsWith('Cheese ')) {
    rosterVs('cheese');p1.x=440;p2.x=850;
    if(name==='Cheese vanish'){p1.enter('vanished');p2.dread=70;}
    if(name==='Cheese trap'){p1.traps=[{x:850,life:700},{x:500,life:700}];p2.enter('walk');updateRosterWorld(g);}
    if(name==='Cheese phone'){p1.kit.upSpecial(p1);p1.stateFrame=24;}
    if(name==='Cheese scare'){p2.dread=100;updateRosterWorld(g);}
    if(name==='Cheese throw'){p2.x=500;newThrow();p1.stateFrame=31;THROW_EVENTS.cheese(p1,p2,31,g);}
    if(name==='Cheese chase')beginDomain(0,g);
  }
  if (name.startsWith('Teo ')) {
    rosterVs('teo');p1.x=440;p2.x=850;p1.bottles=3;
    if(name==='Teo Buzzed')p1.tipsy=35;
    if(name==='Teo Drunk')p1.tipsy=75;
    if(name==='Teo Blackout'){p1.tipsy=50;p1.enter('blackout');p1.stateFrame=12;}
    if(name==='Teo bottle'){p1.tipsy=75;p1.kit.special(p1,p2,g);p1.stateFrame=12;p1.kit.update(p1,p2,g);for(let i=0;i<16;i++)updateProjectiles(g);p1.puddles=[{x:900,life:230}];}
    if(name==='Teo pick'){p2.x=525;p2.ultimate=70;p1.kit.downSpecial(p1);p1.stateFrame=7;applyHit(p1,p2,{x:525,y:FLOOR-50},g);}
    if(name==='Teo Bellow'){p1.tipsy=75;p1.kit.upSpecial(p1);p1.stateFrame=24;}
    if(name==='Teo throw'){p2.x=500;newThrow();p1.stateFrame=22;THROW_EVENTS.teo(p1,p2,22,g);}
    if(name==='Teo Last Call')beginDomain(0,g);
  }
  if (name === 'Burst meter') {
    p1.reset(600,1); p2.reset(680,-1); p2.startAttack('light'); p2.stateFrame = MOVES.light.startup;
    applyHit(p2,p1,{x:p1.x,y:p1.y-100},g); press('KeyR'); press('KeyG'); step(); release('KeyR'); release('KeyG');
    g.impactLeft = 0;
  }
  if (name === 'Air combo') { juggleRoute(1, true); p1.stateFrame = MOVES.airMedium.startup; g.shakeMag = 0; }
  if (name === 'Ten hits') { juggleRoute(); g.shakeMag = 0; }
  if (name === 'Medium') { p2.x = 560; strike('medium'); g.shakeMag = 0; }
  if (name === 'Low Medium combo') { lowMediumRoute('haze',1);g.popups=[];g.popup('4 HITS · LOW MEDIUM CHAIN',p1.x,p1.y-240,p1.stats.color,60); }
  if (name === 'Throw escape window') { beginEscapeThrow('lancer');g.popups=[]; }
  if (name === 'Throw escape') { const {key}=beginEscapeThrow('haze');g.popups=[];tap(key);step(3); }
  if (name === 'Heavy') { p2.x = 560; tap('KeyH'); stepUntil(() => p1.moveHit); g.shakeMag = 0; }
  if (name === 'Heavy parry') {
    pickCharacters(['lancer','rip']);g.popups=[];p1.reset(570,1);p2.reset(650,-1);
    p1.startAttack('heavy');p1.stateFrame=MOVES.heavy.startup-1;p1.vx=0;tap('Period');
  }
  if (name === 'CPU select') { charSelect.cpuLevel = 3; g.characters = ['yitty', 'gooner']; openCharacterSelect(); }
  if (name === 'CPU match') {
    startMatch(false, [{ type: 'keyboard', layout: 0 }, { type: 'cpu', level: 5 }], ['yitty', 'rip']);
    g.phase = 'fight'; g.inputLocked = false; step(110);
  }
  if (name === 'Relentless') { RIP_ABILITIES.special(p2, p1, g); g.clouds.push({ type: 'gas', owner: 1, x: 740, y: 560, radius: 70, framesLeft: 36 }); }
  if (name === 'Infinite Haze') { beginDomain(0, g); p1.startAttack('light'); p1.stateFrame = 2; }
  if (name === 'Malevolent Stench') beginDomain(1, g);
  if (name === 'Clash') { beginDomain(0, g); p2.ultimate = 100; activateDomain(p2, g); g.domainSequence.boundary = 680; }
  if (name === 'Haze cutscene' || name === 'Rip cutscene') {
    const f = name === 'Haze cutscene' ? p1 : p2; f.ultimate = 100; activateDomain(f, g); g.domainSequence.framesLeft = 30;
  }
  if (name === 'Practice') {
    startMatch(true); g.phase = 'fight'; g.inputLocked = false; g.popups = [];
    p1.reset(500, 1); p2.reset(580, -1); p1.startAttack('light'); p1.stateFrame = 5;
    g.practice.boxes = true; g.practice.infinite = true; preparePractice(g);
    g.practice.lastEvent = { move: 'light', startup: 5, kind: 'hit', advantage: 3 };
  }
  if (name === 'Practice CPU 5') {runPracticeCombo('null',1);g.shakeMag=0;}
  if (name.startsWith('Yitty ')) {
    yittyVs(name === 'Yitty montage' ? 'gooner' : 'rip');
    if (name === 'Yitty roster') { g.characters = ['yitty', 'gooner']; openCharacterSelect(); }
    if (name === 'Yitty suplex') { beginYittyThrow(); slamYitty(); chainYitty(); slamYitty(); chainYitty(); slamYitty(); }
    if (name === 'Yitty escape') {
      beginYittyThrow();
      for (let i = 0; i < YITTY.mashThresholds[0]; i++) { tap('Comma'); step(); }
      slamYitty(); chainYitty();
    }
    if (name === 'Yitty ball') {
      p1.x = 360; p2.x = 1000; tap('KeyT'); step(YITTY.ballWindup + 15);
    }
    if (name === 'Yitty tackle') {
      p2.x = p1.x + 160; press('KeyS'); tap('KeyT'); release('KeyS');
      stepUntil(() => p2.hp < MAX_HP); tap('KeyJ'); step(16);
    }
    if (name === 'Yitty montage') { p2.x = 930; startMontageTest(); step(YITTY.chantEvery * 3); }
    if (name === 'Yitty opening') { p1.ultimate = 100; activateDomain(p1, g); }
    g.impactLeft = 0;
  }
  g.shakeMag = 0; g.flashAlpha = 0; g.impactLeft = 0; render(ctx, g, fighters, STEP);
  if(['Character blocks','Block impacts','Air blocks'].includes(name))drawGuardGallery(name==='Block impacts',name==='Air blocks');
  if(name==='Low Medium')drawLowMediumGallery();
  if(name==='Missed throws')drawMissedThrowGallery();
  if(name.startsWith('Curtis '))showCurtisScene(name);
  if(name.startsWith('Siglarp '))showSiglarpScene(name);
  if(name.startsWith('Kinkade '))showKinkadeScene(name);
  if(name.startsWith('Run styles')) {
    let frame=12;const mirrored=name==='Run styles mirrored';
    drawRunGallery(frame,mirrored);
    if(name!=='Run styles paused')runPreviewTimer=setInterval(()=>drawRunGallery(++frame,mirrored),1000/60);
  }
}
function drawRunGallery(t,mirrored=false) {
  const themes=['Loose, easy jog','Heavy shoulder stomp','Hands in pockets','Ball tucked, knees driving',
    'Sword-trailing sprint','Hunched stalker chase','Off-balance bottle run','Low predator sprint','Agile hacker sprint','Elastic athlete sprint','Theatrical mirror stride','Powerful arm pump'];
  const cols=ROSTER.length>10?6:ROSTER.length>9?5:3,rows=Math.ceil(ROSTER.length/cols),rowHeight=570/rows;
  ctx.fillStyle='#101827';ctx.fillRect(0,0,W,H);ctx.textAlign='center';
  ctx.fillStyle='#f1f5ff';ctx.font='bold 28px sans-serif';ctx.fillText(`${ROSTER.length} PERSONALITIES · ${ROSTER.length} RUNS`,W/2,51);
  ctx.fillStyle='#a6b6cd';ctx.font='14px sans-serif';ctx.fillText('Distinct posture, stride, arm motion and rhythm',W/2,80);
  for(let i=0;i<ROSTER.length;i++) {
    const id=ROSTER[i],col=i%cols,row=Math.floor(i/cols),x=col*W/cols+W/cols/2,y=103+row*rowHeight+rowHeight-28;
    ctx.fillStyle='#172238';ctx.fillRect(col*W/cols+12,103+row*rowHeight,W/cols-24,rowHeight-12);
    const f=new Fighter(CHARACTERS[id],new PlayerInput(i%2),i%2);
    f.reset(x,mirrored?-1:1);f.enter('run');f.stateFrame=24;f.animationFrame=t;
    f.bottles=id==='teo'?2:0;f.tipsy=id==='teo'?70:0;
    ctx.save();ctx.translate(x,y-30);ctx.scale(.78,.78);ctx.translate(-x,-FLOOR);
    drawFighter(ctx,f,t,STEP,g);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle=f.stats.color;ctx.font='bold 13px sans-serif';ctx.fillText(f.stats.name,x,y-9);
    ctx.fillStyle='#a6b6cd';ctx.font='12px sans-serif';ctx.fillText(themes[i],x,y+10);
  }
  ctx.fillStyle='#8190aa';ctx.font='12px sans-serif';ctx.fillText('Double-tap forward, then hold to run · Teo shown drunk · Gameplay speeds unchanged',W/2,705);
}
function showCurtisScene(name) {
  const pair=curtisVs(),{f,opp}=pair;f.x=460;opp.x=850;
  if(name==='Curtis roster'){g.characters=['curtis','curtis'];openCharacterSelect();}
  if(name==='Curtis swing') {f.y=FLOOR-100;f.enter('air');press(pair.up);step();release(pair.up);step(8);}
  if(name==='Curtis wall kick') {
    const wall=curtisHeavyWall();activeUntil(()=>wall.f.curtisWallWindow>0,35);
    press(wall.up);step();release(wall.up);step(3);
  }
  if(name==='Curtis pistol') {opp.x=f.x+200;press(pair.special);step();release(pair.special);step(10);}
  if(name==='Curtis squeeze'||name==='Curtis pop') {
    opp.x=f.x+58;f.startAttack('grab');startThrow(f,opp,g,'');
    if(name==='Curtis squeeze')step(56);else {activeUntil(()=>f.state==='throwRecover',140);step(4);}
  }
  if(name==='Curtis Grand Line'){f.ultimate=100;activateDomain(f,g);step(DOMAIN.cutsceneFrames+10);}
  g.shakeMag=0;g.flashAlpha=0;g.impactLeft=0;render(ctx,g,fighters,STEP);
}
function showSiglarpScene(name) {
  const id=name.includes('Curtis')?'curtis':name.includes('Somhack')?'sombra':name.includes('Null')?'null':'lancer';
  const pair=siglarpVs(id),{f,opp}=pair;f.x=420;opp.x=860;
  if(name==='Siglarp roster'){g.characters=['siglarp','null'];openCharacterSelect();}
  if(name==='Siglarp Copycat'){siglarpObserve(opp,'special','null');tap(pair.special);step(NULL.spearStartup+4);}
  if(name==='Siglarp saved'){siglarpObserve(opp,'upSpecial');press(pair.down);tap(pair.special);release(pair.down);step(15);}
  if(name==='Siglarp counter'){opp.startAttack('heavy');opp.stateFrame=10;press(pair.up);tap(pair.special);release(pair.up);step(4);}
  if(name==='Siglarp Identity Theft'){opp.x=f.x+54;f.startAttack('grab');startThrow(f,opp,g,'');step(30);}
  if(name==='Siglarp opening'){f.ultimate=100;activateDomain(f,g);}
  if(name.startsWith('Siglarp Complete Larp')){siglarpLarp(pair);step(10);}
  if(name==='Siglarp copied Null ultimate'){siglarpLarp(pair);useSiglarpUltimate(f,g);step(DOMAIN.cutsceneFrames+4);}
  g.shakeMag=0;g.flashAlpha=0;g.impactLeft=0;render(ctx,g,fighters,STEP);
}
function showKinkadeScene(name) {
  const pair=kinkadeVs(),{f,opp}=pair;f.x=430;opp.x=880;
  if(name==='Kinkade roster'){g.characters=['kinkade','kinkade'];openCharacterSelect();}
  if(name==='Kinkade drinking'){kinkadeDrink(pair,48);}
  if(name==='Kinkade safe dose'){kinkadeDrink(pair,48);kinkadeRelease(pair);}
  if(name==='Kinkade overstimulated'){kinkadeDrink(pair,110);kinkadeRelease(pair);}
  if(name==='Kinkade running'){f.preworkout=80;f.enter('run');f.animationFrame=12;}
  if(name==='Kinkade throw'){opp.x=f.x+54;f.startAttack('grab');startThrow(f,opp,g,'');step(30);}
  if(name==='Kinkade struggle'){opp.x=f.x+54;f.startAttack('grab');startThrow(f,opp,g,'');step(48);}
  if(name==='Kinkade slam'){opp.x=f.x+54;f.startAttack('grab');startThrow(f,opp,g,'');step(86);}
  if(name==='Kinkade Pump ready')f.pumpNormals=new Set(['light','medium','low']);
  if(name==='Kinkade Bench'||name==='Kinkade pumped Bench'){
    opp.x=f.x+105;if(name==='Kinkade pumped Bench')f.pumpNormals=new Set(['light','medium','low']);
    press(pair.special);step(name==='Kinkade pumped Bench'?20:13);release(pair.special);
  }
  g.shakeMag=0;g.flashAlpha=0;g.impactLeft=0;render(ctx,g,fighters,STEP);
}
function drawMissedThrowGallery() {
  const themes=['Collar reach','Two-hand grab','Laptop reach','Wrestling clinch','Free-hand reach','Free-hand grab','Loose collar grab','Glowtech clinch','Tech clinch','Elastic clinch','Face snatch','Gym clinch'];
  const background=ctx.createLinearGradient(0,0,0,H);background.addColorStop(0,'#291d32');background.addColorStop(1,'#100b16');
  ctx.fillStyle=background;ctx.fillRect(0,0,W,H);ctx.textAlign='center';
  ctx.fillStyle='#fff0e9';ctx.font='bold 30px sans-serif';ctx.fillText('MISSED THROWS · OPEN TO PUNISH',W/2,80);
  ctx.fillStyle='#c5abc9';ctx.font='17px sans-serif';ctx.fillText('Grab: J / L on keyboard · B (Circle) on controller',W/2,120);
  ctx.font='15px sans-serif';ctx.fillText('6f startup · 3f active · 30f recovery on a miss',W/2,154);
  for(let i=0;i<ROSTER.length;i++) {
    const id=ROSTER[i],x=50+i*(W-170)/(ROSTER.length-1),f=new Fighter(CHARACTERS[id],new PlayerInput(i%2),i%2);
    f.reset(x,1);f.startAttack('grab');f.stateFrame=f.move.startup+f.move.active+2;f.animationFrame=12;f.bottles=1;
    ctx.save();ctx.translate(x,520);ctx.translate(-x,-FLOOR);drawFighter(ctx,f,12,STEP,g);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle=f.stats.color;ctx.font='bold 14px sans-serif';ctx.fillText(f.stats.name,x+20,580);
    ctx.fillStyle='#c5abc9';ctx.font='12px sans-serif';ctx.fillText(themes[i],x+20,606);
  }
  ctx.fillStyle='#b69ebc';ctx.font='14px sans-serif';ctx.fillText('A missed grab must recover · Connected throws keep each fighter’s personality',W/2,674);
}
function drawLowMediumGallery() {
  const themes=['Smoke sweep','Low body strike','Laptop shin swipe','Low forearm','Low sword slash','Low knife stab','Tipsy sweep','Low body strike','Low SMG burst','Rubber sweep','Mirror body jab','Low power jab'];
  const background=ctx.createLinearGradient(0,0,0,H);background.addColorStop(0,'#182339');background.addColorStop(1,'#090d18');
  ctx.fillStyle=background;ctx.fillRect(0,0,W,H);ctx.textAlign='center';
  ctx.fillStyle='#f1f5ff';ctx.font='bold 30px sans-serif';ctx.fillText(`LOW MEDIUM · ${ROSTER.length} FIGHTERS`,W/2,80);
  ctx.fillStyle='#a6b6cd';ctx.font='17px sans-serif';ctx.fillText('Down + V / K on keyboard · Down + A (Cross) on controller',W/2,120);
  ctx.font='15px sans-serif';ctx.fillText('Light → Medium → Low Medium → Overhead',W/2,154);
  for(let i=0;i<ROSTER.length;i++) {
    const id=ROSTER[i],x=50+i*(W-170)/(ROSTER.length-1),f=new Fighter(CHARACTERS[id],new PlayerInput(i%2),i%2);
    f.reset(x,1);f.startAttack('lowMedium');f.stateFrame=f.move.startup;f.animationFrame=12;f.bottles=2;
    ctx.save();ctx.translate(x,520);ctx.translate(-x,-FLOOR);drawFighter(ctx,f,12,STEP,g);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle=f.stats.color;ctx.font='bold 14px sans-serif';ctx.fillText(f.stats.name,x+25,580);
    ctx.fillStyle='#a6b6cd';ctx.font='12px sans-serif';ctx.fillText(themes[i],x+25,606);
  }
  ctx.fillStyle='#8190aa';ctx.font='14px sans-serif';ctx.fillText('65 base damage · 11f startup · Block or Down + Parry · Once per chain',W/2,674);
}
function drawGuardGallery(impact,air=false) {
  const themes=['Palm guard','Crossed forearms','Laptop shield','Lineman brace','Sword guard','Knife guard','Tipsy guard','Forearm guard','Forearm brace','Rubber guard','Mirror guard','Boxer brace'];
  const background=ctx.createLinearGradient(0,0,0,H);background.addColorStop(0,'#182339');background.addColorStop(1,'#090d18');
  ctx.fillStyle=background;ctx.fillRect(0,0,W,H);ctx.textAlign='center';
  ctx.fillStyle='#f1f5ff';ctx.font='bold 30px sans-serif';ctx.fillText(air?'EVERY FIGHTER · AIR BLOCK':impact?'EVERY BLOCK HAS CHARACTER':`${ROSTER.length} FIGHTERS · ${ROSTER.length} GUARDS`,W/2,80);
  ctx.fillStyle='#a6b6cd';ctx.font='15px sans-serif';ctx.fillText(impact?'Unique recoil and impact effects on a blocked hit':'Character poses and weapons while holding Block',W/2,112);
  for(let i=0;i<ROSTER.length;i++) {
    const id=ROSTER[i], x=60+i*(W-170)/(ROSTER.length-1), f=new Fighter(CHARACTERS[id],new PlayerInput(i%2),i%2);
    f.reset(x,1);f.enter(impact?'blockstun':'block');f.timer=18;f.stateFrame=impact?1:12;f.animationFrame=12;f.bottles=2;f.tipsy=id==='teo'?70:0;
    if(air)f.y=FLOOR-60;
    ctx.save();ctx.translate(x,550);ctx.scale(1.25,1.25);ctx.translate(-x,-FLOOR);drawFighter(ctx,f,12,STEP,g);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle=f.stats.color;ctx.font='bold 14px sans-serif';ctx.fillText(f.stats.name,x,597);
    ctx.fillStyle='#a6b6cd';ctx.font='12px sans-serif';ctx.fillText(themes[i],x,623);
  }
  ctx.fillStyle='#8190aa';ctx.font='13px sans-serif';ctx.fillText('Same controls and blocking rules · Guard drains only on blocked hits',W/2,681);
}
function drawSmoothBenchGallery() {
  ctx.fillStyle='#10131d';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#fff1d0';
  ctx.font='bold 30px sans-serif';ctx.fillText('KINKADE · SMOOTHER BENCH PRESS',W/2,55);
  ctx.font='16px sans-serif';ctx.fillStyle='#adb9cc';ctx.fillText('Load the legs → drive the hips → extend the arms → follow through → settle',W/2,87);
  const stages=[[0,'READY'],[4,'LOAD'],[9,'LEG DRIVE'],[12,'FIRST SHOVE'],[17,'RELOAD'],[19,'SECOND SHOVE'],[30,'SETTLE']];
  for(const facing of [1,-1])for(const [i,[frame,label]] of stages.entries()) {
    const x=(facing===1?90:120)+i*174,y=facing===1?330:585;
    const f=new Fighter({...CHARACTERS.kinkade,drawScale:.75},new PlayerInput(0),0);
    f.reset(x,facing);f.kit.special(f);f.benchPumped=true;
    f.stateFrame=frame;f.animationFrame=frame;f.pose=null;f.isAfterimage=true;
    ctx.strokeStyle='#46505f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-51,y+3);ctx.lineTo(x+123,y+3);ctx.stroke();
    ctx.save();ctx.translate(0,y-FLOOR);drawFighter(ctx,f,frame,STEP,g);ctx.restore();
    ctx.fillStyle=frame===12||frame===19?'#ffe08a':'#c2ccdc';ctx.font='bold 12px sans-serif';ctx.fillText(label,x+(facing===1?30:-15),y+31);
  }
  ctx.font='15px sans-serif';ctx.fillStyle='#adb9cc';ctx.fillText('Same 12-frame startup · same hits and combo timing · planted stance · rigid bar grip',W/2,674);
}
const sceneControls = document.createElement('div');
sceneControls.style = 'position:absolute;top:735px;left:20px;display:flex;gap:8px;flex-wrap:wrap';
for (const name of ['Title', 'Run styles', 'Run styles paused', 'Run styles mirrored', 'Fifteen hits', 'Air extension window', 'Character blocks', 'Block impacts', 'Air blocks', 'Air combo', 'Ten hits', 'Medium', 'Low Medium', 'Low Medium combo', 'Throw escape window', 'Throw escape', 'Missed throws', 'Heavy', 'Heavy parry', 'CPU select', 'CPU match', 'Relentless', 'Infinite Haze', 'Malevolent Stench', 'Clash', 'Haze cutscene', 'Rip cutscene', 'Practice',
  'Practice CPU 5', 'Yitty roster', 'Yitty suplex', 'Yitty escape', 'Yitty ball', 'Yitty tackle', 'Yitty montage', 'Yitty opening', 'Burst meter',
  'Somhack roster', 'Somhack idle', 'Somhack SMG', 'Somhack Hack', 'Somhack Virus', 'Somhack beacon', 'Somhack teleport', 'Somhack stealth', 'Somhack domain', 'Somhack HUD error', 'Somhack fifteen hits', 'Somhack throw', 'Somhack throw Hack', 'Somhack throw blast',
  'Curtis roster','Curtis idle','Curtis swing','Curtis wall kick','Curtis pistol','Curtis squeeze','Curtis pop','Curtis Grand Line',
  'Siglarp roster','Siglarp idle','Siglarp Copycat','Siglarp saved','Siglarp counter','Siglarp Identity Theft','Siglarp opening',
  'Siglarp Complete Larp Lancer','Siglarp Complete Larp Curtis','Siglarp Complete Larp Somhack','Siglarp copied Null ultimate',
  'Kinkade roster','Kinkade idle','Kinkade drinking','Kinkade safe dose','Kinkade overstimulated','Kinkade running','Kinkade throw',
  'Kinkade struggle','Kinkade slam','Kinkade Pump ready','Kinkade Bench','Kinkade pumped Bench',
  'Null roster', 'Null idle', 'Null punch', 'Null spear windup', 'Null spear', 'Null air spear', 'Null air Zoom', 'Null air Zoom reset', 'Null air double Zoom', 'Null marked', 'Null staggered Zoom', 'Null Zoom reset', 'Null double Zoom', 'Null Silent Eclipse', 'Null Eclipse attack', 'Null throw',
  'New roster', 'Lancer wave', 'Lancer masked wave', 'Lancer mask', 'Lancer shatter', 'Lancer Flash Slash', 'Lancer barrage', 'Lancer masked barrage', 'Lancer Soul Sky',
  'Cheese vanish', 'Cheese trap', 'Cheese phone', 'Cheese scare', 'Cheese throw', 'Cheese chase',
  'Teo Sober', 'Teo Buzzed', 'Teo Drunk', 'Teo Blackout', 'Teo bottle', 'Teo pick', 'Teo Bellow', 'Teo throw', 'Teo Last Call',
  'CPU Lancer 1', 'CPU Lancer 3', 'CPU Lancer 5', 'CPU Cheese 1', 'CPU Cheese 3', 'CPU Cheese 5', 'CPU Teo 1', 'CPU Teo 3', 'CPU Teo 5']) {
  const button = document.createElement('button'); button.textContent = name;
  button.addEventListener('click', () => showScene(name)); sceneControls.append(button);
}
document.body.append(sceneControls);
for(const name of ['Smooth Bench poses','Smooth Bench live']) {
  const button=document.createElement('button');button.textContent=name;
  button.addEventListener('click',()=>showScene(name));sceneControls.append(button);
}
const audioStatus = document.createElement('output'); audioStatus.id = 'audio-status';
audioStatus.style = 'position:absolute;top:775px;left:20px;color:white;font:14px sans-serif';
const refreshAudioStatus = () => { audioStatus.textContent = `Audio: ${sound.context?.state || 'locked'} • ${sound.muted ? 'muted' : 'unmuted'} • volume ${Math.round(sound.volume * 100)}%`; };
document.body.append(audioStatus); refreshAudioStatus();
let observedAudio = null;
window.addEventListener('keydown', () => {
  if (sound.context && sound.context !== observedAudio) { observedAudio = sound.context; sound.context.addEventListener('statechange', refreshAudioStatus); }
  refreshAudioStatus();
});
const finalReport = document.getElementById('test-report'); finalReport.style.top = '960px';
finalReport.textContent = testResults.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n');
showScene(location.hash==='#runs'?'Run styles':location.hash==='#smooth'?'Smooth Bench live':'Title');
