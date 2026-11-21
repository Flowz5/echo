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

import { TUNING } from "./player";
import { LEDGE, WALL } from "./test-helpers";

/** Settles on the ground, then dashes in the held direction(s). */
function groundDash(rows: string[], dirs: ("left" | "right" | "up" | "down")[]) {
  const ctx = makePlayer(rows);
  step(ctx.player, ctx.input, 5);
  for (const d of dirs) ctx.input.press(d);
  ctx.input.press("dash");
  step(ctx.player, ctx.input, 1);
  return ctx;
}

/** Frames until the current dash is over. */
function finishDash(ctx: ReturnType<typeof makePlayer>): void {
  let n = 0;
  while (ctx.player.dashing && n++ < 60) step(ctx.player, ctx.input, 1);
}

describe("dash jump", () => {
  it("ground dash then jump keeps the double jump and the speed", () => {
    const ctx = groundDash(FLAT, ["right"]);
    step(ctx.player, ctx.input, 3);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.dashing).toBe(false);
    expect(ctx.player.vy).toBeLessThan(0);
    expect(ctx.player.vx).toBeGreaterThan(TUNING.dashEndSpeed);
    expect(ctx.player.canDoubleJump).toBe(true);
  });

  it("diagonal ground dash then jump keeps the double jump", () => {
    const ctx = groundDash(FLAT, ["right", "up"]);
    step(ctx.player, ctx.input, 6);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.dashing).toBe(false);
    expect(ctx.player.canDoubleJump).toBe(true);
  });

  it("jump right after a ground dash ends still counts", () => {
    const ctx = groundDash(FLAT, ["right", "up"]);
    finishDash(ctx);
    step(ctx.player, ctx.input, 3);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.vy).toBeLessThan(0);
    expect(ctx.player.canDoubleJump).toBe(true);
  });

  it("too late after the dash is a double jump", () => {
    const ctx = groundDash(FLAT, ["right", "up"]);
    finishDash(ctx);
    step(ctx.player, ctx.input, 15);
    expect(ctx.player.grounded).toBe(false);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.canDoubleJump).toBe(false);
  });

  it("air dash then jump uses the double jump but keeps the speed", () => {
    const { player, input } = makePlayer(FLAT);
    step(player, input, 5);
    input.press("jump");
    step(player, input, 8);
    input.release("jump").press("right").press("dash");
    step(player, input, 3);
    input.press("jump");
    step(player, input, 1);
    expect(player.dashing).toBe(false);
    expect(player.vy).toBeLessThan(0);
    expect(player.vx).toBeGreaterThan(TUNING.dashEndSpeed);
    expect(player.canDoubleJump).toBe(false);
  });

  it("straight up ground dash is not a dash jump", () => {
    const ctx = groundDash(FLAT, ["up"]);
    step(ctx.player, ctx.input, 6);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.canDoubleJump).toBe(false);
  });

  it("dash and jump pressed on the same frame is a ground dash jump", () => {
    const { player, input } = makePlayer(FLAT);
    step(player, input, 5);
    input.press("right").press("dash").press("jump");
    step(player, input, 1);
    expect(player.dashing).toBe(false);
    expect(player.vy).toBeLessThan(0);
    expect(player.vx).toBeGreaterThan(TUNING.runSpeed);
    expect(player.canDoubleJump).toBe(true);
  });

  it("ground dash off a ledge, jump after the dash, still a dash jump", () => {
    const ctx = groundDash(LEDGE, ["right"]);
    finishDash(ctx);
    expect(ctx.player.grounded).toBe(false);
    step(ctx.player, ctx.input, 2);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.vy).toBeLessThan(0);
    expect(ctx.player.canDoubleJump).toBe(true);
  });

  it("dash jump rising past a wall keeps the double jump", () => {
    const ctx = groundDash(WALL, ["right", "up"]);
    step(ctx.player, ctx.input, 6);
    ctx.input.press("jump");
    step(ctx.player, ctx.input, 1);
    expect(ctx.player.dashing).toBe(false);
    expect(ctx.player.vy).toBeLessThan(0);
    expect(ctx.player.canDoubleJump).toBe(true);
  });

  it("air dash into a wall then jump is a wall jump", () => {
    const { player, input } = makePlayer(WALL);
    step(player, input, 5);
    input.press("jump");
    step(player, input, 6);
    input.release("jump").press("right").press("dash");
    step(player, input, 9); // pressed against the wall, still dashing
    expect(player.dashing).toBe(true);
    input.press("jump");
    step(player, input, 1);
    expect(player.dashing).toBe(false);
    expect(player.vx).toBeLessThan(0);
    expect(player.canDoubleJump).toBe(true);
  });

  it("a rewind mid-dash clears the dash jump", () => {
    const { player, input } = makePlayer(FLAT);
    step(player, input, 5);
    input.press("jump");
    step(player, input, 10);
    const inAir = player.snapshot();
    input.release("jump");
    step(player, input, 60);
    input.press("right").press("up").press("dash");
    step(player, input, 3);
    player.restore(inAir);
    input.press("jump");
    step(player, input, 1);
    expect(player.canDoubleJump).toBe(false);
  });
});

describe("closing a dialogue", () => {
  it("cancelJumpBuffer drops a jump pressed just before", () => {
    const { player, input } = makePlayer(FLAT);
    step(player, input, 5);
    input.press("jump");
    input.endFrame(); // the press was eaten by the dialogue, but the player saw the buffer…
    (player as unknown as { buffer: number }).buffer = 0.12;
    player.cancelJumpBuffer();
    step(player, input, 1);
    expect(player.vy).toBeGreaterThanOrEqual(0);
  });
});
