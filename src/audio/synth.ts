/** Low-level chiptune voices shared by the music sequencer and the sound effects. */

export type Wave = "square" | "pulse25" | "pulse12" | "triangle" | "sine" | "sawtooth";

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" -> 440, "C#5", "Bb3"… */
export function noteFreq(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note "${name}"`);
  const semis = NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function semitone(freq: number, n: number): number {
  return freq * Math.pow(2, n / 12);
}

export class Synth {
  private readonly waves = new Map<string, PeriodicWave>();
  private noiseBuffer: AudioBuffer | null = null;

  constructor(readonly ac: AudioContext) {}

  /** Pulse wave with the given duty cycle (the classic NES-like timbres). */
  private pulse(duty: number): PeriodicWave {
    const key = `p${duty}`;
    let w = this.waves.get(key);
    if (!w) {
      const n = 64;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      w = this.ac.createPeriodicWave(real, imag);
      this.waves.set(key, w);
    }
    return w;
  }

  private osc(wave: Wave): OscillatorNode {
    const o = this.ac.createOscillator();
    if (wave === "pulse25") o.setPeriodicWave(this.pulse(0.25));
    else if (wave === "pulse12") o.setPeriodicWave(this.pulse(0.125));
    else o.type = wave;
    return o;
  }

  /** A note with a short attack and release. `to` slides the pitch. */
  tone(
    dest: AudioNode,
    opts: { freq: number; to?: number; t: number; dur: number; wave: Wave; gain: number; attack?: number; release?: number; slideCurve?: "exp" | "lin" },
  ): void {
    const { t, dur, gain } = opts;
    const attack = opts.attack ?? 0.005;
    const release = opts.release ?? 0.04;
    const o = this.osc(opts.wave);
    const g = this.ac.createGain();
    o.frequency.setValueAtTime(opts.freq, t);
    if (opts.to !== undefined) {
      if (opts.slideCurve === "lin") o.frequency.linearRampToValueAtTime(opts.to, t + dur);
      else o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + dur);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Filtered white noise burst (drums, dash whoosh, thuds). */
  noise(
    dest: AudioNode,
    opts: { t: number; dur: number; gain: number; type: BiquadFilterType; freq: number; to?: number; q?: number },
  ): void {
    const { t, dur } = opts;
    const src = this.ac.createBufferSource();
    src.buffer = this.getNoise();
    const f = this.ac.createBiquadFilter();
    f.type = opts.type;
    f.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(opts.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private getNoise(): AudioBuffer {
    if (!this.noiseBuffer) {
      const len = this.ac.sampleRate;
      this.noiseBuffer = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }
}
