import { C, COLORS, HEIGHT, STEP, WIDTH, manifest } from "../config";
import { Echo } from "../game/echo";
import { Level, overlaps, type Entity, type Point } from "../game/level";
import { Progress, type Ability, type CollectibleKind } from "../game/progress";
import { keyName } from "../engine/input";
import { Effects } from "../game/particles";
import { Player, TUNING, type PlayerSnapshot } from "../game/player";
import { Room } from "../game/room";
import { World, type RoomDef } from "../game/world";
import { OptionList } from "../ui/option-list";
import type { Ctx, Scene, ScreenName } from "./scene";

/** chapter to load: chapter0 by default, or ?world=playground for the movement test rooms */
const WORLD = new URLSearchParams(location.search).get("world") ?? "chapter0";
const RESPAWN_DELAY = 0.5;
const CAMERA_LERP_X = 7; // higher = snappier
const CAMERA_LERP_Y = 4.5;
const LOOK_AHEAD = 28; // max px the camera leads in the running direction
const JUMP_WINDOW = 40; // px Iris can rise above her last footing before the camera follows up

// ---- room transitions
const TRANSITION_TIME = 0.42;
const UP_BOOST = 230; // going up into a room gives a little hop so you can land

// ---- rewind
const REWIND_SECONDS = 2;
const HISTORY = Math.round(REWIND_SECONDS / STEP); // recorded steps
const MIN_HISTORY = Math.round(0.25 / STEP); // can't rewind right after (re)spawning
const REWIND_ANIM = 0.32; // seconds of the reverse playback
const REWIND_COOLDOWN = 0.6;
const SLOTS_HUD_TIME = 2;
const ROOM_NAME_TIME = 2.2;
const BANNER_TIME = 3.5;
const POPUP_TIME = 2.2;
const TALK_RANGE = 36; // px: NPC / shrine names show up within this distance

const COLLECTIBLE_FRAME: Record<CollectibleKind, number> = { shard: 0, note: 1, page: 2, moment: 3 };
const COLLECTIBLE_NAME: Record<CollectibleKind, string> = { shard: "BELL SHARD", note: "RESONANT NOTE", page: "LOST PAGE", moment: "LUMI'S MOMENT" };

/** What a Bell Shard can unlock ("unlocks" property in Tiled). */
const UNLOCK_TEXT: Record<string, { title: string; hint: (keys: Record<string, string>) => string }> = {
  dash: { title: "DASH", hint: (k) => `PRESS ${k.dash} TO DASH, IN ANY DIRECTION` },
  rewind: { title: "REWIND", hint: (k) => `PRESS ${k.rewind} TO GO BACK 2 SECONDS AND LEAVE AN ECHO` },
  doubleJump: { title: "DOUBLE JUMP", hint: (k) => `PRESS ${k.jump} AGAIN IN THE AIR` },
  wallJump: { title: "WALL JUMP", hint: () => "JUMP WHILE SLIDING DOWN A WALL" },
  echo: { title: "ONE MORE ECHO", hint: () => "YOUR EYE CAN HOLD ANOTHER MOMENT" },
};

interface Rewinding {
  /** recorded moments, newest first */
  path: PlayerSnapshot[];
  t: number;
}

interface Transition {
  from: RoomDef;
  /** camera position at the start, in the new room's coordinates */
  camFromX: number;
  camFromY: number;
  t: number;
}

export class GameScene implements Scene {
  private readonly world = new World(WORLD);
  private readonly progress = new Progress();
  private banner: { title: string; hint: string; t: number } | null = null;
  private popup: { kind: CollectibleKind; t: number } | null = null;
  private current: RoomDef;
  private room: Room;
  private readonly fx = new Effects();
  private readonly player: Player;
  private respawnPoint: Point;
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
  private roomNameTimer = 0;
  private readonly pauseMenu: OptionList;

  private history: PlayerSnapshot[] = [];
  private rewinding: Rewinding | null = null;
  private transition: Transition | null = null;
  private rewindCooldown = 0;
  private slotsHud = 0;

  constructor(private readonly ctx: Ctx) {
    this.current = this.world.startRoom;
    this.room = new Room(this.current.level, this.current.maxEchoes);
    this.respawnPoint = this.current.level.spawn;
    this.player = new Player(this.room, this.fx, (name) => ctx.sfx(name), (a) => this.progress.has(a));
    this.pauseMenu = new OptionList(
      ctx,
      [
        { kind: "action", label: "RESUME", run: () => this.setPaused(false) },
        { kind: "action", label: "RESTART ROOM", run: () => this.restartRoom() },
        { kind: "action", label: "SETTINGS", run: () => ctx.scenes.go("settings") },
        { kind: "action", label: "MAIN MENU", run: () => ctx.scenes.go("main", { fade: true }) },
      ],
      { style: "center", cx: WIDTH / 2, y: 70, rowH: 16 },
    );
  }

