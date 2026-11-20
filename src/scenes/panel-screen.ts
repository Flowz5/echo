import { C, HEIGHT, WIDTH } from "../config";
import { OptionList, type Option } from "../ui/option-list";
import type { Ctx, Scene, ScreenName } from "./scene";

const DEFAULT_ROW_H = 14;
const PANEL_W = 248;

/** Base for the menu screens drawn as a titled panel over the animated backdrop. */
export abstract class PanelScreen implements Scene {
  protected t = 0;
  protected list: OptionList;
  protected backTo: ScreenName = "main";
  private readonly panelY: number;
  private readonly panelH: number;

  constructor(
    protected readonly ctx: Ctx,
    private readonly title: string,
    items: Option[],
    opts: { rowH?: number } = {},
  ) {
    const rowH = opts.rowH ?? DEFAULT_ROW_H;
    this.panelH = items.length * rowH + 12;
    this.panelY = Math.round((HEIGHT - this.panelH) / 2) + 6;
    const x = Math.round((WIDTH - PANEL_W) / 2);
    this.list = new OptionList(ctx, items, { style: "rows", x, y: this.panelY + 9, w: PANEL_W, rowH });
  }

  enter(_from: ScreenName | null): void {
    this.list.index = 0;
  }

  /** Override to block input (e.g. while waiting for a key). */
  protected get busy(): boolean {
    return false;
  }

  protected back(): void {
    this.ctx.sfx("back");
    this.ctx.scenes.go(this.backTo);
  }

  update(dt: number): void {
    this.t += dt;
    this.ctx.bg.update(dt);
    if (this.busy) return;
    if (this.ctx.input.justPressed("back")) {
      this.back();
      return;
    }
    this.list.update();
  }

  render(): void {
    const { draw, bg } = this.ctx;
    bg.render();
    draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.55);
    draw.text(this.title, WIDTH / 2, this.panelY - 16, C.echoLight, { align: "center" });
    draw.panel("panel", Math.round((WIDTH - PANEL_W) / 2), this.panelY, PANEL_W, this.panelH);
    this.list.render(this.t);
    draw.text(this.hint(), WIDTH / 2, HEIGHT - 12, C.slate, { align: "center", shadow: null });
  }

  protected hint(): string {
    return "ESC BACK";
  }
}
