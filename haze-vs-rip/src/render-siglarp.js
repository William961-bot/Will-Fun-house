CHARACTER_GUARDS.siglarp=pose(STAND,{head:[-8,-149],neck:[-5,-130],eF:[19,-121],hF:[36,-152],eB:[-9,-103],hB:[25,-132]});
GUARD_RECOIL.siglarp=10;
CHARACTER_RUNS.siglarp=(f,t)=>{
  const {s,bob,legs}=runningSteps(t,.32,48,30,4);
  return pose(STAND,{...legs,head:[20,-145+bob],neck:[13,-127+bob],hip:[-1,-74+bob],
    eF:[15+s*19,-116+bob],hF:[32+s*27,-142+bob],eB:[-12-s*19,-90+bob],hB:[-30-s*27,-78+bob]});
};
function siglarpPose(f,t,frame) {
  if(f.state==='siglarpCounter')return pose(f.siglarpCounterPose||STAND,{sx:1,rot:0});
  if(f.state==='siglarpSave')return pose(STAND,{hF:[12,-153],eF:[29,-124],hB:[-17,-84]});
  if(f.state==='attack'&&f.moveName==='siglarpReply') {
    const other=Object.create(f);other.stats=CHARACTERS[f.siglarpReplyId];other.moveName=f.siglarpReplyName;
    if(MOVES[other.moveName])return attackAnim(other,other.move.startup+frame);
    return pose(STAND,{head:[28,-146],neck:[21,-128],eF:[54,-112],hF:[106,-115]});
  }
  if(f.siglarpUltimateId&&g.domainSequence?.owner===f.index||f.state==='goonDash')
    return withSiglarpKit(f,f.siglarpUltimateId,()=>animatedPose(f,t,frame));
  if(f.state==='idle')return pose(idleAnim(t),{eB:[-14,-98],hB:[-18,-78],hF:[30,-137],eF:[19,-110]});
  return null;
}
function drawSiglarpMask(ctx,x,y,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='#ece9ff';ctx.strokeStyle='#74698e';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,0,12,15,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='#514266';ctx.beginPath();ctx.ellipse(-5,-3,3,2,-.25,0,TAU);ctx.ellipse(5,-3,3,2,.25,0,TAU);ctx.fill();
  ctx.strokeStyle='#514266';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,3,6,.2,Math.PI-.2);ctx.stroke();ctx.restore();
}
function drawSiglarpBody(ctx,f,p,t) {const [x,y]=worldPoint(f,p,'head');drawSiglarpMask(ctx,x,y);}
function drawSiglarpDomain(ctx,g,domain) {
  if(domain.type!=='siglarp')return false;
  ctx.save();if(!g.domain)ctx.globalAlpha=domain.framesLeft/DOMAIN.fadeFrames;
  const sky=ctx.createLinearGradient(0,0,W,FLOOR);sky.addColorStop(0,'#201533');sky.addColorStop(.5,'#403158');sky.addColorStop(1,'#16142b');
  ctx.fillStyle=sky;fillArenaBackground(ctx, FLOOR);
  for(let i=0;i<7;i++) {
    const x=115+i*175;ctx.fillStyle='#b3a4ff14';ctx.strokeStyle='#dbd0ff66';ctx.lineWidth=2;
    ctx.fillRect(x-55,205,110,355);ctx.strokeRect(x-55,205,110,355);
    ctx.strokeStyle='#f4edff33';ctx.beginPath();ctx.moveTo(x-42,530);ctx.lineTo(x+42,240);ctx.stroke();
  }
  ctx.restore();return true;
}