  private get level(): Level {
    return this.current.level;
  }

  enter(from: ScreenName | null): void {
    if (from === "settings") return; // back from the pause menu's settings: keep the run
    this.ctx.audio.playMusic("vale");
    this.startRun();
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.ctx.audio.setDucked(paused);
  }

  /** A fresh run from the first room: checkpoints forgotten. */
  private startRun(): void {
    for (const r of this.world.rooms) for (const c of r.level.checkpoints) c.active = false;
    this.progress.reset(this.world.startAbilities, this.world.startEchoSlots);
    this.banner = this.popup = null;
    this.setRoom(this.world.startRoom);
    this.respawnPoint = this.level.spawn;
    this.restartRoom();
  }

  /** Back to the respawn point of the current room, room state reset. */
  private restartRoom(): void {
    this.setPaused(false);
    this.fx.clear();
    this.resetRoom();
    this.player.respawnAt(this.respawnPoint);
    this.respawnTimer = 0;
    this.transition = null;
    this.snapCamera();
  }

  /** Death, restart or leaving: echoes vanish, plates and doors reset, history is forgotten. */
  private resetRoom(): void {
    this.room.clearEchoes();
    this.level.doorsOpen = false;
    this.history = [];
    this.rewinding = null;
    this.rewindCooldown = 0;
  }

  /** Echoes allowed here: the room's limit, capped by what Iris's Eye can hold. */
  private echoLimit(def: RoomDef): number {
    return Math.min(def.maxEchoes, this.progress.echoSlots);
  }

