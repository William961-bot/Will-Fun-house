// Source-rig animation sheets; action timing and effects are adapted for Hoodratz.
const pantherSheets={};
if(typeof Image!=='undefined')for(const [key,row] of Object.entries(PANTHER_ATLAS.clips)){
 const image=new Image();image.src=`assets/panther/${row.sheet}?v=${PANTHER_ATLAS.version}`;pantherSheets[key]=image;
}
function pantherRetimed(key,frame,contact,total,sourceContact){
 const split=sourceContact/PANTHER_ATLAS.clips[key].duration;
 return {key,progress:frame<contact?split*frame/Math.max(1,contact):split+(1-split)*(frame-contact)/Math.max(1,total-contact)};
}
function pantherMotion(f){
 const timed=(key,clock=f.stateFrame,loop=false)=>{const row=PANTHER_ATLAS.clips[key];return {key,progress:row?(loop?(clock/60%row.duration)/row.duration:clock/(row.duration*60)):0};};
 if(f.state==='pantherSpear')return pantherRetimed('spear',f.stateFrame,PANTHER.spearAt,PANTHER.spearFrames,PANTHER.spearSourceContact);
 if(f.state==='pantherBast')return pantherRetimed('ultimate',f.stateFrame,PANTHER.ultimateAt,PANTHER.ultimateFrames,PANTHER.ultimateSourceContact);
 if(f.state==='attack'){
  if(f.moveName==='pantherRend')return f.stateFrame>=f.move.startup+f.move.active?timed('dashEnd',f.stateFrame-f.move.startup-f.move.active):timed('dash',Math.max(0,f.stateFrame-f.move.startup),true);
  if(f.moveName==='pantherKick')return {key:'kick',progress:f.stateFrame/(f.move.startup+f.move.active+f.move.recovery)};
  const key=({low:'light',lowMedium:'medium',air:'light',airMedium:'medium',airHeavy:'overhead',grab:'heavy'})[f.moveName]||f.moveName;
  const selected=PANTHER_ATLAS.clips[key]?key:'light',row=PANTHER_ATLAS.clips[selected],contact=PANTHER.clawContact/row.duration;
  const progress=f.stateFrame<f.move.startup?contact*f.stateFrame/Math.max(1,f.move.startup):contact+(1-contact)*(f.stateFrame-f.move.startup)/Math.max(1,f.move.active+f.move.recovery);
  return {key:selected,progress};
 }
 if(f.state==='ko'||f.koed)return timed('ko');
 if(['block','blockstun','parry','deflect','hitstun','stagger'].includes(f.state))return timed('guard',0);
 if(f.state==='land')return timed('land');
 if(f.pantherClimbing)return timed('wall',f.animationFrame,true);
 if(!f.grounded){if(f.animHint==='pantherDoubleJump')return timed('doubleJump');return timed(f.vy<0?'jump':'fall');}
 if(['dash','backdash','slide'].includes(f.state))return timed('dash',f.stateFrame,true);
 if(f.state==='run')return timed('run',f.animationFrame,true);
 if(f.state==='walk')return timed(f.vx*f.facing<0?'back':'walk',f.animationFrame,true);
 if(f.state==='throw'||f.state==='thrown')return timed('heavy');
 return timed('idle',f.animationFrame,true);
}
function drawPantherFrame(ctx,key,progress,x,y,width=PANTHER.spriteWidth,facing=1){
 const row=PANTHER_ATLAS.clips[key],sheet=pantherSheets[key],size=row?.size||PANTHER_ATLAS.size;
 if(!row||!sheet?.complete||!sheet.naturalWidth){ctx.fillStyle='#c395ff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('BP · LOADING',x,y-120);return;}
 const frame=Math.min(row.count-1,Math.max(0,Math.floor(progress*row.count)));
 const anchor=row.anchor||PANTHER_ATLAS.anchor;
 width*=row.widthScale||1;
 if(row.offsets)x+=row.offsets[frame]*width/row.ortho*facing;
 ctx.save();ctx.translate(x,y);ctx.scale(facing,1);ctx.drawImage(sheet,frame%8*size,Math.floor(frame/8)*size,size,size,-anchor[0]*width/size,-anchor[1]*width/size,width,width);ctx.restore();
}
function drawPantherSprite(ctx,f,p,t){
 if(f.state==='pantherBast'){ctx.save();ctx.globalAlpha*=PANTHER.bastAlpha;drawPantherFrame(ctx,'bast',f.stateFrame/PANTHER.ultimateFrames,f.x+120*f.facing,f.y,PANTHER.bastWidth,f.facing);ctx.restore();}
 const m=pantherMotion(f);drawPantherFrame(ctx,m.key,m.progress,f.x,f.y,PANTHER.spriteWidth,f.pantherClimbing?-f.pantherWallAway:f.facing);
 if(f.nullMark){const victim=fighters[f.nullMark.target];if(victim){ctx.strokeStyle='#bf8aff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(victim.x,victim.y-115,28,0,Math.PI*2);ctx.stroke();}}
}
function drawPantherPortrait(ctx,x,y,size){
 ctx.save();ctx.fillStyle='#22152f';ctx.fillRect(x,y,size,size);ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();
 drawPantherFrame(ctx,'idle',0,x+size*.5,y+size*2,size*2.5);ctx.restore();
}
