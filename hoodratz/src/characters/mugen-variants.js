// Extra Special moves for the MUGEN fighters: Special + Forward and Special + Back give each of them two more moves on top of
// their plain / Down / Up Specials, the same way Juri's Senpusha and Kasatsushi work. Each variant has its own cooldown (shown in
// the HUD only for the plain Special), is a normal attack (`kind:'attack'`, drawn from the clip named like the move) or a
// cast that spawns one projectile (`kind:'shot'`, state `mxShot`, drawn from `def.clip`). Cooldowns are set in onSpecialUsed:
// cooldownFor is also called by the HUD every frame, so it must stay free of side effects.
function mxHeld(f, side) {
  const held = f.input.held;
  return side === 'forward' ? !!held[f.facing === 1 ? 'right' : 'left'] : !!held[f.facing === 1 ? 'left' : 'right'];
}
function mxVariantOf(f, defs) {
  return defs.back && mxHeld(f, 'back') ? 'back' : defs.forward && mxHeld(f, 'forward') ? 'forward' : null;
}
function mxAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery, low = m.height === 'low';
  const rest = low ? CROUCH : STAND;
  const strike = low ? pose(CROUCH, { hip: [12, -48], neck: [30, -86], head: [38, -102], eF: [50, -52], hF: [86, -38], kF: [44, -26], fF: [84, -4] })
    : pose(STAND, { neck: [20, -128], head: [28, -146], hip: [4, -72], eF: [46, -122], hF: [92, -124], eB: [26, -108], hB: [50, -112] });
  return sampleTrack([[0, STAND], [Math.max(1, s - 2), pose(rest, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, strike, 'snap'],
    [s + m.active, strike], [end, STAND, 'inOut']], frame);
}
// defs: { forward: {name, label, cooldown, kind:'attack', move:{...kitAttack spec, mx:true}} |
//                  {name, label, cooldown, kind:'shot', clip, frames, at, projectile:(f)=>spawnProjectile spec} , back: {...} }
function addMugenVariants(kit, defs) {
  const orig = { reset: kit.reset, special: kit.special, update: kit.update, pose: kit.pose, attackPose: kit.attackPose, onSpecialUsed: kit.onSpecialUsed };
  const bySide = side => defs[side];
  kit.mugenVariants = defs;
  kit.reset = function (f) {
    orig.reset?.call(this, f); f.mxCd = { forward: 0, back: 0 }; f.mxUsing = null; f.mxFired = false; f.mxClip = null;
  };
  kit.cooldownLeft = function (f, key) {
    if (key !== 'special') return undefined;
    const side = mxVariantOf(f, defs);
    return side ? (f.mxCd?.[side] || 0) : f.cooldowns.special;
  };
  kit.cooldownFor = function (f, key) {
    if (key === 'special' && f.mxUsing) return 0;
    return this.cooldowns[key];
  };
  kit.onSpecialUsed = function (f, key) {
    orig.onSpecialUsed?.call(this, f, key);   // e.g. Hakai and Terrifier halve the cooldowns
    if (key === 'special' && f.mxUsing) { f.mxCd[f.mxUsing] = bySide(f.mxUsing).cooldown; f.mxUsing = null; }
  };
  kit.special = function (f, opp, g) {
    const side = mxVariantOf(f, defs);
    if (!side) { f.mxUsing = null; return orig.special.call(this, f, opp, g); }
    const def = defs[side];
    f.mxUsing = side;
    if (def.kind === 'attack') return kitAttack(f, def.name, { ...def.move, mx: true });
    f.mxFired = false; f.mxClip = def.clip;
    return openAbility(f, 'mxShot', def.frames);
  };
  kit.update = function (f, opp, g) {
    if (g.phase === 'fight' && f.mxCd) for (const side of ['forward', 'back']) if (f.mxCd[side] > 0) f.mxCd[side]--;
    if (g.phase === 'fight' && f.state === 'mxShot') {
      f.vx = 0;
      const def = ['forward', 'back'].map(bySide).find(d => d && d.kind === 'shot' && d.clip === f.mxClip);
      if (def && f.stateFrame === def.at && !f.mxFired) { f.mxFired = true; spawnProjectile(g, def.projectile(f)); if (def.sound) g.sound(def.sound); }
      if (f.stateFrame >= f.abilityFrames) f.enter('idle');
      return;
    }
    return orig.update?.call(this, f, opp, g);
  };
  kit.pose = function (f, t, frame) {
    if (f.state === 'mxShot') return pose(STAND, { hF: [58, -128], eF: [36, -120], head: [6, -146] });
    return orig.pose ? orig.pose.call(this, f, t, frame) : null;
  };
  kit.attackPose = function (f, frame) {
    if (f.move?.mx) return mxAttackPose(f, frame);
    return orig.attackPose.call(this, f, frame);
  };
  kit.visibleVariantLabels = ['forward', 'back'].filter(s => defs[s]).map(s => defs[s].label);
  return kit;
}
