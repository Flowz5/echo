import { describe, expect, it } from "vitest";
import { Progress } from "./progress";

describe("progress save/restore", () => {
  it("exports secured collectibles and restores them", () => {
    const a = new Progress();
    a.reset(["doubleJump"], 0);
    a.unlock("dash");
    a.secure("orchard:12", "page");
    a.pending.push({ key: "bridge:3", kind: "note" });
    expect(a.securedEntries()).toEqual([["orchard:12", "page"]]);

    const b = new Progress();
    b.restore(["doubleJump", "dash"], 1, a.securedEntries());
    expect(b.has("dash")).toBe(true);
    expect(b.echoSlots).toBe(1);
    expect(b.count("page")).toBe(1);
    expect(b.taken("orchard:12")).toBe(true);
    expect(b.taken("bridge:3")).toBe(false);
    expect(b.pending).toEqual([]);
  });
});
