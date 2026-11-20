import { C, HEIGHT, WIDTH } from "../config";
import type { AudioEngine, SfxName } from "../engine/audio";
import type { Draw } from "../engine/draw";
import type { Input } from "../engine/input";
import type { Renderer } from "../engine/renderer";
import type { Settings } from "../settings";
import type { MenuBackground } from "./menu-background";

export type ScreenName = "main" | "settings" | "controls" | "credits" | "game";

/** Everything a scene needs, shared by all scenes. */
export interface Ctx {
  draw: Draw;
  input: Input;
  renderer: Renderer;
  settings: Settings;
  scenes: SceneManager;
  bg: MenuBackground;
  audio: AudioEngine;
  save(): void;
  sfx(name: SfxName): void;
}

export interface Scene {
  enter?(from: ScreenName | null): void;
  update(dt: number): void;
  render(): void;
}

const FADE_TIME = 0.25;

/** Switches between scenes, either instantly (menus) or through a fade to black. */
export class SceneManager {
  private readonly scenes = new Map<ScreenName, Scene>();
  private current: Scene | null = null;
  private currentName: ScreenName | null = null;
  private pending: ScreenName | null = null;
  private fade = 0;
  private dir: 0 | 1 | -1 = 0;

  constructor(private readonly draw: Draw) {}

  register(name: ScreenName, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  go(name: ScreenName, opts: { fade?: boolean } = {}): void {
    if (this.dir !== 0) return;
    if (opts.fade) {
      this.pending = name;
      this.dir = 1;
    } else {
      this.switchTo(name);
    }
  }

  private switchTo(name: ScreenName): void {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Unknown scene ${name}`);
    const from = this.currentName;
    this.current = scene;
    this.currentName = name;
    scene.enter?.(from);
  }

  update(dt: number): void {
    if (this.dir === 1) {
      this.fade = Math.min(1, this.fade + dt / FADE_TIME);
      if (this.fade === 1 && this.pending) {
        this.switchTo(this.pending);
        this.pending = null;
        this.dir = -1;
      }
      return; // no input while fading out
    }
    if (this.dir === -1) {
      this.fade = Math.max(0, this.fade - dt / FADE_TIME);
      if (this.fade === 0) this.dir = 0;
    }
    this.current?.update(dt);
  }

  render(): void {
    this.current?.render();
    if (this.fade > 0) this.draw.rect(0, 0, WIDTH, HEIGHT, C.void, this.fade);
  }
}
