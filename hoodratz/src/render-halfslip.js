// Helpers are drawn silhouettes: they have no independent hurtboxes or attacks.
const HALFSLIP_REST = pose(STAND,{head:[-5,-150],neck:[-3,-132],eF:[16,-110],hF:[-6,-111],eB:[-17,-111],hB:[11,-114]});
CHARACTER_GUARDS.halfslip = pose(HALFSLIP_REST,{head:[-13,-148],neck:[-9,-130],ox:-7});
GUARD_RECOIL.halfslip = 8;
CHARACTER_RUNS.halfslip = (f,t) => {
  const {s,bob,legs}=runningSteps(t,.34,45,28,4);
  return pose(HALFSLIP_REST,{...legs,head:[16,-144+bob],neck:[10,-127+bob],hip:[-4,-75+bob],rot:-.04});
};
function halfslipPose(f,t,frame) {
  if(f.isMinion)return null;
  if(g.domainSequence?.kind==='cutscene'&&g.domainSequence.owner===f.index&&g.domainSequence.type==='halfslip')
    return pose(HALFSLIP_REST,{hF:[49,-132],eF:[22,-115],head:[7,-150]});
  if(f.state==='idle'||f.state==='halfslipSummon')return pose(HALFSLIP_REST,{oy:Math.sin(t*.06)*1.3});
  if(f.state==='halfslipSwitch')return pose(HALFSLIP_REST,{ox:Math.sin(frame*.8)*3});
  if(f.state==='attack'&&f.moveName==='halfslipUpper') {
    const kick=pose(HALFSLIP_REST,{kF:[35,-105],fF:[78,-160],kB:[-24,-54],fB:[-40,-24],rot:-.3});
    return sampleTrack([[0,CROUCH],[8,pose(CROUCH,{oy:8})],[10,kick,'snap'],[16,kick],
      [24,pose(HALFSLIP_REST,{kF:[28,-52],fF:[40,-22],kB:[-18,-50],fB:[-29,-18]}),'out']],frame);
  }
  if(f.state==='attack'&&!['heavy','airHeavy'].includes(f.moveName)) {
    const low=['low','lowMedium'].includes(f.moveName);
    return pose(low?CROUCH:HALFSLIP_REST,{eF:[16,low?-75:-110],hF:[-6,low?-75:-111],eB:[-17,low?-76:-111],hB:[11,low?-78:-114],ox:-12});
  }
  if(f.state==='walk')return pose(walkAnim(t),{eF:HALFSLIP_REST.eF,hF:HALFSLIP_REST.hF,eB:HALFSLIP_REST.eB,hB:HALFSLIP_REST.hB});
  if(f.state==='dash')return pose(HALFSLIP_REST,{rot:.14,ox:9,kF:[30,-42],fF:[50,-3],kB:[-28,-37],fB:[-44,-5]});
  if(f.state==='backdash')return pose(HALFSLIP_REST,{rot:-.17,ox:-12,kF:[20,-38],fF:[42,-4]});
  if(f.state==='air')return pose(HALFSLIP_REST,{kF:[28,-52],fF:[40,-22],kB:[-18,-50],fB:[-29,-18],rot:Math.sin(t*.06)*.04});
  return null;
}
function halfslipThrowPose(f,who,frame) {
  if(who==='def')return sampleTrack([[0,TH.held],[18,TH.held],
    [28,pose(A.hitSnap,{rot:-.7,kF:[40,-55],fF:[64,-30]}),'snap'],
    [36,pose(A.hitSnap,{rot:.65}),'snap'],[48,pose(A.hitSnap,{rot:-.65}),'snap'],
    [60,pose(POSES.hit,{rot:Math.PI*.8}),'snap'],[70,pose(POSES.hit,{rot:Math.PI*.8})],
    [84,pose(POSES.hit,{rot:Math.PI/2,oy:65}),'snap']],frame);
  return sampleTrack([[0,HALFSLIP_REST],[18,pose(HALFSLIP_REST,{hF:[45,-140],eF:[25,-123]}),'snap'],
    [28,HALFSLIP_REST,'out'],[60,HALFSLIP_REST],[70,pose(HALFSLIP_REST,{head:[15,-145],rot:.08}),'in'],
    [84,pose(HALFSLIP_REST,{head:[15,-145],rot:.08})]],frame);
}
function drawHalfslipFace(ctx,f,p) {
  const [hx,hy]=worldPoint(f,p,'head'),[nx,ny]=worldPoint(f,p,'neck'),[bx,by]=worldPoint(f,p,'hip');
  ctx.lineCap='round';ctx.strokeStyle=f.stats.dark;ctx.lineWidth=15;
  ctx.beginPath();ctx.moveTo(nx,ny+5);ctx.lineTo(bx,by-8);ctx.stroke();
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(nx+3*f.facing,ny+9);ctx.lineTo(bx+3*f.facing,by-15);ctx.stroke();
  ctx.strokeStyle=f.stats.dark;ctx.lineWidth=6;ctx.beginPath();ctx.arc(hx,hy-1,14,Math.PI,TAU);ctx.stroke();
  ctx.strokeStyle='#143244';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(hx-8,hy-2);ctx.lineTo(hx-2,hy-1);ctx.moveTo(hx+3,hy-1);ctx.lineTo(hx+9,hy-2);ctx.stroke();
  ctx.beginPath();ctx.arc(hx+2,hy+4,5,0,Math.PI*.8);ctx.stroke();
}
function drawHalfslipHelper(ctx,f,p,alpha=.55) {
  ctx.save();ctx.globalAlpha*=alpha;ctx.lineCap='round';ctx.lineJoin='round';
  const paths=[['neck','hip'],['hip','kB','fB'],['neck','eB','hB'],['hip','kF','fF'],['neck','eF','hF']];
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=6;
  for(const path of paths) {
    ctx.beginPath();path.forEach((joint,i)=>{const [x,y]=worldPoint(f,p,joint);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  }
  const [x,y]=worldPoint(f,p,'head');ctx.fillStyle=f.stats.color;ctx.beginPath();ctx.arc(x,y,15,0,TAU);ctx.fill();
  drawHalfslipFace(ctx,f,p);ctx.restore();
}
function halfslipHelperViews(f,t,frame=f.stateFrame) {
  if(f.isMinion||f.isAfterimage||f.isIllusion)return [];
  const view=(dx,dy,p,alpha=.55)=>({x:f.x+dx*f.facing,y:f.y+dy,facing:f.facing,stats:f.stats,p,alpha});
  if(f.state==='attack') {
    if(f.moveName==='halfslipUpper') {
      const launch=f.move.startup,age=Math.max(0,frame-launch),alpha=.75*Math.max(0,1-age/15);
      const p=sampleTrack([[0,CROUCH],[8,pose(CROUCH,{hF:[25,-56],hB:[-10,-52]})],
        [10,pose(STAND,{hF:[25,-190],eF:[31,-147],hB:[-19,-182],eB:[-27,-143]}),'snap'],[24,STAND,'out']],frame);
      const dy=frame<launch?0:(f.halfslipCatapultY??f.y)-f.y;
      return [-1,1].map(dir=>view(dir*28,dy,p,alpha));
    }
    if(['heavy','airHeavy'].includes(f.moveName))return [view(-40,0,pose(STAND,{hF:[45,-80],eF:[28,-97],hB:[38,-112]})),
      view(30,0,pose(CROUCH,{hF:[-35,-86],eF:[-19,-74],hB:[-30,-108]}))];
    const proxy=Object.create(f);proxy.stats={...f.stats,id:'haze'};
    const p=attackAnim(proxy,frame);
    if(f.moveName==='overhead') {
      const vault=clamp01(frame/f.move.startup);
      return [view(0,-75*Math.sin(vault*Math.PI),pose(p,{rot:TAU*vault}),.72)];
    }
    return [view(0,0,p,.72)];
  }
  if(f.state==='block'||f.state==='blockstun')return [view(26,0,pose(POSES.block||A.block,{ox:f.state==='blockstun'?-6:0}),.72)];
  if(f.state==='parry'||f.state==='parryRecover')return [view(20,0,f.parryDir==='overhead'?A.parryOverhead:POSES['parry_'+f.parryDir],.75)];
  if(['jumpsquat','air'].includes(f.state)) {
    const boost=f.animHint==='halfslipBoost',age=f.state==='jumpsquat'?0:frame;
    if(age<18||boost&&age<24)return [view(0,Math.min(125,30+age*5),pose(CROUCH,{hF:[27,-145],eF:[31,-109],hB:[-17,-140],eB:[-26,-103]}),.65*(1-age/(boost?25:20)))];
    return [];
  }
  if(['run','dash','walk','slide','slideRecover','skid','rebound'].includes(f.state)) {
    const p=pose(runAnim(t+5),{hF:[62,-115],eF:[35,-102],hB:[45,-108],eB:[18,-100]});
    return [view(-53,0,p,.45+Math.sin(t*.15)*.12)];
  }
  if(['backdash','roll','rollRecover'].includes(f.state))return [view(-64,0,pose(STAND,{rot:-.13,hF:[62,-124],eF:[34,-115],hB:[55,-112]}),.65)];
  if(f.state==='throw') {
    const victim=fighters[f.throwTarget];if(!victim)return [];
    const dx=(victim.x-f.x)*f.facing,dy=victim.y-f.y;
    const punch=pose(STAND,{hF:[64,-123],eF:[31,-115],hB:[-13,-116],rot:.12});
    const upper=pose(CROUCH,{hF:[32,-176],eF:[35,-126],hB:[-22,-93]});
    const left=frame<30?upper:pose(punch,{ox:Math.sin(frame*.5)*8});
    const right=pose(punch,{hF:[-64,-123],eF:[-31,-115],rot:-.12});
    const helpers=[view(dx-60,dy,left,.72),view(dx+60,dy,right,.6)];
    if(frame>=56) {
      const wind=clamp01((frame-56)/14),descend=clamp01((frame-70)/14);
      helpers.push(view(dx,-195+descend*180,pose(STAND,{hF:[32,-90],eF:[28,-149],hB:[22,-88],eB:[-2,-141],
        kF:[28,-60],fF:[42,-38],kB:[-18,-55],fB:[-30,-29],rot:wind*.25}),.8));
    }
    return helpers;
  }
  if(['hitstun','stagger','thrown'].includes(f.state))return [view(-48,0,pose(STAND,{hF:[58,-108],eF:[31,-120],hB:[41,-125],rot:-.12}),.4)];
  if(f.state==='knockdown')return [view(-45,0,pose(CROUCH,{hF:[48,-40],eF:[22,-57]}),.6)];
  if(f.state==='land'||f.state==='throwRecover')return [view(-45,0,pose(STAND,{hF:[50,-130],eF:[26,-111]}),.55*Math.max(0,1-frame/20))];
  if(f.state==='burst')return [-1,1].map(dir=>view(dir*48,0,pose(A.burstOpen,{rot:dir*.15}),.65));
  if(f.state==='deflect')return [view(24,0,A.shove,.6)];
  if(f.state==='ko')return [view(-42,0,pose(STAND,{hF:[-15,-153],eF:[8,-121],hB:[16,-151],eB:[-7,-124]}),.5)];
  if(g.phase==='matchOver')return [-1,1].map(dir=>view(dir*55,0,pose(STAND,{hF:[37,-190],eF:[35,-150],hB:[-32,-185],eB:[-30,-147]}),.55));
  if(f.state==='halfslipSummon')return [view(-55,0,HALFSLIP_REST,Math.min(.7,frame/20))];
  if(f.state==='halfslipSwitch')return [view(Math.sin(frame*.25)*50,0,HALFSLIP_REST,.35)];
  if(g.domainSequence?.owner===f.index&&g.domainSequence.type==='halfslip')return [-1,1].map(dir=>view(dir*65,0,HALFSLIP_REST,.6));
  return [];
}
function drawHalfslipBody(ctx,f,p,t) {
  drawHalfslipFace(ctx,f,p);
  if(f.isMinion)return;
  for(const helper of halfslipHelperViews(f,t,f.stateFrame+subFrame()))drawHalfslipHelper(ctx,helper,helper.p,helper.alpha);
  if(halfslipWatching(f)) {
    ctx.textAlign='center';ctx.fillStyle=f.stats.color;ctx.font='bold 12px sans-serif';
    ctx.fillText('THE ORIGINAL · WATCHING',f.x,f.y-195);
  }
}
function drawHalfslipClones(ctx,game,dt) {
  for(const c of allHalfslipClones()) {
    const x=c.x,y=c.y,a=tweenAlpha(game);
    c.x=(c.prevX??x)+(x-(c.prevX??x))*a;c.y=(c.prevY??y)+(y-(c.prevY??y))*a;
    ctx.save();ctx.globalAlpha*=.65;ctx.setLineDash([5,6]);ctx.strokeStyle=c.stats.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(c.x,FLOOR+3,27,6,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
    try { drawFighter(ctx,c,game.frame,dt,game); }
    finally { ctx.restore();c.x=x;c.y=y; }
    ctx.save();ctx.fillStyle=c.stats.color;ctx.font='bold 11px sans-serif';ctx.textAlign='center';
    ctx.fillText(`${c.index+1}P · C${c.cloneNumber+1}`,c.x,c.y-185);ctx.restore();
  }
}
function drawHalfslipMeter(ctx,f) {
  const clones=halfslipClones(f),x=hudTextX(f,hudStart(f),180);
  ctx.textAlign=hudAlign(f);ctx.fillStyle=f.stats.color;ctx.font='bold 11px sans-serif';
  ctx.fillText(halfslipWatching(f)?`WATCHING · ${clones.length}/4 CLONES`:`PLUS ONE · ${clones.length?`ACTIVE ${(clones[0].life/60).toFixed(1)}s`:'NO CLONE'}`,x,205);
}
function drawHalfslipPortrait(ctx,cx,y,size,ch) {
  for(const dx of [-.23,.23]) {
    ctx.globalAlpha=.4;ctx.fillStyle=ch.color;ctx.beginPath();ctx.arc(cx+size*dx,y+size*.43,size*.17,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.fillStyle=ch.color;ctx.beginPath();ctx.arc(cx,y+size*.45,size*.2,0,TAU);ctx.fill();
  ctx.strokeStyle=ch.dark;ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,y+size*.44,size*.2,Math.PI,TAU);ctx.stroke();
  ctx.strokeStyle='#143244';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-size*.13,y+size*.44);ctx.lineTo(cx-size*.04,y+size*.45);
  ctx.moveTo(cx+size*.04,y+size*.45);ctx.lineTo(cx+size*.13,y+size*.44);ctx.stroke();
  ctx.beginPath();ctx.arc(cx+size*.02,y+size*.51,size*.07,0,Math.PI*.8);ctx.stroke();
}
function drawHalfslipDomain(ctx,game,domain) {
  ctx.save();if(!game.domain)ctx.globalAlpha=domain.framesLeft/DOMAIN.fadeFrames;
  const bg=ctx.createLinearGradient(0,0,0,FLOOR);bg.addColorStop(0,'#101d38');bg.addColorStop(1,'#1e4658');
  ctx.fillStyle=bg;fillArenaBackground(ctx,FLOOR);
  ctx.strokeStyle='#7adfff25';ctx.lineWidth=2;
  for(let x=WALL_L;x<=WALL_R;x+=140) {
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,FLOOR);ctx.stroke();
    const p=pose(HALFSLIP_REST,{oy:Math.sin(game.frame*.035+x)*5});
    drawHalfslipHelper(ctx,{x,y:470,facing:1,stats:CHARACTERS.halfslip},p,.08);
  }
  ctx.restore();return true;
}
