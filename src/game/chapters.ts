/** The chapters of the climb (SCRIPT.md §5), in order. Each one is a Tiled world: assets/levels/<id>.world. */
import type { TrackName } from "../audio/tracks";

export interface ChapterDef {
  /** world file name, also the save's chapter id */
  id: string;
  number: number;
  /** shown on the chapter card and the map */
  title: string;
  music: TrackName;
}

export const CHAPTERS: ChapterDef[] = [
  { id: "chapter0", number: 0, title: "THE QUIET VALE", music: "vale" },
  { id: "chapter1", number: 1, title: "STARFALL RUINS", music: "ruins" },
];

export function chapterDef(id: string): ChapterDef | null {
  return CHAPTERS.find((c) => c.id === id) ?? null;
}
