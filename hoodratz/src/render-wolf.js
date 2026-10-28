const wolfSheets={};
if(typeof Image!=='undefined')for(const [key,row] of Object.entries(WOLF_ATLAS.clips)){
 const sheet=new Image();sheet.src='assets/wolf/motions/'+row.sheet+'?v=native3';wolfSheets[key]=sheet;
}
const wolfPortraitSheet=typeof Image==='undefined'?null:new Image();
if(wolfPortraitSheet)wolfPortraitSheet.src='assets/wolf/portrait.png?v=appearance2';
const WOLF_SPRITE_WIDTH=WOLF.spriteWidth;
CHARACTER_GUARDS.wolf=Object.fromEntries(Object.entries(WOLF_ATLAS.poses[WOLF_ATLAS.clips.block.start]).map(([k,p])=>[k,p.map(v=>v*WOLF_SPRITE_WIDTH/WOLF_ATLAS.size)]));
GUARD_RECOIL.wolf=7;
CHARACTER_RUNS.wolf=(f,t)=>wolfJointPose(Object.assign(Object.create(f),{state:'run',animationFrame:t}));
THROW_TIMELINES.wolf={
 att:spec=>[[0,CHARACTER_GUARDS.wolf],[spec.frames*.45,pose(STAND,{hF:[48,-140],hB:[32,-115],head:[12,-151]})],[spec.frames,pose(STAND,{hF:[80,-100],hB:[26,-110],head:[18,-146]})]],
 def:spec=>[[0,pose(STAND,{head:[-8,-145],neck:[-8,-125]})],[spec.frames*.5,pose(STAND,{head:[-20,-124],neck:[-12,-110],hip:[-7,-68]})],[spec.frames,pose(STAND,{rot:-.35,head:[-26,-132]})]],
};
function wolfMotion(f){
 const seq=g.domainSequence;
 if(seq?.owner===f.index&&seq.kind==='wolfWindup')return {key:'parry',progress:.15};
 if(seq?.owner===f.index&&seq.kind==='wolfFinisher')return {key:'finisher',progress:seq.frame/WOLF.finisherFrames};
 if(f.animHint==='wolfFinishRecover')return {key:'finisher',progress:1};
 const timed=(key,clock=f.stateFrame,loop=false)=>{const duration=WOLF_ATLAS.clips[key].duration*60;return {key,progress:loop?(clock%duration)/duration:clock/duration};};
 if(f.state==='wolfShuriken')return wolfRetimed(f.wolfAirThrow?'airShuriken':'shuriken',f.stateFrame,f.wolfAirThrow?WOLF.airShurikenAt:WOLF.shurikenAt,f.abilityFrames,WOLF.sourceContacts[f.wolfAirThrow?'airShuriken':'shuriken'][0]);
 if(f.state==='wolfMikiri')return {key:'step',progress:f.stateFrame/f.abilityFrames};
 if(f.state==='wolfMikiriHit')return wolfRetimed('mikiri',f.stateFrame,WOLF.counterContact,WOLF.counterHitFrames,WOLF.sourceContacts.mikiri[0]);
 if(f.state==='attack'){
  const key=({low:'light',lowMedium:'medium',air:'airAttack',airMedium:'airAttack',airHeavy:'overhead',
   grab:'parry',deathblow:'medium'})[f.moveName]||f.moveName;
  const selected=WOLF_ATLAS.clips[key]?key:'light',window=WOLF.sourceContacts[selected]||WOLF.sourceContacts.fallback;
  return wolfRetimed(selected,f.stateFrame,f.move.startup,f.move.startup+f.move.active+f.move.recovery,window[0],f.move.active,window[1]);
 }
 if(f.state==='throw')return {key:'finisher',progress:f.stateFrame/(f.throwFrames||54)};
 if(['ko','knockdown'].includes(f.state)||f.koed)return timed('ko');
 if(['hitstun','stagger','thrown'].includes(f.state))return timed('hit');
 if(['parry','parryRecover','deflect'].includes(f.state))return timed('parry');
 if(['block','blockstun'].includes(f.state))return timed('block',f.animationFrame,true);
 if(f.state==='land')return timed('land');
 if(f.state==='jumpsquat')return timed('jump');
 if(!f.grounded)return timed(f.vy<0?'jump':'air');
 if(['backdash','roll','slide'].includes(f.state))return timed('backdash');
 if(['dash','rebound','skid'].includes(f.state))return timed('dash',f.animationFrame,true);
 if(f.state==='run')return timed('run',f.animationFrame,true);
 if(f.state==='walk')return timed(f.vx*f.facing<0?'backward':'walk',f.animationFrame,true);
 return timed('idle',f.animationFrame,true);
}
// Keep the fast fighter's contact/recovery clock, while using the actual source strike poses.
function wolfRetimed(key,frame,contact,total,sourceContact,active=0,sourceActive=0){
 const nativeTicks=WOLF_ATLAS.clips[key].duration*60,at=Math.min(.95,sourceContact/nativeTicks),end=Math.min(1,(sourceContact+sourceActive)/nativeTicks);
 const progress=frame<contact?at*frame/contact:active&&frame<contact+active
  ?at+(end-at)*(frame-contact)/active:end+(1-end)*(frame-contact-active)/Math.max(1,total-contact-active);
 return {key,progress};
}
function wolfFrame(m){const row=WOLF_ATLAS.clips[m.key]||WOLF_ATLAS.clips.idle;return row.start+Math.round(clamp01(m.progress)*(row.count-1));}
function wolfJointPose(f,frame=f.stateFrame){
 const view=Object.create(f);view.stateFrame=frame;
 return Object.fromEntries(Object.entries(WOLF_ATLAS.poses[wolfFrame(wolfMotion(view))]).map(([k,p])=>[k,p.map(v=>v*WOLF_SPRITE_WIDTH/WOLF_ATLAS.size)]));
}
function drawWolfFrame(ctx,key,progress,x,y,width=WOLF_SPRITE_WIDTH,facing=1){
 const wolfSheet=wolfSheets[key]||wolfSheets.idle;
 if(!wolfSheet?.complete||!wolfSheet.naturalWidth){ctx.save();ctx.fillStyle='#e2ba8f';ctx.textAlign='center';ctx.fillText('WOLF · LOADING',x,y-80);ctx.restore();return;}
 const a=WOLF_ATLAS,row=a.clips[key]||a.clips.idle,frame=wolfFrame({key,progress})-row.start;
 ctx.save();ctx.translate(x,y);ctx.scale(facing*width/a.size,width/a.size);
 ctx.drawImage(wolfSheet,frame%a.columns*a.size,Math.floor(frame/a.columns)*a.size,a.size,a.size,-a.anchor[0],-a.anchor[1],a.size,a.size);ctx.restore();
}
function drawWolfSprite(ctx,f,p,t){
 const m=wolfMotion(f);ctx.save();
 if(m.rot){ctx.translate(f.x,f.y-40);ctx.rotate(m.rot*f.facing);ctx.translate(-f.x,-f.y+40);}
 drawWolfFrame(ctx,m.key,m.progress,f.x,f.y,WOLF_SPRITE_WIDTH,f.facing);ctx.restore();
}
function drawWolfPortrait(ctx,x,y,size){
 if(wolfPortraitSheet?.complete&&wolfPortraitSheet.naturalWidth){ctx.save();ctx.fillStyle='#2b251f';ctx.fillRect(x,y,size,size);ctx.drawImage(wolfPortraitSheet,x,y,size,size);ctx.restore();return;}
 ctx.save();ctx.fillStyle='#2b251f';ctx.fillRect(x,y,size,size);ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();
 drawWolfFrame(ctx,'idle',0,x+size*.52,y+size*1.55,size*2.1);ctx.restore();
}
function drawWolfProjectiles(ctx,g){
 for(const p of g.projectiles)if(p.kind==='wolfShuriken'){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.age*.9);ctx.fillStyle='#dce2e8';ctx.strokeStyle='#5b6771';ctx.lineWidth=2;
  ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?4:14;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
}
// Recovered attacker motion; camera, effects and partner reaction are authored for this game.
function drawWolfFinisherOverlay(ctx,g){
 const seq=g.domainSequence;if(!['wolfWindup','wolfFinisher'].includes(seq?.kind))return;
 const owner=fighters[seq.owner],frame=seq.frame||0,facing=seq.facing||owner.facing;
 ctx.save();ctx.fillStyle='#0d0a09';ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W/2,H*.55,10,W/2,H*.55,580);glow.addColorStop(0,'#573329');glow.addColorStop(1,'#0d0a09');ctx.fillStyle=glow;ctx.fillRect(0,60,W,H-120);
 ctx.fillStyle='#e45b47';ctx.textAlign='center';ctx.font='bold 40px serif';ctx.fillText('DEATHBLOW',W/2,115);
 if(seq.kind==='wolfWindup')drawWolfFrame(ctx,'parry',.2,W/2,H+50,720,facing);
 else{
  const victim=fighters[seq.target],progress=frame/WOLF.finisherFrames;
  if(victim){
   const view=Object.create(victim);Object.assign(view,{x:W/2+90*facing,y:FLOOR,facing:-facing,state:'hitstun',stateFrame:10,animationFrame:frame});
   ctx.save();ctx.translate(view.x,view.y);ctx.scale(1.65,1.65);ctx.translate(-view.x,-view.y);drawFighter(ctx,view,frame,STEP,g);ctx.restore();
  }
  drawWolfFrame(ctx,'finisher',progress,W/2-55*facing,FLOOR,510,facing);
  if([48,112].some(n=>frame>=n&&frame<n+10)){
   ctx.strokeStyle='#e6553c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(W/2-160*facing,230);ctx.lineTo(W/2+190*facing,540);ctx.stroke();
  }
 }
 ctx.fillStyle='#000';ctx.fillRect(0,0,W,45);ctx.fillRect(0,H-45,W,45);ctx.restore();
}
