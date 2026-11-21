import { describe, expect, it } from "vitest";
import { NPC_DIALOGUES, lingeringLine, quillFirst, quillRepeat, tamsinFirst, tamsinRepeat } from "./dialogues";

describe("chapter 0 scripts", () => {
  it("Tamsin wakes Iris and offers NOD / TILT HEAD", () => {
    const lines = tamsinFirst();
    expect(lines[0].text).toBe("UP, UP. STARS ARE OUT.");
    expect(lines[0].speaker.name).toBe("TAMSIN");
    const choice = lines.find((l) => l.choices);
    expect(choice?.choices?.map((c) => c.label)).toEqual(["NOD", "TILT HEAD"]);
    expect(lines.at(-1)?.text).toBe("AND COME BACK FOR TEA. MOSS WORRIES.");
    expect(tamsinRepeat()[0].text).toBe("EAST, CHILD. THE TOWER WON'T CLIMB ITSELF.");
  });

  it("Quill offers WILL IT COME BACK? / SHOW ME THE MAP", () => {
    const lines = quillFirst();
    expect(lines[0].speaker.name).toBe("QUILL");
    const choice = lines.find((l) => l.choices);
    expect(choice?.choices?.map((c) => c.label)).toEqual(["WILL IT COME BACK?", "SHOW ME THE MAP"]);
    const map = choice!.choices![1].reply;
    expect(map.at(-1)?.speaker.voice).toBe("system");
    expect(map.at(-1)?.text).toBe("MAP UPDATED.");
    expect(choice!.choices![1].effect).toBe("revealMap");
    expect(choice!.choices![0].effect).toBeUndefined();
    expect(quillRepeat().length).toBe(1);
  });

  it("a Lingering villager says its one line", () => {
    const lines = lingeringLine("THE APPLES WON'T FALL ANYMORE.");
    expect(lines).toHaveLength(1);
    expect(lines[0].speaker.portrait).toBeNull();
    expect(lines[0].speaker.voice).toBe("lingering");
  });
});

describe("chapter 1 scripts", () => {
  it("Quill at his perch reveals the chapter 1 map whatever Iris answers", () => {
    const quill = NPC_DIALOGUES.quill_ch1;
    const lines = quill.first();
    expect(lines[0].speaker.name).toBe("QUILL");
    const choice = lines.find((l) => l.choices);
    expect(choice?.choices?.length).toBe(2);
    for (const c of choice!.choices!) expect(c.effect).toBe("revealMap");
    expect(quill.repeat()[0].text).not.toBe(NPC_DIALOGUES.QUILL.repeat()[0].text);
  });
});
