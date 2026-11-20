import { MusicPlayer } from "../audio/music";
import { Synth, noteFreq } from "../audio/synth";
import { TRACKS, type TrackName } from "../audio/tracks";

export type SfxName =
  | "move"
  | "select"
  | "back"
  | "toggle"
  | "pause"
  | "jump"
  | "doubleJump"
  | "wallJump"
  | "dash"
  | "land"
  | "death"
  | "respawn"
  | "rewind"
  | "rewindFail"
  | "echoAppear"
  | "echoShatter"
  | "doorOpen"
  | "doorClose"
  | "checkpoint";

/**
 * Audio graph: music bus + sfx bus -> compressor -> speakers.
 * The AudioContext only starts after the first key press or click (browser rule),
 * so anything requested before that is remembered and played on unlock.
 */
export class AudioEngine {
  private ac: AudioContext | null = null;
  private synth: Synth | null = null;
  private music: MusicPlayer | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private duck: GainNode | null = null;
  private wantedTrack: TrackName | null = null;
  private musicVolume = 0.7;
  private sfxVolume = 0.8;
  private ducked = false;

  constructor() {
    const unlock = () => this.unlock();
    window.addEventListener("keydown", unlock);
    window.addEventListener("mousedown", unlock);
    window.addEventListener("touchstart", unlock);
  }

  private unlock(): void {
    try {
      if (!this.ac) {
        const ac = new AudioContext();
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        comp.connect(ac.destination);
        this.musicBus = ac.createGain();
        this.duck = ac.createGain();
        this.sfxBus = ac.createGain();
        this.musicBus.connect(this.duck).connect(comp);
        this.sfxBus.connect(comp);
        this.ac = ac;
        this.synth = new Synth(ac);
        this.music = new MusicPlayer(this.synth, this.musicBus);
        this.applyVolumes();
        if (this.wantedTrack) this.music.play(TRACKS[this.wantedTrack]);
      }
      if (this.ac.state === "suspended") void this.ac.resume();
    } catch (err) {
      console.warn("Audio disabled:", err); // the game stays silent
    }
  }

