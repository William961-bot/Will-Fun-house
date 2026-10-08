// Practice uses the normal CPU tiers. Level five also attempts a legal corner juggle through inputs.
const PRACTICE_COMBO_ROUTE=['light','low','medium','overhead','jump','air','airMedium','airHeavy','chase','light','medium','low'];
class PracticeCpuInput extends CpuInput {
  reset(round=1) {super.reset(round);this.comboRoute=null;this.nextCombo=0;}
  choose(frame) {
    if(this.level===5) {
      const command=this.comboChoice(frame);
      if(command!==null)return command;
    }
    return super.choose(frame);
  }
  comboChoice(frame) {
    const f=fighters[this.index],opp=opponentOf(f);
    const moves=f.stats.id==='sombra'?PRACTICE_COMBO_ROUTE.slice(0,-2):PRACTICE_COMBO_ROUTE;
    const free=['idle','walk','run','skid'].includes(f.state)||f.state==='taunt'&&f.animHint==='wallTaunt';
    const distance=Math.abs(opp.x-f.x),facing=Math.sign(opp.x-f.x)||f.facing;
    if(!this.comboRoute) {
      const wallDistance=facing>0?WALL_R-HALF_W-opp.x:opp.x-WALL_L-HALF_W;
      if(frame<this.nextCombo||!free||!f.grounded||!opp.grounded||f.guardBroken||nullHidden(opp,g)||
          !['idle','walk','run','skid'].includes(opp.state)||distance>80||wallDistance>200)return null;
      this.comboRoute={stage:0,sentAt:frame,started:false,facing};
      return {attack:true};
    }
    const route=this.comboRoute,name=moves[route.stage];
    const abort=()=>{this.comboRoute=null;this.nextCombo=frame+45;return null;};
    if(['hitstun','stagger','blockstun','thrown','throw','burst','ko'].includes(f.state)||f.guardBroken||opp.koed||
        route.stage>0&&(opp.state!=='hitstun'||opp.comboAttacker!==this.index))return abort();
    if(g.practice)g.practice.cpuBestCombo=Math.max(g.practice.cpuBestCombo||0,opp.comboAttacker===this.index?opp.combo:0);
    if(name==='jump') {
      if(f.state==='air'){route.stage++;route.started=false;route.sentAt=frame;return {attack:true};}
      if(frame-route.sentAt>BUFFER+6)return abort();
      return {};
    }
    if(name==='chase') {
      if(free&&f.grounded&&opp.wallBounced&&distance<=115) {
        route.stage++;route.started=false;route.sentAt=frame;return {attack:true};
      }
      return {[route.facing>0?'right':'left']:true};
    }
    if(f.state==='attack'&&f.moveName===name)route.started=true;
    if(!route.started){if(frame-route.sentAt>BUFFER+12)return abort();return {};}
    if(f.state!=='attack'||f.moveName!==name)return abort();
    if(f.moveHit&&(opp.state!=='hitstun'||f.moveAbsorbed))return abort();
    if(!f.moveHit) {
      if(f.stateFrame>=f.move.startup+f.move.active)return abort();
      return {};
    }
    if(route.stage===moves.length-1) {
      this.comboRoute=null;this.nextCombo=frame+90;return {};
    }
    if(name!=='airHeavy'&&f.stateFrame+1<f.move.startup+f.move.active)return {};
    route.stage++;route.started=false;route.sentAt=frame;
    const next=moves[route.stage];
    if(next==='jump')return {up:true};
    if(next==='chase')return {[route.facing>0?'right':'left']:true};
    if(next==='medium'||next==='airMedium')return {medium:true};
    if(next==='airHeavy')return {heavy:true};
    return {attack:true,down:next==='low',up:next==='overhead'};
  }
}

function setPracticeOpponent(level=0,mode=g.practice?.mode||1) {
  if(!g.practice)return;
  level=Math.max(0,Math.min(5,Math.round(level)||0));
  g.practice.cpuLevel=level;g.practice.mode=mode;g.practice.lastEvent=null;g.practice.cpuBestCombo=0;
  p2.input=level?new PracticeCpuInput(1,level):new PracticeInput(1);
  g.inputSources[1]=level?{type:'cpu',level}:null;
  keysDown.clear();
  for(const b of BUTTONS){p1.input.held[b]=false;p1.input.pressedAt[b]=p1.input.rawPressedAt[b]=-999;}
  startRound();g.phase='fight';g.phaseTimer=0;g.inputLocked=false;g.popups=[];
}
function practiceClick(x,y) {
  const hit=g.practice?.hits?.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);
  if(hit){setPracticeOpponent(hit.level);return true;}
  return false;
}
