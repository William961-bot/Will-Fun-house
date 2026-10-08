// Glowtech visuals follow fighter joints and never affect gameplay.
const NULL_REST = pose(STAND,{eF:[20,-106],hF:[34,-124],eB:[-8,-104],hB:[4,-118],head:[2,-150]});
const NULL_THRUST = pose(STAND,{neck:[17,-126],head:[25,-144],eF:[52,-110],hF:[88,-112],eB:[6,-109],hB:[10,-112]});
function drawNullDomain(ctx,g,domain) {
  if(domain.type!=='null')return false;
  ctx.save();if(!g.domain)ctx.globalAlpha=domain.framesLeft/DOMAIN.fadeFrames;
  ctx.fillStyle='#020409';fillArenaBackground(ctx, FLOOR);
  const glow=ctx.createRadialGradient(W/2,330,120,W/2,330,650);
  glow.addColorStop(0,'#050913');glow.addColorStop(1,'#0b1a25');ctx.fillStyle=glow;fillArenaBackground(ctx, FLOOR);
  ctx.strokeStyle='#205062';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(W/2,330,590,270,0,0,TAU);ctx.stroke();
  ctx.strokeStyle='#64f6ff18';ctx.lineWidth=1;
  for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(W/2,330,570-i*6,260-i*8,0,0,TAU);ctx.stroke();}
  ctx.fillStyle='#68969c';ctx.font='13px sans-serif';ctx.textAlign='center';
  ctx.fillText('SILENT ECLIPSE · Attacks reveal Null · A hit exposes him',W/2,292);ctx.restore();return true;
}
CHARACTER_GUARDS.null=pose(STAND,{neck:[-8,-130],head:[-12,-148],hip:[-10,-72],eF:[28,-112],hF:[40,-141],eB:[10,-96],hB:[30,-116],fF:[32,0],fB:[-32,0]});
GUARD_RECOIL.null=8;
for(const name of ['light','low','overhead','heavy','air']) {
  // His ordinary strikes are unarmed; the spear belongs only to Spear Throw.
  SIGNATURE_TIMELINES[`null_${name}`]=m=>weaponTrack(NULL_REST,POSES[`${name}_w`],POSES[`${name}_s`],m);
}
function nullPose(f,t,frame) {
  if(g.domainSequence?.kind==='cutscene'&&g.domainSequence.owner===f.index)
    return pose(CROUCH,{hF:[20,-190],hB:[14,-150],eF:[24,-151],head:[8,-133],neck:[4,-115]});
  if(f.state==='nullSpearWindup')return pose(sampleTrack([[0,NULL_REST],
    [NULL.spearStartup-2,pose(STAND,{neck:[-8,-130],head:[-13,-148],eF:[-26,-125],hF:[-39,-137]}),'out'],
    [NULL.spearStartup,pose(STAND,{neck:[22,-125],head:[29,-142],eF:[55,-110],hF:[98,-110]}),'snap'],
    [NULL.spearStartup+NULL.spearRecovery,NULL_REST,'inOut']],frame),f.grounded?{}:
      {kF:[24,-48],fF:[20,-20],kB:[-18,-42],fB:[-30,-18]});
  if(f.state==='attack'&&f.moveName==='nullZoom') {
    const dash=pose(STAND,{neck:[36,-118],head:[48,-131],hip:[-5,-67],eF:[12,-99],hF:[-8,-94],eB:[-24,-97],hB:[-43,-86],kF:[34,-40],fF:[58,-8],kB:[-32,-35],fB:[-54,-3],
      ...(f.zoomAir?{kF:[20,-48],fF:[16,-22],kB:[-38,-51],fB:[-58,-33]}:{})});
    return sampleTrack([[0,NULL_REST],[NULL.zoomStartup-2,CROUCH,'out'],[NULL.zoomStartup,dash,'snap'],
      [f.move.startup+f.move.active,dash],[f.move.startup+f.move.active+f.move.recovery,NULL_REST,'inOut']],frame);
  }
  if(f.state==='idle')return pose(NULL_REST,{oy:Math.sin(t*.1)*1.5});
  if(f.state==='walk')return pose(walkAnim(t),{hF:NULL_REST.hF,hB:NULL_REST.hB});
  return null;
}
function nullThrowPose(f,who,frame) {
  if(who==='def')return sampleTrack([[0,TH.held],[24,A.hitSnap,'snap'],[THROWS.null.frames,POSES.hit,'out']],frame);
  return sampleTrack([[0,POSES.grab_s],[12,pose(NULL_REST,{eB:[40,-110],hB:[70,-120]}),'out'],
    [24,pose(NULL_THRUST,{eB:[44,-108],hB:[72,-106]}),'snap'],[36,NULL_THRUST],[THROWS.null.frames,NULL_REST,'out']],frame);
}
function drawGlowSpear(ctx,x,y,facing,angle,color,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(facing*scale,scale);ctx.rotate(angle);ctx.lineCap='round';
  ctx.strokeStyle='#10353e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-42,0);ctx.lineTo(85,0);ctx.stroke();
  ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeStyle=color;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-42,0);ctx.lineTo(87,0);ctx.stroke();
  for(const at of [-32,-10,12,34,56]){ctx.beginPath();ctx.moveTo(at,-4);ctx.lineTo(at,4);ctx.stroke();}
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(108,0);ctx.lineTo(82,-9);ctx.lineTo(88,0);ctx.lineTo(82,9);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e5ffff';ctx.beginPath();ctx.moveTo(108,0);ctx.lineTo(87,-3);ctx.lineTo(91,0);ctx.lineTo(87,3);ctx.closePath();ctx.fill();ctx.restore();
}
function drawNullBody(ctx,f,p,t) {
  const [hx,hy]=worldPoint(f,p,'head'),[nx,ny]=worldPoint(f,p,'neck'),[bx,by]=worldPoint(f,p,'hip'),[wx,wy]=worldPoint(f,p,'hF');
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle=f.stats.dark;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(nx,ny+8);ctx.lineTo(bx,by-5);ctx.stroke();
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=2;ctx.shadowColor=f.stats.color;ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(nx+4*f.facing,ny+10);ctx.lineTo(bx+4*f.facing,by-10);ctx.stroke();
  ctx.fillStyle='#091f29';ctx.beginPath();ctx.ellipse(hx,hy,17,16,0,0,TAU);ctx.fill();
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(hx-10,hy-2);ctx.lineTo(hx+11,hy-2);ctx.stroke();
  ctx.fillStyle=f.stats.color;ctx.fillRect(hx+6*f.facing,hy-5,5,6);
  if(f.state==='nullSpearWindup'&&f.stateFrame<NULL.spearStartup)
    drawGlowSpear(ctx,wx,wy,f.facing,0,f.stats.color);
  ctx.restore();
}
function drawNullEffects(ctx,f,g) {
  ctx.save();ctx.lineCap='round';ctx.strokeStyle=f.stats.color;ctx.shadowColor=f.stats.color;ctx.shadowBlur=12;
  for(const point of f.zoomTrail||[]) {
    ctx.globalAlpha=(1-(g.frame-point.born)/16)*.5;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(point.x-48*point.facing,point.y-120);ctx.lineTo(point.x+25*point.facing,point.y-120);ctx.stroke();
    ctx.fillStyle=f.stats.color;ctx.fillRect(point.x-10,point.y-138,8,4);
  }
  const mark=f.nullMark,target=mark&&fighters[mark.target];
  if(target) {
    const x=target.x,y=target.y-110,r=22+Math.sin(g.frame*.2)*2;
    ctx.globalAlpha=1;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*(r-6),y+Math.sin(a)*(r-6));ctx.lineTo(x+Math.cos(a)*(r+9),y+Math.sin(a)*(r+9));ctx.stroke();}
    ctx.fillStyle=f.stats.color;ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillText(`MARKED ${(mark.left/60).toFixed(1)}s`,x,Math.max(235,target.y-220));
  }
  ctx.restore();
}
function drawNullProjectiles(ctx,g) {
  for(const shot of g.projectiles)if(shot.kind==='glowSpear') {
    ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle=shot.color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(shot.x-shot.vx*4,shot.y);ctx.lineTo(shot.x,shot.y);ctx.stroke();ctx.restore();
    drawGlowSpear(ctx,shot.x-38*shot.facing,shot.y,shot.facing,0,shot.color,.65);
  }
}
function drawNullPortrait(ctx,cx,y,size,color) {
  ctx.fillStyle='#091f29';ctx.beginPath();ctx.ellipse(cx,y+size*.45,size*.23,size*.21,0,0,TAU);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-size*.15,y+size*.44);ctx.lineTo(cx+size*.15,y+size*.44);ctx.stroke();
}
