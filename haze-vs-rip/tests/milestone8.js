function ripSpecial(down = false, forward = false) {
  if (down) press('ArrowDown'); if (forward) press('ArrowLeft');
  press('Semicolon'); step(); release('Semicolon'); release('ArrowDown'); release('ArrowLeft');
}
check('Relentless lasts 90 frames, flex lasts 6 and armor preserves attacks', () => {
  setup(); ripSpecial(); near(p2.relentless, RIP.relentlessFrames); near(p2.cooldowns.special, 720);
  step(5); assert(p2.state === 'flex', 'short flex'); step(); assert(p2.state === 'idle', 'long flex');
  p2.startAttack('heavy'); p2.stateFrame = 12; p2.vx = 4;
  strike(); assert(p2.state === 'attack' && p2.stateFrame === 12, 'attack interrupted'); near(p2.vx, 4); near(p2.hp, MAX_HP - 36);
  step(RIP.relentlessFrames - 7); near(p2.relentless, 1); step(); near(p2.relentless, 0);
});
check('Relentless loses to grabs, perfect parry and Mirror Step', () => {
  setup(); ripSpecial(); strike('grab'); assert(p2.state === 'hitstun', 'grab resisted');
  setup(); ripSpecial(); p1.startParry('high'); p2.startAttack('light');
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g); assert(p2.state === 'stagger' && p2.timer === 45, 'parry resisted');
  setup(); p1.reset(800, 1); p2.reset(808, -1); p2.relentless = 100;
  p2.startAttack('heavy'); p2.stateFrame = MOVES.heavy.startup; special();
  assert(p2.state === 'hitstun', 'Mirror resisted');
});
check('Relentless adds 15 guard pressure only on blocked hits; Fart Dash adds 40 and retains burst speed', () => {
  setup(); p2.relentless = 100; p2.startAttack('light');
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g); near(p1.guard, 100);
  setup(); p2.relentless = 100; p1.enter('block'); p2.startAttack('light');
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g); near(p1.guard, 75); near(p1.hp, MAX_HP);
  for (const forward of [true, false]) {
    setup(); p2.momentum = 10; ripSpecial(true, forward);
    near(p2.momentum, 50); near(p2.vx, -16); near(p2.cooldowns.downSpecial, 300);
    assert(p2.state === (forward ? 'run' : 'skid') && g.clouds[0].type === 'gas', 'dash transition/gas');
  }
});
check('Rip cooldowns block reuse, count down and reset each round', () => {
  setup(); ripSpecial(); p2.enter('idle'); ripSpecial(); near(p2.cooldowns.special, 719); assert(p2.state !== 'flex', 'armor reused');
  step(719); near(p2.cooldowns.special, 0);
  setup(); ripSpecial(true); p2.enter('idle'); ripSpecial(true); assert(g.clouds.length === 1, 'dash reused');
  step(299); near(p2.cooldowns.downSpecial, 0); startRound(); near(p2.relentless, 0);
});
