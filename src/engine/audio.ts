/** Tiny synthesized UI sounds until real SFX exist. */
type Blip = "move" | "select" | "back" | "toggle";

const TONES: Record<Blip, { from: number; to: number; dur: number }> = {
  move: { from: 660, to: 700, dur: 0.05 },
  select: { from: 520, to: 1040, dur: 0.12 },
  back: { from: 600, to: 300, dur: 0.1 },
  toggle: { from: 880, to: 880, dur: 0.06 },
};

let ac: AudioContext | null = null;

/** @param volume 0..1 */
export function blip(kind: Blip, volume: number): void {
  if (volume <= 0) return;
  try {
    ac ??= new AudioContext();
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;
    const { from, to, dur } = TONES[kind];
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.06 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // audio unavailable: stay silent
  }
}
