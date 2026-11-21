import { describe, expect, it } from "vitest";
import { Echo } from "./echo";
import { Level } from "./level";
import { Room, touchStrips } from "./room";

const ROOM = ["..........", "..........", "...====...", "..........", "##########"];
const far = { x: 0, y: 3 * 16, w: 8, h: 12 }; // Iris somewhere harmless

function echoAt(x: number, y: number): Echo {
  const e = new Echo({ x, y, w: 8, h: 12 }, 0, 1, x - 4, y - 4);
  e.armed = true;
  return e;
}

describe("room mechanics", () => {
  it("touch strips: under the feet, and against a slid wall", () => {
    const body = { x: 10, y: 20, w: 8, h: 12 };
    expect(touchStrips(body, 0)).toEqual([{ x: 10, y: 32, w: 8, h: 1 }]);
    expect(touchStrips(body, 1)).toEqual([{ x: 10, y: 32, w: 8, h: 1 }, { x: 18, y: 20, w: 1, h: 12 }]);
    expect(touchStrips(body, -1)[1]).toEqual({ x: 9, y: 20, w: 1, h: 12 });
  });

  it("an echo standing on a slab makes it shake", () => {
    const room = new Room(new Level(ROOM), 3);
    room.echoes.push(echoAt(4 * 16 + 4, 2 * 16 - 12));
    const r = room.update(1 / 60, far);
    expect(room.level.mech.crumbleState(4, 2).phase).toBe("shaking");
    expect(r.events.some((e) => e.kind === "shake")).toBe(true);
  });

  it("Iris sliding down a crumble wall triggers it", () => {
    const room = new Room(new Level(["..........", "....=.....", "..........", "##########"]), 3);
    const iris = { x: 4 * 16 - 8, y: 16, w: 8, h: 12 };
    room.update(1 / 60, iris, 1);
    expect(room.level.mech.crumbleState(4, 1).phase).toBe("shaking");
  });

  it("an echo inside a fallen slab keeps it from reforming", () => {
    const room = new Room(new Level(ROOM), 3);
    room.level.mech.update(1 / 60, [{ x: 4 * 16, y: 2 * 16, w: 8, h: 1 }], []);
    room.level.mech.update(0.41, [], []);
    room.echoes.push(echoAt(4 * 16 + 4, 2 * 16 + 2));
    room.update(5, far);
    expect(room.level.mech.crumbleSolid(4, 2)).toBe(false);
  });
});
