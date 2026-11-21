/**
 * Chapter 1 mechanics that change over time (SCRIPT.md §4.5): crumble stone and dash flowers.
 * One instance per Level. Deterministic, so the rewind and the solver can snapshot it.
 *
 * Crumble: a maximal horizontal run of "=" tiles breaks as one slab. Touched -> shakes
 * CRUMBLE_SHAKE s (still solid) -> gone CRUMBLE_GONE s -> reforms once no body overlaps it.
 * Flower: refills a spent dash, then stays closed FLOWER_REGROW s.
 */
import { TILE } from "../config";
import { overlaps, type Rect } from "./level";

export const CRUMBLE_SHAKE = 0.4;
export const CRUMBLE_GONE = 2;
export const FLOWER_REGROW = 2.5;
/** half size of a flower's touch box (12x12) */
const FLOWER_HALF = 6;

const INTACT = 0;
const SHAKING = 1;
const GONE = 2;
const PHASES = ["intact", "shaking", "gone"] as const;
export type CrumblePhase = (typeof PHASES)[number];

export interface CrumbleRun {
  ty: number;
  tx0: number;
  tx1: number;
}

export type MechEvent = { kind: "shake" | "fall" | "reform"; run: number } | { kind: "regrow"; flower: number };

export interface MechSnapshot {
  phase: number[];
  t: number[];
  flower: number[];
}

export class Mechanics {
  readonly runs: (CrumbleRun & { rect: Rect })[];
  readonly flowerRects: Rect[];
  private readonly runAt = new Map<string, number>();
  private phase: number[];
  private t: number[];
  /** seconds left closed (0 = open) */
  private flower: number[];

  constructor(runs: CrumbleRun[], flowers: { x: number; y: number }[]) {
    this.runs = runs.map((r) => ({ ...r, rect: { x: r.tx0 * TILE, y: r.ty * TILE, w: (r.tx1 - r.tx0 + 1) * TILE, h: TILE } }));
    this.runs.forEach((r, i) => {
      for (let tx = r.tx0; tx <= r.tx1; tx++) this.runAt.set(`${tx},${r.ty}`, i);
    });
    this.flowerRects = flowers.map((f) => ({ x: f.x - FLOWER_HALF, y: f.y - FLOWER_HALF, w: FLOWER_HALF * 2, h: FLOWER_HALF * 2 }));
    this.phase = this.runs.map(() => INTACT);
    this.t = this.runs.map(() => 0);
    this.flower = flowers.map(() => 0);
  }

  /** Runs of "=" in a tile grid, row by row, left to right. */
  static findRuns(tiles: string[][]): CrumbleRun[] {
    const runs: CrumbleRun[] = [];
    tiles.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx++) {
        if (row[tx] !== "=") continue;
        const tx0 = tx;
        while (tx + 1 < row.length && row[tx + 1] === "=") tx++;
        runs.push({ ty, tx0, tx1: tx });
      }
    });
    return runs;
  }

  /** Is the crumble tile at (tx, ty) solid now? Coordinates not belonging to a run (a neighbour room's) count as solid. */
  crumbleSolid(tx: number, ty: number): boolean {
    const i = this.runAt.get(`${tx},${ty}`);
    return i === undefined || this.phase[i] !== GONE;
  }

  crumbleState(tx: number, ty: number): { phase: CrumblePhase; t: number } {
    const i = this.runAt.get(`${tx},${ty}`);
    return i === undefined ? { phase: "intact", t: 0 } : { phase: PHASES[this.phase[i]], t: this.t[i] };
  }

  flowerOpen(i: number): boolean {
    return this.flower[i] <= 0;
  }

  /**
   * @param touches rects that trigger stones (strips under feet, against a slid wall)
   * @param bodies rects a stone must not reform on (Iris, echoes)
   */
  update(dt: number, touches: Rect[], bodies: Rect[]): MechEvent[] {
    const events: MechEvent[] = [];
    this.runs.forEach((r, i) => {
      if (this.phase[i] === INTACT) {
        if (!touches.some((b) => overlaps(b, r.rect))) return;
        this.phase[i] = SHAKING;
        this.t[i] = dt; // the touching frame counts
        events.push({ kind: "shake", run: i });
        return;
      }
      this.t[i] += dt;
      if (this.phase[i] === SHAKING && this.t[i] >= CRUMBLE_SHAKE) {
        this.phase[i] = GONE;
        this.t[i] -= CRUMBLE_SHAKE;
        events.push({ kind: "fall", run: i });
      } else if (this.phase[i] === GONE && this.t[i] >= CRUMBLE_GONE && !bodies.some((b) => overlaps(b, r.rect))) {
        this.phase[i] = INTACT;
        this.t[i] = 0;
        events.push({ kind: "reform", run: i });
      }
    });
    this.flower.forEach((left, i) => {
      if (left <= 0) return;
      this.flower[i] = left - dt;
      if (this.flower[i] <= 0) {
        this.flower[i] = 0;
        events.push({ kind: "regrow", flower: i });
      }
    });
    return events;
  }

  /** Iris touching an open flower with her dash spent: the flower closes. @returns its index, or -1 */
  useFlower(hitbox: Rect, canDash: boolean): number {
    if (canDash) return -1;
    const i = this.flowerRects.findIndex((f, k) => this.flower[k] <= 0 && overlaps(hitbox, f));
    if (i >= 0) this.flower[i] = FLOWER_REGROW;
    return i;
  }

  snapshot(): MechSnapshot {
    return { phase: [...this.phase], t: [...this.t], flower: [...this.flower] };
  }

  restore(s: MechSnapshot): void {
    this.phase = [...s.phase];
    this.t = [...s.t];
    this.flower = [...s.flower];
  }

  /** Rewind: back to `s`, but a stone never comes back inside a body — it waits, gone, until free. */
  restoreAfterRewind(s: MechSnapshot, bodies: Rect[]): void {
    this.restore(s);
    this.runs.forEach((r, i) => {
      if (this.phase[i] !== GONE && bodies.some((b) => overlaps(b, r.rect))) {
        this.phase[i] = GONE;
        this.t[i] = CRUMBLE_GONE;
      }
    });
  }

  reset(): void {
    this.phase.fill(INTACT);
    this.t.fill(0);
    this.flower.fill(0);
  }

  /** Compact key for the solver's dedupe. */
  key(): string {
    return this.phase.join("") + "|" + this.t.map((t) => Math.round(t * 10)).join(",") + "|" + this.flower.map((f) => (f > 0 ? Math.ceil(f * 10) : 0)).join(",");
  }
}
