import { describe, expect, it } from "vitest";
import { SaveStore, formatPlayTime, slotSummary, type SaveData } from "./save";

function memory() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}

const sample = (room = "the_rise"): SaveData => ({
  version: 2,
  chapter: "chapter0",
  room,
  point: { x: 40, y: 208 },
  abilities: ["doubleJump", "wallJump", "dash"],
  echoSlots: 0,
  secured: [["orchard:12", "page"]],
  lit: ["the_rise:0"],
  lastCheckpoint: { the_rise: { x: 40, y: 208 } },
  talked: ["lanternrest:3"],
  visited: ["lanternrest", "the_rise"],
  playTime: 125,
  savedAt: 1,
});

describe("save store", () => {
  it("writes and loads a slot", () => {
    const s = new SaveStore(memory());
    s.write(2, sample());
    expect(s.load(2)).toEqual(sample());
    expect(s.load(1)).toBeNull();
  });

  it("loads a v1 save as chapter 0", () => {
    const m = memory();
    const { chapter: _chapter, ...v1 } = sample();
    m.data["echo.save.v1.slot1"] = JSON.stringify({ ...v1, version: 1 });
    expect(new SaveStore(m).load(1)).toEqual({ ...sample(), version: 2, chapter: "chapter0" });
  });

  it("treats broken or unknown-version saves as empty", () => {
    const m = memory();
    m.data["echo.save.v1.slot1"] = "{not json";
    m.data["echo.save.v1.slot2"] = JSON.stringify({ ...sample(), version: 3 });
    const s = new SaveStore(m);
    expect(s.load(1)).toBeNull();
    expect(s.load(2)).toBeNull();
  });

  it("keeps an unknown chapter as written (the scene falls back)", () => {
    const s = new SaveStore(memory());
    s.write(1, { ...sample(), chapter: "chapter9" });
    expect(s.load(1)?.chapter).toBe("chapter9");
  });

  it("remembers the last slot written, forgets it when erased", () => {
    const s = new SaveStore(memory());
    expect(s.lastSlot).toBeNull();
    s.write(3, sample());
    expect(s.lastSlot).toBe(3);
    s.write(1, sample());
    s.erase(3);
    expect(s.lastSlot).toBe(1);
    s.erase(1);
    expect(s.lastSlot).toBeNull();
    expect(s.load(1)).toBeNull();
  });

  it("survives a storage that throws (private mode)", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    const s = new SaveStore({ getItem: boom, setItem: boom, removeItem: boom });
    expect(() => s.write(1, sample())).not.toThrow();
    expect(s.load(1)).toBeNull();
    expect(s.lastSlot).toBeNull();
    expect(new SaveStore(null).load(1)).toBeNull();
  });

  it("summarises a slot for the menu", () => {
    const s = new SaveStore(memory());
    s.write(1, { ...sample(), roomTitle: "The Rise", secured: [["a", "page"], ["b", "page"], ["c", "shard"]], playTime: 2520 });
    expect(slotSummary(s.load(1))).toEqual({ room: "THE RISE", time: "0:42", shards: 1, pages: 2 });
    expect(slotSummary(null)).toBeNull();
    expect(slotSummary(s.load(1) && { ...s.load(1)!, roomTitle: undefined })?.room).toBe("THE RISE");
  });

  it("formats play time as H:MM", () => {
    expect(formatPlayTime(2520)).toBe("0:42");
    expect(formatPlayTime(3725)).toBe("1:02");
  });
});
