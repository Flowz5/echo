import { C, HEIGHT, WIDTH } from "../config";
import { LINE_H } from "../engine/draw";
import type { Ctx, Scene } from "./scene";

const LINES: [string, string][] = [
  ["ECHO", C.echoLight],
  ["", ""],
  ["A GAME BY FLOWZ", C.bone],
  ["", ""],
  ["MADE WITH TYPESCRIPT", C.ash],
  ["AND A CANVAS", C.ash],
  ["", ""],
  ["THANKS FOR PLAYING", C.gold],
];

export class Credits implements Scene {
  constructor(private readonly ctx: Ctx) {}

  update(dt: number): void {
    const { input, bg } = this.ctx;
    bg.update(dt);
    if (input.justPressed("back") || input.justPressed("confirm") || input.mouse.clicked) {
      this.ctx.sfx("back");
      this.ctx.scenes.go("main");
    }
  }

  render(): void {
    const { draw, bg } = this.ctx;
    bg.render();
    draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.55);
    const top = Math.round((HEIGHT - LINES.length * (LINE_H + 2)) / 2) - 10;
    LINES.forEach(([text, color], i) => {
      if (text) draw.text(text, WIDTH / 2, top + i * (LINE_H + 2), color, { align: "center" });
    });
    draw.text("ESC BACK", WIDTH / 2, HEIGHT - 12, C.slate, { align: "center", shadow: null });
  }
}
