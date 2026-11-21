import { describe, expect, it } from "vitest";
import { World } from "./world";

describe("world", () => {
  it("tags rooms with their chapter and finds them by name", () => {
    const w = new World("chapter1");
    expect(w.id).toBe("chapter1");
    expect(w.room("gorge_gate")?.chapter).toBe("chapter1");
    expect(w.room("overlook")).toBeNull();
  });

  it("parses the Overlook exit as a full-height strip", () => {
    const exit = new World("chapter0").room("overlook")!.level.exits[0];
    expect(exit).toEqual({ x: 23 * 16, y: 0, w: 16, h: 16 * 16, chapter: "chapter1", room: "gorge_gate", spawn: 0 });
  });

  it("the return exit points at the Overlook's second spawn", () => {
    const exit = new World("chapter1").room("gorge_gate")!.level.exits[0];
    expect(exit).toMatchObject({ chapter: "chapter0", room: "overlook", spawn: 1 });
    expect(new World("chapter0").room("overlook")!.level.spawns).toHaveLength(2);
  });

  it("parses crumble, flowers, vents and drift", () => {
    const r = new World("mechanics").room("mech_test")!;
    expect(r.level.ownTile(6, 10)).toBe("=");
    expect(r.level.ownTile(9, 10)).toBe("=");
    expect(r.level.mech.runs).toHaveLength(1);
    expect(r.level.flowers).toEqual([{ x: 216, y: 136 }]);
    expect(r.level.vents).toEqual([{ x: 256, y: 64, w: 16, h: 144 }]);
    expect(r.level.drifts).toEqual([{ x: 304, y: 32, w: 64, h: 176 }]);
  });
});
