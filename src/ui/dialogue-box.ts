import { C, HEIGHT, WIDTH } from "../config";
import type { Draw } from "../engine/draw";
import type { Conversation } from "../game/dialogue";

const BOX_X = 8;
const BOX_W = WIDTH - 16;
const BOX_H = 50;
const PORTRAIT = 32;
const LINE_H = 9;
const CHOICE_H = 10;

/** Splits text into lines that fit `width` pixels (words never cut). */
export function wrap(draw: Draw, text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && draw.textWidth(next) > width) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

/** The dialogue panel at the bottom of the screen: portrait, name, typed text, choices. */
export function drawDialogueBox(draw: Draw, conv: Conversation, t: number): void {
  const line = conv.line;
  const { speaker } = line;
  const choices = conv.lineComplete ? (line.choices ?? []) : [];
  const tx = speaker.portrait !== null ? BOX_X + 7 + PORTRAIT + 8 : BOX_X + 8;
  // wrap the full line so words don't jump to the next row while typing
  const rows = wrap(draw, line.text, BOX_X + BOX_W - 8 - tx);
  const nameH = speaker.name ? LINE_H + 2 : 0;
  const choicesH = choices.length > 0 ? 4 + choices.length * CHOICE_H : 0;
  const h = Math.max(BOX_H, 7 + nameH + rows.length * LINE_H + choicesH + 6);
  const y = HEIGHT - 6 - h;
  draw.panel("panel", BOX_X, y, BOX_W, h);

  if (speaker.portrait !== null) draw.frame(draw.img.portraits, speaker.portrait, BOX_X + 7, y + 8, { fw: PORTRAIT, fh: PORTRAIT });
  let ty = y + 7;
  if (speaker.name) draw.text(speaker.name, tx, ty, speaker.color);
  ty += nameH;
  let left = conv.shown.length;
  for (const row of rows) {
    if (left > 0) draw.text(row.slice(0, left), tx, ty, C.bone);
    left -= row.length + 1;
    ty += LINE_H;
  }

  if (choices.length > 0) {
    let cy = ty + 4;
    choices.forEach((c, i) => {
      const selected = i === conv.choice;
      if (selected) draw.ui("cursor", tx + (Math.sin(t * 6) > 0.6 ? 1 : 0), cy);
      draw.text(c.label, tx + 10, cy, selected ? C.echoLight : C.ash);
      cy += CHOICE_H;
    });
  } else if (conv.lineComplete && Math.sin(t * 6) > -0.2) {
    draw.text("V", BOX_X + BOX_W - 12, y + h - 12, C.echoLight); // "next" marker
  }
}
