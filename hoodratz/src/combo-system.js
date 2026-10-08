// All damaging contacts share one budget, including cinematic slams and ultimate damage.
function countComboHit(att, def) {
  realAttacker(att).combatTarget = def.index;
  def.combo++;
  def.comboAttacker = realAttacker(att).index;
  def.mirrorBounce = false;
  if (def.wallBounced) def.bounceHits++;
  def.comboCapped = def.combo >= COMBO_LIMIT.total || (def.wallBounced
    ? def.bounceHits >= COMBO_LIMIT.afterBounce : def.combo >= COMBO_LIMIT.beforeBounce);
}
const ABILITY_LINK_STATES = {
  nullSpearWindup: NULL.spearStartup, crescentWindup: LANCER.waveWindup,
  deepBall: YITTY.ballWindup, bottleWindup: TEO.throwWindup, spear: 0, virusWindup: SOMBRA.virusStartup,
};
function armAbilityNormalLink(att, def, name, dmg) {
  const f = realAttacker(att);
  if (dmg <= 0 || MOVES[name] || def.state !== 'hitstun' || def.comboAttacker !== f.index) return;
  if (f.state === 'attack' && f.moveName === name) {
    // Attack-based specials retain their own recovery cancel window and travel rules.
    f.chainUsed.delete('light'); f.chainUsed.delete('medium');
  } else if (Object.hasOwn(ABILITY_LINK_STATES, f.state)) {
    f.abilityLink = { state: f.state, contact: f.stateFrame, target: def.index };
  }
}
function tryAbilityNormalLink(f, opp, inp, g) {
  const link = f.abilityLink;
  if (!link) return false;
  if (f.state !== link.state || opp.index !== link.target || opp.state !== 'hitstun' ||
      opp.comboAttacker !== f.index || opp.comboCapped) {
    f.abilityLink = null; return false;
  }
  // Only recent contact during this ability's recovery can shorten it.
  const start = Math.max(ABILITY_LINK_STATES[f.state] + 4, link.contact + 4);
  if (f.stateFrame < start) return false;
  if (f.stateFrame >= start + MOVE.chainWindow) { f.abilityLink = null; return false; }
  const name = inp.pressed('attack', BUFFER) ? f.pickAttack(inp)
    : inp.pressed('medium', BUFFER) ? f.pickMedium(inp) : null;
  if (!name) return false;
  inp.consume(name === 'medium' || name === 'lowMedium' ? 'medium' : 'attack');
  f.chainUsed.delete('light'); f.chainUsed.delete('medium'); f.spearHitUntil = -1;
  f.startAttack(name); return true;
}
function airExtensionReady(f) {
  const opp = opponentOf(f);
  // Rendering observes the previous tick; a fresh press executes on the next one.
  return f.state === 'attack' && f.moveName === 'airMedium' && f.moveHit && !f.moveAbsorbed && !f.grounded &&
    f.stateFrame >= f.move.startup + f.move.active - 1 &&
    f.stateFrame < f.move.startup + f.move.active + AIR_EXTENSION.window - 1 &&
    opp.state === 'hitstun' && opp.comboAttacker === f.index && !opp.comboAirExtended && !opp.comboCapped;
}
