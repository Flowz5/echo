import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, rebind } from "./settings";

function fakeStorage(data: Record<string, string>) {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("interact key", () => {
  it("defaults to E", () => {
    expect(DEFAULT_SETTINGS.bindings.interact).toBe("KeyE");
  });

  it("old saved settings without it get E", () => {
    fakeStorage({ "echo.settings.v1": JSON.stringify({ bindings: { jump: "KeyK" } }) });
    const s = loadSettings();
    expect(s.bindings.interact).toBe("KeyE");
    expect(s.bindings.jump).toBe("KeyK");
  });

  it("rebinding it onto another action's key swaps them", () => {
    const s = structuredClone(DEFAULT_SETTINGS);
    rebind(s, "interact", "KeyR");
    expect(s.bindings.interact).toBe("KeyR");
    expect(s.bindings.rewind).toBe("KeyE");
  });
});
