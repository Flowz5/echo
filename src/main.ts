import { loadImages } from "./engine/assets";
import { blip } from "./engine/audio";
import { Draw } from "./engine/draw";
import { Input } from "./engine/input";
import { startLoop } from "./engine/loop";
import { Renderer } from "./engine/renderer";
import { ControlsMenu } from "./scenes/controls-menu";
import { Credits } from "./scenes/credits";
import { GamePlaceholder } from "./scenes/game-placeholder";
import { MainMenu } from "./scenes/main-menu";
import { MenuBackground } from "./scenes/menu-background";
import { SceneManager, type Ctx } from "./scenes/scene";
import { SettingsMenu } from "./scenes/settings-menu";
import { loadSettings, saveSettings } from "./settings";

async function boot(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const settings = loadSettings();
  const renderer = new Renderer(canvas, () => settings.pixelScale);
  const input = new Input(renderer, () => settings.bindings);
  const draw = new Draw(renderer.ctx, await loadImages());
  const scenes = new SceneManager(draw);

  const ctx: Ctx = {
    draw,
    input,
    renderer,
    settings,
    scenes,
    bg: new MenuBackground(draw),
    save: () => saveSettings(settings),
    sfx: (kind) => blip(kind, settings.sfx / 10),
  };

  scenes.register("main", new MainMenu(ctx));
  scenes.register("settings", new SettingsMenu(ctx));
  scenes.register("controls", new ControlsMenu(ctx));
  scenes.register("credits", new Credits(ctx));
  scenes.register("game", new GamePlaceholder(ctx));
  scenes.go("main");

  canvas.focus();
  startLoop(
    (dt) => {
      input.update();
      scenes.update(dt);
    },
    () => {
      scenes.render();
      renderer.present();
    },
  );
}

boot().catch((err: unknown) => {
  console.error(err);
  document.body.style.color = "#f4f1e8";
  document.body.style.font = "16px monospace";
  document.body.textContent = `Echo failed to start: ${err instanceof Error ? err.message : String(err)}`;
});
