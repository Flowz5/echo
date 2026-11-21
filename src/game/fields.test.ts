import { describe, expect, it } from "vitest";
import { Level } from "./level";
import { Effects } from "./particles";
import { Player, TUNING } from "./player";
import { DT, FakeInput, FLAT, step } from "./test-helpers";

function playerIn(rows: string[], opts: ConstructorParameters<typeof Level>[1] = {}) {
  const level = new Level(rows, opts);
  return { level, player: new Player(level, new Effects()), input: new FakeInput() };
}

/** a tall empty shaft: spawn near the top, ground at the bottom */
const SHAFT = ["..........", "....P.....", ...Array.from({ length: 56 }, () => ".........."), "##########"];

describe("fields", () => {
  it("no field where Iris is: a jump arc is identical", () => {
    const arc = (opts: ConstructorParameters<typeof Level>[1]) => {
      const { player, input } = playerIn(FLAT, opts);
      step(player, input, 5);
      input.press("jump");
      const ys: number[] = [];
      for (let i = 0; i < 60; i++) {
        step(player, input, 1);
        ys.push(player.y);
      }
      return ys;
    };
    const far = { x: 60 * 16, y: 0, w: 16, h: 16 };
    expect(arc({ drifts: [far], vents: [far] })).toEqual(arc({}));
  });

  it("Drift: falling settles at 0.6x the max fall speed", () => {
    const { player, input } = playerIn(SHAFT, { drifts: [{ x: 0, y: 0, w: 160, h: 58 * 16 }] });
    step(player, input, 180);
    expect(player.vy).toBeCloseTo(TUNING.maxFall * 0.6, 0);
  });

  it("Drift: entering the zone never changes speed faster than gravity would", () => {
    const { player, input } = playerIn(SHAFT, { drifts: [{ x: 0, y: 12 * 16, w: 160, h: 40 * 16 }] });
    let prev = player.vy;
    for (let i = 0; i < 150; i++) {
      step(player, input, 1);
      expect(Math.abs(player.vy - prev)).toBeLessThanOrEqual(TUNING.gravityDown * DT + 1e-6);
      prev = player.vy;
    }
  });

  it("vent: Iris rises, capped at 200 px/s; a dash ignores it", () => {
    const rows = [...Array.from({ length: 14 }, () => "...................."), "...P................", "####################"];
    const vent = { x: 2 * 16, y: 4 * 16, w: 3 * 16, h: 11 * 16 };
    const { player, input } = playerIn(rows, { vents: [vent] });
    const y0 = player.y;
    step(player, input, 30);
    expect(player.vy).toBeCloseTo(-200, 0);
    expect(player.y).toBeLessThan(y0);
    input.press("right").press("dash");
    step(player, input, 1);
    expect(player.vy).toBe(0); // a horizontal dash: no lift while dashing
  });

  it("refillDash gives the dash back, not the double jump", () => {
    const { player, input } = playerIn(FLAT);
    step(player, input, 5);
    input.press("jump");
    step(player, input, 6);
    input.release("jump");
    step(player, input, 2);
    input.press("jump");
    step(player, input, 2);
    input.press("dash");
    step(player, input, 2);
    expect(player.canDash).toBe(false);
    expect(player.canDoubleJump).toBe(false);
    player.refillDash();
    expect(player.canDash).toBe(true);
    expect(player.canDoubleJump).toBe(false);
  });

  it("Drift blends in over 0.1 s, not longer", () => {
    const { player, input } = playerIn(SHAFT, { drifts: [{ x: 0, y: 0, w: 160, h: 58 * 16 }] });
    const factor = () => (player as unknown as { gravityFactor: number }).gravityFactor;
    step(player, input, 3);
    expect(factor()).toBeLessThan(1);
    expect(factor()).toBeGreaterThan(0.45);
    step(player, input, 4); // 7 frames ≈ 0.117 s
    expect(factor()).toBe(0.45);
  });
});
