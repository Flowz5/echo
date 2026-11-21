import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterDef } from "./chapters";

describe("chapters", () => {
  it("knows chapters by id", () => {
    expect(chapterDef("chapter1")?.title).toBe("STARFALL RUINS");
    expect(chapterDef("nope")).toBeNull();
    expect(CHAPTERS.map((c) => c.number)).toEqual([0, 1]);
  });
});
