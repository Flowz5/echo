import { C, HEIGHT, VERSION, WIDTH } from "../config";
import { keyName } from "../engine/input";
import { OptionList, type Option } from "../ui/option-list";
import type { Ctx, Scene } from "./scene";

export class MainMenu implements Scene {
  private t = 0;
  private list: OptionList;

  constructor(private readonly ctx: Ctx) {
    this.list = this.buildList();
  }

  /** CONTINUE only shows when there is a save to continue. */
  private buildList(): OptionList {
    const { ctx } = this;
    const last = ctx.saves.lastSlot;
    const save = last !== null ? ctx.saves.load(last) : null;
    const items: Option[] = [];
    if (last !== null && save) {
      items.push({
        kind: "action",
        label: "CONTINUE",
        run: () => {
          ctx.session = { slot: last, data: ctx.saves.load(last) };
          ctx.scenes.go("game", { fade: true });
        },
      });
    }
    items.push(
      { kind: "action", label: "PLAY", run: () => ctx.scenes.go("slots") },
      { kind: "action", label: "SETTINGS", run: () => ctx.scenes.go("settings") },
      { kind: "action", label: "CREDITS", run: () => ctx.scenes.go("credits") },
    );
    return new OptionList(ctx, items, { style: "center", cx: WIDTH / 2, y: items.length > 3 ? 74 : 82, rowH: 16 });
  }

  enter(): void {
    this.list = this.buildList();
    this.ctx.audio.setDucked(false);
    this.ctx.audio.playMusic("menu");
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
