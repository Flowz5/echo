import { C, HEIGHT, VERSION, WIDTH } from "../config";
import { keyName } from "../engine/input";
import { OptionList } from "../ui/option-list";
import type { Ctx, Scene } from "./scene";

export class MainMenu implements Scene {
  private t = 0;
  private readonly list: OptionList;

  constructor(private readonly ctx: Ctx) {
    this.list = new OptionList(
      ctx,
      [
        { kind: "action", label: "PLAY", run: () => ctx.scenes.go("game", { fade: true }) },
        { kind: "action", label: "SETTINGS", run: () => ctx.scenes.go("settings") },
        { kind: "action", label: "CREDITS", run: () => ctx.scenes.go("credits") },
      ],
      { style: "center", cx: WIDTH / 2, y: 82, rowH: 16 },
    );
  }

  update(dt: number): void {
    this.t += dt;
    this.ctx.bg.update(dt);
    this.list.update();
  }

  render(): void {
    const { draw, bg, settings } = this.ctx;
    bg.render();
    const title = draw.img.title;
    const bob = Math.round(Math.sin(this.t * 1.6) * 1.5);
    draw.ctx.drawImage(title, Math.round((WIDTH - title.width) / 2) + 4, 18 + bob);
    this.list.render(this.t);

    const footY = HEIGHT - 11; // on the ground, below Iris and her echoes
    draw.text(VERSION, 4, footY, C.ash);
    draw.text(`${keyName(settings.bindings.jump)} TO SELECT`, WIDTH - 4, footY, C.ash, { align: "right" });
  }
}
