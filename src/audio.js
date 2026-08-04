// All audio is synthesized WebAudio, quiet, started only after a user
// gesture, and guarded so it is inert headless.

export function createAudio() {
  const supported =
    typeof window !== 'undefined' &&
    (window.AudioContext || window.webkitAudioContext);

  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let musicOn = false;
  let musicGain = null;
  let musicTimer = null;
  let chordIndex = 0;

  function ensure() {
    if (!supported || ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    startAmbience();
    startEngine();
    if (musicOn) startMusic();
  }

  function startAmbience() {
    // A looped brown-noise wind through a low-pass, very quiet.
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(filter).connect(gain).connect(master);
    src.start();
  }

  function startEngine() {
    // A filtered sawtooth whose pitch and gain follow the moped's speed.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 42;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 520;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(master);
    engineOsc.start();
  }

  const CHORDS = [
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
    [196.0, 246.94, 293.66],
    [164.81, 196.0, 246.94],
  ];

  function playChord(notes) {
    if (!ctx || !musicGain) return;
    const now = ctx.currentTime;
    for (const f of notes) {
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.028, now + 1.3);
        g.gain.linearRampToValueAtTime(0.0001, now + 5.6);
        osc.connect(g).connect(musicGain);
        osc.start(now);
        osc.stop(now + 5.8);
      }
    }
  }

  function startMusic() {
    if (!ctx) return;
    if (!musicGain) {
      musicGain = ctx.createGain();
      musicGain.gain.value = 1;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      musicGain.connect(lp).connect(master);
    }
    musicGain.gain.value = 1;
    const tick = () => {
      playChord(CHORDS[chordIndex % CHORDS.length]);
      chordIndex += 1;
      musicTimer = setTimeout(tick, 4200);
    };
    tick();
  }

  function stopMusic() {
    if (musicTimer) clearTimeout(musicTimer);
    musicTimer = null;
    if (musicGain) musicGain.gain.value = 0;
  }

  return {
    ensure,
    setEngine(norm) {
      if (!ctx || !engineGain) return;
      const t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(42 + norm * 140, t, 0.08);
      engineFilter.frequency.setTargetAtTime(420 + norm * 900, t, 0.1);
      engineGain.gain.setTargetAtTime(norm * 0.045 + (norm > 0.01 ? 0.004 : 0), t, 0.1);
    },
    toggleMusic() {
      musicOn = !musicOn;
      if (ctx) {
        if (musicOn) startMusic();
        else stopMusic();
      }
      return musicOn;
    },
    musicEnabled() {
      return musicOn;
    },
    phoneRing() {
      // A short two-tone beep pattern, a few cycles.
      if (!ctx) return;
      const now = ctx.currentTime;
      const tones = [1174, 880, 1174, 880, 1174, 880];
      tones.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = ctx.createGain();
        const t0 = now + i * 0.14;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.06, t0 + 0.015);
        g.gain.linearRampToValueAtTime(0.0001, t0 + 0.12);
        osc.connect(g).connect(master);
        osc.start(t0);
        osc.stop(t0 + 0.14);
      });
    },
    chime() {
      // A soft pickup and delivery chime.
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = ctx.createGain();
        const t0 = now + i * 0.09;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 0.02);
        g.gain.linearRampToValueAtTime(0.0001, t0 + 0.5);
        osc.connect(g).connect(master);
        osc.start(t0);
        osc.stop(t0 + 0.55);
      });
    },
  };
}
