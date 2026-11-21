/** Headless helpers to drive the player in tests (no canvas, no DOM). */
import type { Action, Input } from "../engine/input";
import { Level } from "./level";
import { Effects } from "./particles";
import { Player } from "./player";

export const DT = 1 / 60;

/** Keyboard stand-in: hold/release actions; a press lasts one frame as `justPressed`. */
export class FakeInput {
  private held = new Set<Action>();
  private pressed = new Set<Action>();

  press(a: Action): this {
    if (!this.held.has(a)) this.pressed.add(a);
    this.held.add(a);
    return this;
  }
  release(a: Action): this {
    this.held.delete(a);
    return this;
  }
  isDown(a: Action): boolean {
    return this.held.has(a);
  }
  justPressed(a: Action): boolean {
    return this.pressed.has(a);
  }
  endFrame(): void {
    this.pressed.clear();
  }
  get asInput(): Input {
    return this as unknown as Input;
  }
}

/** A player standing on the `P` of an ASCII room (`#` solid, `-` platform, `^` spikes). */
export function makePlayer(rows: string[]): { player: Player; input: FakeInput; level: Level } {
  const level = new Level(rows);
  const player = new Player(level, new Effects());
  return { player, input: new FakeInput(), level };
}

export function step(player: Player, input: FakeInput, frames = 1): void {
  for (let i = 0; i < frames; i++) {
    player.update(DT, input.asInput);
    input.endFrame();
  }
}

/** A wide flat room, 12 rows high, ground on the last two rows, spawn on the left. */
export const FLAT = [
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "...P............................................................",
  "################################################################",
  "################################################################",
];
