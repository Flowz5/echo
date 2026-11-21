/**
 * Lumi's Moments (SCRIPT.md §6.8): silent memory scenes. Lumi appears as an echo,
 * says one line, and fades away. Pure timing logic; the game scene draws it.
 */

export const LUMI_LINES: Record<number, string> = {
  1: "LOOK, PAPA! IT'S TOUCHING THE STARS!",
  2: "HAVE YOU SEEN MY PAPA? HE RINGS THE BELL.",
  3: "...NINE, TEN! READY OR NOT!",
  4: "IS THE MORNING GOING TO BE BRIGHT?",
  5: "PAPA, I'M NOT SCARED. YOU CAN RING IT.",
};

export const MOMENT_COUNT = 5;

const FADE_IN = 0.7;
const PAUSE_BEFORE = 0.3; // she appears, then speaks
const CHARS_PER_SECOND = 24; // slower than dialogues: a memory
const HOLD = 1.6; // the line stays a moment once typed
const FADE_OUT = 0.9;
const SKIPPABLE_AFTER = 1;

export class MomentScene {
  private t = 0;
  private typed = 0;
  private typeTimer = 0;
  private letters = 0;
  private fadeOutAt: number | null = null;
  readonly line: string;

  constructor(readonly index: number) {
    this.line = LUMI_LINES[index] ?? "...";
  }

  get shown(): string {
    return this.line.slice(0, this.typed);
  }

  get skipping(): boolean {
    return this.fadeOutAt !== null && this.typed < this.line.length;
  }

  get done(): boolean {
    return this.fadeOutAt !== null && this.t >= this.fadeOutAt + FADE_OUT;
  }

  /** How visible Lumi is (0..1). */
  get alpha(): number {
    if (this.fadeOutAt !== null) return Math.max(0, 1 - (this.t - this.fadeOutAt) / FADE_OUT);
    return Math.min(1, this.t / FADE_IN);
  }

  update(dt: number): { blip: boolean } {
    this.t += dt;
    let blip = false;
    if (this.fadeOutAt === null && this.t >= FADE_IN + PAUSE_BEFORE) {
      this.typeTimer += dt;
      while (this.typeTimer >= 1 / CHARS_PER_SECOND && this.typed < this.line.length) {
        this.typeTimer -= 1 / CHARS_PER_SECOND;
        const ch = this.line[this.typed++];
        if (/[A-Z0-9]/.test(ch) && this.letters++ % 2 === 0) blip = true;
      }
      if (this.typed >= this.line.length) {
        const typedAt = FADE_IN + PAUSE_BEFORE + this.line.length / CHARS_PER_SECOND;
        if (this.t >= typedAt + HOLD) this.fadeOutAt = this.t;
      }
    }
    return { blip };
  }

  /** Jump/interact: fade out now (only after the first second). */
  skip(): void {
    if (this.t < SKIPPABLE_AFTER || this.fadeOutAt !== null) return;
    this.fadeOutAt = this.t;
  }
}
