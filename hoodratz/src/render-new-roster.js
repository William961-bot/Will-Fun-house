// Original canvas accessories and keyframes, tied to the same joints as the body.
const NR = {
  swordRest: pose(STAND, { hF: [-12,-130], eF: [10,-104], hB: [-8,-82], eB: [-18,-100] }),
  swordWind: pose(STAND, { hF: [-8,-130], eF: [-22,-110], hB: [-10,-126], head: [-8,-150] }),
  swordCut: pose(STAND, { hF: [20,-104], eF: [28,-113], hB: [16,-106], neck: [14,-126], head: [20,-144] }),
  swordLow: pose(CROUCH, { hF: [15,-22], eF: [32,-48], hB: [10,-26], head: [20,-105] }),
  swordRaise: pose(STAND, { hF: [-8,-190], eF: [-4,-164], hB: [-10,-188] }),
  swordChop: pose(CROUCH, { hF: [30,-75], eF: [34,-96], hB: [28,-77], head: [22,-123] }),
  swordFlash: pose(CROUCH, { hF: [42,-105], eF: [28,-100], hB: [39,-108], head: [24,-126], neck: [20,-110], rot: .08 }),
  knifeRest: pose(STAND, { hF: [4,-74], eF: [16,-98], hB: [-18,-84], head: [5,-149], rot: .025 }),
  knifeStab: pose(STAND, { hF: [76,-114], eF: [45,-108], neck: [24,-130], head: [32,-149] }),
  knifeLow: pose(CROUCH, { hF: [60,-28], eF: [34,-60], neck: [15,-105], head: [24,-125] }),
  looseWind: pose(STAND, { hF: [-38,-96], eF: [-25,-110], head: [-12,-145], rot: -.08 }),
  loosePunch: pose(STAND, { hF: [100,-106], eF: [48,-116], head: [32,-143], neck: [25,-125], hip: [10,-70], rot: .08 }),
};
function weaponTrack(rest, wind, strike, m, spin = false) {
  return [[0,rest], [Math.max(1,m.startup-3), spin ? {...wind,sx:-1} : wind,'inOut'], [m.startup,strike,'snap'],
    [m.startup+m.active,strike], [m.startup+m.active+m.recovery,rest,'inOut']];
}
for (const name of ['light','low','overhead','heavy','air']) {
  SIGNATURE_TIMELINES[`lancer_${name}`] = m => weaponTrack(NR.swordRest,
    name === 'overhead' ? NR.swordRaise : NR.swordWind,
    name === 'low' ? NR.swordLow : name === 'overhead' ? NR.swordChop : name === 'air' ? pose(AIR,{hF:[20,-65],eF:[28,-96],hB:[18,-66]}) : NR.swordCut, m, name === 'heavy');
  SIGNATURE_TIMELINES[`cheese_${name}`] = m => weaponTrack(NR.knifeRest,
    name === 'overhead' ? GP.slamRaise : POSES.heavy_w,
    name === 'low' ? NR.knifeLow : name === 'overhead' ? GP.slam : name === 'air' ? GP.airChop : NR.knifeStab, m, name === 'heavy');
  SIGNATURE_TIMELINES[`teo_${name}`] = m => weaponTrack(STAND, name === 'overhead' ? S.hammerRaise : NR.looseWind,
    name === 'low' ? A.sweepStrike : name === 'overhead' ? S.hammerSlam : name === 'air' ? A.airKick : NR.loosePunch, m, name === 'heavy');
}
function rosterThrowPose(f, who, frame) {
  const sf = Math.floor(frame);
  if (who === 'def') {
    const snap = f.throwKind === 'lancer' ? f.barrage?.slashes.includes(sf) : f.throwKind === 'cheese' ? [18,25,31,36,40].includes(sf) : sf >= 22 && sf < 28;
    return pose(snap ? A.hitSnap : TH.held, { ox: Math.sin(frame * 1.8) * (snap ? 6 : 1), rot: snap ? -.08 : 0 });
  }
  if (f.throwKind === 'lancer') return frame >= f.throwFrames - 8 ? pose(NR.swordRest,{sx:-1}) : frame < 8 ? POSES.grab_s : NR.swordCut;
  if (f.throwKind === 'cheese') return frame < 10 ? POSES.grab_s : frame < 48 ? sampleTrack(weaponTrack(NR.knifeRest, NR.knifeRest, NR.knifeStab, {startup:3,active:2,recovery:1}), frame % 6) : pose(walkAnim(frame), { hF:[4,-74], eF:[16,-98], oy:-Math.abs(Math.sin(frame*.45))*5 });
  return frame < 10 ? POSES.grab_s : frame < 22 ? S.hammerRaise : frame < 32 ? S.hammerSlam : frame < 48 ? TH.present : frame < 62 ? AB.smoking : A.shove;
}
function newRosterPose(f, t, frame) {
  if (f.state === 'throw' && ['lancer','cheese','teo'].includes(f.throwKind)) return rosterThrowPose(f,'att',frame);
  if (f.state === 'attack') {
    if (f.moveName === 'flashSlash') return sampleTrack(weaponTrack(NR.swordRest, NR.swordWind, NR.swordFlash,f.move),frame);
    if (f.moveName === 'pickpocket') return sampleTrack(weaponTrack(STAND,CROUCH,NR.knifeLow,f.move),frame);
    if (f.moveName === 'stumbleCounter') return sampleTrack(weaponTrack(AB.backbend,AB.backbend,NR.loosePunch,f.move),frame);
    if (f.moveName === 'bellow') return sampleTrack(weaponTrack(STAND,AB.exhale,pose(AB.exhale,{head:[20,-145],hF:[46,-160],hB:[-30,-155]}),f.move),frame);
  }
  if (f.stats.id === 'lancer') {
    if (f.state === 'idle') return pose(NR.swordRest,{oy:Math.sin(t*.1)*2});
    if (f.state === 'walk') return pose(walkAnim(t),{hF:[-12,-130],eF:[10,-104]});
    if (f.state === 'crescentWindup') return sampleTrack(weaponTrack(NR.swordRest,NR.swordWind,NR.swordCut,{startup:12,active:1,recovery:17}),frame);
    if (f.state === 'maskToggle') return sampleTrack([[0,NR.swordRest],[5,AB.coverFace,'out'],[f.abilityFrames,AB.coverFace]],frame);
  }
  if (f.stats.id === 'cheese') {
    if (f.state === 'idle') return cheeseIdlePose(t);
    if (['walk','dash'].includes(f.state)) return cheeseWalkPose(t);
    if (['vanishFade','vanished','trapDeploy'].includes(f.state)) return CROUCH;
    if (f.state === 'phoneCall') return pose(NR.knifeRest,{hB:[6,-148],eB:[-12,-116],head:[10,-147]});
  }
  if (f.stats.id === 'teo') {
    if (f.state === 'blackout') return pose(TH.soulless,{hip:[0,-35],head:[16,-85],neck:[10,-80],kF:[28,-18],kB:[-28,-18],fF:[38,0],fB:[-38,0],rot:Math.sin(frame*.2)*.05});
    if (['chug','smokeBreak'].includes(f.state)) return pose(AB.smoking,{head:[-10,-148],hF:[0,-152],rot:-.08});
    if (f.state === 'stumbleDodge') return pose(AB.backbend,{ox:Math.sin(frame*.4)*8});
    if (f.state === 'bottleWindup') return sampleTrack(weaponTrack(STAND,NR.looseWind,NR.loosePunch,{startup:12,active:1,recovery:18}),frame);
    if (['idle','walk'].includes(f.state)) {
      const base = f.state === 'idle' ? idleAnim(t) : walkAnim(t);
      return pose(base,{rot:Math.sin(t*.13)*(teoDrunk(f) ? .11 : f.tipsy>=25 ? .055 : .025)});
    }
  }
  return null;
}
function rosterDomainPose(f) {
  if(f.stats.id==='siglarp')return pose(STAND,{hF:[5,-148],eF:[30,-125],hB:[-18,-82],head:[0,-150]});
  if(f.stats.id==='curtis')return pose(STAND,{hF:[0,-174],eF:[22,-140],hB:[-25,-85],head:[4,-147]});
  if(f.stats.id==='brainlag')return BRAINLAG_POSES.oneEye;
  if (f.stats.id === 'lancer') return pose(NR.swordRest,{hF:[30,-80],eF:[28,-100],hB:[28,-84]});
  if (f.stats.id === 'cheese') return pose(NR.knifeRest,{head:[8,-148],rot:.04});
  if (f.stats.id === 'teo') return pose(STAND,{hF:[34,-202],eF:[26,-166],head:[10,-156],hB:[-20,-86]});
  return null;
}
// The blink leaves sword-ready silhouettes and a slash that appears after the crossing.
function drawFlashSlash(ctx, f, game) {
  const flash = f.flashSlash;
  if (!flash) return;
  const age = game.frame - flash.born;
  if (age < 0 || age > 18) return;
  const life = 1 - age / 19, color = flash.masked ? '#ff4265' : '#d7f4ff';
  ctx.save();
  for (const fraction of [0, .33, .66]) {
    drawGhost(ctx, f, { x: flash.from + (flash.to - flash.from) * fraction, y: flash.y,
      facing: flash.facing, pose: NR.swordFlash }, life * .3 * (1 - fraction * .5));
  }
  if (age >= 1) {
    ctx.globalAlpha *= life; ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(flash.from, flash.y - 120); ctx.lineTo(flash.to, flash.y - 100); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(flash.from, flash.y - 113); ctx.lineTo(flash.to, flash.y - 93); ctx.stroke();
  }
  ctx.restore();
}
function drawMaskFace(ctx, x, y, scale = 1, color = '#faf4da', lancer = false) {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  ctx.fillStyle = color; ctx.strokeStyle = '#343539'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-13,-13); ctx.lineTo(12,-15); ctx.lineTo(16,4); ctx.lineTo(7,15); ctx.lineTo(-10,12); ctx.lineTo(-16,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = lancer ? '#f4d968' : '#17272a'; ctx.fillRect(-10,-3,8,3); ctx.fillRect(3,-5,8,3);
  ctx.strokeStyle = lancer ? '#cf293d' : '#344b40'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9,5); ctx.lineTo(7,8); ctx.lineTo(11,4); ctx.stroke();
  if (lancer) for (let i=0;i<3;i++) { ctx.beginPath();ctx.moveTo(4+i*3,-13);ctx.lineTo(1+i*3,-6);ctx.lineTo(7+i*2,3);ctx.stroke(); }
  ctx.restore();
}
function drawBottle(ctx,x,y,angle=0,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
  ctx.fillStyle='#ecad4c';ctx.strokeStyle='#513a24';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-3,-12);ctx.lineTo(3,-12);ctx.lineTo(3,-6);ctx.lineTo(7,-2);ctx.lineTo(7,12);ctx.lineTo(-7,12);ctx.lineTo(-7,-2);ctx.lineTo(-3,-6);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#f5e6c1';ctx.fillRect(-5,2,10,5);ctx.fillStyle='#72633c';ctx.fillRect(-4,-14,8,3);ctx.restore();
}
function drawNewFighterBody(ctx,f,p,t) {
  const point = j => [f.x+posedPoint(p,j)[0]*f.facing,f.y+posedPoint(p,j)[1]];
  const [hx,hy]=point('head'),[nx,ny]=point('neck'),[bx,by]=point('hip'),[wx,wy]=point('hF');
  ctx.save();ctx.lineCap='round';
  if(f.stats.id==='lancer') {
    drawLancerStyled(ctx,f,p,t);
  } else if(f.stats.id==='cheese') {
    drawCheeseStyled(ctx,f,p,t);
  } else if(f.stats.id==='teo') {
    ctx.strokeStyle=f.stats.dark;ctx.lineWidth=23;ctx.beginPath();ctx.moveTo(nx,ny+8);ctx.lineTo(bx,by);ctx.stroke();
    ctx.strokeStyle=f.stats.color;ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(nx,ny+8);ctx.lineTo(bx,by);ctx.stroke();
    ctx.strokeStyle='#eadbbb';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(nx-12,ny+3);ctx.lineTo(nx,ny+10);ctx.lineTo(nx+12,ny+3);ctx.stroke();
    ctx.strokeStyle=f.stats.dark;ctx.lineWidth=7;ctx.beginPath();ctx.arc(hx,hy,19,Math.PI*.8,Math.PI*2.2);ctx.stroke();
    ctx.strokeStyle='#4a3429';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(bx-14,by-3);ctx.lineTo(bx+14,by-3);ctx.stroke();
    for(let i=0;i<f.bottles;i++)drawBottle(ctx,bx+(i-1)*10,by+5,Math.sin(t*.1+i)*.1,.48);
    ctx.fillStyle='#e9857666';ctx.beginPath();ctx.arc(hx-9,hy+3,4,0,TAU);ctx.arc(hx+9,hy+3,4,0,TAU);ctx.fill();
    ctx.fillStyle='#442d24';ctx.fillRect(hx-7,hy-2,4,2);ctx.fillRect(hx+4,hy-2,4,2);
    if(f.state==='blackout'){ctx.strokeStyle='#442d24';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();for(let i=0;i<20;i++){const a=i*.6,r=i*.14,x=hx+side*6+Math.cos(a)*r,y=hy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}}
    if(f.lootFly>0)drawBottle(ctx,bx+(1-f.lootFly/24)*45*f.facing,by-40*f.lootFly/24,0,.7);
    if(['chug','bottleWindup','throw'].includes(f.state))drawBottle(ctx,wx,wy,f.state==='chug'?-1.7*f.facing:0,.8);
    if(['block','blockstun'].includes(f.state)&&f.bottles>0)drawBottle(ctx,wx,wy,-.15*f.facing,.8);
    if(f.state==='smokeBreak'){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+13*f.facing,wy);ctx.stroke();ctx.strokeStyle='#ffffff66';ctx.lineWidth=1;ctx.beginPath();ctx.arc(wx+16*f.facing,wy-13,8,0,Math.PI);ctx.stroke();}
    if(g.domainSequence?.kind==='cutscene'&&g.domainSequence.owner===f.index){ctx.fillStyle='#d9a247';ctx.fillRect(wx-10,wy-17,20,23);ctx.strokeStyle='#fce3a2';ctx.strokeRect(wx+10,wy-14,8,14);}
    if(teoDrunk(f)||f.state==='blackout'){ctx.fillStyle='#fbd980';ctx.font='18px sans-serif';ctx.fillText(f.state==='blackout'?'@ @':'✦',hx+Math.sin(t*.08)*25,hy-25);}
    if(f.moveName==='bellow'&&isStriking(f)){ctx.strokeStyle='#ffd38988';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(hx,hy,70+i*60,f.facing>0?-.5:Math.PI-.5,f.facing>0?.5:Math.PI+.5);ctx.stroke();}}
  }
  ctx.restore();
}
function drawKitMeter(ctx,f,value,label,color) {
  const x=hudStart(f), y=194,w=180;
  drawBar(ctx,x,y,w,5,value/100,0,color,false);ctx.fillStyle=color;ctx.textAlign=hudAlign(f);ctx.font='bold 9px sans-serif';
  ctx.fillText(`${label} ${Math.ceil(value)}`,hudTextX(f,x,w),y+17);
}
function drawDread(ctx,f) {
  if(!opponentsOf(f).some(opp=>opp.stats.id==='cheese'))return;
  const x=hudStart(f,200);drawBar(ctx,x,222,200,4,f.dread/100,0,'#a6d98b',false);
  ctx.fillStyle='#cde2ae';ctx.textAlign=hudAlign(f);ctx.font='bold 10px sans-serif';ctx.fillText(`◉ DREAD ${Math.ceil(f.dread)}`,hudTextX(f,x,200),239);
}
function drawRosterProjectiles(ctx,g) {
  for(const p of g.projectiles){
    if(p.kind==='bottle'){drawBottle(ctx,p.x,p.y,p.age*.3,1);continue;}
    if(p.kind!=='crescent')continue;
    drawCrescentWave(ctx,p,g.frame);
  }
}
function drawRosterFloor(ctx,g) {
  for(const f of fighters){
    for(const p of f.puddles||[]){ctx.save();ctx.globalAlpha=Math.min(1,p.life/30)*.6;ctx.fillStyle='#b5792d';ctx.beginPath();ctx.ellipse(p.x,FLOOR+2,70,7,0,0,TAU);ctx.fill();ctx.strokeStyle='#ffe3a1';ctx.stroke();ctx.restore();}
    for(const p of f.traps||[]){ctx.save();ctx.strokeStyle='#b7c99e88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-40,FLOOR-7);ctx.lineTo(p.x+40,FLOOR-7);ctx.moveTo(p.x-40,FLOOR);ctx.lineTo(p.x-40,FLOOR-12);ctx.moveTo(p.x+40,FLOOR);ctx.lineTo(p.x+40,FLOOR-12);ctx.stroke();ctx.fillStyle=f.stats.color+'aa';ctx.beginPath();ctx.moveTo(p.x-10,FLOOR);ctx.lineTo(p.x+10,FLOOR);ctx.lineTo(p.x+3,FLOOR-13);ctx.closePath();ctx.fill();ctx.restore();}
  }
}
function drawRosterThrowFx(ctx,g) {
  for(const f of fighters){
    if(f.state!=='throw')continue;const v=opponentOf(f);
    if(f.throwKind==='lancer'&&f.stateFrame>=8&&f.stateFrame<f.throwFrames-8){
      ctx.save();ctx.fillStyle='#00000088';fillArenaBackground(ctx);ctx.strokeStyle=f.barrage.masked?'#ed365a':'#e3f5ff';ctx.lineWidth=4;
      const age=f.stateFrame-f.barrage.lastAt;
      if(age>=0&&age<6){const angle=[0,Math.PI,.7,-.7,Math.PI/2,-Math.PI/2][f.barrage.lastDirection];ctx.translate(v.x,v.y-110);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-90,-8);ctx.lineTo(90,8);ctx.moveTo(-80,12);ctx.lineTo(80,-12);ctx.stroke();ctx.globalAlpha=.25;const ghost={...f,state:'idle',x:v.x-110*Math.cos(angle),y:v.y-40*Math.sin(angle),isAfterimage:true};drawFighter(ctx,ghost,g.frame,STEP,g);}
      ctx.restore();
    }
    if(f.throwKind==='teo'&&f.stateFrame>=22&&f.stateFrame<36){ctx.save();ctx.fillStyle='#fff0a0';ctx.font='25px sans-serif';ctx.fillText('✦ ✦',v.x-25,v.y-185);ctx.restore();}
  }
}
function drawRosterFear(ctx,g) {
  const vanished=fighters.find(f=>f.state==='vanished'),fear=fighters.find(f=>f.dread>=66);
  if(vanished||fear){const v=vanished?opponentOf(vanished):fear;ctx.save();const radius=vanished?180:450;const grad=ctx.createRadialGradient(v.x,v.y-100,80,v.x,v.y-100,radius);grad.addColorStop(0,'#00000000');grad.addColorStop(1,vanished?`rgba(0,6,9,${.7+Math.sin(g.frame*2.3)*.08})`:'#05161166');ctx.fillStyle=grad;fillArenaBackground(ctx);ctx.restore();}
  
}
function drawRosterDomain(ctx,g,domain) {
  if(!['lancer','cheese','teo'].includes(domain.type))return false;
  ctx.save();if(!g.domain)ctx.globalAlpha=domain.framesLeft/DOMAIN.fadeFrames;
  if(domain.type==='lancer'){
    const sky=ctx.createLinearGradient(0,0,0,FLOOR);sky.addColorStop(0,'#101a44');sky.addColorStop(1,'#405a8c');ctx.fillStyle=sky;fillArenaBackground(ctx, FLOOR);
    ctx.fillStyle='#e8ecdb';ctx.shadowColor='#e6f5ff';ctx.shadowBlur=35;ctx.beginPath();ctx.arc(W/2,300,145,0,TAU);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#111c38';for(let i=0;i<10;i++){const h=30+(i*47)%120;ctx.fillRect(0,230+i*34,h,28);ctx.fillRect(W-h,180+i*39,h,30);}
    ctx.strokeStyle='#bdcbea44';ctx.lineWidth=22;for(let i=0;i<5;i++){let x=(i*280+g.frame*.4)%(W+300)-150;ctx.beginPath();ctx.moveTo(x,400+i*20);ctx.lineTo(x+170,400+i*20);ctx.stroke();}
  }else if(domain.type==='cheese'){
    ctx.fillStyle='#061b24';fillArenaBackground(ctx, FLOOR);
    for(let i=0;i<11;i++){const x=i*127+20;ctx.fillStyle='#030e15';ctx.fillRect(x,230+(i%3)*30,12,390);ctx.beginPath();ctx.moveTo(x-55,470);ctx.lineTo(x+6,160+(i%3)*35);ctx.lineTo(x+65,470);ctx.fill();}
    ctx.strokeStyle='#637166';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(960,FLOOR);ctx.lineTo(960,210);ctx.lineTo(1010,210);ctx.stroke();
    const light=ctx.createRadialGradient(1010,230,5,1010,360,220);light.addColorStop(0,'#d5e2a344');light.addColorStop(1,'#d5e2a300');ctx.fillStyle=light;ctx.fillRect(790,160,440,460);
    ctx.strokeStyle='#71a99b22';ctx.lineWidth=35;for(let i=0;i<5;i++){const x=(i*290+g.frame*.7)%(W+400)-200;ctx.beginPath();ctx.moveTo(x,440+i*25);ctx.lineTo(x+280,440+i*25);ctx.stroke();}
  }else{
    ctx.fillStyle='#352015';fillArenaBackground(ctx, FLOOR);const sway=Math.sin(g.frame*.025)*8;
    ctx.fillStyle='#6c452788';for(let i=0;i<9;i++)ctx.fillRect(i*160+sway,200,12,420);
    ctx.fillStyle='#100d1488';for(let i=0;i<13;i++){ctx.beginPath();ctx.arc(i*104+30,450,26,0,TAU);ctx.fill();ctx.fillRect(i*104+10,475,40,145);}
    for(let i=0;i<4;i++){const x=200+i*280+sway;ctx.strokeStyle='#cfa866';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,185);ctx.stroke();const light=ctx.createRadialGradient(x,190,10,x,190,180);light.addColorStop(0,'#ffc15c66');light.addColorStop(1,'#ffc15c00');ctx.fillStyle=light;ctx.fillRect(x-180,20,360,360);ctx.fillStyle='#deae65';ctx.fillRect(x-24,170,48,16);}
    ctx.fillStyle='#a8733844';for(let i=0;i<8;i++){const x=(i*181+g.frame*.4)%W,y=320+Math.sin(g.frame*.015+i)*60;ctx.fillRect(x,y,25,30);ctx.strokeStyle='#d5a36a55';ctx.strokeRect(x+25,y+6,10,18);}
  }
  ctx.restore();return true;
}
function drawRosterPortrait(ctx,id,cx,y,size) {
  if(id==='lancer'){ctx.fillStyle='#ff8a1f';ctx.beginPath();ctx.moveTo(cx-size*.2,y+size*.42);for(let i=0;i<6;i++){ctx.lineTo(cx-size*.22+i*size*.08,y+size*(.15+(i%2)*.05));ctx.lineTo(cx-size*.18+i*size*.07,y+size*.32);}ctx.closePath();ctx.fill();ctx.strokeStyle='#d6e6f5';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx+size*.1,y+size*.76);ctx.lineTo(cx+size*.4,y+size*.25);ctx.stroke();}
  if(id==='cheese')drawMaskFace(ctx,cx,y+size*.45,size/80,CHARACTERS[id].color);
  if(id==='teo'){ctx.strokeStyle=CHARACTERS[id].dark;ctx.lineWidth=6;ctx.beginPath();ctx.arc(cx,y+size*.45,size*.23,Math.PI*.8,Math.PI*2.2);ctx.stroke();ctx.strokeStyle='#e2d4b8';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(cx-size*.2,y+size*.69);ctx.lineTo(cx,y+size*.77);ctx.lineTo(cx+size*.2,y+size*.69);ctx.stroke();drawBottle(ctx,cx+size*.3,y+size*.75,-.2,size/100);}
}