  /** @param music 0..10  @param sfx 0..10 (settings scale) */
  setVolumes(music: number, sfx: number): void {
    // perceptual curve: the slider feels linear to the ear
    this.musicVolume = Math.pow(music / 10, 1.6) * 0.9;
    this.sfxVolume = Math.pow(sfx / 10, 1.6) * 1.8;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ac || !this.musicBus || !this.sfxBus || !this.duck) return;
    const t = this.ac.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicVolume, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, t, 0.02);
    this.duck.gain.setTargetAtTime(this.ducked ? 0.35 : 1, t, 0.1);
  }

  playMusic(name: TrackName): void {
    this.wantedTrack = name;
    this.music?.play(TRACKS[name]);
  }

  /** Lowers the music (pause menu). */
  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    this.applyVolumes();
  }

  sfx(name: SfxName): void {
    const s = this.synth;
    const out = this.sfxBus;
    if (!s || !out || !this.ac || this.sfxVolume <= 0) return;
    const t = this.ac.currentTime + 0.005;
    switch (name) {
      case "move":
        s.tone(out, { freq: 880, to: 940, t, dur: 0.045, wave: "pulse25", gain: 0.22 });
        break;
      case "toggle":
        s.tone(out, { freq: 1180, t, dur: 0.05, wave: "pulse25", gain: 0.22 });
        break;
      case "select":
        s.tone(out, { freq: noteFreq("E5"), t, dur: 0.06, wave: "pulse25", gain: 0.25 });
        s.tone(out, { freq: noteFreq("B5"), t: t + 0.06, dur: 0.1, wave: "pulse25", gain: 0.25 });
        break;
      case "back":
        s.tone(out, { freq: noteFreq("B5"), t, dur: 0.06, wave: "pulse25", gain: 0.22 });
        s.tone(out, { freq: noteFreq("E5"), t: t + 0.06, dur: 0.09, wave: "pulse25", gain: 0.22 });
        break;
      case "pause":
        s.tone(out, { freq: noteFreq("A5"), t, dur: 0.07, wave: "triangle", gain: 0.4 });
        s.tone(out, { freq: noteFreq("E5"), t: t + 0.08, dur: 0.12, wave: "triangle", gain: 0.4 });
        break;
      case "jump":
        s.tone(out, { freq: 260, to: 620, t, dur: 0.11, wave: "pulse25", gain: 0.2 });
        break;
      case "doubleJump":
        s.tone(out, { freq: 420, to: 980, t, dur: 0.12, wave: "pulse12", gain: 0.2 });
        s.tone(out, { freq: noteFreq("E6"), t: t + 0.05, dur: 0.08, wave: "triangle", gain: 0.25 });
        break;
      case "wallJump":
        s.noise(out, { t, dur: 0.05, gain: 0.25, type: "highpass", freq: 2500 });
        s.tone(out, { freq: 330, to: 700, t, dur: 0.1, wave: "pulse25", gain: 0.2 });
        break;
      case "dash":
        s.noise(out, { t, dur: 0.2, gain: 0.45, type: "bandpass", freq: 3200, to: 500, q: 1.5 });
        s.tone(out, { freq: 220, to: 70, t, dur: 0.16, wave: "square", gain: 0.12 });
        break;
      case "land":
        s.noise(out, { t, dur: 0.07, gain: 0.35, type: "lowpass", freq: 900 });
        break;
      case "death":
        s.tone(out, { freq: 700, to: 60, t, dur: 0.45, wave: "square", gain: 0.2 });
        s.noise(out, { t, dur: 0.35, gain: 0.35, type: "lowpass", freq: 2400, to: 200 });
        break;
      case "rewind":
        // a reversed whoosh: noise sweeping up, a tone sliding down then up
        s.noise(out, { t, dur: 0.32, gain: 0.4, type: "bandpass", freq: 400, to: 4000, q: 2 });
        s.tone(out, { freq: 900, to: 220, t, dur: 0.16, wave: "triangle", gain: 0.25 });
        s.tone(out, { freq: 220, to: 1300, t: t + 0.16, dur: 0.16, wave: "triangle", gain: 0.25 });
        break;
      case "rewindFail":
        s.tone(out, { freq: 180, to: 150, t, dur: 0.08, wave: "square", gain: 0.12 });
        break;
      case "echoAppear":
        ["E6", "B6"].forEach((n, i) => s.tone(out, { freq: noteFreq(n), t: t + i * 0.04, dur: 0.25, wave: "triangle", gain: 0.25, release: 0.2 }));
        break;
      case "echoShatter":
        s.noise(out, { t, dur: 0.25, gain: 0.35, type: "highpass", freq: 3000 });
        ["C7", "G6", "D7"].forEach((n, i) => s.tone(out, { freq: noteFreq(n), t: t + i * 0.025, dur: 0.08, wave: "pulse12", gain: 0.12 }));
        break;
      case "doorOpen":
        s.tone(out, { freq: 110, to: 220, t, dur: 0.25, wave: "square", gain: 0.12 });
        s.noise(out, { t, dur: 0.25, gain: 0.2, type: "lowpass", freq: 600 });
        break;
      case "doorClose":
        s.tone(out, { freq: 220, to: 90, t, dur: 0.2, wave: "square", gain: 0.12 });
        s.noise(out, { t, dur: 0.15, gain: 0.3, type: "lowpass", freq: 500 });
        break;
      case "checkpoint":
        ["A5", "E6", "A6"].forEach((n, i) =>
          s.tone(out, { freq: noteFreq(n), t: t + i * 0.07, dur: 0.35, wave: "triangle", gain: 0.28, release: 0.25 }),
        );
        s.noise(out, { t, dur: 0.3, gain: 0.12, type: "highpass", freq: 6000 });
        break;
      case "respawn":
        ["C5", "E5", "G5", "C6"].forEach((n, i) =>
          s.tone(out, { freq: noteFreq(n), t: t + i * 0.05, dur: 0.12, wave: "triangle", gain: 0.3 }),
        );
        break;
    }
  }
}
