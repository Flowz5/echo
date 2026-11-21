import { SLOTS, slotSummary } from "../game/save";
import type { Option } from "../ui/option-list";
import { PanelScreen } from "./panel-screen";
import type { Ctx, ScreenName } from "./scene";

/** PLAY: pick one of the 3 files. Empty = new game, full = resume. Can erase a file. */
export class SlotsMenu extends PanelScreen {
  private erasing = false;
  /** file waiting for the second, confirming press while erasing */
  private confirm: number | null = null;

  constructor(ctx: Ctx) {
    const items: Option[] = [];
    for (let slot = 1; slot <= SLOTS; slot++) {
      items.push({
        kind: "action",
        label: `FILE ${slot}`,
        value: () => this.slotValue(slot),
        run: () => this.pick(slot),
      });
    }
    items.push(
      { kind: "action", label: "ERASE A FILE", value: () => (this.erasing ? "ON" : ""), run: () => this.toggleErase() },
      { kind: "action", label: "BACK", run: () => this.back() },
    );
    super(ctx, "CHOOSE A FILE", items, { rowH: 14 });
  }

  enter(from: ScreenName | null): void {
    super.enter(from);
    this.erasing = false;
    this.confirm = null;
  }

  private slotValue(slot: number): string {
    if (this.confirm === slot) return "PRESS AGAIN TO ERASE";
    const s = slotSummary(this.ctx.saves.load(slot));
    return s ? `${s.room}  ${s.time}` : "EMPTY";
  }

  private pick(slot: number): void {
    const data = this.ctx.saves.load(slot);
    if (this.erasing) {
      if (!data) return;
      if (this.confirm !== slot) {
        this.confirm = slot;
        this.ctx.sfx("toggle");
        return;
      }
      this.ctx.saves.erase(slot);
      this.ctx.sfx("echoShatter");
      this.confirm = null;
      this.erasing = false;
      return;
    }
    this.ctx.session = { slot, data };
    this.ctx.scenes.go("game", { fade: true });
  }

  private toggleErase(): void {
    this.erasing = !this.erasing;
    this.confirm = null;
  }

  update(dt: number): void {
    const before = this.list.index;
    super.update(dt);
    if (this.list.index !== before) this.confirm = null; // moving away cancels the erase
  }

  protected hint(): string {
    if (this.erasing) return "CHOOSE A FILE TO ERASE   ESC BACK";
    const i = this.list.index;
    const s = i < SLOTS ? slotSummary(this.ctx.saves.load(i + 1)) : null;
    return s ? `SHARDS ${s.shards}   PAGES ${s.pages}` : "ESC BACK";
  }
}
