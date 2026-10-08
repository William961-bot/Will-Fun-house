const RIP_ABILITIES = CHARACTER_ABILITIES.rip = {
  cooldowns: { special: RIP.relentlessCooldown, downSpecial: RIP.dashCooldown, upSpecial: RIP.creamCooldown },
  labels: { special: 'ARMOR', downSpecial: 'GAS', upSpecial: 'CREAM' },
  special(f, opp, g) {
    f.relentless = RIP.relentlessFrames; f.relentlessStarted = g.frame;
    f.enter('flex'); f.vx = 0;
    g.popup('RELENTLESS', f.x, f.y - 210, f.stats.color, 40); g.shake(2);
    g.ring(f.x, FLOOR - 20, f.stats.color, 200); g.floorCrack(f.x, 1.2); g.dust(f.x, FLOOR, 0, 10);
    g.sound?.('armor'); return true;
  },
  downSpecial(f, opp, g) {
    const fwd = f.facing > 0 ? 'right' : 'left';
    g.clouds.push({ type: 'gas', owner: f.index, x: f.x - 25 * f.facing, y: f.y - 55,
      radius: RIP.gasRadius, framesLeft: RIP.gasFrames });
    f.momentum = Math.min(MOVE.maxMomentum, f.momentum + RIP.dashMomentum);
    if (f.input.held[fwd]) f.enter('run'); else f.startSkid();
    f.animHint = 'fartDash';
    f.vx = RIP.dashSpeed * f.facing;
    g.dust(f.x, FLOOR, -f.facing, 8);
    g.sound?.('fart'); return true;
  },
  // Fong Cream: squat and slap a white puddle onto the floor at his feet.
  upSpecial(f, opp, g) { f.vx = 0; f.enter('creamDeploy'); return true; },
  update(f, opp, g) {
    if (f.state === 'creamDeploy') {
      f.vx = 0;
      if (f.stateFrame === RIP.creamDropFrame) dropCream(f, g);
      if (f.stateFrame >= RIP.creamDeployFrames) f.enter('idle');
    }
    if (g.phase === 'fight' && f.relentless > 0 && f.relentlessStarted !== g.frame) f.relentless--;
    if (f.state === 'flex' && f.stateFrame >= RIP.flexFrames) f.enter('idle');
    // Fart Dash jet: gas pours out behind for the first frames of the launch.
    if (f.animHint === 'fartDash' && f.stateFrame < 10) g.smokePuff(f.x - 34 * f.facing, f.y - 56, 16 + f.stateFrame * 2, 22, true);
  },
  // The Relentless aura itself is drawn on the limbs by drawAura in render-fx.js; this is the time-left bar.
  draw(ctx, f, g) {
    if (!f.relentless) return;
    ctx.save(); ctx.fillStyle = '#e8b64c'; ctx.fillRect(f.x - 30, f.y - 198, 60 * f.relentless / RIP.relentlessFrames, 4); ctx.restore();
  },
};

// One puddle per Rip: a new one replaces the old.
function dropCream(f, g) {
  g.creams = g.creams.filter(c => c.owner !== f.index);
  g.creams.push({ owner: f.index, x: Math.max(WALL_L + RIP.creamHalfWidth, Math.min(WALL_R - RIP.creamHalfWidth, f.x)), framesLeft: RIP.creamFrames });
  g.popup('FONG CREAM', f.x, f.y - 210, '#fffaf0', 34);
  g.ring(f.x, FLOOR - 4, '#fffaf0', 90, 14);
  g.sound?.('splat');
}

// Standing in the other player's cream. Rip's own cream never slows him.
function inCream(f, g) {
  return f.y >= FLOOR - 2 && g.creams.some(c => c.owner !== f.index && Math.abs(f.x - c.x) <= RIP.creamHalfWidth);
}
