import { describe, expect, it } from "vitest";
import { Level } from "./level";

const ROOM = ["..........", "..........", "...====...", "..........", "##########"];
/** 1-px strip just under the feet of a body standing on row 2, centred on column tx */
const on = (tx: number) => ({ x: tx * 16 + 4, y: 2 * 16, w: 8, h: 1 });

describe("crumble stone", () => {
  it("a touched run shakes 0.4 s (still solid), then is gone 2 s, then reforms", () => {
    const lv = new Level(ROOM);
    lv.mech.update(1 / 60, [on(4)], []);
    expect(lv.mech.crumbleState(6, 2).phase).toBe("shaking"); // the whole run
    lv.mech.update(0.37, [], []);
    expect(lv.mech.crumbleSolid(3, 2)).toBe(true);
    lv.mech.update(0.03, [], []);
    expect(lv.mech.crumbleSolid(3, 2)).toBe(false);
    lv.mech.update(1.97, [], []);
    expect(lv.mech.crumbleSolid(3, 2)).toBe(false);
    lv.mech.update(0.05, [], []);
    expect(lv.mech.crumbleSolid(3, 2)).toBe(true);
  });

  it("does not reform on a body", () => {
    const lv = new Level(ROOM);
    lv.mech.update(1 / 60, [on(4)], []);
    lv.mech.update(0.41, [], []);
    const inside = { x: 4 * 16 + 4, y: 2 * 16 + 2, w: 8, h: 12 };
    lv.mech.update(3, [], [inside]);
    expect(lv.mech.crumbleSolid(4, 2)).toBe(false);
    lv.mech.update(0.01, [], []);
    expect(lv.mech.crumbleSolid(4, 2)).toBe(true);
  });

  it("separate runs break separately", () => {
    const lv = new Level(["..==.==...", "##########"]);
    lv.mech.update(1 / 60, [{ x: 2 * 16 + 4, y: 0, w: 8, h: 1 }], []);
    expect(lv.mech.crumbleState(2, 0).phase).toBe("shaking");
    expect(lv.mech.crumbleState(5, 0).phase).toBe("intact");
  });

  it("solidAt follows the crumble state", () => {
    const lv = new Level(ROOM);
    const box = { x: 3 * 16, y: 2 * 16, w: 8, h: 8 };
    expect(lv.solidAt(box)).toBe(true);
    lv.mech.update(1 / 60, [on(4)], []);
    lv.mech.update(0.41, [], []);
    expect(lv.solidAt(box)).toBe(false);
  });
});

describe("dash flower", () => {
  it("refills only a spent dash, then regrows after 2.5 s", () => {
    const lv = new Level(["..........", "##########"], { flowers: [{ x: 40, y: 8 }] });
    const hb = { x: 36, y: 4, w: 8, h: 12 };
    expect(lv.mech.useFlower(hb, true)).toBe(-1);
    expect(lv.mech.flowerOpen(0)).toBe(true);
    expect(lv.mech.useFlower(hb, false)).toBe(0);
    expect(lv.mech.useFlower(hb, false)).toBe(-1);
    lv.mech.update(2.49, [], []);
    expect(lv.mech.flowerOpen(0)).toBe(false);
    lv.mech.update(0.02, [], []);
    expect(lv.mech.flowerOpen(0)).toBe(true);
  });
});

describe("mechanics snapshot", () => {
  it("restore round-trips; restoreAfterRewind keeps stones off bodies", () => {
    const lv = new Level(ROOM, { flowers: [{ x: 8, y: 8 }] });
    const before = lv.mech.snapshot();
    lv.mech.update(1 / 60, [on(4)], []);
    lv.mech.useFlower({ x: 4, y: 2, w: 8, h: 12 }, false);
    lv.mech.update(0.5, [], []);
    lv.mech.restore(before);
    expect(lv.mech.crumbleState(4, 2).phase).toBe("intact");
    expect(lv.mech.flowerOpen(0)).toBe(true);
    lv.mech.update(1 / 60, [on(4)], []);
    lv.mech.update(0.5, [], []);
    const echoInGap = { x: 4 * 16 + 4, y: 2 * 16 + 2, w: 8, h: 12 };
    lv.mech.restoreAfterRewind(before, [echoInGap]);
    expect(lv.mech.crumbleSolid(4, 2)).toBe(false); // waits: the echo is in the way
    lv.mech.update(5, [], [echoInGap]);
    expect(lv.mech.crumbleSolid(4, 2)).toBe(false);
    lv.mech.update(0.01, [], []);
    expect(lv.mech.crumbleSolid(4, 2)).toBe(true);
  });

  it("reset puts everything back", () => {
    const lv = new Level(ROOM);
    lv.mech.update(1 / 60, [on(4)], []);
    lv.mech.update(0.5, [], []);
    lv.mech.reset();
    expect(lv.mech.crumbleState(4, 2).phase).toBe("intact");
  });
});
