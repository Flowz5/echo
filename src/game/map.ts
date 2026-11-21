/** Map logic (SCRIPT.md §4.9): which rooms show, the area they cover, fast-travel targets. */
import { CHAPTERS } from "./chapters";

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

/** A Bell Shrine: its chapter and room, its index among the room's checkpoints, its world position (px, feet). */
export interface ShrineSpot {
  chapter: string;
  room: string;
  index: number;
  x: number;
  y: number;
}

export const shrineKey = (s: { room: string; index: number }) => `${s.room}:${s.index}`;

const chapterOrder = (id: string) => {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i < 0 ? CHAPTERS.length : i;
};

/** Where Iris can travel to: lit shrines other than the one she stands at, by chapter then left to right. */
export function travelTargets(shrines: ShrineSpot[], lit: Set<string>, here: string | null): ShrineSpot[] {
  return shrines
    .filter((s) => lit.has(shrineKey(s)) && shrineKey(s) !== here)
    .sort((a, b) => chapterOrder(a.chapter) - chapterOrder(b.chapter) || a.x - b.x);
}

/** The travel targets in one chapter (order kept). */
export function chapterTargets(targets: ShrineSpot[], chapter: string): ShrineSpot[] {
  return targets.filter((t) => t.chapter === chapter);
}

/** Chapters with at least one visited room, in chapter order (what the map lets you browse). */
export function visitedChapters(visited: Set<string>, roomChapter: (room: string) => string | null): string[] {
  const seen = new Set<string>();
  for (const room of visited) {
    const c = roomChapter(room);
    if (c) seen.add(c);
  }
  return [...seen].sort((a, b) => chapterOrder(a) - chapterOrder(b));
}
