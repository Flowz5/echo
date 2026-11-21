import { loadImages } from "./engine/assets";
import { AudioEngine } from "./engine/audio";
import { Draw } from "./engine/draw";
import { Input } from "./engine/input";
import { startLoop } from "./engine/loop";
import { Renderer } from "./engine/renderer";
import { ControlsMenu } from "./scenes/controls-menu";
import { Credits } from "./scenes/credits";
import { GameScene } from "./scenes/game-scene";
import { MainMenu } from "./scenes/main-menu";
import { MenuBackground } from "./scenes/menu-background";
import { SceneManager, type Ctx } from "./scenes/scene";
import { SettingsMenu } from "./scenes/settings-menu";
import { SlotsMenu } from "./scenes/slots-menu";
import { SaveStore } from "./game/save";
import { loadSettings, saveSettings } from "./settings";

async function boot(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const settings = loadSettings();
  const renderer = new Renderer(canvas, () => settings.pixelScale);
  const input = new Input(renderer, () => settings.bindings);
  const draw = new Draw(renderer.ctx, await loadImages());
  const scenes = new SceneManager(draw);
  const audio = new AudioEngine();
  audio.setVolumes(settings.music, settings.sfx);

  const ctx: Ctx = {
    draw,
    input,
    renderer,
    settings,
    scenes,
    bg: new MenuBackground(draw),
    audio,
    saves: new SaveStore(),
    session: { slot: 1, data: null },
    save: () => saveSettings(settings),
    sfx: (name) => audio.sfx(name),
  };

  scenes.register("main", new MainMenu(ctx));
  scenes.register("settings", new SettingsMenu(ctx));
  scenes.register("controls", new ControlsMenu(ctx));
  scenes.register("credits", new Credits(ctx));
  scenes.register("slots", new SlotsMenu(ctx));
  const game = new GameScene(ctx);
  scenes.register("game", game);
  scenes.go("main");
  if (import.meta.env.DEV) Object.assign(window, { __echo: ctx, __echoGame: game }); // console debugging, playtests

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
