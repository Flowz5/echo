import { describe, expect, it } from "vitest";
import { FLAT, makePlayer, step } from "./test-helpers";

describe("player basics", () => {
  it("jump from the ground rises and lands", () => {
    const { player, input } = makePlayer(FLAT);
    step(player, input, 5);
    expect(player.grounded).toBe(true);
    input.press("jump");
    step(player, input, 2);
    expect(player.vy).toBeLessThan(0);
    input.release("jump");
    step(player, input, 60);
    expect(player.grounded).toBe(true);
  });
});
