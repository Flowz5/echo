import { C, HEIGHT, WIDTH, manifest } from "../config";
import { Level } from "../game/level";
import { TEST_ROOM } from "../game/levels/test-room";
import { Effects } from "../game/particles";
import { Player } from "../game/player";
import { OptionList } from "../ui/option-list";
import type { Ctx, Scene, ScreenName } from "./scene";

const RESPAWN_DELAY = 0.5;
const CAMERA_LERP = 10; // higher = snappier
const LOOK_AHEAD = 24; // px the camera leads in the facing direction

export class GameScene implements Scene {
  private level = new Level(TEST_ROOM);
  private readonly fx = new Effects();
  private player = new Player(this.level, this.fx);
  private camX = 0;
  private camY = 0;
  private lookAhead = 0;
  private freeze = 0;
  private shake = 0;
  private respawnTimer = 0;
  private paused = false;
  private debug = false;
  private t = 0;
  private readonly pauseMenu: OptionList;

  constructor(private readonly ctx: Ctx) {
    this.pauseMenu = new OptionList(
      ctx,
      [
        { kind: "action", label: "RESUME", run: () => (this.paused = false) },
        { kind: "action", label: "RESTART ROOM", run: () => this.restart() },
        { kind: "action", label: "SETTINGS", run: () => ctx.scenes.go("settings") },
        { kind: "action", label: "MAIN MENU", run: () => ctx.scenes.go("main", { fade: true }) },
      ],
      { style: "center", cx: WIDTH / 2, y: 70, rowH: 16 },
    );
  }

  enter(from: ScreenName | null): void {
    if (from === "settings") return; // back from the pause menu's settings: keep the run
    this.restart();
  }

  private restart(): void {
    this.paused = false;
    this.fx.clear();
    this.player.respawn();
    this.respawnTimer = 0;
    this.snapCamera();
  }

  update(dt: number): void {
    const { input } = this.ctx;
    this.t += dt;
    if (input.keyPressed("F3")) this.debug = !this.debug;

    if (this.paused) {
      if (input.justPressed("back")) {
        this.ctx.sfx("back");
        this.paused = false;
        return;
      }
      this.pauseMenu.update();
      return;
    }
    if (input.justPressed("pause")) {
      this.ctx.sfx("select");
      this.paused = true;
      this.pauseMenu.index = 0;
      return;
    }

    if (this.freeze > 0) {
      this.freeze -= dt; // hit-stop: the world holds its breath
      return;
    }

    const p = this.player;
    const wasDead = p.dead;
    p.update(dt, input);
    if (p.freeze > 0) {
      this.freeze = p.freeze;
      p.freeze = 0;
    }
    if (p.dead && !wasDead) {
      this.respawnTimer = RESPAWN_DELAY;
      if (this.ctx.settings.screenShake) this.shake = 0.25;
    }
    if (p.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        p.respawn();
        this.fx.burst(p.x + 4, p.y + 6, 14, { colors: [C.echo, C.echoLight, C.bone], speed: 50, life: 0.4 });
      }
    }

    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.updateCamera(dt);
  }

  private cameraTarget(): { x: number; y: number } {
    const p = this.player;
    const x = p.x + 4 - WIDTH / 2 + this.lookAhead;
    const y = p.y + 6 - HEIGHT / 2 - 10;
    return {
      x: Math.max(0, Math.min(this.level.width - WIDTH, x)),
      y: Math.max(0, Math.min(this.level.height - HEIGHT, y)),
    };
  }

  private updateCamera(dt: number): void {
    const p = this.player;
    this.lookAhead += (p.facing * LOOK_AHEAD - this.lookAhead) * Math.min(1, dt * 2);
    const target = this.cameraTarget();
    const k = 1 - Math.exp(-dt * CAMERA_LERP);
    this.camX += (target.x - this.camX) * k;
    this.camY += (target.y - this.camY) * k;
  }

  private snapCamera(): void {
    this.lookAhead = LOOK_AHEAD * this.player.facing;
    const t = this.cameraTarget();
    this.camX = t.x;
    this.camY = t.y;
  }

  render(): void {
    const { draw } = this.ctx;
    const { ctx, img } = draw;
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = Math.round((Math.random() - 0.5) * 6 * (this.shake / 0.25));
      sy = Math.round((Math.random() - 0.5) * 6 * (this.shake / 0.25));
    }
    const camX = Math.round(this.camX) + sx;
    const camY = Math.round(this.camY) + sy;

    // parallax backdrop
    ctx.drawImage(img.sky, 0, 0);
    this.layer(img.mountains, manifest.backgrounds.mountains.parallax, camX, camY);
    this.layer(img.hills, manifest.backgrounds.hills.parallax, camX, camY);

    this.level.render(draw, camX, camY, WIDTH, HEIGHT);
    this.fx.renderBehind(draw, camX, camY);
    this.player.render(draw, camX, camY);
    this.fx.renderFront(draw, camX, camY);

    if (this.debug) this.renderDebug(camX, camY);

    if (this.paused) {
      draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.6);
      draw.text("PAUSED", WIDTH / 2, 46, C.echoLight, { align: "center" });
      this.pauseMenu.render(this.t);
    }
  }

  /** Layers scroll with the camera at their parallax factor and stay anchored to the screen bottom. */
  private layer(image: HTMLImageElement, parallax: number, camX: number, camY: number): void {
    const w = image.width;
    const x = -(((Math.round(camX * parallax) % w) + w) % w);
    const maxCamY = Math.max(1, this.level.height - HEIGHT);
    const y = HEIGHT - image.height + Math.round((1 - camY / maxCamY) * 12 * parallax * 4);
    this.ctx.draw.ctx.drawImage(image, x, y);
    this.ctx.draw.ctx.drawImage(image, x + w, y);
  }

  private renderDebug(camX: number, camY: number): void {
    const { draw } = this.ctx;
    const p = this.player;
    const hb = p.hitbox;
    draw.rect(hb.x - camX, hb.y - camY, hb.w, hb.h, C.gold, 0.5);
    const lines = [
      `STATE ${p.state.toUpperCase()}`,
      `VX ${Math.round(p.vx)} VY ${Math.round(p.vy)}`,
      `DASH ${p.canDash ? "READY" : "USED"}  2ND JUMP ${p.canDoubleJump ? "READY" : "USED"}`,
    ];
    lines.forEach((l, i) => draw.text(l, 4, 4 + i * 9, C.bone));
  }
}
