import { C, COLORS, HEIGHT, STEP, WIDTH, manifest } from "../config";
import { Echo } from "../game/echo";
import { Level } from "../game/level";
import { TEST_ROOM } from "../game/levels/test-room";
import { Effects } from "../game/particles";
import { Player, TUNING, type PlayerSnapshot } from "../game/player";
import { Room } from "../game/room";
import { OptionList } from "../ui/option-list";
import type { Ctx, Scene, ScreenName } from "./scene";

const RESPAWN_DELAY = 0.5;
const CAMERA_LERP_X = 7; // higher = snappier
const CAMERA_LERP_Y = 4.5;
const LOOK_AHEAD = 28; // max px the camera leads in the running direction
const JUMP_WINDOW = 40; // px Iris can rise above her last footing before the camera follows up

// ---- rewind
const REWIND_SECONDS = 2;
const HISTORY = Math.round(REWIND_SECONDS / STEP); // recorded steps
const MIN_HISTORY = Math.round(0.25 / STEP); // can't rewind right after (re)spawning
const REWIND_ANIM = 0.32; // seconds of the reverse playback
const REWIND_COOLDOWN = 0.6;
const SLOTS_HUD_TIME = 2;
const TEST_ROOM_ECHOES = 3;

interface Rewinding {
  /** recorded moments, newest first */
  path: PlayerSnapshot[];
  t: number;
}

export class GameScene implements Scene {
  private readonly level = new Level(TEST_ROOM);
  private readonly room = new Room(this.level, TEST_ROOM_ECHOES);
  private readonly fx = new Effects();
  private readonly player: Player;
  private camX = 0;
  private camY = 0;
  private lookAhead = 0;
  private focusY = 0; // vertical point the camera follows (last footing, or lower when falling)
  private freeze = 0;
  private shake = 0;
  private respawnTimer = 0;
  private paused = false;
  private debug = false;
  private t = 0;
  private readonly pauseMenu: OptionList;

  private history: PlayerSnapshot[] = [];
  private rewinding: Rewinding | null = null;
  private rewindCooldown = 0;
  private slotsHud = 0;

  constructor(private readonly ctx: Ctx) {
    this.player = new Player(this.room, this.fx, (name) => ctx.sfx(name));
    this.pauseMenu = new OptionList(
      ctx,
      [
        { kind: "action", label: "RESUME", run: () => this.setPaused(false) },
        { kind: "action", label: "RESTART ROOM", run: () => this.restart() },
        { kind: "action", label: "SETTINGS", run: () => ctx.scenes.go("settings") },
        { kind: "action", label: "MAIN MENU", run: () => ctx.scenes.go("main", { fade: true }) },
      ],
      { style: "center", cx: WIDTH / 2, y: 70, rowH: 16 },
    );
  }

  enter(from: ScreenName | null): void {
    if (from === "settings") return; // back from the pause menu's settings: keep the run
    this.ctx.audio.playMusic("vale");
    this.restart();
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.ctx.audio.setDucked(paused);
  }

  private restart(): void {
    this.setPaused(false);
    this.fx.clear();
    this.resetRoom();
    this.player.respawn();
    this.respawnTimer = 0;
    this.snapCamera();
  }

  /** Death or restart: echoes vanish, plates and doors reset, history is forgotten. */
  private resetRoom(): void {
    this.room.clearEchoes();
    this.level.doorsOpen = false;
    this.history = [];
    this.rewinding = null;
    this.rewindCooldown = 0;
  }

  update(dt: number): void {
    const { input } = this.ctx;
    this.t += dt;
    if (input.keyPressed("F3")) this.debug = !this.debug;

    if (this.paused) {
      if (input.justPressed("back")) {
        this.ctx.sfx("back");
        this.setPaused(false);
        return;
      }
      this.pauseMenu.update();
      return;
    }
    if (input.justPressed("pause")) {
      this.ctx.sfx("pause");
      this.setPaused(true);
      this.pauseMenu.index = 0;
      return;
    }

    if (this.rewinding) {
      this.updateRewind(dt);
      return;
    }

    if (this.freeze > 0) {
      this.freeze -= dt; // hit-stop: the world holds its breath
      return;
    }

    const p = this.player;
    this.rewindCooldown = Math.max(0, this.rewindCooldown - dt);
    this.slotsHud = Math.max(0, this.slotsHud - dt);

    if (input.justPressed("rewind") && !p.dead) {
      if (this.history.length >= MIN_HISTORY && this.rewindCooldown <= 0) {
        this.startRewind();
        return;
      }
      this.ctx.sfx("rewindFail");
    }

    const wasDead = p.dead;
    p.update(dt, input);
    if (p.freeze > 0) {
      this.freeze = p.freeze;
      p.freeze = 0;
    }
    if (!p.dead) {
      this.history.push(p.snapshot());
      if (this.history.length > HISTORY) this.history.shift();
    }
    if (p.dead && !wasDead) {
      this.respawnTimer = RESPAWN_DELAY;
      if (this.ctx.settings.screenShake) this.shake = 0.25;
    }
    if (p.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.resetRoom();
        p.respawn();
        this.ctx.sfx("respawn");
        this.fx.burst(p.x + 4, p.y + 6, 14, { colors: [C.echo, C.echoLight, C.bone], speed: 50, life: 0.4 });
      }
    }

