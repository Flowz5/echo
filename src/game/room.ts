import { Echo } from "./echo";
import { overlaps, type Level, type Rect } from "./level";

/** What the player collides with: the level's tiles plus the solid echoes. */
export interface Collider {
  readonly spawn: { x: number; y: number };
  readonly height: number;
  solidAt(r: Rect): boolean;
  platformBelow(x: number, w: number, bottom: number): boolean;
  hazardAt(r: Rect): boolean;
}

/** A playable room: its level, the echoes left in it, plates and doors. */
export class Room implements Collider {
  echoes: Echo[] = [];

  constructor(
    readonly level: Level,
    /** how many echoes can exist at once in this room (raised when Iris unlocks more slots) */
    public maxEchoes: number,
  ) {}

  get spawn() {
    return this.level.spawn;
  }

  get height(): number {
    return this.level.height;
  }

  solidAt(r: Rect): boolean {
    return this.level.solidAt(r) || this.echoes.some((e) => e.armed && overlaps(r, e.hitbox));
  }

  /** Echoes are solid from above too, so this only checks one-way platforms. */
  platformBelow(x: number, w: number, bottom: number): boolean {
    return this.level.platformBelow(x, w, bottom);
  }

  hazardAt(r: Rect): boolean {
    return this.level.hazardAt(r);
  }

  /** Adds an echo; returns the one that had to shatter to make room, if any. */
  addEcho(echo: Echo): Echo | null {
    this.echoes.push(echo);
    return this.echoes.length > this.maxEchoes ? (this.echoes.shift() ?? null) : null;
  }

  clearEchoes(): void {
    this.echoes = [];
  }

  /**
   * Arms echoes Iris no longer overlaps, presses plates and opens doors.
   * @returns true when the doors changed state this step
   */
  update(dt: number, player: Rect): boolean {
    for (const e of this.echoes) {
      e.update(dt);
      if (!e.armed && !overlaps(e.hitbox, player)) e.armed = true;
    }
    const bodies = [player, ...this.echoes.map((e) => e.hitbox)];
    const lv = this.level;
    lv.platesPressed = lv.plates.map((p) => bodies.some((b) => overlaps(b, p)));
    // a door never closes on someone standing in it
    const blocked = lv.doors.some((d) => bodies.some((b) => overlaps(b, d)));
    const open = lv.platesPressed.some(Boolean) || (lv.doorsOpen && blocked);
    const changed = open !== lv.doorsOpen;
    lv.doorsOpen = open;
    return changed;
  }
}
