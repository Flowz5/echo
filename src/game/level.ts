import { TILE } from "../config";
import type { Draw } from "../engine/draw";

/**
 * Tile legend:
 *   #  solid ground
 *   -  one-way platform (solid from above only)
 *   ^  spikes
 *   b  pressure plate (held down by Iris or an echo standing on it)
 *   D  door (solid while closed; stack two for a 2-tile door). Doors open while any plate is held
 *   P  player spawn
 *   .  empty
 * Outside the room, left/right/top count as walls; below the bottom is the void.
 */
export type Tile = "#" | "-" | "^" | "b" | "D" | ".";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
  readonly spawn: { x: number; y: number };
  /** Trigger zones of the pressure plates (the lower part of their tile). */
  readonly plates: Rect[] = [];
  /** Door tiles, as rects. */
  readonly doors: Rect[] = [];
  doorsOpen = false;
  platesPressed: boolean[] = [];
  private readonly tiles: Tile[][];

  constructor(map: string[]) {
    this.rows = map.length;
    this.cols = map[0].length;
    this.width = this.cols * TILE;
    this.height = this.rows * TILE;
    let spawn = { x: TILE, y: TILE };
    this.tiles = map.map((row, ty) => {
      if (row.length !== this.cols) throw new Error(`Level row ${ty} is ${row.length} wide, expected ${this.cols}`);
      return [...row].map((ch, tx) => {
        if (ch === "P") {
          spawn = { x: tx * TILE, y: ty * TILE };
          return ".";
        }
        if (ch === "b") this.plates.push({ x: tx * TILE + 1, y: ty * TILE + 10, w: TILE - 2, h: 6 });
        if (ch === "D") this.doors.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE });
        return ch as Tile;
      });
    });
    this.platesPressed = this.plates.map(() => false);
    this.spawn = spawn;
  }

  tile(tx: number, ty: number): Tile {
    if (ty >= this.rows) return ".";
    if (tx < 0 || tx >= this.cols || ty < 0) return "#";
    return this.tiles[ty][tx];
  }

  private overlapping(r: Rect, fn: (t: Tile, tx: number, ty: number) => boolean): boolean {
    const x0 = Math.floor(r.x / TILE);
    const x1 = Math.floor((r.x + r.w - 1) / TILE);
    const y0 = Math.floor(r.y / TILE);
    const y1 = Math.floor((r.y + r.h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(this.tile(tx, ty), tx, ty)) return true;
    return false;
  }

  solidAt(r: Rect): boolean {
    return this.overlapping(r, (t) => t === "#" || (t === "D" && !this.doorsOpen));
  }

  /** True if a rect whose bottom edge is at `bottom` stands exactly on a one-way platform. */
  platformBelow(x: number, w: number, bottom: number): boolean {
    if (bottom % TILE !== 0) return false;
    const ty = bottom / TILE;
    for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 1) / TILE); tx++) if (this.tile(tx, ty) === "-") return true;
    return false;
  }

  /** Spikes only hurt in their lower 9 px (the visible points). */
  hazardAt(r: Rect): boolean {
    return this.overlapping(r, (t, tx, ty) => {
      if (t !== "^") return false;
      const sx = tx * TILE + 2;
      const sy = ty * TILE + 7;
      return r.x < sx + TILE - 4 && r.x + r.w > sx && r.y < sy + TILE - 7 && r.y + r.h > sy;
    });
  }

  /** Autotile index: bit set = that side touches air (top 1, right 2, bottom 4, left 8). */
  private mask(tx: number, ty: number): number {
    const air = (x: number, y: number) => y >= 0 && y < this.rows && x >= 0 && x < this.cols && this.tiles[y][x] !== "#";
    return (air(tx, ty - 1) ? 1 : 0) | (air(tx + 1, ty) ? 2 : 0) | (air(tx, ty + 1) ? 4 : 0) | (air(tx - 1, ty) ? 8 : 0);
  }

  render(draw: Draw, camX: number, camY: number, viewW: number, viewH: number): void {
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const x1 = Math.min(this.cols - 1, Math.floor((camX + viewW) / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const y1 = Math.min(this.rows - 1, Math.floor((camY + viewH) / TILE));
    let plate = 0;
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const t = this.tiles[ty][tx];
        if (t === "b") plate++;
        if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        if (t === "#") draw.frame(draw.img.tiles, this.mask(tx, ty), sx, sy);
        else if (t === "^") draw.frame(draw.img.props, 0, sx, sy);
        else if (t === "-") draw.frame(draw.img.props, 5, sx, sy);
        else if (t === "b") draw.frame(draw.img.props, this.platesPressed[plate - 1] ? 2 : 1, sx, sy);
        else if (t === "D" && this.tile(tx, ty - 1) !== "D") draw.frame(draw.img.door, this.doorsOpen ? 1 : 0, sx, sy, { fh: 32 });
      }
    }
  }
}
