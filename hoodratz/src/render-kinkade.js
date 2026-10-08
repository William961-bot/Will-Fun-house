CHARACTER_GUARDS.kinkade=pose(STAND,{head:[-9,-147],neck:[-7,-128],hip:[-12,-72],
  eF:[26,-106],hF:[19,-146],eB:[-23,-104],hB:[-5,-137],fF:[37,0],fB:[-33,0]});
GUARD_RECOIL.kinkade=7;
CHARACTER_RUNS.kinkade=(f,t)=>{
  const {s,bob,legs}=runningSteps(t,kinkadeOver(f)?.48:.34,46,31,3);
  return pose(STAND,{...legs,head:[24,-146+bob],neck:[15,-126+bob],hip:[-5,-73+bob],
    eF:[22+s*25,-102+bob],hF:[25+s*37,-127+bob],eB:[-18-s*21,-98+bob],hB:[-26-s*31,-117+bob]});
};
for(const name of ['light','medium','lowMedium','low','overhead','heavy','air','grab']) {
  const low=['low','lowMedium'].includes(name),base=low?CROUCH:STAND;
  const strike=low?pose(CROUCH,{neck:[23,-90],head:[30,-108],kF:[51,-24],fF:[105,-12],hF:[72,-54]}):
    name==='overhead'?pose(STAND,{neck:[24,-124],head:[30,-143],eF:[56,-153],hF:[91,-190]}):
    name==='air'?pose(AIR,{kF:[36,-59],fF:[91,-33],hF:[65,-105],eF:[39,-108]}):
    name==='grab'?pose(STAND,{hF:[79,-117],eF:[43,-105],hB:[58,-142]}):
    pose(STAND,{neck:[26,-124],head:[34,-142],eF:[55,-105],hF:[name==='heavy'?120:name==='medium'?97:81,-116],hB:[-12,-122]});
  SIGNATURE_TIMELINES[`kinkade_${name}`]=m=>weaponTrack(base,
    pose(base,{eF:[-14,-100],hF:[-36,-113],hB:[-19,-124]}),strike,m);
}
function kinkadePose(f,t,frame) {
  if(f.state==='attack'&&f.moveName==='benchPress') {
    const rest=pose(STAND,{fF:[38,0],fB:[-34,0],hF:[43,-115],hB:[11,-115]});
    const load=pose(rest,{hip:[-16,-61],neck:[-12,-117],head:[-14,-136],kF:[34,-29],kB:[-28,-28],
      eF:[28,-98],hF:[40,-109],eB:[-4,-100],hB:[8,-109]});
    const drive=pose(load,{hip:[-2,-72],neck:[9,-123],head:[15,-142],kF:[25,-38],kB:[-21,-36],
      eF:[42,-111],hF:[57,-122],eB:[14,-110],hB:[25,-122]});
    const shove=pose(rest,{hip:[4,-73],neck:[30,-126],head:[38,-146],eF:[91,-115],hF:[152,-115],eB:[69,-108],hB:[120,-115]});
    const follow=pose(shove,{neck:[34,-125],head:[41,-144],eF:[95,-113],hF:[156,-113],eB:[74,-106],hB:[124,-113]});
    const reload=pose(load,{hip:[-7,-66],neck:[-2,-122],head:[0,-141],eF:[42,-106],hF:[70,-119],eB:[18,-105],hB:[38,-119]});
    const settle=pose(rest,{hip:[-5,-69],neck:[3,-127],head:[8,-145],eF:[35,-105],hF:[49,-117],eB:[8,-105],hB:[17,-117]});
    const track=f.benchPumped?[[0,rest],[4,load,'out'],[9,drive],[12,shove,'snap'],[14,follow,'out'],
      [17,reload],[19,shove,'snap'],[22,follow,'out'],[30,settle],[42,rest]]:
      [[0,rest],[4,load,'out'],[9,drive],[12,shove,'snap'],[15,follow,'out'],[24,settle],[35,rest]];
    // One rigid bar with both hands gripping 32 px apart.
    const p=sampleTrack(track,frame);return pose(p,{hB:[p.hF[0]-32,p.hF[1]]});
  }
  if(f.state==='preworkoutDrink')return pose(STAND,{head:[-3,-151],neck:[-5,-133],hip:[-9,-72],
    eF:[28,-119],hF:[12,-149],eB:[-18,-100],hB:[-25,-79],fF:[31,0],fB:[-29,0],
    oy:Math.sin(t*.7)*(kinkadeOver(f)?1.5:.4)});
  if(f.state==='preworkoutRecover')return sampleTrack([[0,pose(STAND,{hF:[20,-149],eF:[30,-119]})],
    [KINKADE.recovery,STAND,'out']],frame);
  if(f.state==='idle')return pose(idleAnim(t),{eF:[27,-100],hF:[37,-118],eB:[-23,-98],hB:[-32,-118],
    ox:kinkadeOver(f)?Math.sin(t*1.4)*.7:0});
  return null;
}
function kinkadeThrowPose(f,who,frame) {
  if(who==='def')return sampleTrack([[0,TH.held],[14,TH.held],
    [30,pose(AIR,{rot:Math.PI/2,hF:[25,-107],hB:[-25,-107]})],
    [62,pose(AIR,{rot:Math.PI/2,hF:[25,-107],hB:[-25,-107]})],
    [86,pose(CROUCH,{head:[40,-63],neck:[26,-48],hip:[0,-32],rot:.4}),'in']],frame);
  const lifted=pose(STAND,{head:[-5,-151],neck:[-3,-132],hip:[-9,-72],
    eF:[38,-175],hF:[38,-215],eB:[-24,-172],hB:[-16,-215],kF:[34,-34],kB:[-32,-35],fF:[48,0],fB:[-43,0]});
  const strain=frame>=30&&frame<62?Math.sin(frame*1.1)*1.4:0;
  return pose(sampleTrack([[0,POSES.grab_s],[14,pose(CROUCH,{hF:[67,-110],hB:[43,-124]})],
    [30,lifted,'out'],[62,lifted],[86,pose(CROUCH,{neck:[35,-91],head:[45,-107],hF:[85,-32],hB:[60,-35]}),'in']],frame),{ox:strain});
}
function drawKinkadeBody(ctx,f,p,t) {
  const [nx,ny]=worldPoint(f,p,'neck'),[hx,hy]=worldPoint(f,p,'hip'),[headX,headY]=worldPoint(f,p,'head');
  ctx.save();ctx.lineCap='round';
  // Joggers follow both bent knees instead of floating beside the body.
  for(const side of ['B','F']) {
    const knee=worldPoint(f,p,'k'+side),foot=worldPoint(f,p,'f'+side);
    ctx.strokeStyle='#303d4d';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(...knee);ctx.stroke();
    ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(...knee);ctx.lineTo(...foot);ctx.stroke();
    ctx.strokeStyle=f.stats.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(...knee);ctx.lineTo(...foot);ctx.stroke();
    ctx.strokeStyle='#e8edf2';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(foot[0]-4,foot[1]);ctx.lineTo(foot[0]+9*f.facing,foot[1]);ctx.stroke();
  }
  // Tank top follows the torso, with actual shoulder straps and a lifting belt.
  ctx.fillStyle='#232b35';ctx.strokeStyle=f.stats.dark;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(nx-20,ny+8);ctx.lineTo(nx-12,ny-1);ctx.quadraticCurveTo(nx,ny+17,nx+12,ny-1);
  ctx.lineTo(nx+20,ny+8);ctx.lineTo(hx+17,hy-4);ctx.lineTo(hx-17,hy-4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=f.stats.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(nx-15,ny+3);ctx.lineTo(hx-13,hy-11);
  ctx.moveTo(nx+15,ny+3);ctx.lineTo(hx+13,hy-11);ctx.stroke();
  ctx.fillStyle='#634638';ctx.fillRect(hx-20,hy-12,40,11);ctx.fillStyle='#e6dbbe';ctx.fillRect(hx-5,hy-11,10,9);
  ctx.strokeStyle='#e8edf2';ctx.lineWidth=5;
  for(const hand of ['hF','hB']){const [x,y]=worldPoint(f,p,hand);ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.stroke();}
  ctx.strokeStyle='#263241';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(headX-13,headY-8);ctx.lineTo(headX+13,headY-8);ctx.stroke();
  ctx.fillStyle=kinkadeOver(f)?'#ff626e':'#d2f6df';ctx.beginPath();ctx.arc(headX-5,headY-1,2,0,TAU);ctx.arc(headX+5,headY-1,2,0,TAU);ctx.fill();
  if(f.state==='attack'&&f.moveName==='benchPress') {
    const [x,y]=worldPoint(f,p,'hF');ctx.save();ctx.translate(x,y);ctx.scale(f.facing,1);
    ctx.strokeStyle='#b8c7d7';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-47,0);ctx.lineTo(43,0);ctx.stroke();
    for(const end of [-37,30]) {
      ctx.fillStyle='#172330';ctx.strokeStyle=f.benchPumped?'#ffe08a':f.stats.color;ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(end-7,-27,14,54,4);ctx.fill();ctx.stroke();
      ctx.fillStyle='#d9e5ee';ctx.fillRect(end-10,-4,20,8);
    }
    ctx.restore();
  }
  if(f.state==='preworkoutDrink'||f.state==='preworkoutRecover') {
    const [x,y]=worldPoint(f,p,'hF');ctx.save();ctx.translate(x,y);ctx.rotate(-.8*f.facing);
    ctx.fillStyle='#eaf5ef';ctx.strokeStyle='#415354';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-7,-18,14,26,4);ctx.fill();ctx.stroke();
    ctx.fillStyle='#63df98';ctx.fillRect(-8,-21,16,6);ctx.fillStyle='#283f35';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.fillText('PRE',0,-2);ctx.restore();
  }
  if(kinkadeOver(f)&&!f.isAfterimage&&!f.isDecoy) {
    ctx.strokeStyle='#ff626e';ctx.globalAlpha=.3+.15*Math.sin(t*.5);ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(f.x,f.y-91,48,96,0,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
function drawPreworkoutMeter(ctx,f) {
  const x=hudStart(f,200),w=200,over=kinkadeOver(f),color=over?'#ff626e':'#63df98';
  ctx.save();drawBar(ctx,x,194,w,7,(f.preworkout||0)/KINKADE.max,0,color,false);
  ctx.fillStyle='#fff4cf';ctx.fillRect(x+w*KINKADE.over/KINKADE.max-1,191,2,13);
  ctx.fillStyle=color;ctx.font='bold 10px sans-serif';ctx.textAlign=hudAlign(f);
  const label=over?'OVERSTIM · +30% SPEED · +20% DAMAGE TAKEN':f.preworkout>0?'SAFE DOSE · −20% DAMAGE TAKEN':'HOLD UP + SPECIAL · PRE-WORKOUT';
  ctx.fillText(label,hudTextX(f,x,w),218);ctx.restore();
}
function drawPumpMeter(ctx,f,y=236) {
  const x=hudStart(f,200),ready=kinkadePumpReady(f),count=f.pumpNormals?.size||0;
  ctx.save();ctx.fillStyle='#131b25';ctx.fillRect(x,y,200,8);
  for(let i=0;i<3;i++){ctx.fillStyle=i<count?(ready?'#ffe08a':'#f3a34d'):'#38404a';ctx.fillRect(x+i*68,y,64,8);}
  ctx.fillStyle=ready?'#ffe08a':'#d6dbe3';ctx.font='bold 10px sans-serif';ctx.textAlign=hudAlign(f);
  ctx.fillText(ready?'PUMP READY · NEXT BENCH: DOUBLE SHOVE':`PUMP ${count}/3 · DIFFERENT NORMAL HITS`,hudTextX(f,x,200),y+22);ctx.restore();
}
function drawKinkadePortrait(ctx,cx,y,size,color) {
  ctx.fillStyle='#232b35';ctx.beginPath();ctx.moveTo(cx-size*.29,y+size);ctx.lineTo(cx-size*.24,y+size*.72);
  ctx.lineTo(cx-size*.12,y+size*.69);ctx.quadraticCurveTo(cx,y+size*.88,cx+size*.12,y+size*.69);
  ctx.lineTo(cx+size*.24,y+size*.72);ctx.lineTo(cx+size*.29,y+size);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#263241';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cx-size*.18,y+size*.36);ctx.lineTo(cx+size*.18,y+size*.36);ctx.stroke();
  ctx.fillStyle='#d2f6df';ctx.fillRect(cx-size*.1,y+size*.45,size*.055,size*.035);ctx.fillRect(cx+size*.045,y+size*.45,size*.055,size*.035);
}
