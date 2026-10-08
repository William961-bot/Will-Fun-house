// Effects only. Audio is unlocked by a trusted key press; simulation never depends on it.
const sound = {
  context: null, master: null, muted: false, volume: AUDIO.initialVolume,
  unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!this.context) { this.context = new Context(); this.master = this.context.createGain(); this.master.connect(this.context.destination); this.setVolume(this.volume); }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch (_) { /* Audio availability must never interrupt the game. */ }
  },
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  },
  toggleMute() { this.muted = !this.muted; this.setVolume(this.volume); },
  play(name) {
    if (!this.context || this.context.state !== 'running' || this.muted || !this.volume) return;
    const event = SOUND_EVENTS[name]; if (!event) return;
    const [from, to, duration, type] = event, ctx = this.context, now = ctx.currentTime;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(name === 'crowd' ? AUDIO.envelopeFloor : 0.18, now);
    if (name === 'crowd') gain.gain.exponentialRampToValueAtTime(0.18, now + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(AUDIO.envelopeFloor, now + duration); gain.connect(this.master);
    let source;
    if (type === 'noise') {
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      source = ctx.createBufferSource(); source.buffer = buffer;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(from, now);
      filter.frequency.exponentialRampToValueAtTime(to, now + duration); source.connect(filter); filter.connect(gain);
    } else {
      source = ctx.createOscillator(); source.type = type;
      source.frequency.setValueAtTime(from, now); source.frequency.exponentialRampToValueAtTime(to, now + duration);
      if (name === 'fart') {
        const wobble = ctx.createOscillator(), depth = ctx.createGain(); wobble.frequency.value = 35; depth.gain.value = 22;
        wobble.connect(depth); depth.connect(source.frequency); wobble.start(now); wobble.stop(now + duration);
      }
      if (name === 'perfect') {
        const chime = ctx.createOscillator(); chime.type = 'sine'; chime.frequency.value = from * 1.5;
        chime.connect(gain); chime.start(now + 0.06); chime.stop(now + duration);
      }
      if (name === 'sting') {
        const screech = ctx.createOscillator(); screech.type = 'sawtooth';
        screech.frequency.setValueAtTime(from * 1.025, now); screech.frequency.exponentialRampToValueAtTime(to * 1.025, now + duration);
        screech.connect(gain); screech.start(now); screech.stop(now + duration);
      }
      source.connect(gain);
    }
    source.start(now); source.stop(now + duration);
    source.onended = () => gain.disconnect();
  },
};
