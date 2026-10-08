// A thrown spear marks once; only a damaging Zoom consumes that mark and resets Zoom.
const NULL_ZOOM = { startup: NULL.zoomStartup, active: NULL.zoomActive, recovery: NULL.zoomRecovery,
  dmg: NULL.zoomDamage, height: 'high', hitstun: NULL.zoomHitstun, kb: 0, hitstop: 5, shake: 2,
  box: { x: -18, y: -150, w: 64, h: 100 } };
function nullZooming(f) {
  return f.state === 'attack' && f.moveName === 'nullZoom' &&
    f.stateFrame >= NULL.zoomStartup && f.stateFrame < f.move.startup+f.move.active;
}
function nullHidden(f,g) {
  if((f.stats.id!=='null'&&f.siglarpUltimateId!=='null')||g.domain?.type!=='null'||g.domain.owner!==f.index||f.nullReveal>0)return false;
  if(['hitstun','stagger','thrown','throw','blockstun','burst','parry','deflect','ko'].includes(f.state))return false;
  if(f.state==='attack'&&f.stateFrame>=f.move.startup-3)return false;
  if(f.state==='nullSpearWindup'&&f.stateFrame>=NULL.spearStartup-4)return false;
  return true;
}
function nullSpear(f,g) {
  if (g.projectiles.some(p=>p.kind==='glowSpear'&&p.owner===f.index)) return false;
  spawnProjectile(g,{kind:'glowSpear',owner:f.index,color:f.stats.color,
    x:f.x+58*f.facing,y:f.y-110,facing:f.facing,vx:NULL.spearSpeed*f.facing,framesLeft:90,
    box:{w:78,h:18},blockGuard:8,name:'spearThrow',
    move:{dmg:NULL.spearDamage,fixedDamage:NULL.spearDamage,height:'high',hitstun:20,kb:3,hitstop:4,shake:1,
      startup:NULL.spearStartup,active:1,recovery:NULL.spearRecovery}});
  g.sound('shing');return true;
}
function updateNullMarks(g) {
  for(const f of fighters)if((f.stats.id==='null'||isSiglarp(f))&&f.nullMark) {
    const target=fighters[f.nullMark.target];
    if(!target||target.koed||target.hp<=0||--f.nullMark.left<=0)f.nullMark=null;
  }
}
const NULL_ABILITIES = CHARACTER_ABILITIES.null = {
  cooldowns:{special:NULL.spearCooldown,upSpecial:NULL.zoomCooldown},
  labels:{special:'SPEAR',upSpecial:'ZOOM'},
  airSpecials:['special','upSpecial'],
  reset(f) {f.nullMark=null;f.zoomTrail=[];f.zoomFacing=1;f.zoomConnected=false;f.zoomStopX=null;f.zoomAir=false;f.nullReveal=0;},
  special(f,opp,g) {
    if(g.projectiles.some(p=>p.kind==='glowSpear'&&p.owner===f.index))return false;
    return openAbility(f,'nullSpearWindup',NULL.spearStartup+NULL.spearRecovery);
  },
  upSpecial(f) {
    const aerial=!f.grounded;
    const lightUsed=f.chainUsed.has('light');kitAttack(f,'nullZoom',{...NULL_ZOOM,air:aerial,launch:aerial?MOVES.air.launch:0});
    if(!lightUsed)f.chainUsed.delete('light');f.chainUsed.add('nullZoom');
    f.zoomFacing=f.facing;f.zoomConnected=false;f.zoomStopX=null;f.zoomAir=aerial;f.moveAbsorbed=true;f.zoomTrail=[];f.input.consume('up');
    return true;
  },
  passesThrough:nullZooming,
  suspendGravity(f) {return f.zoomAir&&nullZooming(f);},
  attackBox(f) {
    if(f.moveName!=='nullZoom')return null;
    return {x:Math.min(f.previousX,f.x)-18,y:f.y-150,w:Math.abs(f.x-f.previousX)+36,h:100};
  },
  onHit(f,victim,dmg,name,g) {
    if(dmg<=0)return;
    if(name==='spearThrow'&&victim.hp>0) {
      f.nullMark={target:victim.index,left:NULL.markFrames};
      g.popup('TARGET MARKED',victim.x,Math.max(260,victim.y-235),f.stats.color,32,`nullMark${f.index}`);
      g.ring(victim.x,victim.y-110,f.stats.color,55,15);
    } else if(name==='nullZoom') {
      f.zoomConnected=true;
      f.zoomStopX=clampArena(victim.x+64*f.zoomFacing);
      if(f.nullMark?.target===victim.index&&f.nullMark.left>0) {
        f.nullMark=null;f.cooldowns.upSpecial=0;
        g.popup('ZOOM RESET',f.x,Math.max(260,f.y-235),f.stats.color,40,`nullMark${f.index}`);
        g.ring(victim.x,victim.y-110,f.stats.color,110,18);g.sound('shing');
      }
    }
  },
  update(f,opp,g) {
    f.zoomTrail=f.zoomTrail.filter(p=>g.frame-p.born<16);
    if(f.nullReveal>0)f.nullReveal--;
    if(g.phase!=='fight')return;
    if(f.state==='nullSpearWindup') {
      // Special may be sampled before Up. Redirect only before the spear has left his hand.
      if(f.stateFrame<=BUFFER && f.input.pressed('up',BUFFER) &&
          f.input.rawPressedAt.up>=f.input.rawPressedAt.special &&
          f.input.frame-f.input.rawPressedAt.special<=BUFFER && !f.cooldowns.upSpecial && !f.guardBroken && !f.domainPending) {
        f.cooldowns.special=0;
        this.upSpecial(f);
        f.cooldowns.upSpecial=NULL.zoomCooldown;
        return;
      }
      f.vx=0;
      if(f.stateFrame===NULL.spearStartup)nullSpear(f,g);
      if(f.stateFrame>=f.abilityFrames)f.enter(f.grounded?'idle':'air');
    }
    if(f.state==='attack'&&f.moveName==='nullZoom') {
      if(nullZooming(f)&&f.zoomConnected&&(f.zoomStopX-f.x)*f.zoomFacing<=0)f.move.active=f.stateFrame-f.move.startup;
      if(nullZooming(f)) {
        f.vx=NULL.zoomSpeed*f.zoomFacing;
        if(f.zoomAir)f.vy=0;
        f.zoomTrail.push({x:f.x,y:f.y,born:g.frame,facing:f.zoomFacing});
        if(f.stateFrame===NULL.zoomStartup)g.sound('slash');
      } else {
        f.vx=0;
        if(f.stateFrame>=f.move.startup+f.move.active) {
          f.facing=Math.sign(opp.x-f.x)||-f.zoomFacing;
          if(f.zoomConnected) {
            f.move.recovery=NULL.zoomHitRecovery;
            // Recovery cancels start only after travel has finished, and only on a flinching hit.
            f.moveAbsorbed=opp.state!=='hitstun';
          }
        }
      }
    }
  },
  onTakenHit(f) {f.nullReveal=45;},
  cpuChoice(f,opp,distance) {
    const aligned=Math.abs(f.y-opp.y)<90;
    if(aligned&&!f.cooldowns.upSpecial&&distance<280&&distance>45&&opp.state!=='block'&&opp.state!=='blockstun')return 'upSpecial';
    if(aligned&&!f.cooldowns.special&&distance>140&&distance<650&&!f.nullMark)return 'special';
    return null;
  },
  pose(f,t,frame) {return nullPose(f,t,frame);},
  drawBody(ctx,f,p,t) {drawNullBody(ctx,f,p,t);},
  draw(ctx,f,g) {if(!f.isAfterimage&&!f.isDecoy)drawNullEffects(ctx,f,g);},
  drawMeter(ctx,f) {
    drawKitMeter(ctx,f,f.nullMark?f.nullMark.left/NULL.markFrames*100:0,
      f.nullMark?`TARGET LOCK · ${(f.nullMark.left/60).toFixed(1)}s`:'TARGET LOCK',f.stats.color);
  },
};
