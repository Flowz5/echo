/** The chapters of the climb (SCRIPT.md §5), in order. Each one is a Tiled world: assets/levels/<id>.world. */
import type { TrackName } from "../audio/tracks";

export interface ChapterDef {
  /** world file name, also the save's chapter id */
  id: string;
  number: number;
  /** shown on the chapter card and the map */
  title: string;
  music: TrackName;
  /** how the chapter looks: ground tiles, far background, procedural dressing */
  look: Look;
}

/** vale: grass and hills (chapter 0); ruins: cut stone and moss, the ruined town across the gorge (chapter 1) */
export type Look = "vale" | "ruins";

export const CHAPTERS: ChapterDef[] = [
  { id: "chapter0", number: 0, title: "THE QUIET VALE", music: "vale", look: "vale" },
  { id: "chapter1", number: 1, title: "STARFALL RUINS", music: "ruins", look: "ruins" },
];

export function chapterDef(id: string): ChapterDef | null {
  return CHAPTERS.find((c) => c.id === id) ?? null;
}
