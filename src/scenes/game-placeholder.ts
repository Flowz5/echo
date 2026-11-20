import { C, HEIGHT, WIDTH } from "../config";
import { keyName } from "../engine/input";
import type { Ctx, Scene } from "./scene";

/** Stand-in for the gameplay scene until it exists (feature/gameplay). */
export class GamePlaceholder implements Scene {
  private t = 0;

  constructor(private readonly ctx: Ctx) {}

  enter(): void {
    this.t = 0;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.ctx.input.justPressed("back")) {
      this.ctx.sfx("back");
      this.ctx.scenes.go("main", { fade: true });
    }
  }

  render(): void {
    const { draw, settings } = this.ctx;
    draw.rect(0, 0, WIDTH, HEIGHT, C.night1);
    draw.text("CHAPTER 0", WIDTH / 2, 64, C.slate, { align: "center" });
    draw.text("THE QUIET VALE", WIDTH / 2, 76, C.echoLight, { align: "center" });
    draw.frame(draw.img.player, 0, WIDTH / 2 - 8, 94 + Math.round(Math.sin(this.t * 3)));
    draw.text("GAMEPLAY COMING SOON", WIDTH / 2, 124, C.ash, { align: "center" });
    draw.text(`${keyName(settings.bindings.pause)} TO RETURN`, WIDTH / 2, HEIGHT - 12, C.slate, {
      align: "center",
      shadow: null,
    });
  }
}
