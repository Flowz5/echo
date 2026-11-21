import { describe, expect, it } from "vitest";
import { parseAbilities } from "./progress";

describe("abilities", () => {
  it("knows the light (Shard of Light, chapter 1)", () => {
    expect(parseAbilities("dash, light")).toEqual(["dash", "light"]);
  });
});