    if (this.room.update(dt, p.hitbox)) this.ctx.sfx(this.level.doorsOpen ? "doorOpen" : "doorClose");
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.updateCamera(dt);
  }

  // ------------------------------------------------------------------ rewind
  private startRewind(): void {
    this.rewinding = { path: [...this.history].reverse(), t: 0 };
    this.ctx.sfx("rewind");
  }

  private updateRewind(dt: number): void {
    const rw = this.rewinding!;
    rw.t += dt;
    this.fx.update(dt);
    // trail of cyan sparks along the rewound path
    const s = this.rewindSample(rw);
    if (Math.random() < 0.7) {
      this.fx.burst(s.x + 4, s.y + 6, 1, { colors: [COLORS.C, COLORS.e, COLORS.E], speed: 20, life: 0.4 });
    }
    if (rw.t >= REWIND_ANIM) this.finishRewind(rw);
  }

  /** Where Iris is drawn during the reverse playback (eased, so it accelerates then lands softly). */
  private rewindSample(rw: Rewinding): PlayerSnapshot {
    const k = Math.min(1, rw.t / REWIND_ANIM);
    const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return rw.path[Math.min(rw.path.length - 1, Math.floor(eased * (rw.path.length - 1)))];
  }

  private finishRewind(rw: Rewinding): void {
    const p = this.player;
    const now = rw.path[0];
    const past = rw.path[rw.path.length - 1];

    // freeze the moment Iris leaves behind, unless she was in the void or inside something
    const pose = { ...p.pose, frame: now.frame, facing: now.facing };
    const hitbox = { x: now.x, y: now.y, w: p.hitbox.w, h: p.hitbox.h };
    const inVoid = now.y > this.level.height;
    if (!inVoid && !this.level.solidAt(hitbox)) {
      const echo = new Echo(hitbox, pose.frame, pose.facing, now.x - 4, now.y - 4);
      const shattered = this.room.addEcho(echo);
      if (shattered) this.shatter(shattered);
      this.ctx.sfx("echoAppear");
    } else {
      this.fx.burst(now.x + 4, Math.min(now.y, this.level.height - 4) + 6, 10, { colors: [COLORS.c, COLORS.C], speed: 30, life: 0.4 });
    }

    p.restore(past);
    this.history = [];
    this.rewinding = null;
    this.rewindCooldown = REWIND_COOLDOWN;
    this.slotsHud = SLOTS_HUD_TIME;
    this.fx.burst(p.x + 4, p.y + 6, 16, { colors: [COLORS.C, COLORS.e, COLORS.E], speed: 70, life: 0.45 });
    if (this.ctx.settings.screenShake) this.shake = 0.08;
  }

  private shatter(echo: Echo): void {
    const h = echo.hitbox;
    this.fx.burst(h.x + h.w / 2, h.y + h.h / 2, 18, { colors: [COLORS.C, COLORS.e, COLORS.c], speed: 90, life: 0.5, gravity: 150 });
    this.ctx.sfx("echoShatter");
  }

  // ------------------------------------------------------------------ camera
  private cameraTarget(): { x: number; y: number } {
    const p = this.player;
    const x = p.x + 4 - WIDTH / 2 + this.lookAhead;
    const y = this.focusY + 6 - HEIGHT / 2 - 10;
    return {
      x: Math.max(0, Math.min(this.level.width - WIDTH, x)),
      y: Math.max(0, Math.min(this.level.height - HEIGHT, y)),
    };
  }

  private updateCamera(dt: number): void {
    const p = this.player;
    // lead in the direction of travel, proportional to speed
    const lead = Math.max(-1, Math.min(1, p.vx / 100)) * LOOK_AHEAD;
    this.lookAhead += (lead - this.lookAhead) * Math.min(1, dt * 2.5);
    // don't bob with every jump: follow the footing, or Iris when she falls below it / climbs high
    if (p.grounded || p.y > this.focusY) this.focusY = p.y;
    else if (p.y < this.focusY - JUMP_WINDOW) this.focusY = p.y + JUMP_WINDOW;
    const target = this.cameraTarget();
    this.camX += (target.x - this.camX) * (1 - Math.exp(-dt * CAMERA_LERP_X));
    this.camY += (target.y - this.camY) * (1 - Math.exp(-dt * CAMERA_LERP_Y));
  }

  private snapCamera(): void {
    this.lookAhead = 0;
    this.focusY = this.player.y;
    const t = this.cameraTarget();
    this.camX = t.x;
    this.camY = t.y;
  }

  // ------------------------------------------------------------------ render
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
    for (const e of this.room.echoes) e.render(draw, camX, camY);
    this.fx.renderBehind(draw, camX, camY);
    if (this.rewinding) this.renderRewind(camX, camY);
    else this.player.render(draw, camX, camY);
    this.fx.renderFront(draw, camX, camY);

    // falling into the void: the screen dims, there's still time to rewind
    const p = this.player;
    if (p.voidTime > 0 && !p.dead) draw.rect(0, 0, WIDTH, HEIGHT, C.void, Math.min(0.6, (p.voidTime / TUNING.voidGrace) * 0.6));

    this.renderSlots();
    if (this.debug) this.renderDebug(camX, camY);

    if (this.paused) {
      draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.6);
      draw.text("PAUSED", WIDTH / 2, 46, C.echoLight, { align: "center" });
      this.pauseMenu.render(this.t);
    }
  }

  private renderRewind(camX: number, camY: number): void {
    const { draw } = this.ctx;
    const rw = this.rewinding!;
    const k = rw.t / REWIND_ANIM;
    // cyan wash and scanlines: time running backwards
    draw.rect(0, 0, WIDTH, HEIGHT, COLORS.c, 0.18 * Math.sin(k * Math.PI));
    for (let y = Math.floor((rw.t * 400) % 6); y < HEIGHT; y += 6) draw.rect(0, y, WIDTH, 1, COLORS.e, 0.06);
    // ghost trail along the path
    for (let i = 1; i <= 4; i++) {
      const back = { ...rw, t: Math.max(0, rw.t - i * 0.03) };
      const s = this.rewindSample(back);
      draw.frame(draw.img.echo, s.frame, s.x - 4 - camX, s.y - 4 - camY, { flip: s.facing < 0, alpha: 0.35 / i });
    }
    const s = this.rewindSample(rw);
    draw.frame(draw.img.player, s.frame, s.x - 4 - camX, s.y - 4 - camY, { flip: s.facing < 0, row: 2 });
  }

  /** Echo slots: cyan diamonds, shown for a moment after each rewind. */
  private renderSlots(): void {
    if (this.slotsHud <= 0 && !this.rewinding) return;
    const { draw } = this.ctx;
    const alpha = this.rewinding ? 1 : Math.min(1, this.slotsHud * 2);
    const used = this.room.echoes.length;
    for (let i = 0; i < this.room.maxEchoes; i++) {
      const x = 6 + i * 9;
      const y = 6;
      const filled = i < used;
      const d = ["..K..", ".KeK.", "KeEeK", ".KeK.", "..K.."];
      d.forEach((row, ry) =>
        [...row].forEach((ch, rx) => {
          if (ch === ".") return;
          const color = ch === "K" ? COLORS.K : filled ? (ch === "E" ? COLORS.E : COLORS.C) : COLORS["2"];
          draw.rect(x + rx, y + ry, 1, 1, color, alpha);
        }),
      );
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
    for (const e of this.room.echoes) draw.rect(e.hitbox.x - camX, e.hitbox.y - camY, e.hitbox.w, e.hitbox.h, e.armed ? C.echo : C.slate, 0.5);
    const lines = [
      `STATE ${p.state.toUpperCase()}`,
      `VX ${Math.round(p.vx)} VY ${Math.round(p.vy)}`,
      `DASH ${p.canDash ? "READY" : "USED"}  2ND JUMP ${p.canDoubleJump ? "READY" : "USED"}`,
      `ECHOES ${this.room.echoes.length}/${this.room.maxEchoes}  HISTORY ${(this.history.length * STEP).toFixed(1)}S`,
    ];
    lines.forEach((l, i) => draw.text(l, 4, 18 + i * 9, C.bone));
  }
}
