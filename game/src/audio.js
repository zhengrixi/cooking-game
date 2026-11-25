// Sunny Side Diner — every sound is synthesized with WebAudio, no audio files.
//
// The diner is a noisy place: a blip for each layer landing, a hiss for the
// grill and the fryer, a bell when something is cooked, a little arpeggio
// when a customer pays. Sounds are fire-and-forget: play(event) is called for
// each entry the world pushes onto its event list, and a muted or not-yet-
// unlocked context simply stays silent.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (!context) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      context = new AudioCtor();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone({ freq = 440, end = null, type = 'sine', at = 0, dur = 0.12, gain = 0.16 }) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (end) osc.frequency.exponentialRampToValueAtTime(end, start + dur);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function hiss({ at = 0, dur = 0.18, gain = 0.05 }) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    const start = ctx.currentTime + at;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2400;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(start);
  }

  const sounds = {
    place: () => tone({ freq: 320 + Math.random() * 60, type: 'triangle', dur: 0.07, gain: 0.2 }),
    pop: () => tone({ freq: 500, end: 240, type: 'triangle', dur: 0.06, gain: 0.12 }),
    pour: () => tone({ freq: 700, end: 380, type: 'sine', dur: 0.16, gain: 0.12 }),
    sizzle: () => hiss({ dur: 0.3, gain: 0.06 }),
    ding: () => {
      tone({ freq: 1318, type: 'sine', dur: 0.3, gain: 0.14 });
      tone({ freq: 1760, type: 'sine', dur: 0.22, gain: 0.08, at: 0.01 });
    },
    serve: () => {
      tone({ freq: 784, type: 'square', dur: 0.09, gain: 0.07 });
      tone({ freq: 988, type: 'square', dur: 0.09, gain: 0.07, at: 0.08 });
      tone({ freq: 1318, type: 'square', dur: 0.16, gain: 0.08, at: 0.16 });
    },
    error: () => tone({ freq: 140, end: 90, type: 'sawtooth', dur: 0.18, gain: 0.12 }),
    burn: () => {
      hiss({ dur: 0.25, gain: 0.09 });
      tone({ freq: 110, type: 'sawtooth', dur: 0.2, gain: 0.08 });
    },
    trash: () => tone({ freq: 180, end: 60, type: 'triangle', dur: 0.14, gain: 0.16 }),
    arrive: () => tone({ freq: 660, end: 880, type: 'sine', dur: 0.09, gain: 0.08 }),
    leave: () => tone({ freq: 392, end: 262, type: 'sine', dur: 0.25, gain: 0.1 }),
    click: () => tone({ freq: 900, type: 'sine', dur: 0.04, gain: 0.06 }),
    fanfare: () => {
      [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.22, gain: 0.12, at: i * 0.11 }));
    },
  };

  return {
    unlock() {
      ensureContext();
    },
    play(event) {
      if (muted) return;
      const sound = sounds[event];
      if (sound) sound();
    },
    toggleMuted() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
