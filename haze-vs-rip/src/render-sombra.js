const SOMBRA_REST = pose(STAND, { eF: [16,-92], hF: [24,-70], eB: [-12,-91], hB: [-20,-69] });
CHARACTER_GUARDS.sombra = pose(STAND, { neck: [-7,-130], head: [-10,-148], hip: [-8,-72],
  eF: [20,-114], hF: [25,-145], eB: [4,-100], hB: [15,-132], fF: [29,0], fB: [-30,0] });
GUARD_RECOIL.sombra = 7;
function sombraPose(f,t,frame) {
  if(g.domainSequence?.kind==='hackDomainWindup'&&g.domainSequence.owner===f.index)
    return pose(CROUCH,{hF:[36,-150],hB:[-34,-150],eF:[28,-105],eB:[-26,-105]});
  if(['virusWindup','beaconWindup'].includes(f.state)) {
    const at=f.state==='virusWindup'?SOMBRA.virusStartup:SOMBRA.beaconStartup;
    return sampleTrack([[0,SOMBRA_REST],[at-2,pose(STAND,{hF:[-26,-132],eF:[-18,-110]}),'out'],
      [at,pose(STAND,{hF:[75,-110],eF:[40,-112]}),'snap'],[f.abilityFrames,SOMBRA_REST,'out']],frame);
  }
  if(f.state==='teleportRecover')return pose(CROUCH,{hF:[28,-100],hB:[-25,-80],ox:Math.sin(frame*2)*2});
  if(f.state==='attack') {
    const name=f.moveName,m=f.move;
    if(name==='hackPulse'||name==='emp')return sampleTrack([[0,SOMBRA_REST],
      [m.startup,pose(STAND,{hF:[75,-125],eF:[38,-112],hB:[-23,-105]}),'snap'],
      [m.startup+m.active,pose(STAND,{hF:[75,-125],eF:[38,-112]})],
      [m.startup+m.active+m.recovery,SOMBRA_REST,'out']],frame);
    if(name==='overhead')return sampleTrack([[0,SOMBRA_REST],
      [m.startup-2,pose(CROUCH,{hF:[42,-60],eF:[26,-76]}),'out'],
      [m.startup,pose(STAND,{hF:[77,-165],eF:[45,-134],head:[15,-148]}),'snap'],
      [m.startup+m.active,pose(STAND,{hF:[77,-165],eF:[45,-134]})],
      [m.startup+m.active+m.recovery,SOMBRA_REST,'out']],frame);
    if(name!=='grab') {
      const low=['low','lowMedium'].includes(name),base=m.air?AIR:low?CROUCH:STAND;
      const y=low?-33:m.air&&name==='air'?-88:-118;
      const aim=pose(base,{hF:[57,y],eF:[27,y+12],hB:[40,y+2],eB:[12,y+10]});
      const kick=pose(aim,{hF:[51,y-2],hB:[34,y],ox:-2});
      return sampleTrack([[0,pose(base,{hF:[38,y],hB:[24,y]})],
        [m.startup-1,aim,'out'],[m.startup,kick,'snap'],[m.startup+m.active,aim,'out'],
        [m.startup+m.active+m.recovery,pose(base,{hF:[38,y],hB:[24,y]}),'out']],frame);
    }
  }
  if(f.state==='idle')return pose(SOMBRA_REST,{oy:Math.sin(t*.1)*1.5});
  if(f.state==='walk')return pose(walkAnim(t),{hF:SOMBRA_REST.hF,hB:SOMBRA_REST.hB});
  return null;
}
function drawSombraGun(ctx,x,y,facing,color,angle=0,flash=false,heavy=false) {
  ctx.save();ctx.translate(x,y);ctx.scale(facing,1);ctx.rotate(angle);
  ctx.fillStyle='#161323';ctx.strokeStyle=color;ctx.lineWidth=1.5;
  ctx.fillRect(-18,-10,42,15);ctx.strokeRect(-18,-10,42,15);
  ctx.fillRect(22,-6,16,6);ctx.fillRect(-24,-7,8,6);ctx.fillRect(-5,5,7,13);
  ctx.fillStyle=color;ctx.fillRect(3,-7,14,3);ctx.fillRect(10,5,7,12);
  if(flash) {
    ctx.shadowColor=color;ctx.shadowBlur=16;ctx.fillStyle=heavy?color:'#fff2aa';
    ctx.beginPath();ctx.moveTo(37,-3);ctx.lineTo(57,-15);ctx.lineTo(52,-4);
    ctx.lineTo(heavy?90:69,-2);ctx.lineTo(52,2);ctx.lineTo(57,10);ctx.closePath();ctx.fill();
    ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(57,-2);ctx.lineTo(heavy?112:92,-2);ctx.stroke();
  }ctx.restore();
}
function drawSombraBody(ctx,f,p,t) {
  const [hx,hy]=worldPoint(f,p,'head'),[nx,ny]=worldPoint(f,p,'neck'),[bx,by]=worldPoint(f,p,'hip'),[wx,wy]=worldPoint(f,p,'hF');
  ctx.save();ctx.strokeStyle=f.stats.dark;ctx.lineWidth=15;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(nx,ny+9);ctx.lineTo(bx,by-4);ctx.stroke();
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(nx+6*f.facing,ny+7);ctx.lineTo(bx+9*f.facing,by-6);ctx.stroke();
  ctx.fillStyle='#c99077';ctx.beginPath();ctx.arc(hx,hy,14,0,TAU);ctx.fill();
  // Swept purple undercut and a hanging lock distinguish her even in silhouette.
  ctx.fillStyle=f.stats.dark;ctx.beginPath();ctx.arc(hx,hy-4,16,Math.PI,TAU);ctx.lineTo(hx+9*f.facing,hy+15);ctx.lineTo(hx-14*f.facing,hy-4);ctx.fill();
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(hx-12*f.facing,hy-9);
  ctx.quadraticCurveTo(hx+18*f.facing,hy-16,hx+17*f.facing,hy+25);ctx.stroke();
  ctx.fillStyle='#2a153e';ctx.fillRect(hx+3*f.facing,hy-1,5,3);
  const bulletThrow=f.state==='throw'&&f.throwKind==='sombra'&&
    THROWS.sombra.shots.some(at=>f.stateFrame>=at&&f.stateFrame<at+3);
  const victim=bulletThrow?opponentOf(f):null;
  const angle=bulletThrow?Math.atan2(victim.y-105-wy,Math.abs(victim.x-wx)):
    f.move?.air&&f.moveName==='air'?.25:0;
  const shooting=f.state==='attack'&&MOVES[f.moveName]&&
    !['grab','overhead'].includes(f.moveName)&&f.smgShotLeft>0;
  if(shooting||bulletThrow)
    drawSombraGun(ctx,wx,wy,f.facing,f.stats.color,angle,f.smgShotLeft>0,f.move?.unblockable);
  if(f.state==='attack'&&f.moveName==='hackPulse') {
    ctx.strokeStyle=f.stats.color;ctx.lineWidth=2;ctx.shadowColor=f.stats.color;ctx.shadowBlur=12;
    ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(f.x+135*f.facing,f.y-110);ctx.stroke();
  }ctx.restore();
}
function drawSombraPortrait(ctx,cx,y,size,color) {
  ctx.fillStyle='#c99077';ctx.beginPath();ctx.arc(cx,y+size*.46,size*.19,0,TAU);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=size*.08;ctx.beginPath();ctx.moveTo(cx-size*.17,y+size*.36);
  ctx.quadraticCurveTo(cx+size*.25,y+size*.2,cx+size*.21,y+size*.73);ctx.stroke();
}
function sombraThrowPose(f,who,frame) {
  const spec=THROWS.sombra;
  if(who==='def') {
    const suspended=pose(AIR,{head:[-12,-145],neck:[-7,-127],hF:[-12,-91],hB:[20,-86],
      kF:[12,-28],fF:[18,-5],kB:[-19,-24],fB:[-27,-3]});
    const hit=pose(suspended,{head:[-22,-142],neck:[-12,-124],ox:-4});
    const base=sampleTrack([[0,TH.held],[spec.floatFrom,TH.held],[spec.floatAt,suspended,'out'],
      [spec.hackAt,suspended],[spec.frames,POSES.hit,'snap']],frame);
    const shot=spec.shots.find(at=>frame>=at&&frame<at+2);
    return shot===undefined?base:hit;
  }
  const aim=pose(SOMBRA_REST,{hF:[43,-130],eF:[23,-109],hB:[28,-125],eB:[8,-110]});
  const hack=pose(STAND,{hF:[74,-150],eF:[37,-122],hB:[-18,-105]});
  return sampleTrack([[0,POSES.grab_s],[spec.floatFrom,POSES.grab_s],[spec.floatAt,aim,'snap'],
    [spec.hackAt-4,aim],[spec.hackAt,hack,'snap'],[spec.frames,hack]],frame);
}
function drawSomhackThrow(ctx,f,victim) {
  const spec=THROWS.sombra,sf=f.stateFrame;
  if(!f.throwCommitted||sf<spec.floatFrom)return;
  const p=f.pose||sombraThrowPose(f,'att',sf),[wx,wy]=worldPoint(f,p,'hF');
  const targetY=victim.y-105;
  ctx.save();ctx.strokeStyle=f.stats.color;ctx.fillStyle=f.stats.color;ctx.lineWidth=2;
  ctx.shadowColor=f.stats.color;ctx.shadowBlur=12;
  // Several staggered tracers are visual bullets, never independent hitboxes or damage.
  const shot=spec.shots.find(at=>sf>=at&&sf<at+3);
  if(shot!==undefined) {
    for(let i=0;i<3;i++) {
      const startX=wx+34*f.facing,startY=wy-12,endX=victim.x+(i-1)*9,endY=targetY+(i-1)*16;
      ctx.globalAlpha=1-i*.2;ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
      ctx.fillRect(endX-3,endY-2,6,4);
    }
  }
  ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(victim.x,victim.y-65,42,94,0,0,TAU);ctx.stroke();
  if(sf>=spec.hackAt) {
    const charge=Math.min(1,(sf-spec.hackAt)/(spec.frames-spec.hackAt));
    ctx.globalAlpha=.85;ctx.lineWidth=3+charge*4;
    ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(victim.x,targetY);ctx.stroke();
    ctx.beginPath();ctx.arc(victim.x,targetY,18+charge*24,0,TAU);ctx.stroke();
    ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('HACK',victim.x,targetY+4);
  }
  ctx.restore();
}
function drawSombraWorld(ctx,g) {
  ctx.save();
  for(const f of fighters) {
    if(f.state==='throw'&&f.throwKind==='sombra')drawSomhackThrow(ctx,f,opponentOf(f));
    if(f.beacon) {
      const b=f.beacon;ctx.strokeStyle=f.stats.color;ctx.fillStyle='#211331';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(b.x,b.y-8,15,7,0,0,TAU);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(b.x,b.y-8,22+Math.sin(g.frame*.18)*3,10,0,0,TAU);ctx.stroke();
      ctx.fillStyle=f.stats.color;ctx.font='bold 11px sans-serif';ctx.textAlign='center';
      ctx.fillText(`P${f.index+1} BEACON · READY`,b.x,b.y-30);
    }
    if(f.hacked>0) {
      ctx.strokeStyle='#cf82ff';ctx.lineWidth=2;ctx.strokeRect(f.x-32,f.y-157,64,140);
      ctx.fillStyle='#cf82ff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';
      ctx.fillText(`HACKED ${(f.hacked/60).toFixed(1)}s`,f.x,Math.max(262,f.y-188));
    }
  }
  for(const p of g.projectiles)if(p.kind==='virus') {
    ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=14;ctx.fillRect(p.x-9,p.y-9,18,18);
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(p.x-5,p.y-5,10,10);ctx.shadowBlur=0;
  }
  if(g.domainSequence?.kind==='hackDomainWindup') {
    ctx.fillStyle='#201037aa';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#cf82ff';
    ctx.font='bold 28px sans-serif';ctx.fillText('DOMAIN EXPANSION',W/2,235);
    ctx.font='bold 68px Impact,sans-serif';ctx.fillText('U HAVE BEEN HACKED',W/2,315);
    ctx.font='18px monospace';ctx.fillText('ERROR · ERROR · ERROR · ERROR',W/2,355);
  }ctx.restore();
}
function drawSomhackErrorHud(ctx,f,g) {
  const x=f.index===0?40:W-540,offset=Math.floor(g.frame/6)%3;
  ctx.save();ctx.fillStyle='#101022';ctx.fillRect(x-3,25,506,194);ctx.fillRect(x-3,628,506,80);
  ctx.strokeStyle='#cf82ff';ctx.lineWidth=1;ctx.strokeRect(x-3,25,506,194);ctx.strokeRect(x-3,628,506,80);
  ctx.textAlign='left';ctx.font='bold 18px monospace';ctx.fillStyle='#ff626e';
  for(let i=0;i<5;i++)ctx.fillText('ERROR  ERROR  ERROR  ERROR',x+14+(i%2?offset*3:0),53+i*33);
  ctx.font='bold 15px monospace';ctx.fillText('ERROR  ERROR  ERROR  ERROR',x+14,653);
  ctx.fillStyle='#cf82ff';ctx.font='12px monospace';ctx.fillText('HUD OFFLINE · U HAVE BEEN HACKED',x+14,683);
  ctx.restore();
}
function drawSomhackDomainOverlay(ctx,g) {
  if(!g.hackDomains.length)return;
  ctx.save();ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillStyle='#cf82ff';
  const y=g.domain?174:123;
  g.hackDomains.forEach((domain,i)=>ctx.fillText(`P${domain.owner+1} · HUD OFFLINE ${(domain.framesLeft/60).toFixed(1)}s`,W/2,y+i*18,190));
  ctx.font='bold 20px monospace';ctx.fillText('U HAVE BEEN HACKED',W/2,275);
  ctx.restore();
}
