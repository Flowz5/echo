import { DEFAULT_BINDINGS, keyName, type Bindable } from "../engine/input";
import { rebind } from "../settings";
import type { Option } from "../ui/option-list";
import { PanelScreen } from "./panel-screen";
import type { Ctx } from "./scene";

const ACTIONS: { action: Bindable; label: string }[] = [
  { action: "jump", label: "JUMP" },
  { action: "dash", label: "DASH" },
  { action: "rewind", label: "REWIND" },
  { action: "pause", label: "PAUSE" },
];

export class ControlsMenu extends PanelScreen {
  private waiting: Bindable | null = null;

  constructor(ctx: Ctx) {
    const items: Option[] = ACTIONS.map(({ action, label }) => ({
      kind: "action" as const,
      label,
      value: () => (this.waiting === action ? (Math.sin(this.t * 8) > -0.3 ? "PRESS A KEY..." : "") : keyName(ctx.settings.bindings[action])),
      run: () => this.listen(action),
    }));
    items.push(
      {
        kind: "action",
        label: "RESET TO DEFAULT",
        run: () => {
          ctx.settings.bindings = { ...DEFAULT_BINDINGS };
          ctx.save();
        },
      },
      { kind: "action", label: "BACK", run: () => this.back() },
    );
    super(ctx, "CONTROLS", items);
    this.backTo = "settings";
  }

  private listen(action: Bindable): void {
    this.waiting = action;
    this.ctx.input.captureNextKey((code) => {
      this.waiting = null;
      // Esc cancels, except when rebinding PAUSE itself
      if (code === "Escape" && action !== "pause") {
        this.ctx.sfx("back");
        return;
      }
      rebind(this.ctx.settings, action, code);
      this.ctx.save();
      this.ctx.sfx("select");
    });
  }

  protected get busy(): boolean {
    return this.waiting !== null;
  }

  protected hint(): string {
    return this.waiting ? "ESC CANCEL" : "MOVE: ARROWS / WASD   ESC BACK";
  }
}
