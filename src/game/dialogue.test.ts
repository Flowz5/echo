import { describe, expect, it } from "vitest";
import { CHARS_PER_SECOND, Conversation, type Line, type Speaker } from "./dialogue";

const A: Speaker = { name: "A", color: "#fff", voice: "tamsin", portrait: 0 };
const say = (text: string): Line => ({ speaker: A, text });

/** Advances in small steps, returning how many blips fired. */
function run(c: Conversation, seconds: number): number {
  let blips = 0;
  for (let t = 0; t < seconds - 1e-9; t += 1 / 240) if (c.update(1 / 240).blip) blips++;
  return blips;
}

describe("conversation", () => {
  it("shows nothing until it is updated", () => {
    const c = new Conversation([say("HELLO")]);
    expect(c.shown).toBe("");
    expect(c.lineComplete).toBe(false);
  });

  it("types at 40 characters per second", () => {
    const c = new Conversation([say("ABCDEFGHIJKLMNOPQRSTUVWXYZ")]);
    run(c, 10 / CHARS_PER_SECOND);
    expect(c.shown.length).toBeGreaterThanOrEqual(9);
    expect(c.shown.length).toBeLessThanOrEqual(11);
  });

  it("pauses after a comma and longer after a full stop", () => {
    const comma = new Conversation([say("A, BCDEFGHIJ")]);
    const stop = new Conversation([say("A. BCDEFGHIJ")]);
    run(comma, 0.2);
    run(stop, 0.2);
    expect(stop.shown.length).toBeLessThan(comma.shown.length);
    const plain = new Conversation([say("A BCDEFGHIJK")]);
    run(plain, 0.2);
    expect(comma.shown.length).toBeLessThan(plain.shown.length);
  });

  it("blips every second letter and never on spaces", () => {
    expect(run(new Conversation([say("ABCDEF")]), 1)).toBe(3);
    expect(run(new Conversation([say("A B C D")]), 1)).toBe(2);
  });

  it("confirm finishes the line, then goes to the next one", () => {
    const c = new Conversation([say("FIRST LINE"), say("SECOND")]);
    run(c, 0.05);
    c.confirm();
    expect(c.shown).toBe("FIRST LINE");
    expect(c.lineComplete).toBe(true);
    c.confirm();
    expect(c.line.text).toBe("SECOND");
    expect(c.shown).toBe("");
    run(c, 1);
    c.confirm();
    expect(c.done).toBe(true);
  });

  it("choices: move wraps and confirm plays the chosen reply", () => {
    const c = new Conversation([
      { speaker: A, text: "WELL?", choices: [{ label: "YES", reply: [say("GOOD.")] }, { label: "NO", reply: [say("TOO BAD.")] }] },
      say("BYE."),
    ]);
    run(c, 1);
    expect(c.choice).toBe(0);
    c.move(-1);
    expect(c.choice).toBe(1);
    c.move(1);
    expect(c.choice).toBe(0);
    c.move(1);
    c.confirm();
    expect(c.line.text).toBe("TOO BAD.");
    run(c, 1);
    c.confirm();
    expect(c.line.text).toBe("BYE.");
  });

  it("confirm on a choice line still typing only completes it", () => {
    const c = new Conversation([{ speaker: A, text: "A LONG QUESTION?", choices: [{ label: "YES", reply: [say("OK.")] }] }]);
    run(c, 0.05);
    c.confirm();
    expect(c.lineComplete).toBe(true);
    expect(c.line.text).toBe("A LONG QUESTION?");
    c.confirm();
    expect(c.line.text).toBe("OK.");
  });

  it("skip ends the conversation", () => {
    const c = new Conversation([say("ONE"), say("TWO")]);
    c.skip();
    expect(c.done).toBe(true);
  });
});
