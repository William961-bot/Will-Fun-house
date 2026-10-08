// Reusable projectiles borrow collision/combat rules without changing their owner's current move.
function boxesOverlap(a, b) { return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y; }
function spawnProjectile(g, spec) {
  const owner=fighters[spec.owner];
  if(hypnotized(owner)&&!hypnoAiming(owner))spec={...spec,x:2*owner.x-spec.x,vx:-(spec.vx||0),facing:-spec.facing};
  const projectile = { ...spec, age: 0, siglarpCopyId:isSiglarp(owner)?owner.stats.id==='siglarp'?owner.siglarpActionId:owner.stats.id:null };
  g.projectiles.push(projectile); g.sound('whistle'); return projectile;
}
function projectileBox(p) { return { x: p.x - p.box.w / 2, y: p.y - p.box.h / 2, w: p.box.w, h: p.box.h }; }
function projectileAttacker(p) {
  const owner = fighters[p.owner], att = Object.create(owner);
  att.projectileOwner = p.owner;
  if(p.siglarpCopyId){att.siglarpCopyId=p.siglarpCopyId;att.stats={...CHARACTERS[p.siglarpCopyId],maxHp:owner.maxHp};}
  att.x = p.x; att.y = p.y; att.facing = p.facing; att.move = p.move; att.moveName = p.name;
  att.moveMomentum = 0; att.moveHit = false; att.chainUsed = new Set();
  return att;
}
function updateProjectiles(g) {
  for (const p of g.projectiles) {
    p.x += p.vx; p.age++;
    if (p.kind === 'bottle') { p.vy += .3; p.y += p.vy; if (p.y >= FLOOR - 10) { p.dead = true; shatterBottle(p, g); continue; } }
    if (--p.framesLeft <= 0 || p.x < WALL_L - p.box.w || p.x > WALL_R + p.box.w) { p.dead = true; continue; }
    const decoy = g.clouds.find(c => c.owner !== p.owner && c.decoy && boxesOverlap(projectileBox(p), hurtBox(c.decoy)));
    if (decoy) {
      g.smokePuff(decoy.decoy.x, decoy.decoy.y - 90, HAZE.smokeRadius / 2);
      decoy.decoy = null; p.dead = true; g.popup('DECOY', p.x, p.y - 60, '#8ef5b0', 28); continue;
    }
    const def = opponentsOf(fighters[p.owner], true).filter(v => !v.invincible && v.state !== 'throw' && !v.phased && !v.comboCapped && boxesOverlap(projectileBox(p), hurtBox(v)))
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x) || a.index - b.index)[0];
    if (!def) continue;
    const att = projectileAttacker(p), pt = { x: p.x, y: p.y };
    p.dead = true;
    if (p.kind === 'bottle' && def.state !== 'parry') shatterBottle(p, g);
    if (['block', 'blockstun'].includes(def.state) && !def.guardBroken) {
      def.framesSinceHit = 0; def.blockAttacker = att.index; def.enter('blockstun'); def.timer = Math.round(p.move.hitstun * BLOCK.stunScale); def.vx = BLOCK.pushback * att.facing;
      guardDrain(def, p.blockGuard, fighters[p.owner], g); g.sound('block'); g.sparks(p.x, p.y, '#a8dcff', 6);
      g.popup('BLOCK', def.x, def.y - 205, '#a8dcff', 22); continue;
    }
    // Parries deflect the ball, not the distant thrower. The normal parry rewards still apply.
    const hp = def.hp, meter = att.ultimate;
    applyHit(att, def, pt, g);
    if (def.hp < hp) gainMeter(fighters[p.owner], Math.max(0, att.ultimate - meter));
    else g.popup('DEFLECTED!', p.x, p.y - 40, '#a8dcff', 24);
  }
  g.projectiles = g.projectiles.filter(p => !p.dead);
}
function drawFootball(ctx, x, y, angle = 0, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.fillStyle = '#9e512c'; ctx.strokeStyle = '#ffd4a0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
  for (let x = -4; x <= 4; x += 4) { ctx.moveTo(x, -3); ctx.lineTo(x, 3); } ctx.stroke(); ctx.restore();
}
function drawProjectiles(ctx, g) {
  drawNullProjectiles(ctx,g);
  drawRosterProjectiles(ctx, g);
  for (const p of g.projectiles) if (p.kind === 'football') {
    ctx.save(); ctx.strokeStyle = '#ffd4a066'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 3, p.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
    drawFootball(ctx, p.x, p.y, p.age * .7);
  }
}
