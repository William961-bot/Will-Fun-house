// Curtis: an athletic stick fighter with elastic limbs and a straw hat.
CHARACTER_GUARDS.curtis=pose(STAND,{head:[-6,-150],neck:[-4,-132],hip:[-6,-72],
  eF:[22,-107],hF:[32,-143],eB:[-8,-102],hB:[15,-128],fF:[32,0],fB:[-27,0]});
GUARD_RECOIL.curtis=9;
for(const name of ['light','low','overhead','heavy','air']) {
  const strike=name==='low'?pose(CROUCH,{kF:[55,-27],fF:[108,-18]}):name==='overhead'?
    pose(STAND,{eF:[46,-126],hF:[90,-165],head:[23,-149]}):name==='air'?
    pose(AIR,{hF:[90,-40],eF:[46,-77],kF:[30,-50],fF:[46,-18]}):
    pose(STAND,{eF:[65,-110],hF:[name==='heavy'?130:103,-113],neck:[25,-127],head:[34,-145]});
  SIGNATURE_TIMELINES[`curtis_${name}`]=m=>weaponTrack(STAND,
    pose(name==='low'?CROUCH:STAND,{hF:[-35,-100],eF:[-20,-106]}),strike,m);
}
CHARACTER_RUNS.curtis=(f,t)=>{
  const {s,bob,legs}=runningSteps(t,.39,54,33,5);
  return pose(STAND,{...legs,head:[27,-143+bob],neck:[18,-125+bob],hip:[-3,-73+bob],
    eF:[18+s*25,-102+bob],hF:[31+s*39,-120+bob],
    eB:[-13-s*25,-98+bob],hB:[-22-s*39,-114+bob]});
};
function curtisPose(f,t,frame) {
  if(f.curtisSwingLeft>0&&['air','block'].includes(f.state))
    return pose(AIR,{head:[20,-137],neck:[12,-120],hF:[70,-213],eF:[39,-168],
      hB:[-27,-91],eB:[-15,-105],kF:[30,-45],fF:[18,-12],kB:[-23,-53],fB:[-43,-33],rot:-.08});
  if(f.state==='air'&&f.animHint==='curtisWallJump')return sampleTrack([[0,pose(AIR,{hF:[-40,-120],hB:[20,-140],
    kB:[-45,-35],fB:[-75,-22],kF:[25,-54],fF:[29,-30]})],[12,AIR,'out']],frame);
  if(f.state==='attack') {
    if(f.moveName==='rubberPistol')return sampleTrack(weaponTrack(STAND,
      pose(STAND,{hF:[-55,-116],eF:[-25,-103],head:[-12,-148]}),
      pose(STAND,{hF:[234,-114],eF:[125,-108],hB:[-14,-118],neck:[20,-125],head:[28,-142]}),f.move),frame);
    if(f.moveName==='rubberSling')return sampleTrack(weaponTrack(STAND,
      pose(CROUCH,{hF:[-48,-110],hB:[-50,-85],neck:[-20,-100],head:[-24,-117]}),
      pose(A.dashLean,{hF:[96,-104],eF:[60,-100],head:[42,-121]}),f.move),frame);
    if(f.moveName==='rubberRocket')return sampleTrack(weaponTrack(STAND,CROUCH,
      pose(STAND,{hF:[68,-205],eF:[36,-152],head:[17,-148],hB:[-20,-102]}),f.move),frame);
  }
  if(f.state==='idle')return pose(idleAnim(t),{eB:[-16,-99],hB:[-17,-77],hF:[34,-112],oy:Math.sin(t*.13)*2});
  return null;
}
function curtisThrowPose(f,who,frame) {
  const amount=clamp01((frame-THROWS.curtis.squeezeFrom)/(THROWS.curtis.squeezeAt-THROWS.curtis.squeezeFrom));
  if(who==='def')return pose(TH.held,{sx:1-amount*.28,oy:amount*8,
    head:[-12,-142+amount*14],hF:[-18,-112],hB:[20,-110],ox:Math.sin(frame*1.4)*amount*2});
  return sampleTrack([[0,POSES.grab_s],[12,pose(STAND,{hF:[90,-100],eF:[48,-104],hB:[85,-135],eB:[36,-119]})],
    [56,pose(CROUCH,{hF:[82,-95],eF:[42,-90],hB:[79,-125],eB:[35,-109]})],
    [THROWS.curtis.frames,A.shove,'snap']],frame);
}
function drawCurtisHat(ctx,x,y,color,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='#eac67c';ctx.strokeStyle='#9f7038';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,-9,26,6,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,-16,15,11,0,Math.PI,TAU);ctx.lineTo(15,-10);ctx.lineTo(-15,-10);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=color;ctx.fillRect(-15,-15,30,5);ctx.restore();
}
function drawCurtisBody(ctx,f,p,t) {
  const [hx,hy]=worldPoint(f,p,'head');
  ctx.save();ctx.lineCap='round';
  drawCurtisHat(ctx,hx,hy,f.stats.color);
  if(f.curtisSwingLeft>0&&f.curtisAnchor) {
    const [x,y]=worldPoint(f,p,'hF');ctx.strokeStyle=f.stats.color;ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+f.curtisAnchor.x)/2-15*f.curtisSwingDir,y-70,f.curtisAnchor.x,f.curtisAnchor.y);ctx.stroke();
    ctx.fillStyle=f.stats.color;ctx.beginPath();ctx.arc(f.curtisAnchor.x,f.curtisAnchor.y,7,0,TAU);ctx.fill();
  }
  if(f.state==='throw'&&f.throwKind==='curtis'&&f.stateFrame>=THROWS.curtis.squeezeFrom) {
    const v=opponentOf(f),tight=clamp01((f.stateFrame-12)/44);
    ctx.strokeStyle=f.stats.color;ctx.lineWidth=6;
    for(let i=0;i<3;i++) {
      ctx.beginPath();ctx.ellipse(v.x,v.y-78-i*24,40-tight*12,10,0,0,TAU);ctx.stroke();
    }
  }
  if(ownDomain(f)){ctx.strokeStyle='#ffd778';ctx.lineWidth=2;ctx.globalAlpha=.5;ctx.beginPath();ctx.ellipse(f.x,f.y-70,58,85,0,0,TAU);ctx.stroke();}
  ctx.restore();
}
function drawCurtisPortrait(ctx,cx,y,size,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(cx,y+size*.46,size*.19,0,TAU);ctx.fill();
  drawCurtisHat(ctx,cx,y+size*.43,color,size/80);
}
function drawCurtisDomain(ctx,g,domain) {
  if(domain.type!=='curtis')return false;
  ctx.save();if(!g.domain)ctx.globalAlpha=domain.framesLeft/DOMAIN.fadeFrames;
  const sky=ctx.createLinearGradient(0,0,0,FLOOR);sky.addColorStop(0,'#17304b');sky.addColorStop(1,'#287f8a');
  ctx.fillStyle=sky;fillArenaBackground(ctx, FLOOR);
  ctx.fillStyle='#ffdd8799';ctx.beginPath();ctx.arc(1050,215,70,0,TAU);ctx.fill();
  ctx.strokeStyle='#8bdddc';ctx.lineWidth=2;
  for(let row=0;row<5;row++) {
    ctx.beginPath();for(let x=0;x<=W;x+=12){const y=450+row*32+Math.sin(x*.025+g.frame*.025+row)*8;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  }
  ctx.fillStyle='#142c38';ctx.beginPath();ctx.moveTo(450,420);ctx.lineTo(820,420);ctx.lineTo(780,460);ctx.lineTo(505,460);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e4c99c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(640,420);ctx.lineTo(640,285);ctx.stroke();
  ctx.fillStyle='#ffdb99';ctx.beginPath();ctx.moveTo(646,290);ctx.lineTo(752,385);ctx.lineTo(646,385);ctx.closePath();ctx.fill();
  ctx.restore();return true;
}
