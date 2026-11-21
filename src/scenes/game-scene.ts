import { C, COLORS, HEIGHT, STEP, WIDTH, manifest } from "../config";
import { Conversation } from "../game/dialogue";
import { NPC_DIALOGUES, lingeringLine } from "../game/dialogues";
import { Echo } from "../game/echo";
import { Level, overlaps, type Entity, type Exit, type Point } from "../game/level";
import { Progress, type Ability, type CollectibleKind } from "../game/progress";
import { keyName } from "../engine/input";
import { Effects } from "../game/particles";
import { Player, TUNING, type PlayerSnapshot } from "../game/player";
import { Room } from "../game/room";
import type { SaveData } from "../game/save";
import type { MechEvent, MechSnapshot } from "../game/mechanics";
import { CHAPTERS, chapterDef } from "../game/chapters";
import { World, type RoomDef } from "../game/world";
import { MOMENT_COUNT, MomentScene } from "../game/lumi";
import { travelTargets, shrineKey, visitedChapters, type ShrineSpot } from "../game/map";
import { drawDialogueBox } from "../ui/dialogue-box";
import { MapScreen } from "../ui/map-screen";
import { OptionList } from "../ui/option-list";
import type { Ctx, Scene, ScreenName } from "./scene";

/** every chapter by default, or only ?world=playground (the movement test rooms) */
const ONLY_WORLD = new URLSearchParams(location.search).get("world");
const TRAVEL_FADE = 0.35; // s, each way
const CHAPTER_CARD_TIME = 2.5; // s the chapter title stays on black (first entry only)
const CARD_SKIP_AFTER = 0.4; // s before the card can be skipped (so a held jump doesn't skip it)
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
  /** crumble stones and flowers as they were at the oldest recorded step (restored on landing) */
  mech: MechSnapshot;
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
  /** every chapter, built up front (rooms are small): lit shrines and maps of other chapters just work */
  private readonly worlds = new Map((ONLY_WORLD ? [ONLY_WORLD] : CHAPTERS.map((c) => c.id)).map((id) => [id, new World(id)]));
  /** the chapter Iris is in */
  private world: World = this.firstWorld;
  private readonly progress = new Progress();
  private banner: { title: string; hint: string; t: number } | null = null;
  private popup: { kind: CollectibleKind; t: number } | null = null;
  private current: RoomDef;
  private room: Room;
  private readonly fx = new Effects();
  private readonly player: Player;
  private respawnPoint: Point;
  /** last crystal / shrine touched in each room: where Iris comes back when she returns there */
  private readonly lastCheckpoint = new Map<string, Point>();
  private camX = 0;
  private camY = 0;
  private lookAhead = 0;
  private focusY = 0; // vertical point the camera follows (last footing, or lower when falling)
  private freeze = 0;
  private shake = 0;
  private respawnTimer = 0;
  private paused = false;
  /** the conversation on screen, if any (Iris waits while it is open) */
  private conversation: Conversation | null = null;
  /** NPCs already talked to this run: they say their short repeat line next time */
  private readonly talked = new Set<string>();
  /** rooms entered at least once this save (for the map) */
  private readonly visited = new Set<string>();
  /** chapters whose whole map Quill revealed */
  private readonly revealed = new Set<string>();
  private readonly map: MapScreen;
  private mapOpen = false;
  /** a Lumi's Moment playing (Iris waits) */
  private moment: { scene: MomentScene; x: number; y: number } | null = null;
  /** fast travel in progress: fading out, then in at the destination */
  private fastTravel: { t: number; target: ShrineSpot; arrived: boolean } | null = null;
  /** walking through a chapter exit: fade out, chapter card (first visit), fade in */
  private chapterChange: { t: number; exit: Exit; arrived: boolean; card: number; cardT: number } | null = null;
  /** seconds of actual play on this save */
  private playTime = 0;
  private debug = false;
  private t = 0;
  private roomNameTimer = 0;
  private readonly pauseMenu: OptionList;

  private history: PlayerSnapshot[] = [];
  /** Iris is inside a Drift zone (music muffled) */
  private inDrift = false;
  /** mechanics state recorded alongside `history`, step for step */
  private mechHistory: MechSnapshot[] = [];
  private rewinding: Rewinding | null = null;
  private transition: Transition | null = null;
  private rewindCooldown = 0;
  private slotsHud = 0;

  constructor(private readonly ctx: Ctx) {
    this.current = this.world.startRoom;
    this.room = new Room(this.current.level, this.current.maxEchoes);
    this.respawnPoint = this.current.level.spawn;
    this.player = new Player(this.room, this.fx, (name) => ctx.sfx(name), (a) => this.progress.has(a));
    this.map = new MapScreen(ctx.draw);
    this.pauseMenu = new OptionList(
      ctx,
      [
        { kind: "action", label: "RESUME", run: () => this.setPaused(false) },
        { kind: "action", label: "MAP", run: () => this.openMap() },
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

  private get firstWorld(): World {
    return this.worlds.values().next().value!;
  }

  /** Rooms of every chapter (save state spans them all). */
  private allRooms(): RoomDef[] {
    return [...this.worlds.values()].flatMap((w) => w.rooms);
  }

  private playChapterMusic(): void {
    this.ctx.audio.playMusic(chapterDef(this.world.id)?.music ?? "vale");
  }

  enter(from: ScreenName | null): void {
    if (from === "settings") return; // back from the pause menu's settings: keep the run
    this.startRun(this.ctx.session.data);
    this.playChapterMusic();
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.ctx.audio.setDucked(paused);
  }

  /** A run from a save (or a new game from the first room when there is none). */
  private startRun(save: SaveData | null = null): void {
    for (const r of this.allRooms()) for (const c of r.level.checkpoints) c.active = false;
    this.lastCheckpoint.clear();
    this.talked.clear();
    this.visited.clear();
    this.revealed.clear();
    this.mapOpen = false;
    this.fastTravel = null;
    this.chapterChange = null;
    this.moment = null;
    this.conversation = null;
    this.banner = this.popup = null;
    this.playTime = save?.playTime ?? 0;
    if (!save) {
      this.world = this.firstWorld;
      this.progress.reset(this.world.startAbilities, this.world.startEchoSlots);
      this.setRoom(this.world.startRoom);
      this.respawnPoint = this.level.spawn;
      this.restartRoom();
      return;
    }
    this.progress.restore(save.abilities, save.echoSlots, save.secured);
    const lit = new Set(save.lit);
    for (const r of this.allRooms()) r.level.checkpoints.forEach((c, i) => (c.active = lit.has(`${r.name}:${i}`)));
    for (const [room, point] of Object.entries(save.lastCheckpoint)) this.lastCheckpoint.set(room, point);
    for (const key of save.talked) this.talked.add(key);
    for (const name of save.visited) this.visited.add(name);
    for (const chapter of save.revealed ?? []) this.revealed.add(chapter);
    // a chapter or room that isn't there (removed since, or a ?world= run): back to the start
    const room = this.worlds.get(save.chapter)?.room(save.room) ?? null;
    this.world = room ? this.worlds.get(save.chapter)! : this.firstWorld;
    this.setRoom(room ?? this.world.startRoom);
    this.respawnPoint = room ? save.point : this.level.spawn;
    this.restartRoom();
  }

  /** Everything needed to resume later, at the current respawn point. */
  private buildSave(): SaveData {
    const lit: string[] = [];
    for (const r of this.allRooms()) r.level.checkpoints.forEach((c, i) => c.active && lit.push(`${r.name}:${i}`));
    return {
      version: 2,
      chapter: this.world.id,
      room: this.current.name,
      roomTitle: this.current.title,
      point: { ...this.respawnPoint },
      abilities: [...this.progress.abilities],
      echoSlots: this.progress.echoSlots,
      secured: this.progress.securedEntries(),
      lit,
      lastCheckpoint: Object.fromEntries(this.lastCheckpoint),
      talked: [...this.talked],
      visited: [...this.visited],
      revealed: [...this.revealed],
      playTime: Math.round(this.playTime),
      savedAt: Date.now(),
    };
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
    this.level.mech.reset();
    this.history = [];
    this.mechHistory = [];
    this.rewinding = null;
    this.rewindCooldown = 0;
  }

  /** Echoes allowed here: the room's limit, capped by what Iris's Eye can hold. */
  private echoLimit(def: RoomDef): number {
    return Math.min(def.maxEchoes, this.progress.echoSlots);
  }

  private setRoom(def: RoomDef): void {
    this.current = def;
    this.visited.add(def.name);
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
    this.playTime += dt;
    if (this.fastTravel) {
      this.updateFastTravel(dt);
      return;
    }
    if (this.chapterChange) {
      this.updateChapterChange(dt);
      return;
    }
    if (this.moment) {
      this.updateMoment(dt);
      return;
    }
    if (this.mapOpen) {
      const r = this.map.update(dt, input);
      if (r && "travel" in r) this.startFastTravel(r.travel);
      else if (r) this.closeMap();
      return;
    }
    if (this.conversation) {
      this.updateConversation(dt);
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

    const target = this.talkTarget();
    if (target && input.justPressed("interact")) {
      this.openConversation(target);
      return;
    }
    if (input.justPressed("map") && !p.dead) {
      this.openMap();
      return;
    }

    const wasDead = p.dead;
    p.update(dt, input);
    if (p.freeze > 0) {
      this.freeze = p.freeze;
      p.freeze = 0;
    }
    if (!p.dead && this.checkTransition()) return;
    if (!p.dead && this.checkExit()) return;
    if (!p.dead) {
      this.history.push(p.snapshot());
      this.mechHistory.push(this.level.mech.snapshot());
      if (this.history.length > HISTORY) {
        this.history.shift();
        this.mechHistory.shift();
      }
      this.checkCheckpoints();
      this.checkCollectibles();
      const flower = this.level.mech.useFlower(p.hitbox, p.canDash);
      if (flower >= 0) {
        p.refillDash();
        this.onFlowerUsed(flower);
      }
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

    const roomStep = this.room.update(dt, p.hitbox, p.dead ? 0 : p.wallSide);
    if (roomStep.doorsChanged) this.ctx.sfx(this.level.doorsOpen ? "doorOpen" : "doorClose");
    this.onMechEvents(roomStep.events);
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
    // respawn: the last crystal touched in this room, else the spawn nearest to where Iris came in
    this.respawnPoint = this.lastCheckpoint.get(next.name) ?? next.level.nearestSpawn({ x: p.x + 4, y: p.y + 12 });
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

  /**
   * Touching a crystal lights it for good, makes it the respawn point (also when coming
   * back to this room later) and refills the dash and double jump.
   */
  private checkCheckpoints(): void {
    const p = this.player;
    for (const c of this.level.checkpoints) {
      if (!overlaps(p.hitbox, Level.checkpointRect(c))) continue;
      p.refill();
      const hadPending = this.progress.pending.length > 0;
      this.securePending();
      const point = { x: c.x, y: c.y };
      const before = this.lastCheckpoint.get(this.current.name);
      this.respawnPoint = point;
      this.lastCheckpoint.set(this.current.name, point);
      const moved = !before || before.x !== point.x || before.y !== point.y;
      const lighting = !c.active;
      c.active = true;
      // auto-save (crystals and shrines alike), only when something changed
      if (lighting || moved || hadPending) this.ctx.saves.write(this.ctx.session.slot, this.buildSave());
      if (!lighting) continue; // already lit: just moves the respawn point here
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
      } else if (e.kind === "moment") {
        this.progress.secure(e.key, e.kind); // a memory, kept at once
        this.startMoment(e);
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
    this.rewinding = { path: [...this.history].reverse(), mech: this.mechHistory[0], t: 0 };
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

    // stones and flowers go back too, but never reform inside Iris (where she lands) or an echo
    const landing = { x: past.x, y: past.y, w: p.hitbox.w, h: p.hitbox.h };
    this.level.mech.restoreAfterRewind(rw.mech, [landing, ...this.room.echoes.map((e) => e.hitbox)]);
    p.restore(past);
    this.history = [];
    this.mechHistory = [];
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
    this.renderDecor("back", camX, camY);
    this.level.render(draw, camX, camY, WIDTH, HEIGHT);
    this.renderAir(camX, camY);
    this.renderDecor("mid", camX, camY);
    this.level.renderMechanics(draw, camX, camY);
    this.level.renderCheckpoints(draw, camX, camY);
    this.renderEntities(camX, camY);
    for (const e of this.room.echoes) e.render(draw, camX, camY);
    this.fx.renderBehind(draw, camX, camY);
    if (this.rewinding) this.renderRewind(camX, camY);
    else this.player.render(draw, camX, camY);
    this.renderDecor("front", camX, camY);
    this.fx.renderFront(draw, camX, camY);
    this.renderAmbient(camX, camY);

    // falling into the void: the screen dims, there's still time to rewind
    const p = this.player;
    if (p.voidTime > 0 && !p.dead) draw.rect(0, 0, WIDTH, HEIGHT, C.void, Math.min(0.6, (p.voidTime / TUNING.voidGrace) * 0.6));

    this.renderPending(camX, camY);
    this.renderSlots();
    this.renderRoomName();
    this.renderPopup();
    this.renderBanner();
    if (this.debug) this.renderDebug(camX, camY);
    this.renderMoment(camX, camY);
    if (this.conversation) drawDialogueBox(draw, this.conversation, this.t);
    if (this.mapOpen) this.map.render(this.t);
    if (this.fastTravel) {
      const k = this.fastTravel.t / TRAVEL_FADE;
      draw.rect(0, 0, WIDTH, HEIGHT, COLORS.e, Math.max(0, Math.min(1, k < 1 ? k : 2 - k)) * 0.9);
    }
    if (this.chapterChange) this.renderChapterChange();

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

  // ------------------------------------------------------------------ dialogues
  /** The NPC or Lingering villager Iris can talk to right now. */
  private talkTarget(): Entity | null {
    const p = this.player;
    if (p.dead || !p.grounded || this.conversation) return null;
    let best: Entity | null = null;
    let bestD = TALK_RANGE;
    for (const e of this.level.entities) {
      if (e.kind !== "npc" && e.kind !== "lingering") continue;
      const d = Math.hypot(p.x + 4 - e.x, p.y + 6 - (e.y - 12));
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  private openConversation(e: Entity): void {
    let lines;
    if (e.kind === "lingering") {
      lines = lingeringLine(String(e.props.text ?? "..."));
    } else {
      const script = NPC_DIALOGUES[String(e.props.name ?? "")];
      if (!script) return;
      lines = this.talked.has(e.key) ? script.repeat() : script.first();
      this.talked.add(e.key);
    }
    this.conversation = new Conversation(lines);
    this.ctx.audio.setDucked(true);
    this.ctx.sfx("select");
  }

  private updateConversation(dt: number): void {
    const { input } = this.ctx;
    const conv = this.conversation!;
    if (input.justPressed("pause")) conv.skip();
    else if (input.justPressed("jump") || input.justPressed("interact")) conv.confirm();
    else if (input.justPressed("up")) conv.move(-1);
    else if (input.justPressed("down")) conv.move(1);
    if (conv.update(dt).blip) this.ctx.audio.blip(conv.line.speaker.voice);
    if (conv.done) {
      this.conversation = null;
      if (conv.effects.includes("revealMap") && !this.revealed.has(this.world.id)) {
        this.revealed.add(this.world.id);
        this.ctx.saves.write(this.ctx.session.slot, this.buildSave());
      }
      this.ctx.audio.setDucked(false);
      this.player.cancelJumpBuffer();
    }
  }

  // ------------------------------------------------------------------ Lumi's moments
  private startMoment(e: Entity): void {
    // Lumi appears a step away from Iris, not on top of her
    const side = this.player.x + 4 < e.x ? 1 : -1;
    this.moment = { scene: new MomentScene(Number(e.props.index ?? 1)), x: e.x + side * 12, y: e.y };
    this.ctx.audio.setDucked(true);
    this.ctx.sfx("echoAppear");
    this.fx.burst(e.x, e.y - 14, 24, { colors: [COLORS.e, COLORS.E, COLORS.C], speed: 40, life: 1, gravity: -20 });
  }

  private updateMoment(dt: number): void {
    const { input } = this.ctx;
    const m = this.moment!;
    if (input.justPressed("jump") || input.justPressed("interact")) m.scene.skip();
    if (m.scene.update(dt).blip) this.ctx.audio.blip("lingering");
    this.fx.update(dt);
    if (Math.random() < dt * 6 * m.scene.alpha) {
      this.fx.burst(m.x + (Math.random() - 0.5) * 20, m.y - 10 - Math.random() * 30, 1, { colors: [COLORS.e, COLORS.E], speed: 8, life: 1.2, gravity: -10 });
    }
    if (m.scene.done) {
      this.moment = null;
      this.ctx.audio.setDucked(false);
      this.player.cancelJumpBuffer();
      this.popup = { kind: "moment", t: POPUP_TIME };
      this.ctx.saves.write(this.ctx.session.slot, this.buildSave());
    }
  }

  /** Lumi as an echo, her kite on its string, and her line. */
  private renderMoment(camX: number, camY: number): void {
    const m = this.moment;
    if (!m) return;
    const { draw } = this.ctx;
    const a = m.scene.alpha;
    draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.35 * a);
    const x = Math.round(m.x - camX);
    const y = Math.round(m.y - camY);
    const sway = Math.sin(this.t * 1.6);
    const kx = x + 18 + Math.round(sway * 3);
    const ky = y - 52 + Math.round(Math.cos(this.t * 1.3) * 2);
    draw.ctx.globalAlpha = a * 0.6;
    draw.ctx.strokeStyle = COLORS.e;
    draw.ctx.beginPath();
    draw.ctx.moveTo(x + 3.5, y - 19.5);
    draw.ctx.quadraticCurveTo(x + 14, y - 28, kx + 0.5, ky + 12.5);
    draw.ctx.stroke();
    draw.ctx.globalAlpha = a * 0.75;
    draw.frame(draw.img.lumi, Math.floor(this.t * 3) % 2, x - 8, y - 24, { fh: 24 });
    draw.frame(draw.img.collectibles, COLLECTIBLE_FRAME.moment, kx - 8, ky - 4);
    draw.ctx.globalAlpha = a;
    if (m.scene.shown) this.label(m.scene.shown, x, y - 66, C.echoLight);
    draw.ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ map & fast travel
  private shrines(): ShrineSpot[] {
    const out: ShrineSpot[] = [];
    for (const r of this.allRooms())
      r.level.checkpoints.forEach((c, i) => c.kind === "shrine" && out.push({ chapter: r.chapter, room: r.name, index: i, x: r.x + c.x, y: r.y + c.y }));
    return out;
  }

  private litCheckpoints(): Set<string> {
    const lit = new Set<string>();
    for (const r of this.allRooms()) r.level.checkpoints.forEach((c, i) => c.active && lit.add(`${r.name}:${i}`));
    return lit;
  }

  /** The shrine Iris stands at (alive and on the ground), if any. */
  private shrineHere(): string | null {
    const p = this.player;
    if (p.dead || !p.grounded) return null;
    const i = this.level.checkpoints.findIndex((c) => c.kind === "shrine" && overlaps(p.hitbox, Level.checkpointRect(c)));
    return i >= 0 ? shrineKey({ room: this.current.name, index: i }) : null;
  }

  private openMap(): void {
    this.setPaused(false);
    const lit = this.litCheckpoints();
    const here = this.shrineHere();
    const targets = here ? travelTargets(this.shrines(), lit, here) : [];
    const keys = this.keyLabels();
    const roomChapter = new Map(this.allRooms().map((r) => [r.name, r.chapter]));
    const chapters = visitedChapters(this.visited, (name) => roomChapter.get(name) ?? null).map((id) => {
      const def = chapterDef(id);
      return { id, number: def?.number ?? 0, title: def?.title ?? id.toUpperCase(), rooms: this.worlds.get(id)!.rooms, revealed: this.revealed.has(id) };
    });
    this.map.open({
      chapters,
      current: this.world.id,
      visited: this.visited,
      lit,
      player: { x: this.current.x + this.player.x + 4, y: this.current.y + this.player.y + 12 },
      currentRoom: this.current.name,
      travel: targets.length > 0 ? targets : null,
      keys: { map: keys.map, jump: keys.jump },
    });
    this.mapOpen = true;
    this.ctx.audio.setDucked(true);
    this.ctx.sfx("pause");
  }

  private closeMap(): void {
    this.mapOpen = false;
    this.ctx.audio.setDucked(false);
    this.ctx.sfx("back");
    this.player.cancelJumpBuffer();
  }

  private startFastTravel(target: ShrineSpot): void {
    this.mapOpen = false;
    this.fastTravel = { t: 0, target, arrived: false };
    this.ctx.sfx("checkpoint"); // the shrine bell rings
  }

  private updateFastTravel(dt: number): void {
    const ft = this.fastTravel!;
    ft.t += dt;
    if (!ft.arrived && ft.t >= TRAVEL_FADE) {
      ft.arrived = true;
      const world = this.worlds.get(ft.target.chapter)!;
      const room = world.room(ft.target.room)!;
      this.arriveAt(world, room, { x: ft.target.x - room.x, y: ft.target.y - room.y });
      this.ctx.audio.setDucked(false);
      this.ctx.sfx("checkpoint"); // the bell there answers
      this.ctx.saves.write(this.ctx.session.slot, this.buildSave());
    }
    if (ft.t >= TRAVEL_FADE * 2) this.fastTravel = null;
  }

  /** Feedback for crumble stones and regrowing flowers. */
  private onMechEvents(events: MechEvent[]): void {
    for (const e of events) {
      if (e.kind === "regrow") {
        const f = this.level.flowers[e.flower];
        this.fx.burst(f.x, f.y, 4, { colors: [COLORS.M, COLORS.n], speed: 20, life: 0.3 });
        continue;
      }
      const run = this.level.mech.runs[e.run].rect;
      if (e.kind === "shake") {
        this.ctx.sfx("crumbleShake");
        this.fx.burst(run.x + run.w / 2, run.y, 3, { colors: [COLORS["3"], COLORS["4"]], speed: 20, life: 0.3, gravity: 200 });
      } else if (e.kind === "fall") {
        this.ctx.sfx("crumbleFall");
        for (let x = run.x + 4; x < run.x + run.w; x += 8)
          this.fx.burst(x, run.y + 8, 3, { colors: [COLORS["2"], COLORS["3"], COLORS["4"], COLORS.K], speed: 40, life: 0.7, gravity: 400 });
      } else {
        this.ctx.sfx("crumbleReform");
        this.fx.burst(run.x + run.w / 2, run.y + 8, 5, { colors: [COLORS["4"], COLORS.g], speed: 25, life: 0.3 });
      }
    }
    // Drift: entering muffles the music, leaving clears it
    const inDrift = !this.player.dead && this.level.fieldAt(this.player.hitbox).gravity < 1;
    if (inDrift !== this.inDrift) {
      this.inDrift = inDrift;
      this.ctx.audio.setFiltered(inDrift);
      if (inDrift) this.ctx.sfx("driftIn");
    }
  }

  /** Feedback for a flower just used: petals and a pop. */
  private onFlowerUsed(index: number): void {
    const f = this.level.flowers[index];
    this.ctx.sfx("flower");
    this.fx.burst(f.x, f.y, 10, { colors: [COLORS.P, COLORS.q, COLORS.p], speed: 45, life: 0.5, gravity: 60 });
  }

  /** The air you can see: rising streaks over vents; Drift zones' tint, shimmering outline and slow motes. */
  private renderAir(camX: number, camY: number): void {
    const { draw } = this.ctx;
    const t = this.t;
    for (const v of this.level.vents) {
      const n = Math.max(4, Math.round((v.w / 16) * 6));
      for (let i = 0; i < n; i++) {
        const seed = i * 53.7 + v.x;
        const h = v.h - 6;
        const y = v.y + v.h - 6 - ((t * (90 + (i % 3) * 25) + seed * 7) % h);
        const x = v.x + 2 + ((seed * 13.1) % (v.w - 4));
        draw.rect(Math.round(x - camX), Math.round(y - camY), 1, 6, COLORS.W, 0.5 * Math.min(1, (y - v.y) / 24));
      }
    }
    for (const d of this.level.drifts) {
      draw.rect(Math.round(d.x - camX), Math.round(d.y - camY), d.w, d.h, COLORS.c, 0.12);
      const off = Math.floor(t * 6) % 4;
      for (let x = off; x < d.w; x += 4) {
        draw.rect(Math.round(d.x + x - camX), Math.round(d.y - camY), 1, 1, COLORS.C, 0.55);
        draw.rect(Math.round(d.x + d.w - 1 - x - camX), Math.round(d.y + d.h - 1 - camY), 1, 1, COLORS.C, 0.55);
      }
      for (let y = off; y < d.h; y += 4) {
        draw.rect(Math.round(d.x + d.w - 1 - camX), Math.round(d.y + y - camY), 1, 1, COLORS.C, 0.55);
        draw.rect(Math.round(d.x - camX), Math.round(d.y + d.h - 1 - y - camY), 1, 1, COLORS.C, 0.55);
      }
      const motes = Math.round((d.w * d.h) / 1600);
      for (let i = 0; i < motes; i++) {
        const seed = i * 71.3 + d.y;
        const x = d.x + ((seed * 17.9) % d.w) + Math.sin(t * 0.8 + seed) * 4;
        const y = d.y + ((t * (6 + (i % 4) * 2) + seed * 11) % d.h);
        draw.rect(Math.round(x - camX), Math.round(y - camY), 1, 1, COLORS.e, 0.6);
      }
    }
  }

  /**
   * Puts Iris at a point of a room, in its chapter (switching chapter and music if needed).
   * `checkpoint`: the point is a shrine (fast travel) and becomes the room's checkpoint; an exit's
   * arrival spawn is not, so the room keeps its last crystal / shrine.
   */
  private arriveAt(world: World, room: RoomDef, point: Point, checkpoint = true): void {
    this.world = world;
    this.setRoom(room);
    this.respawnPoint = point;
    if (checkpoint) this.lastCheckpoint.set(room.name, point);
    this.restartRoom();
    this.playChapterMusic(); // same track: keeps playing
  }

  // ------------------------------------------------------------------ chapters
  /** Touching a chapter exit starts the change of chapter. */
  private checkExit(): boolean {
    const exit = this.level.exits.find((e) => overlaps(this.player.hitbox, e));
    if (!exit) return false;
    const world = this.worlds.get(exit.chapter);
    const room = world?.room(exit.room);
    if (!world || !room) return false; // that chapter isn't loaded (a ?world= run)
    const firstVisit = !world.rooms.some((r) => this.visited.has(r.name));
    this.chapterChange = { t: 0, exit, arrived: false, card: firstVisit ? CHAPTER_CARD_TIME : 0, cardT: 0 };
    return true;
  }

  private updateChapterChange(dt: number): void {
    const cc = this.chapterChange!;
    const { input } = this.ctx;
    if (!cc.arrived) {
      cc.t = Math.min(TRAVEL_FADE, cc.t + dt);
      if (cc.t < TRAVEL_FADE) return;
      cc.arrived = true;
      const world = this.worlds.get(cc.exit.chapter)!;
      const room = world.room(cc.exit.room)!;
      this.arriveAt(world, room, room.level.spawns[cc.exit.spawn] ?? room.level.spawn, false);
      this.ctx.saves.write(this.ctx.session.slot, this.buildSave());
      return;
    }
    if (cc.card > 0) {
      cc.card -= dt;
      cc.cardT += dt;
      if (cc.cardT > CARD_SKIP_AFTER && (input.justPressed("jump") || input.justPressed("interact"))) cc.card = 0;
      if (cc.card <= 0) this.player.cancelJumpBuffer();
      return;
    }
    cc.t += dt;
    if (cc.t >= TRAVEL_FADE * 2) this.chapterChange = null;
  }

  /** The fade, and on black the chapter card: "CHAPTER 1" small, "STARFALL RUINS" twice as big. */
  private renderChapterChange(): void {
    const { draw } = this.ctx;
    const cc = this.chapterChange!;
    const k = cc.t / TRAVEL_FADE;
    const black = cc.card > 0 ? 1 : Math.max(0, Math.min(1, k < 1 ? k : 2 - k));
    draw.rect(0, 0, WIDTH, HEIGHT, C.void, black);
    if (cc.card <= 0 || cc.cardT <= 0) return;
    const chapter = chapterDef(cc.exit.chapter);
    if (!chapter) return;
    const FADE = 0.4;
    const ctx = draw.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, cc.cardT / FADE, cc.card / FADE);
    draw.text(`CHAPTER ${chapter.number}`, WIDTH / 2, HEIGHT / 2 - 20, C.ash, { align: "center" });
    ctx.scale(2, 2);
    draw.text(chapter.title, WIDTH / 4, (HEIGHT / 2 - 4) / 2, C.echoLight, { align: "center" });
    ctx.restore();
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
          this.label(text, e.x - camX, e.y - camY, C.bone);
          draw.ctx.globalAlpha = 1;
        }
        continue;
      }
      if (e.kind === "lingering") {
        // a villager frozen in the Stilling: a faint echo with a thought
        const shimmer = 0.4 + 0.1 * Math.sin(this.t * 2 + e.x);
        draw.frame(draw.img.npc, 0, e.x - 8 - camX, e.y - 24 - camY, { fh: 24, alpha: shimmer, flip: e.props.flip === true });
        if (near(e.x, e.y - 12) && !this.conversation) this.label(`(${keys.interact})`, e.x - camX, e.y - 34 - camY, C.echoLight);
        continue;
      }
      if (e.kind === "npc") {
        const blink = Math.floor(this.t * 2 + e.x) % 7 === 0 ? 1 : 0;
        draw.frame(draw.img.npc, blink, e.x - 8 - camX, e.y - 24 - camY, { fh: 24, flip: p.x + 4 < e.x });
        if (near(e.x, e.y - 12) && !this.conversation) this.label(`${String(e.props.name ?? "???")} (${keys.interact})`, e.x - camX, e.y - 34 - camY, C.bone);
        continue;
      }
      if (this.progress.taken(e.key)) continue;
      const bob = Math.round(Math.sin(this.t * 3 + e.x * 0.1) * 2);
      draw.frame(draw.img.collectibles, COLLECTIBLE_FRAME[e.kind], e.x - 8 - camX, e.y - 18 + bob - camY);
    }
    for (const c of this.level.checkpoints) {
      if (c.kind === "shrine" && near(c.x, c.y - 14)) this.label("BELL SHRINE", c.x - camX, c.y - 42 - camY, C.gold);
    }
  }

  /** Decorations of one layer (only those on screen). */
  private renderDecor(layer: "back" | "mid" | "front", camX: number, camY: number): void {
    const { draw } = this.ctx;
    for (const d of this.level.decor) {
      if (d.layer !== layer) continue;
      const sx = d.x - camX;
      const sy = d.y - camY;
      if (sx < -64 || sx > WIDTH + 64 || sy < -8 || sy > HEIGHT + 96) continue;
      if (layer === "mid" && d.sprite.startsWith("lantern")) this.glow(sx, sy - 26, 22);
      if (layer === "back" && d.sprite === "hanging_lantern") this.glow(sx, sy - 6, 20);
      draw.decor(d.sprite, sx, sy, { flip: d.flip, dark: layer === "back" && !d.sprite.includes("lantern"), t: this.t, alpha: layer === "front" ? 0.9 : undefined });
    }
  }

  /** Soft warm light around lanterns and windows. */
  private glow(x: number, y: number, r: number): void {
    const ctx = this.ctx.draw.ctx;
    const flicker = 0.85 + 0.15 * Math.sin(this.t * 7 + x);
    ctx.fillStyle = COLORS.q;
    for (const [k, a] of [[1, 0.05], [0.66, 0.06], [0.36, 0.08]] as const) {
      ctx.globalAlpha = a * flicker;
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Fireflies outdoors, dust motes indoors: a living room even when nothing moves. */
  private renderAmbient(camX: number, camY: number): void {
    const { draw } = this.ctx;
    const indoor = this.current.indoor;
    const n = indoor ? 18 : 14;
    for (let i = 0; i < n; i++) {
      // each mote drifts on its own slow loop, anchored in the world (parallax-free)
      const s = i * 97.13;
      const span = WIDTH + 80;
      const wx = ((s * 13.7 + this.t * (indoor ? 4 : 9) * (i % 2 ? 1 : -1)) % span + span) % span + Math.floor(camX / span) * span - 40;
      const x = wx - camX + Math.sin(this.t * 0.7 + s) * 10;
      const y = ((s * 7.3) % HEIGHT) + Math.sin(this.t * (0.5 + (i % 5) * 0.1) + s) * 14 - (indoor ? (this.t * 3) % HEIGHT : 0);
      const yy = ((y % HEIGHT) + HEIGHT) % HEIGHT;
      const blink = indoor ? 0.35 : Math.max(0, Math.sin(this.t * (1.3 + (i % 4) * 0.3) + s));
      if (blink <= 0.05) continue;
      draw.rect(x, yy, 1, 1, indoor ? COLORS.g : COLORS.Y, blink * (indoor ? 0.6 : 0.9));
      if (!indoor && blink > 0.7) draw.rect(x - 1, yy, 3, 1, COLORS.y, 0.25);
    }
    void camY;
  }

  /** A text anchored in the world, kept fully on screen. */
  private label(text: string, x: number, y: number, color: string): void {
    const w = this.ctx.draw.textWidth(text.toUpperCase());
    const cx = Math.max(w / 2 + 3, Math.min(WIDTH - w / 2 - 3, x));
    const cy = Math.max(3, Math.min(HEIGHT - 20, y));
    this.ctx.draw.text(text, cx, cy, color, { align: "center" });
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
    const count = kind === "moment" ? `${this.progress.count(kind)}/${MOMENT_COUNT}` : `${this.progress.count(kind)}`;
    const text = `${COLLECTIBLE_NAME[kind]} ${count}`;
    const x = WIDTH - 4 - Math.round(slide * (18 + draw.textWidth(text) + 4));
    draw.ctx.globalAlpha = slide;
    draw.frame(draw.img.collectibles, COLLECTIBLE_FRAME[kind], x, 4);
    draw.text(text, x + 18, 9, C.bone);
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
