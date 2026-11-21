/**
 * A conversation with an NPC: lines typed out one character at a time
 * (Undertale-style), with voice blips, punctuation pauses and choices.
 * Pure logic: the game scene feeds it time and inputs and draws it.
 */

export type Voice = "tamsin" | "quill" | "system" | "lingering";

export interface Speaker {
  name: string;
  color: string;
  voice: Voice;
  /** frame in the portraits sheet, or null for no portrait */
  portrait: number | null;
}

export interface Choice {
  label: string;
  /** lines played right after this choice */
  reply: Line[];
}

export interface Line {
  speaker: Speaker;
  text: string;
  choices?: Choice[];
}

export const CHARS_PER_SECOND = 40;
const COMMA_PAUSE = 0.12;
const STOP_PAUSE = 0.3;

const isLetter = (ch: string) => /[A-Z0-9]/i.test(ch);

export class Conversation {
  /** highlighted choice on a choice line */
  choice = 0;
  private readonly lines: Line[];
  private index = 0;
  private typed = 0;
  private timer = 0;
  private letters = 0;
  private ended = false;

  constructor(lines: Line[]) {
    this.lines = [...lines];
  }

  get done(): boolean {
    return this.ended;
  }

  get line(): Line {
    return this.lines[this.index];
  }

  get shown(): string {
    return this.line.text.slice(0, this.typed);
  }

  get lineComplete(): boolean {
    return this.typed >= this.line.text.length;
  }

  /** Types characters for `dt` seconds; `blip` is true when a voice blip should play. */
  update(dt: number): { blip: boolean } {
    if (this.ended || this.lineComplete) return { blip: false };
    let blip = false;
    this.timer += dt;
    const text = this.line.text;
    while (this.timer >= 1 / CHARS_PER_SECOND && this.typed < text.length) {
      this.timer -= 1 / CHARS_PER_SECOND;
      const ch = text[this.typed++];
      if (isLetter(ch) && this.letters++ % 2 === 0) blip = true;
      const nextCh = text[this.typed];
      if (ch === "." && nextCh === ".") continue; // inside "...": only the last dot waits
      if (ch === ",") this.timer -= COMMA_PAUSE;
      else if (".!?".includes(ch)) this.timer -= STOP_PAUSE;
    }
    return { blip };
  }

  /** Finishes the line; if it is finished, picks the choice or goes to the next line. */
  confirm(): void {
    if (this.ended) return;
    if (!this.lineComplete) {
      this.typed = this.line.text.length;
      return;
    }
    const picked = this.line.choices?.[this.choice];
    if (picked) this.lines.splice(this.index + 1, 0, ...picked.reply);
    this.next();
  }

  move(dir: -1 | 1): void {
    const n = this.line.choices?.length ?? 0;
    if (n > 0 && this.lineComplete) this.choice = (this.choice + dir + n) % n;
  }

  skip(): void {
    this.ended = true;
  }

  private next(): void {
    if (this.index + 1 >= this.lines.length) {
      this.ended = true;
      return;
    }
    this.index++;
    this.typed = 0;
    this.timer = 0;
    this.letters = 0;
    this.choice = 0;
  }
}
