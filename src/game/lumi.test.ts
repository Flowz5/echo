import { describe, expect, it } from "vitest";
import { LUMI_LINES, MomentScene } from "./lumi";

function run(s: MomentScene, seconds: number): number {
  let blips = 0;
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) if (s.update(1 / 60).blip) blips++;
  return blips;
}

describe("Lumi's moments", () => {
  it("has the five lines from the script", () => {
    expect(LUMI_LINES[1]).toBe("LOOK, PAPA! IT'S TOUCHING THE STARS!");
    expect(Object.keys(LUMI_LINES)).toHaveLength(5);
  });

  it("fades in, types the line with blips, then fades out and ends", () => {
    const s = new MomentScene(1);
    expect(s.alpha).toBe(0);
    run(s, 0.8);
    expect(s.alpha).toBeGreaterThan(0.9);
    const blips = run(s, 2);
    expect(blips).toBeGreaterThan(5);
    expect(s.shown).toBe(LUMI_LINES[1]);
    run(s, 4);
    expect(s.done).toBe(true);
    expect(s.alpha).toBe(0);
  });

  it("can be skipped, but not in the first second", () => {
    const s = new MomentScene(1);
    run(s, 0.5);
    s.skip();
    expect(s.skipping).toBe(false);
    run(s, 0.6);
    s.skip();
    run(s, 1);
    expect(s.done).toBe(true);
  });
});