  private setRoom(def: RoomDef): void {
    this.current = def;
    this.room = new Room(def.level, this.echoLimit(def));
    this.player.setCollider(this.room);
    this.resetRoom();
    this.roomNameTimer = ROOM_NAME_TIME;
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

    this.roomNameTimer = Math.max(0, this.roomNameTimer - dt);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    if (this.popup && (this.popup.t -= dt) <= 0) this.popup = null;
    if (this.transition) {
      this.updateTransition(dt);
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

    if (input.justPressed("rewind") && !p.dead && this.progress.has("rewind")) {
      if (this.history.length >= MIN_HISTORY && this.rewindCooldown <= 0 && this.room.maxEchoes > 0) {
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
    if (!p.dead && this.checkTransition()) return;
    if (!p.dead) {
      this.history.push(p.snapshot());
      if (this.history.length > HISTORY) this.history.shift();
      this.checkCheckpoints();
      this.checkCollectibles();
    }
    if (p.dead && !wasDead) {
      this.respawnTimer = RESPAWN_DELAY;
      if (this.ctx.settings.screenShake) this.shake = 0.25;
    }
    if (p.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.progress.dropPending(); // what wasn't secured at a checkpoint goes back
        this.resetRoom();
        p.respawnAt(this.respawnPoint);
        this.ctx.sfx("respawn");
        this.fx.burst(p.x + 4, p.y + 6, 14, { colors: [C.echo, C.echoLight, C.bone], speed: 50, life: 0.4 });
      }
    }

    if (this.room.update(dt, p.hitbox)) this.ctx.sfx(this.level.doorsOpen ? "doorOpen" : "doorClose");
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.updateCamera(dt);
  }

  // ------------------------------------------------------------------ rooms
  /** Walking off an edge into a neighbouring room starts a transition. */
  private checkTransition(): boolean {
    const p = this.player;
    const lv = this.level;
    const cx = p.x + 4;
    const cy = p.y + 6;
    if (cx >= 0 && cx < lv.width && cy >= 0 && cy < lv.height) return false;
    const next = this.world.roomAt(this.current.x + cx, this.current.y + cy, this.current);
    if (!next) return false;

    const from = this.current;
    const dx = from.x - next.x;
    const dy = from.y - next.y;
    this.transition = { from, camFromX: this.camX + dx, camFromY: this.camY + dy, t: 0 };
    p.shift(dx, dy);
    if (cy < 0) p.vy = Math.min(p.vy, -UP_BOOST);
    this.fx.clear();
    this.setRoom(next);

    // respawn: an active checkpoint in this room, else the spawn nearest to where Iris came in
    const active = next.level.checkpoints.find((c) => c.active);
    this.respawnPoint = active ?? next.level.nearestSpawn({ x: p.x + 4, y: p.y + 12 });
    this.focusY = p.y;
    return true;
  }

  private updateTransition(dt: number): void {
    const tr = this.transition!;
    tr.t = Math.min(1, tr.t + dt / TRANSITION_TIME);
    const k = tr.t < 0.5 ? 4 * tr.t ** 3 : 1 - (-2 * tr.t + 2) ** 3 / 2; // ease in-out
    const target = this.cameraTarget();
    this.camX = tr.camFromX + (target.x - tr.camFromX) * k;
    this.camY = tr.camFromY + (target.y - tr.camFromY) * k;
    if (tr.t >= 1) this.transition = null;
  }

  /** Touching a crystal makes it the respawn point and refills the dash and double jump. */
  private checkCheckpoints(): void {
    const p = this.player;
    for (const c of this.level.checkpoints) {
      if (!overlaps(p.hitbox, Level.checkpointRect(c))) continue;
      p.refill();
      this.securePending();
      if (c.active) continue;
      for (const r of this.world.rooms) for (const other of r.level.checkpoints) other.active = false;
      c.active = true;
      this.respawnPoint = { x: c.x, y: c.y };
      this.ctx.sfx("checkpoint");
      this.fx.burst(c.x, c.y - 9, 18, { colors: [COLORS.C, COLORS.e, COLORS.E, COLORS.W], speed: 60, life: 0.6 });
    }
  }

  // ------------------------------------------------------------------ collectibles
  private collectibleRect(e: Entity) {
    return { x: e.x - 6, y: e.y - 15, w: 12, h: 12 };
  }

  private checkCollectibles(): void {
    const p = this.player;
    for (const e of this.level.entities) {
      if (e.kind === "npc" || e.kind === "text" || e.kind === "lingering" || this.progress.taken(e.key)) continue;
      if (!overlaps(p.hitbox, this.collectibleRect(e))) continue;
      this.fx.burst(e.x, e.y - 9, 16, { colors: [COLORS.y, COLORS.Y, COLORS.W, COLORS.e], speed: 70, life: 0.5 });
      if (e.kind === "shard") {
        this.progress.secure(e.key, e.kind); // story items are kept at once
        this.unlock(String(e.props.unlocks ?? ""));
      } else {
        this.progress.pending.push({ key: e.key, kind: e.kind });
        this.ctx.sfx("echoAppear");
      }
    }
  }

  private unlock(what: string): void {
    const text = UNLOCK_TEXT[what];
    if (what === "echo") this.progress.echoSlots++;
    else if (text) this.progress.unlock(what as Ability);
    else console.warn(`Bell Shard with unknown "unlocks" value "${what}"`);
    this.room.maxEchoes = this.echoLimit(this.current);
    this.player.refill();
    this.player.power = 1;
    this.ctx.sfx("checkpoint");
    if (this.ctx.settings.screenShake) this.shake = 0.15;
    const b = this.ctx.settings.bindings;
    const keys = { dash: keyName(b.dash), rewind: keyName(b.rewind), jump: keyName(b.jump) };
    if (text) this.banner = { title: text.title, hint: text.hint(keys), t: BANNER_TIME };
    this.popup = { kind: "shard", t: POPUP_TIME };
  }

  /** Reaching a checkpoint keeps the collectibles picked up since the last one. */
  private securePending(): void {
    const kinds = this.progress.securePending();
    if (kinds.length) this.popup = { kind: kinds[kinds.length - 1], t: POPUP_TIME };
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
    const hitbox = { x: now.x, y: now.y, w: p.hitbox.w, h: p.hitbox.h };
    const inVoid = now.y > this.level.height;
    if (!inVoid && !this.level.solidAt(hitbox)) {
      const echo = new Echo(hitbox, now.frame, now.facing, now.x - 4, now.y - 4);
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

    // parallax backdrop follows the world camera, so it flows across rooms
    ctx.drawImage(img.sky, 0, 0);
    this.layer(img.mountains, manifest.backgrounds.mountains.parallax, camX + this.current.x, camY + this.current.y);
    this.layer(img.hills, manifest.backgrounds.hills.parallax, camX + this.current.x, camY + this.current.y);
    if (this.transition?.from.indoor) this.backWall(this.transition.from, camX, camY);
    if (this.current.indoor) this.backWall(this.current, camX, camY);

    if (this.transition) {
      const from = this.transition.from;
      from.level.render(draw, camX - (from.x - this.current.x), camY - (from.y - this.current.y), WIDTH, HEIGHT);
    }
    this.level.render(draw, camX, camY, WIDTH, HEIGHT);
    this.renderEntities(camX, camY);
    for (const e of this.room.echoes) e.render(draw, camX, camY);
    this.fx.renderBehind(draw, camX, camY);
    if (this.rewinding) this.renderRewind(camX, camY);
    else this.player.render(draw, camX, camY);
    this.fx.renderFront(draw, camX, camY);

    // falling into the void: the screen dims, there's still time to rewind
    const p = this.player;
    if (p.voidTime > 0 && !p.dead) draw.rect(0, 0, WIDTH, HEIGHT, C.void, Math.min(0.6, (p.voidTime / TUNING.voidGrace) * 0.6));

    this.renderPending(camX, camY);
    this.renderSlots();
    this.renderRoomName();
    this.renderPopup();
    this.renderBanner();
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

  private renderEntities(camX: number, camY: number): void {
    const { draw } = this.ctx;
    const p = this.player;
    const near = (x: number, y: number) => Math.hypot(p.x + 4 - x, p.y + 6 - y) < TALK_RANGE;
    const keys = this.keyLabels();
    for (const e of this.level.entities) {
      if (e.kind === "text") {
        // tutorial text in the world, fading in as Iris gets close
        const d = Math.hypot(p.x + 4 - e.x, p.y + 6 - e.y);
        const a = Math.max(0, Math.min(1, (140 - d) / 60));
        if (a > 0) {
          draw.ctx.globalAlpha = a;
          const text = String(e.props.text ?? "").replace(/\{(\w+)\}/g, (_, k: string) => keys[k] ?? k.toUpperCase());
          draw.text(text, e.x - camX, e.y - camY, C.bone, { align: "center" });
          draw.ctx.globalAlpha = 1;
        }
        continue;
      }
      if (e.kind === "lingering") {
        // a villager frozen in the Stilling: a faint echo with a thought
        const shimmer = 0.4 + 0.1 * Math.sin(this.t * 2 + e.x);
        draw.frame(draw.img.npc, 0, e.x - 8 - camX, e.y - 24 - camY, { fh: 24, alpha: shimmer, flip: e.props.flip === true });
        if (near(e.x, e.y - 12)) draw.text(String(e.props.text ?? "..."), e.x - camX, e.y - 34 - camY, C.echoLight, { align: "center" });
        continue;
      }
      if (e.kind === "npc") {
        const blink = Math.floor(this.t * 2 + e.x) % 7 === 0 ? 1 : 0;
        draw.frame(draw.img.npc, blink, e.x - 8 - camX, e.y - 24 - camY, { fh: 24, flip: p.x + 4 < e.x });
        if (near(e.x, e.y - 12)) draw.text(String(e.props.name ?? "???"), e.x - camX, e.y - 34 - camY, C.bone, { align: "center" });
        continue;
      }
      if (this.progress.taken(e.key)) continue;
      const bob = Math.round(Math.sin(this.t * 3 + e.x * 0.1) * 2);
      draw.frame(draw.img.collectibles, COLLECTIBLE_FRAME[e.kind], e.x - 8 - camX, e.y - 18 + bob - camY);
    }
    for (const c of this.level.checkpoints) {
      if (c.kind === "shrine" && near(c.x, c.y - 14)) draw.text("BELL SHRINE", c.x - camX, c.y - 42 - camY, C.gold, { align: "center" });
    }
  }

  /** Current key names, for {jump}-style placeholders in tutorial texts. */
  private keyLabels(): Record<string, string> {
    const b = this.ctx.settings.bindings;
    const out: Record<string, string> = {};
    for (const [action, code] of Object.entries(b)) out[action] = keyName(code);
    return out;
  }

  /** Collectibles not secured yet float above Iris until the next checkpoint. */
  private renderPending(camX: number, camY: number): void {
    const pending = this.progress.pending;
    if (!pending.length || this.player.dead) return;
    const { draw } = this.ctx;
    pending.forEach((item, i) => {
      const x = this.player.x + 4 - 8 + (i - (pending.length - 1) / 2) * 10;
      const y = this.player.y - 18 + Math.round(Math.sin(this.t * 4 + i) * 1.5);
      draw.frame(draw.img.collectibles, COLLECTIBLE_FRAME[item.kind], x - camX, y - camY, { alpha: 0.75 });
    });
  }

  /** "+1 LOST PAGE  3" in the top-right corner. */
  private renderPopup(): void {
    if (!this.popup) return;
    const { draw } = this.ctx;
    const { kind, t } = this.popup;
    const slide = Math.min(1, (POPUP_TIME - t) * 6, t * 3);
    const x = WIDTH - 4 - Math.round(slide * 100);
    draw.ctx.globalAlpha = slide;
    draw.frame(draw.img.collectibles, COLLECTIBLE_FRAME[kind], x, 4);
    draw.text(`${COLLECTIBLE_NAME[kind]} ${this.progress.count(kind)}`, x + 18, 9, C.bone);
    draw.ctx.globalAlpha = 1;
  }

  /** Big centred text when an ability is unlocked. */
  private renderBanner(): void {
    if (!this.banner) return;
    const { draw } = this.ctx;
    const { title, hint, t } = this.banner;
    const a = Math.min(1, (BANNER_TIME - t) * 4, t * 2);
    draw.ctx.globalAlpha = a;
    draw.rect(0, 52, WIDTH, 34, C.void, 0.7);
    draw.text(title, WIDTH / 2, 58, C.echoLight, { align: "center" });
    draw.text(hint, WIDTH / 2, 72, C.bone, { align: "center" });
    draw.ctx.globalAlpha = 1;
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

  /** Room name fades in at the bottom-left when entering a room. */
  private renderRoomName(): void {
    if (this.roomNameTimer <= 0) return;
    const alpha = Math.min(1, this.roomNameTimer * 2, (ROOM_NAME_TIME - this.roomNameTimer) * 4);
    this.ctx.draw.ctx.globalAlpha = alpha;
    this.ctx.draw.text(this.current.title.toUpperCase(), 6, HEIGHT - 12, C.ash);
    this.ctx.draw.ctx.globalAlpha = 1;
  }

  /** Indoor rooms: a dark stone back wall over the room's area (scrolls with the room). */
  private backWall(def: RoomDef, camX: number, camY: number): void {
    const { draw } = this.ctx;
    const ox = def.x - this.current.x - camX;
    const oy = def.y - this.current.y - camY;
    const x0 = Math.max(0, ox);
    const y0 = Math.max(0, oy);
    const x1 = Math.min(WIDTH, ox + def.level.width);
    const y1 = Math.min(HEIGHT, oy + def.level.height);
    if (x1 <= x0 || y1 <= y0) return;
    draw.rect(x0, y0, x1 - x0, y1 - y0, C.void);
    draw.ctx.save();
    draw.ctx.beginPath();
    draw.ctx.rect(x0, y0, x1 - x0, y1 - y0);
    draw.ctx.clip();
    const start = (v: number) => Math.floor(-v / 16) * 16 + v;
    for (let y = start(oy); y < y1; y += 16)
      for (let x = start(ox); x < x1; x += 16) draw.frame(draw.img.tiles, 0, x, y, { alpha: 0.28 });
    draw.ctx.restore();
  }

  /** Layers scroll with the camera at their parallax factor and stay anchored to the screen bottom. */
  private layer(image: HTMLImageElement, parallax: number, worldCamX: number, worldCamY: number): void {
    const w = image.width;
    const x = -(((Math.round(worldCamX * parallax) % w) + w) % w);
    const y = HEIGHT - image.height + Math.round(-worldCamY * parallax * 0.3) + 8;
    this.ctx.draw.ctx.drawImage(image, x, y);
    this.ctx.draw.ctx.drawImage(image, x + w, y);
  }

  private renderDebug(camX: number, camY: number): void {
    const { draw } = this.ctx;
    const p = this.player;
    const hb = p.hitbox;
    draw.rect(hb.x - camX, hb.y - camY, hb.w, hb.h, C.gold, 0.5);
    for (const e of this.room.echoes) draw.rect(e.hitbox.x - camX, e.hitbox.y - camY, e.hitbox.w, e.hitbox.h, e.armed ? C.echo : C.slate, 0.5);
    draw.rect(this.respawnPoint.x - 1 - camX, this.respawnPoint.y - 2 - camY, 3, 3, C.gold);
    const lines = [
      `ROOM ${this.current.name.toUpperCase()}  STATE ${p.state.toUpperCase()}`,
      `VX ${Math.round(p.vx)} VY ${Math.round(p.vy)}`,
      `DASH ${p.canDash ? "READY" : "USED"}  2ND JUMP ${p.canDoubleJump ? "READY" : "USED"}`,
      `ECHOES ${this.room.echoes.length}/${this.room.maxEchoes}  HISTORY ${(this.history.length * STEP).toFixed(1)}S`,
      `ABILITIES ${[...this.progress.abilities].join(" ").toUpperCase() || "NONE"}`,
    ];
    lines.forEach((l, i) => draw.text(l, 4, 18 + i * 9, C.bone));
  }
}
