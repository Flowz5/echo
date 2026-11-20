import { PIXEL_SCALES } from "../settings";
import { PanelScreen } from "./panel-screen";
import type { Ctx } from "./scene";

export class SettingsMenu extends PanelScreen {
  constructor(ctx: Ctx) {
    const s = ctx.settings;
    const change = (fn: () => void) => () => {
      fn();
      ctx.save();
    };
    super(ctx, "SETTINGS", [
      {
        kind: "slider",
        label: "MUSIC VOLUME",
        max: 10,
        get: () => s.music,
        set: (v) => change(() => (s.music = v))(),
      },
      {
        kind: "slider",
        label: "SFX VOLUME",
        max: 10,
        get: () => s.sfx,
        set: (v) => change(() => (s.sfx = v))(),
      },
      {
        kind: "toggle",
        label: "SCREEN SHAKE",
        get: () => s.screenShake,
        set: (v) => change(() => (s.screenShake = v))(),
      },
      {
        kind: "toggle",
        label: "FULLSCREEN",
        get: () => document.fullscreenElement !== null,
        set: (v) => {
          if (v) void document.documentElement.requestFullscreen?.().catch(() => {});
          else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        },
      },
      {
        kind: "choice",
        label: "PIXEL SCALE",
        options: PIXEL_SCALES.map((n) => (n === 0 ? "AUTO" : `${n}X`)),
        get: () => Math.max(0, PIXEL_SCALES.indexOf(s.pixelScale)),
        set: (i) =>
          change(() => {
            s.pixelScale = PIXEL_SCALES[i];
            ctx.renderer.resize();
          })(),
      },
      { kind: "action", label: "CONTROLS", value: () => ">", run: () => ctx.scenes.go("controls") },
      { kind: "action", label: "BACK", run: () => this.back() },
    ]);
  }

  enter(from: Parameters<PanelScreen["enter"]>[0]): void {
    // coming back from the controls screen keeps the cursor on CONTROLS
    if (from === "controls") return;
    // opened from the main menu or the pause menu: return there
    if (from === "main" || from === "game") this.backTo = from;
    super.enter(from);
  }
}
