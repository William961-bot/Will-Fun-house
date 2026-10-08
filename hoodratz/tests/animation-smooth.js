function motionCombatSnapshot(f) {
  return JSON.stringify([f.x,f.y,f.vx,f.vy,f.state,f.stateFrame,f.animationFrame,f.hp,f.guard,f.cooldowns,
    f.combo,f.burstMeter,f.ultimate,f.preworkout,[...(f.pumpNormals||[])],f.move,f.input.held]);
}
check('Curved pose travel preserves exact keyframes, leads with hips, lifts swinging limbs and never lifts planted feet',()=>{
  const a=pose(STAND,{hip:[0,-74],hF:[0,-120],fF:[20,0]}),b=pose(STAND,{hip:[40,-74],hF:[100,-120],fF:[40,0]});
  const before=JSON.stringify([a,b]),mid=travelPose(a,b,.5);
  assert(mid.hip[0]>20&&mid.hF[0]<50&&mid.hF[1]<-120,'body leads curved hand');near(mid.fF[1],0);
  for(const at of [0,1]) {
    const p=travelPose(a,b,at),expected=at?b:a;for(const k of JOINTS){near(p[k][0],expected[k][0]);near(p[k][1],expected[k][1]);}
  }
  for(let at=0;at<=1;at+=.01)assert(poseIsFinite(travelPose(a,b,at)),'finite arc');
  assert(JSON.stringify([a,b])===before,'key poses immutable');
  const spinning=travelPose(pose(a,{rot:0}),pose(b,{rot:TAU}),.5);near(spinning.rot,Math.PI);
});
check('Render blends action changes, keeps active strikes and hit reactions exact, and preserves full rolls without reverse unwinding',()=>{
  const savedAcc=acc;acc=0;
  try {
    const {f}=kinkadeVs();f.enter('run');f.stateFrame=100;smoothPose(f,12,STEP);const start=f.pose.hF.slice();
    f.state='idle';f.stateFrame=101;smoothPose(f,13,STEP);near(f.pose.hF[0],start[0]);
    f.stateFrame=103;const halfway=smoothPose(f,15,STEP);assert(poseIsFinite(halfway),'transition halfway');
    f.stateFrame=105;const idle=smoothPose(f,17,STEP),goal=animatedPose(f,17,105);near(idle.hF[0],goal.hF[0]);
    f.startAttack('light');f.stateFrame=f.move.startup;
    const strike=smoothPose(f,18,STEP),target=animatedPose(f,18,f.stateFrame);
    for(const joint of ['head','neck','hip','eF','hF'])for(const axis of [0,1])near(strike[joint][axis],target[joint][axis]);
    f.enter('hitstun');f.hitstun=20;const hit=smoothPose(f,19,STEP),snap=hitAnim(f);near(hit.head[0],snap.head[0]);
    f.enter('roll');f.rollDir=f.facing;f.stateFrame=BLOCK.rollFrames;near(smoothPose(f,20,STEP).rot,TAU);
    f.enter('idle');smoothPose(f,21,STEP);f.stateFrame=4;near(smoothPose(f,25,STEP).rot,0);
  }finally{acc=savedAcc;}
});
check('Bench motion bends knees before leg drive, keeps a rigid two-hand grip and reaches both active shove poses exactly',()=>{
  for(const pumped of [false,true])for(const index of [0,1])for(const facing of [-1,1]) {
    const {f}=kinkadeVs(index,facing);f.benchPumped=pumped;f.kit.special(f);f.benchPumped=pumped;
    const load=kinkadePose(f,4,4),drive=kinkadePose(f,9,9);assert(load.hip[1]>drive.hip[1],'knees drive before extension');
    for(let at=0;at<=42;at+=.125) {
      const p=kinkadePose(f,at,at);assert(poseIsFinite(p),'finite bench');near(p.hF[0]-p.hB[0],32);near(p.hF[1],p.hB[1]);
      near(p.fF[1],0);near(p.fB[1],0);
    }
    for(const at of pumped?[12,19]:[12]){const p=kinkadePose(f,at,at);near(p.hF[0],152);near(p.hF[1],-115);}
  }
});
check('Planted Bench and guard feet stay at fixed world positions despite small body movement, on either side',()=>{
  const savedAcc=acc;acc=0;
  try {for(const facing of [-1,1])for(const state of ['bench','block']) {
    const {f}=kinkadeVs(0,facing);if(state==='bench')f.kit.special(f);else f.enter('block');
    f.pose=null;smoothPose(f,0,STEP);const anchors=['fF','fB'].map(k=>worldPoint(f,f.pose,k));
    for(let at=1;at<=20;at++){f.x+=facing*.6;f.stateFrame=at;smoothPose(f,at,STEP);
      for(const [i,k] of ['fF','fB'].entries()){const point=worldPoint(f,f.pose,k);near(point[0],anchors[i][0]);near(point[1],FLOOR);}}
  }}finally{acc=savedAcc;}
});
check('Rendering is identical at matching animation times across 60/144 Hz, freezes at fractional poses and never changes combat',()=>{
  const savedAcc=acc;
  try {for(const id of ROSTER) {
    setup();p1.setCharacter(id);p1.reset(600,1);p1.enter('run');p1.stateFrame=20;const before=motionCombatSnapshot(p1);
    acc=STEP*.4;const a=JSON.stringify(smoothPose(p1,12,STEP));
    p1.pose=null;const b=JSON.stringify(smoothPose(p1,12,1000/144));assert(a===b,'refresh-rate independence '+id);
    acc=STEP*.7;smoothPose(p1,12,1000/144);const frozen=JSON.stringify(p1.pose);
    g.paused=true;acc=0;smoothPose(p1,12,STEP);assert(JSON.stringify(p1.pose)===frozen,'pause '+id);g.paused=false;
    g.hitstopLeft=3;smoothPose(p1,12,STEP);assert(JSON.stringify(p1.pose)===frozen,'hitstop '+id);g.hitstopLeft=0;
    assert(motionCombatSnapshot(p1)===before,'render-only '+id);
  }}finally{acc=savedAcc;g.paused=false;g.hitstopLeft=0;}
});
