import { noteFreq, semitone, type Synth } from "./synth";
import type { TrackDef } from "./tracks";

const STEPS_PER_BAR = 16;
const LOOKAHEAD = 0.15; // seconds scheduled ahead of the audio clock
const FADE = 0.6;

interface NoteEvent {
  step: number;
  freq: number;
  steps: number;
}

/** Parses a bar of "A4 - . C5" tokens into notes with their lengths. */
function parseLead(bars: string[]): NoteEvent[] {
  const events: NoteEvent[] = [];
  let current: NoteEvent | null = null;
  bars.forEach((bar, b) => {
    const tokens = bar.trim().split(/\s+/);
    if (tokens.length !== STEPS_PER_BAR) throw new Error(`Bar ${b} has ${tokens.length} steps: "${bar}"`);
    tokens.forEach((tok, i) => {
      const step = b * STEPS_PER_BAR + i;
      if (tok === "-") {
        if (current) current.steps++;
      } else if (tok === ".") {
        current = null;
      } else {
        current = { step, freq: noteFreq(tok), steps: 1 };
        events.push(current);
      }
    });
  });
  return events;
}

/** "Am" -> [A3, C4, E4] frequencies (root in octave 3). */
function chordFreqs(chord: string): number[] {
  const m = /^([A-G][#b]?)(m?)$/.exec(chord);
  if (!m) throw new Error(`Bad chord "${chord}"`);
  const root = noteFreq(`${m[1]}3`);
  const third = m[2] ? 3 : 4;
  return [root, semitone(root, third), semitone(root, 7)];
}

/** Plays one looping track on its own gain node (so tracks can crossfade). */
class TrackPlayer {
  readonly out: GainNode;
  private readonly leadIn: GainNode;
  private readonly lead: NoteEvent[];
  private readonly chords: number[][];
  private readonly stepDur: number;
  private readonly totalSteps: number;
  private step = 0;
  private nextTime: number;

  constructor(
    private readonly synth: Synth,
    private readonly def: TrackDef,
    dest: AudioNode,
  ) {
    const ac = synth.ac;
    this.out = ac.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);

    // lead -> dry + feedback delay (wet)
    this.leadIn = ac.createGain();
    const delay = ac.createDelay(2);
    delay.delayTime.value = def.delay.time;
    const fb = ac.createGain();
    fb.gain.value = def.delay.feedback;
    const wet = ac.createGain();
    wet.gain.value = def.delay.mix;
    const tone = ac.createBiquadFilter(); // darker repeats
    tone.type = "lowpass";
    tone.frequency.value = 2800;
    this.leadIn.connect(this.out);
    this.leadIn.connect(delay);
    delay.connect(tone).connect(fb).connect(delay);
    tone.connect(wet).connect(this.out);

    this.lead = parseLead(def.lead);
    this.chords = def.chords.map(chordFreqs);
    this.stepDur = 60 / def.bpm / 4;
    this.totalSteps = def.lead.length * STEPS_PER_BAR;
    this.nextTime = ac.currentTime + 0.1;
  }

  fadeTo(value: number, time = FADE): void {
    const g = this.out.gain;
    const now = this.synth.ac.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + time);
  }

  /** Schedules every step that falls inside the lookahead window. */
  pump(): void {
    const ac = this.synth.ac;
    if (this.nextTime < ac.currentTime) this.nextTime = ac.currentTime + 0.05; // tab was asleep
    while (this.nextTime < ac.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % this.totalSteps;
    }
  }

  private playStep(step: number, t: number): void {
    const { synth, def, stepDur } = this;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const i = step % STEPS_PER_BAR;
    const chord = this.chords[bar % this.chords.length];

    for (const n of this.lead) {
      if (n.step === step) {
        synth.tone(this.leadIn, { freq: n.freq, t, dur: n.steps * stepDur * 0.95, wave: def.leadWave, gain: 0.15, release: 0.06 });
      }
    }

    if (def.bass === "hold" && i === 0) {
      synth.tone(this.out, { freq: chord[0] / 2, t, dur: STEPS_PER_BAR * stepDur, wave: "triangle", gain: 0.3, attack: 0.02, release: 0.3 });
    } else if (def.bass === "drive" && i % 2 === 0) {
      const f = i % 4 === 2 ? chord[0] : chord[0] / 2;
      synth.tone(this.out, { freq: f, t, dur: stepDur * 1.8, wave: "triangle", gain: 0.32, release: 0.03 });
    }

    if (def.arp) {
      const pattern = [0, 1, 2, 1, 0, 1, 2, 3];
      const idx = pattern[i % pattern.length];
      const f = idx === 3 ? chord[0] * 2 : chord[idx];
      synth.tone(this.out, { freq: f * 2, t, dur: stepDur * 0.8, wave: "pulse12", gain: def.pad ? 0.045 : 0.035, release: 0.02 });
    }

    if (def.pad && i === 0) {
      for (const f of chord) {
        synth.tone(this.out, { freq: f, t, dur: STEPS_PER_BAR * stepDur, wave: "triangle", gain: 0.05, attack: 0.4, release: 0.5 });
      }
    }

    const hit = def.drums?.[bar % def.drums.length][i];
    if (hit === "k") {
      synth.tone(this.out, { freq: 140, to: 40, t, dur: 0.14, wave: "sine", gain: 0.7, release: 0.05 });
    } else if (hit === "s") {
      synth.noise(this.out, { t, dur: 0.14, gain: 0.3, type: "highpass", freq: 1200 });
      synth.tone(this.out, { freq: 190, to: 120, t, dur: 0.07, wave: "triangle", gain: 0.25 });
    } else if (hit === "h") {
      synth.noise(this.out, { t, dur: 0.035, gain: 0.12, type: "highpass", freq: 7000 });
    }
  }

  stop(): void {
    this.fadeTo(0);
    const out = this.out;
    setTimeout(() => out.disconnect(), FADE * 1000 + 100);
  }
}

/** Keeps one track playing at a time, crossfading on change. */
export class MusicPlayer {
  private current: TrackPlayer | null = null;
  private currentDef: TrackDef | null = null;
  private timer: number | null = null;

  constructor(
    private readonly synth: Synth,
    private readonly dest: AudioNode,
  ) {}

  play(def: TrackDef): void {
    if (this.currentDef === def) return;
    this.current?.stop();
    this.currentDef = def;
    this.current = new TrackPlayer(this.synth, def, this.dest);
    this.current.fadeTo(def.volume);
    this.timer ??= window.setInterval(() => this.current?.pump(), 25);
    this.current.pump();
  }
}
