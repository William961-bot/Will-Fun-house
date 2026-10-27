// A textured render of the actual recovered model replaces the entire stick body.
const juriSheet=typeof Image==='undefined'?null:new Image();
const JURI_SPRITE_WIDTH=282;
if(juriSheet)juriSheet.src='assets/juri/nostalgia.png';
function juriMotion(f){
  const seq=g.domainSequence;
  if(seq?.owner===f.index&&seq.kind==='juriWindup')return {key:'finisher',progress:.02};
  if(seq?.owner===f.index&&seq.kind==='juriFinisher')return {key:'finisher',progress:seq.frame/JURI.finisherFrames};
  if(f.animHint==='juriFinishRecover')return {key:'finisher',progress:1};
  if(f.state==='attack'){
    const key=f.moveName==='fuhazan'?'fuhaStore':f.moveName==='air'?'airLight':f.moveName==='grab'?'grabMiss':f.moveName;
    const row=JURI_ATLAS.clips[key]||JURI_ATLAS.clips.light;
    const contact={light:7,medium:9,low:5,lowMedium:8,heavy:13,overhead:25,airLight:6,airMedium:9,airHeavy:12,
      fuhaStore:15,ryodan:25,tensen:8}[key];
    const end=f.move.startup+f.move.active+f.move.recovery;
    let progress=f.stateFrame/end;
    if(contact){const at=Math.min(.7,contact/(row.duration*60));progress=f.stateFrame<f.move.startup
      ?at*f.stateFrame/f.move.startup:at+(1-at)*(f.stateFrame-f.move.startup)/(end-f.move.startup);}
    return {key:JURI_ATLAS.clips[key]?key:'light',progress};
  }
  if(f.state==='juriRelease')return {key:'fuhaRelease',progress:f.stateFrame/JURI.releaseFrames};
  if(f.state==='throw')return {key:'grab',progress:f.stateFrame/(f.throwFrames||64)};
  if(f.state==='thrown')return {key:'hit',progress:.3,rot:pureThrowRotation(f)};
  if(f.state==='ko'||f.state==='knockdown'||f.koed)return {key:'ko',progress:Math.min(1,f.stateFrame/28)};
  if(f.state==='hitstun'||f.state==='stagger')return {key:'hit',progress:Math.min(1,f.stateFrame/20)};
  if(f.animHint==='throwEscape')return {key:'escape',progress:f.stateFrame/25};
  if(f.state==='parry'||f.state==='parryRecover')return {key:'parry',progress:Math.min(.6,f.stateFrame/30)};
  if(f.state==='block'||f.state==='blockstun')return {key:'block',progress:.2};
  if(f.state==='land'||f.state==='jumpsquat')return {key:'land',progress:f.stateFrame/8};
  if(!f.grounded)return {key:'air',progress:Math.max(.15,Math.min(.8,f.stateFrame/40))};
  if(['slide','slideRecover','roll','rollRecover'].includes(f.state)||f.input.held.down)return {key:'crouch',progress:.3};
  if(f.state==='backdash')return {key:'backdash',progress:f.stateFrame/25};
  if(['dash','run','rebound','skid'].includes(f.state))return {key:'dash',progress:(f.animationFrame%20)/20};
  if(f.state==='walk')return {key:f.vx*f.facing<0?'backward':'walk',progress:(f.animationFrame%54)/54};
  return {key:'idle',progress:(f.animationFrame%598)/598};
}
function pureThrowRotation(f){return f.pose?.rot||0;}
function juriJointPose(f,frame=f.stateFrame){
  const view=Object.create(f);view.stateFrame=frame;
  const m=juriMotion(view),row=JURI_ATLAS.clips[m.key]||JURI_ATLAS.clips.idle;
  const source=JURI_ATLAS.poses[row.start+Math.round(Math.max(0,Math.min(1,m.progress))*(row.count-1))];
  return Object.fromEntries(Object.entries(source).map(([joint,point])=>[joint,point.map(v=>v*JURI_SPRITE_WIDTH/JURI_ATLAS.size)]));
}
function drawJuriFrame(ctx,key,progress,x,y,width=320,facing=1){
  if(!juriSheet?.complete||!juriSheet.naturalWidth){
    ctx.save();ctx.fillStyle='#d79aff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('JURI · LOADING',x,y-80);ctx.restore();return;
  }
  const a=JURI_ATLAS,row=a.clips[key]||a.clips.idle;
  const frame=row.start+Math.round(Math.max(0,Math.min(1,progress))*(row.count-1));
  ctx.save();ctx.translate(x,y);ctx.scale(facing*width/a.size,width/a.size);
  ctx.drawImage(juriSheet,frame%a.columns*a.size,Math.floor(frame/a.columns)*a.size,a.size,a.size,-a.anchor[0],-a.anchor[1],a.size,a.size);ctx.restore();
}
function drawJuriSprite(ctx,f,p,t){
  const m=juriMotion(f);ctx.save();
  if(f.stats.color===CHARACTERS.juri.altColor)ctx.filter='hue-rotate(115deg)';
  if(f.state==='hitstun'&&f.stateFrame<3)ctx.filter='brightness(2)';
  if(m.rot){ctx.translate(f.x,f.y-80);ctx.rotate(m.rot*f.facing);ctx.translate(-f.x,-f.y+80);}
  drawJuriFrame(ctx,m.key,m.progress,f.x,f.y,JURI_SPRITE_WIDTH,f.facing);ctx.restore();
}
function drawJuriPortrait(ctx,x,y,size){
  ctx.save();ctx.fillStyle='#25132d';ctx.fillRect(x,y,size,size);ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();
  drawJuriFrame(ctx,'idle',0,x+size*.52,y+size*1.35,size*1.8,1);ctx.restore();
}
function drawJuriProjectiles(ctx,g){
  for(const p of g.projectiles)if(p.kind==='juriFuha'){
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.facing,1);ctx.strokeStyle='#edb5ff';ctx.lineWidth=4;
    ctx.shadowColor='#c05bff';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(-8,0,22,-1.4,1.4);ctx.stroke();
    ctx.strokeStyle='#9e45e5';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-38,-13);ctx.lineTo(-10,-7);ctx.moveTo(-48,12);ctx.lineTo(-8,8);ctx.stroke();ctx.restore();
  }
}
// Camera framing, energy and opponent motion are a reconstruction; Juri's poses are recovered.
function drawJuriFinisherOverlay(ctx,g){
  const seq=g.domainSequence;
  if(!seq||!['juriWindup','juriFinisher'].includes(seq.kind))return;
  const owner=fighters[seq.owner],frame=seq.frame||0,progress=frame/JURI.finisherFrames;
  const facing=seq.facing||owner.facing;
  ctx.save();ctx.fillStyle='#0c0614';ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*.52,H*.54,20,W*.52,H*.54,560);
  glow.addColorStop(0,'#632a83');glow.addColorStop(1,'#0c0614');ctx.fillStyle=glow;ctx.fillRect(0,60,W,H-120);
  ctx.strokeStyle='#d385ff40';ctx.lineWidth=2;
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6+frame*.007;
    ctx.beginPath();ctx.moveTo(W/2,H*.55);ctx.lineTo(W/2+Math.cos(angle)*900,H*.55+Math.sin(angle)*650);ctx.stroke();
  }
  if(seq.kind==='juriWindup'){
    drawJuriFrame(ctx,'finisher',.02,W/2,H+60,760,facing);
    ctx.fillStyle='#f3d5ff';ctx.textAlign='center';ctx.font='bold 20px sans-serif';ctx.fillText('CRITICAL ART',W/2,125);
  }else{
    const zoom=progress<.16?1.38:progress>.8?1.18:1.04;
    const shake=[64,126,192,236].some(at=>frame>=at&&frame<at+8)?Math.sin(frame*2.1)*6:0;
    ctx.save();ctx.translate(W/2+shake,H*.83);ctx.scale(zoom,zoom);ctx.translate(-W/2,-FLOOR);
    ctx.fillStyle='#2c123c';ctx.fillRect(0,FLOOR,W,160);ctx.strokeStyle='#b96bdf';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,FLOOR);ctx.lineTo(W,FLOOR);ctx.stroke();
    const x=W/2-105*facing,victim=fighters[seq.target];
    if(victim){
      const reaction=Math.max(0,Math.sin(progress*Math.PI));
      const view=Object.create(victim);
      Object.assign(view,{x:W/2+(130+reaction*45)*facing,y:FLOOR-reaction*85,vx:0,vy:0,
        facing:-facing,state:'hitstun',stateFrame:8+frame%12,animationFrame:frame,isAfterimage:true,
        pose:null,koed:false,animHint:'',prevX:undefined,prevY:undefined});
      drawFighter(ctx,view,frame,STEP,g);
    }
    drawJuriFrame(ctx,'finisher',progress,x,FLOOR,430,facing);
    if(progress>.12){
      const pulse=1+Math.sin(frame*.15)*.18,cx=W/2+70*facing,cy=FLOOR-105;
      ctx.save();ctx.translate(cx,cy);ctx.scale(facing,1);ctx.shadowColor='#d16aff';ctx.shadowBlur=30;
      ctx.strokeStyle='#e5a4ff';ctx.lineWidth=10*pulse;
      ctx.beginPath();ctx.arc(0,0,70+progress*100,-1.5+progress,1.5+progress);ctx.stroke();
      ctx.strokeStyle='#a639ec';ctx.lineWidth=20;ctx.beginPath();ctx.arc(-20,10,110+progress*80,-1.1,1.1);ctx.stroke();
      for(let i=0;i<8;i++){
        const a=frame*.055+i*.8;ctx.fillStyle=i%2?'#edb7ff':'#b846f5';
        ctx.beginPath();ctx.arc(Math.cos(a)*160,Math.sin(a)*80,3+i%3,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    for(const at of [64,126,192,236])if(frame>=at&&frame<at+6){ctx.fillStyle=`rgba(244,213,255,${.35*(1-(frame-at)/6)})`;ctx.fillRect(0,0,W,H);}
  }
  ctx.fillStyle='#050308';ctx.fillRect(0,0,W,76);ctx.fillRect(0,H-75,W,75);
  ctx.textAlign='center';ctx.fillStyle='#edc6ff';ctx.font='bold 34px Impact, sans-serif';ctx.fillText('SAKKAI FUHAZAN',W/2,51);
  ctx.font='bold 14px sans-serif';ctx.fillStyle='#c99de0';ctx.fillText('CRITICAL ART',W/2,H-30);
  ctx.restore();
}
