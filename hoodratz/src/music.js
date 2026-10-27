// Domain songs: optional audio files in assets/music/ (git-ignored, personal use only).
// Presentation only: nothing in the game logic reads this. A missing file is silently skipped.
// <audio> elements are used because fetch() of local files fails when the game runs from file://.
const music = {
  tracks: {}, current: null, fading: [],

  // Which song should be playing right now: the domain owner's, from the cutscene until the domain ends.
  want(game) {
    if (game.phase !== 'fight') return null;
    const seq = game.domainSequence;
    const src = seq?.kind === 'cutscene' ? seq : seq ? null : game.domain;
    // A domain with variants (Tonka) has one song per variant, keyed type_variant.
    const key = src && (src.variant && DOMAIN_MUSIC[`${src.type}_${src.variant}`] ? `${src.type}_${src.variant}` : src.type);
    if (!key || !DOMAIN_MUSIC[key] || this.tracks[key]?.broken) return null;
    if (seq?.kind === 'cutscene' && DOMAIN.cutsceneFrames - seq.framesLeft < (DOMAIN_MUSIC[key].delay || 0)) return null;
    return key;
  },

  track(id) {
    if (this.tracks[id]) return this.tracks[id];
    const el = new Audio(DOMAIN_MUSIC[id].file);
    el.preload = 'auto'; el.loop = true;
    const track = this.tracks[id] = { el, broken: false };
    el.addEventListener('error', () => { track.broken = true; });
    return track;
  },

  // A random spot in the song, leaving room for the whole domain before it loops.
  // A song with a bpm (Duttpack's) starts on a whole beat so the On the Beat clock stays in time.
  // Presentation only, so Math.random is fine here.
  startAt(id) {
    const cfg = DOMAIN_MUSIC[id], len = this.tracks[id].el.duration;
    const room = len - (DOMAIN.cutsceneFrames + DOMAIN.activeFrames) / 60;
    if (!(room > 0)) return cfg.start || 0;   // length not known yet (or a short song)
    if (!cfg.bpm) return Math.random() * room;
    const beat = 60 / cfg.bpm;
    return Math.floor(Math.random() * room / beat) * beat;
  },

  // Load the songs of the fighters in this match up front, so their length is known before a domain starts.
  preload() {
    const ids = fighters.map(f => f.stats.id).join();
    if (ids === this.preloaded) return;
    this.preloaded = ids;
    for (const key of Object.keys(DOMAIN_MUSIC)) if (fighters.some(f => key === f.stats.id || key.startsWith(f.stats.id + '_'))) this.track(key);
  },

  level(id) { return sound.muted ? 0 : sound.volume * (DOMAIN_MUSIC[id].volume ?? 1); },

  // Called once per drawn frame from the main loop.
  sync(game, dt) {
    if (typeof Audio === 'undefined') return;
    try {
      if (game.phase === 'fight') this.preload();
      const target = this.want(game);
      if (target !== this.current) {
        if (this.current) this.fading.push({ id: this.current, left: MUSIC_FADE_MS });
        this.current = target;
        if (target) {
          const { el } = this.track(target);
          this.fading = this.fading.filter(f => f.id !== target);
          el.currentTime = this.startAt(target);
          el.volume = this.level(target);
          el.play().catch(() => {});
        }
      }
      if (this.current) {
        const { el } = this.tracks[this.current];
        el.volume = this.level(this.current);
        if (game.paused && !el.paused) el.pause();
        else if (!game.paused && el.paused) el.play().catch(() => {});
      }
      for (const f of this.fading) {
        const { el } = this.tracks[f.id];
        f.left -= dt;
        el.volume = Math.max(0, this.level(f.id) * f.left / MUSIC_FADE_MS);
        if (f.left <= 0) el.pause();
      }
      this.fading = this.fading.filter(f => f.left > 0);
    } catch (_) { /* Music must never interrupt the game. */ }
  },
};
