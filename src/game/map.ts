/** Map logic (SCRIPT.md §4.9): which rooms show, the area they cover, fast-travel targets. */

/** A room on the map, in world tiles. */
export interface MapRoom {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** visited = drawn in full; revealed = outline only (Quill); hidden = not drawn. */
export type CellState = "visited" | "revealed" | "hidden";

export function cellState(name: string, visited: Set<string>, revealed: boolean): CellState {
  if (visited.has(name)) return "visited";
  return revealed ? "revealed" : "hidden";
}

export function mapBounds(rooms: MapRoom[]): { x: number; y: number; w: number; h: number } {
  const x0 = Math.min(...rooms.map((r) => r.x));
  const y0 = Math.min(...rooms.map((r) => r.y));
  const x1 = Math.max(...rooms.map((r) => r.x + r.w));
  const y1 = Math.max(...rooms.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A Bell Shrine: its room, its index among the room's checkpoints, its world position (px, feet). */
export interface ShrineSpot {
  room: string;
  index: number;
  x: number;
  y: number;
}

export const shrineKey = (s: { room: string; index: number }) => `${s.room}:${s.index}`;

/** Where Iris can travel to: lit shrines other than the one she stands at, left to right. */
export function travelTargets(shrines: ShrineSpot[], lit: Set<string>, here: string | null): ShrineSpot[] {
  return shrines.filter((s) => lit.has(shrineKey(s)) && shrineKey(s) !== here).sort((a, b) => a.x - b.x);
}
