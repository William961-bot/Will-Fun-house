// Athletic movement is passive: Hack does not remove jumps or the timed wall escape.
function curtisWallJump(f,away,g) {
  f.input.consume('up');f.curtisWallUsed=true;f.curtisWallWindow=0;f.curtisHeavyLaunch=false;
  f.curtisSwingLeft=0;f.hitstun=0;f.enter('air');f.animHint='curtisWallJump';
  f.vx=away*CURTIS.wallSpeed;f.vy=-CURTIS.wallJump;f.y=Math.min(f.y,FLOOR-1);f.facing=away;
  g.ring(f.x,f.y-65,f.stats.color,65,15);g.sound('shing');
  g.popup('WALL KICK!',f.x,Math.max(270,f.y-210),f.stats.color,28);return true;
}
function startCurtisSwing(f,inp,g) {
  if(f.grounded||f.curtisSwings<=0||!inp.pressed('up',BUFFER))return false;
  inp.consume('up');f.curtisSwings--;f.curtisSwingLeft=CURTIS.swingFrames;
  f.curtisSwingDir=inp.held.left?-1:inp.held.right?1:f.facing;
  f.curtisAnchor={x:clampArena(f.x+f.curtisSwingDir*170),y:Math.max(20,f.y-380)};
  f.enter('air');f.animHint='curtisSwing';f.jumpFromRun=false;
  g.sound('shing');g.popup('RUBBER SWING',f.x,Math.max(270,f.y-215),f.stats.color,24);return true;
}
const CURTIS_ABILITIES=CHARACTER_ABILITIES.curtis={
  cooldowns:{special:CURTIS.pistolCooldown,downSpecial:CURTIS.slingCooldown,upSpecial:CURTIS.rocketCooldown},
  labels:{special:'PISTOL',downSpecial:'SLING',upSpecial:'ROCKET'},airSpecials:['special','downSpecial','upSpecial'],
  passiveHitstunAction:true,
  reset(f) {f.curtisSwings=1;f.curtisSwingLeft=0;f.curtisAnchor=null;f.curtisWallUsed=false;
    f.curtisWallWindow=0;f.curtisWallSerial=0;f.curtisHeavyLaunch=false;f.curtisDomainActive=false;},
  speedScale(f) {return ownDomain(f)?1.2:1;},
  damageScale(f) {return ownDomain(f)?1.15:1;},
  onSpecialUsed(f,key) {if(ownDomain(f))f.cooldowns[key]=Math.ceil(f.cooldowns[key]/2);},
  special(f) {return kitAttack(f,'rubberPistol',{startup:11,active:3,recovery:18,dmg:55,height:'high',
    hitstun:28,kb:2,step:2,hitstop:5,shake:1,air:!f.grounded,box:{x:25,y:-132,w:215,h:45}});},
  downSpecial(f) {return kitAttack(f,'rubberSling',{startup:12,active:5,recovery:23,dmg:65,height:'high',
    hitstun:28,kb:4,step:0,hitstop:6,shake:2,air:!f.grounded,box:{x:10,y:-130,w:95,h:95}});},
  upSpecial(f) {
    const result=kitAttack(f,'rubberRocket',{startup:10,active:4,recovery:22,dmg:60,height:'overhead',
      hitstun:26,kb:2,launch:-13,launcher:true,step:2,hitstop:6,shake:2,air:!f.grounded,
      box:{x:15,y:-210,w:100,h:155}});return result;
  },
  onAttackStart(f) {f.curtisSwingLeft=0;},
  onTakenHit(f,m) {f.curtisSwingLeft=0;f.curtisWallWindow=0;f.curtisHeavyLaunch=m.height==='heavy'&&!m.grab;},
  onWallBounce(f,away) {
    if(f.state!=='hitstun'||!f.curtisHeavyLaunch||f.curtisWallUsed||f.koed)return;
    f.curtisWallWindow=ownDomain(f)?CURTIS.domainWallWindow:CURTIS.wallWindow;
    f.curtisWallAway=away;f.curtisWallSerial=f.input.pressSerial.up;
  },
  hitstunAction(f,inp,g) {
    if(f.curtisWallWindow>0&&!f.curtisWallUsed&&f.input.pressSerial.up>f.curtisWallSerial&&inp.pressed('up',BUFFER))
      return curtisWallJump(f,f.curtisWallAway,g);
    return false;
  },
  airAction(f,inp,g) {
    if(!inp.pressed('up',BUFFER))return false;
    const nearLeft=f.x<=WALL_L+HALF_W+18,nearRight=f.x>=WALL_R-HALF_W-18;
    if(!f.curtisWallUsed&&(nearLeft||nearRight))return curtisWallJump(f,nearLeft?1:-1,g);
    return startCurtisSwing(f,inp,g);
  },
  update(f,opp,g) {
    if(g.phase!=='fight')return;
    const domain=ownDomain(f);
    if(domain&&!f.curtisDomainActive)f.curtisSwings=Math.max(f.curtisSwings,2);
    if(!domain&&f.curtisDomainActive)f.curtisSwings=Math.min(f.curtisSwings,1);
    f.curtisDomainActive=domain;
    if(f.curtisWallWindow>0)f.curtisWallWindow--;
    if(f.grounded&&NEUTRAL.has(f.state)) {
      f.curtisSwings=domain?2:1;f.curtisWallUsed=false;f.curtisSwingLeft=0;f.curtisHeavyLaunch=false;
    }
    if(f.curtisSwingLeft>0) {
      if(f.state!=='air'&&f.state!=='block')f.curtisSwingLeft=0;
      else {
        const progress=(CURTIS.swingFrames-f.curtisSwingLeft)/CURTIS.swingFrames;
        f.vx=f.curtisSwingDir*(CURTIS.swingSpeed+Math.sin(progress*Math.PI)*5);
        f.vy=-CURTIS.swingLift+progress*18;f.curtisSwingLeft--;
      }
    }
    if(f.state==='attack'&&f.moveName==='rubberSling')
      f.vx=f.stateFrame>=f.move.startup&&f.stateFrame<f.move.startup+f.move.active?17*f.facing:0;
  },
  cpuChoice(f,opp,distance) {
    if(distance>140&&distance<240&&!f.cooldowns.special)return 'special';
    if(distance>100&&distance<190&&!f.cooldowns.downSpecial)return 'downSpecial';
    if(distance<100&&!f.cooldowns.upSpecial)return 'upSpecial';return null;
  },
  pose(f,t,frame) {return curtisPose(f,t,frame);},
  drawBody(ctx,f,p,t) {drawCurtisBody(ctx,f,p,t);},
  drawMeter(ctx,f) {
    const x=f.index===0?40:W-223;
    drawBar(ctx,x,194,183,5,f.curtisSwings/(ownDomain(f)?2:1),0,f.stats.color,false);
    ctx.fillStyle=f.stats.color;ctx.font='bold 10px sans-serif';ctx.textAlign=f.index===0?'left':'right';
    const label=f.curtisWallWindow>0?'WALL KICK · TAP UP':f.curtisSwings>0?
      `SWING${f.curtisSwings>1?'S '+f.curtisSwings:' READY'} · UP IN AIR`:'SWING USED · LAND TO RESET';
    ctx.fillText(label,f.index===0?x:x+183,210);
  },
};
