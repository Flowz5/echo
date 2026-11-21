import { describe, expect, it } from "vitest";
import { cellState, mapBounds, travelTargets, type ShrineSpot } from "./map";

describe("map", () => {
  it("a room is visited, revealed (outline) or hidden", () => {
    const visited = new Set(["lanternrest"]);
    expect(cellState("lanternrest", visited, false)).toBe("visited");
    expect(cellState("old_road", visited, true)).toBe("revealed");
    expect(cellState("old_road", visited, false)).toBe("hidden");
  });

  it("bounds cover every room", () => {
    expect(mapBounds([{ name: "a", x: 0, y: 0, w: 40, h: 16 }, { name: "b", x: 40, y: -16, w: 10, h: 32 }])).toEqual({ x: 0, y: -16, w: 50, h: 32 });
  });

  it("travel targets: lit shrines other than this one, left to right", () => {
    const shrines: ShrineSpot[] = [
      { room: "vale_shrine", index: 0, x: 7000, y: 200 },
      { room: "lanternrest", index: 0, x: 150, y: 200 },
      { room: "overlook", index: 0, x: 11500, y: 50 },
    ];
    const lit = new Set(["lanternrest:0", "vale_shrine:0"]);
    expect(travelTargets(shrines, lit, "vale_shrine:0").map((s) => s.room)).toEqual(["lanternrest"]);
    expect(travelTargets(shrines, lit, null).map((s) => s.room)).toEqual(["lanternrest", "vale_shrine"]);
    expect(travelTargets(shrines, new Set(["lanternrest:0"]), "lanternrest:0")).toEqual([]);
  });
});
