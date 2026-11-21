/**
 * Original chiptune tracks for Echo.
 *
 * Notation, one bar = 16 steps (16th notes), tokens separated by spaces:
 *   "A4"  play a note      "-"  hold the previous note      "."  rest
 * Drums use one character per step: k = kick, s = snare, h = hi-hat, . = rest.
 * Chords: "Am", "F", "C#m", "Bb"… (major or minor triads).
 */

export interface TrackDef {
  title: string;
  bpm: number;
  /** loudness multiplier, to balance tracks against each other */
  volume: number;
  chords: string[];
  lead: string[];
  leadWave: "pulse25" | "pulse12" | "square" | "triangle";
  /** "drive" = 8th-note bass with octave jumps, "hold" = one long note per bar */
  bass: "drive" | "hold";
  arp: boolean;
  pad: boolean;
  drums?: string[];
  /** feedback delay on the lead: the echo in Echo */
  delay: { time: number; feedback: number; mix: number };
}

/** Main menu: slow, starry, a little melancholic. */
const STARLIT_VALE: TrackDef = {
  title: "Starlit Vale",
  bpm: 84,
  volume: 1.9,
  chords: ["Am", "F", "C", "G", "Am", "F", "Dm", "E"],
  lead: [
    "E5 - - - - - - - C5 - - - D5 - E5 -",
    "F5 - - - E5 - - - C5 - - - - - - -",
    "G5 - - - - - E5 - D5 - C5 - D5 - - -",
    "B4 - - - - - - - . . . . . . . .",
    "E5 - - - - - - - A5 - - - G5 - E5 -",
    "F5 - - - - - A5 - G5 - F5 - E5 - - -",
    "D5 - - - F5 - - - E5 - D5 - C5 - - -",
    "B4 - - - - - - - G#4 - - - . . . .",
  ],
  leadWave: "pulse25",
  bass: "hold",
  arp: true,
  pad: true,
  delay: { time: (60 / 84) * 0.75, feedback: 0.38, mix: 0.35 },
};

/** Chapter 0 / test room: upbeat, hopeful, made for running. */
const FIRST_STEPS: TrackDef = {
  title: "First Steps",
  bpm: 132,
  volume: 1,
  chords: ["Dm", "Bb", "F", "C", "Dm", "Bb", "C", "A"],
  lead: [
    "D5 . F5 . A5 - - . G5 . F5 . E5 . F5 .",
    "D5 - - - . . F5 . G5 - F5 . D5 . C5 .",
    "C5 . F5 . A5 - - . C6 - - . A5 . G5 .",
    "G5 - - - - - E5 . C5 - - - . . . .",
    "D5 . F5 . A5 - - . D6 - - . C6 . A5 .",
    "Bb5 - - - A5 - G5 . F5 - - - D5 . F5 .",
    "G5 - - - E5 - C5 . E5 - G5 . C6 - - .",
    "A5 - - - - - - . C#5 - - - E5 - - .",
  ],
  leadWave: "pulse12",
  bass: "drive",
  arp: true,
  pad: false,
  drums: [
    "k.h.s.h.k.k.s.h.",
    "k.h.s.h.k.h.s.hh",
    "k.h.s.h.k.k.s.h.",
    "k.h.s.h.k.h.s.s.",
    "k.h.s.h.k.k.s.h.",
    "k.h.s.h.k.h.s.hh",
    "k.h.s.h.k.k.s.h.",
    "k.h.s.hkk.h.sss.",
  ],
  delay: { time: (60 / 132) * 0.75, feedback: 0.25, mix: 0.22 },
};

/** Chapter 1, Starfall Ruins (placeholder): open, airy, stars close over a gorge. */
const BROKEN_BRIDGES: TrackDef = {
  title: "Broken Bridges",
  bpm: 104,
  volume: 1.2,
  chords: ["Em", "C", "G", "D", "Em", "C", "Am", "B"],
  lead: [
    "B4 - - - E5 - - - G5 - - - F#5 - E5 -",
    "E5 - - - - - - - . . G5 - A5 - B5 -",
    "D5 - - - - - B4 - D5 - - - G5 - - -",
    "F#5 - - - - - - - A5 - - - F#5 - D5 -",
    "B4 - - - E5 - - - B5 - - - A5 - G5 -",
    "G5 - - - - - - - E5 - - - G5 - C6 -",
    "B5 - - - A5 - - - E5 - - - C5 - - -",
    "D#5 - - - - - - - F#5 - - - B4 - - -",
  ],
  leadWave: "pulse12",
  bass: "hold",
  arp: true,
  pad: true,
  drums: ["k.......s.......", "k.......s...h...", "k.......s.......", "k.....k.s...h.h."],
  delay: { time: (60 / 104) * 0.75, feedback: 0.42, mix: 0.38 },
};

export const TRACKS = {
  menu: STARLIT_VALE,
  vale: FIRST_STEPS,
  ruins: BROKEN_BRIDGES,
} satisfies Record<string, TrackDef>;

export type TrackName = keyof typeof TRACKS;
