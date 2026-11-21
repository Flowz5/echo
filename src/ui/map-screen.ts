import { C, COLORS, HEIGHT, WIDTH } from "../config";
import type { Draw } from "../engine/draw";
import type { Input } from "../engine/input";
import { cellState, mapBounds, shrineKey, type MapRoom, type ShrineSpot } from "../game/map";
import type { RoomDef } from "../game/world";

const SCALE = 2; // map pixels per tile
const TILE = 16;
const VIEW = { x: 8, y: 28, w: WIDTH - 16, h: 116 };
const PAN_SPEED = 180; // map px per second

export interface MapOpenOptions {
  visited: Set<string>;
  revealed: boolean;
  lit: Set<string>;
  /** Iris, in world pixels */
  player: { x: number; y: number };
  currentRoom: string;
  /** fast travel destinations (null = just browsing) */
  travel: ShrineSpot[] | null;
  /** key names shown in the footer */
  keys: { map: string; jump: string };
}

export type MapResult = { close: true } | { travel: ShrineSpot } | null;

/** The chapter map overlay: rooms to scale, icons, and the fast-travel picker. */
export class MapScreen {
  private readonly bounds;
  private cache: HTMLCanvasElement | null = null;
  private opts: MapOpenOptions | null = null;
  private camX = 0;
  private camY = 0;
  private pick = 0;

  constructor(
    private readonly draw: Draw,
    private readonly rooms: RoomDef[],
    private readonly title: string,
  ) {
    this.bounds = mapBounds(rooms.map((r) => this.tileRect(r)));
  }

  private tileRect(r: RoomDef): MapRoom {
    return { name: r.name, x: r.x / TILE, y: r.y / TILE, w: r.level.cols, h: r.level.rows };
  }

  /** World pixels -> map pixels (before panning). */
  private toMap(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx / TILE - this.bounds.x) * SCALE, y: (wy / TILE - this.bounds.y) * SCALE };
  }

  open(opts: MapOpenOptions): void {
    this.opts = opts;
    this.pick = 0;
    this.cache = this.renderCache(opts);
    const focus = opts.travel?.length ? opts.travel[0] : opts.player;
    this.centerOn(focus.x, focus.y);
  }

  private centerOn(wx: number, wy: number): void {
    const p = this.toMap(wx, wy);
    const mw = this.bounds.w * SCALE;
    const mh = this.bounds.h * SCALE;
    this.camX = Math.max(0, Math.min(mw - VIEW.w, p.x - VIEW.w / 2));
    this.camY = Math.max(0, Math.min(Math.max(0, mh - VIEW.h), p.y - VIEW.h / 2));
  }

  /** Terrain silhouettes of visited rooms and outlines of revealed ones, drawn once per opening. */
  private renderCache(opts: MapOpenOptions): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.bounds.w * SCALE;
    canvas.height = this.bounds.h * SCALE;
    const ctx = canvas.getContext("2d")!;
    for (const r of this.rooms) {
      const state = cellState(r.name, opts.visited, opts.revealed);
      if (state === "hidden") continue;
      const o = this.toMap(r.x, r.y);
      const w = r.level.cols * SCALE;
      const h = r.level.rows * SCALE;
      if (state === "visited") {
        ctx.fillStyle = COLORS["1"];
        ctx.fillRect(o.x, o.y, w, h);
        for (let ty = 0; ty < r.level.rows; ty++) {
          for (let tx = 0; tx < r.level.cols; tx++) {
            const t = r.level.ownTile(tx, ty);
            if (t === ".") continue;
            ctx.fillStyle = t === "^" ? COLORS.R : t === "-" ? COLORS.g : t === "D" || t === "b" ? COLORS.A : COLORS["4"];
            ctx.fillRect(o.x + tx * SCALE, o.y + ty * SCALE, SCALE, t === "-" ? 1 : SCALE);
          }
        }
      }
      ctx.strokeStyle = state === "visited" ? COLORS["3"] : COLORS.G;
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, w - 1, h - 1);
    }
    return canvas;
  }

  update(dt: number, input: Input): MapResult {
    const opts = this.opts;
    if (!opts) return { close: true };
    if (input.justPressed("map") || input.justPressed("pause") || input.justPressed("back")) return { close: true };
    const targets = opts.travel ?? [];
    if (targets.length > 0) {
      if (input.pressedOrRepeat("left")) this.pick = (this.pick + targets.length - 1) % targets.length;
      if (input.pressedOrRepeat("right")) this.pick = (this.pick + 1) % targets.length;
      const t = targets[this.pick];
      this.centerOn(t.x, t.y);
      if (input.justPressed("jump") || input.justPressed("interact")) return { travel: t };
      return null;
    }
    const mx = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
    const my = (input.isDown("down") ? 1 : 0) - (input.isDown("up") ? 1 : 0);
    const mw = this.bounds.w * SCALE;
    const mh = this.bounds.h * SCALE;
    this.camX = Math.max(0, Math.min(mw - VIEW.w, this.camX + mx * PAN_SPEED * dt));
    this.camY = Math.max(0, Math.min(Math.max(0, mh - VIEW.h), this.camY + my * PAN_SPEED * dt));
    return null;
  }

  render(t: number): void {
    const { draw } = this;
    const opts = this.opts;
    if (!opts || !this.cache) return;
    draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.97);
    draw.text(this.title, WIDTH / 2, 12, C.echoLight, { align: "center" });
    draw.panel("panel", VIEW.x - 4, VIEW.y - 4, VIEW.w + 8, VIEW.h + 8);

    const ctx = draw.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    ctx.clip();
    const ox = Math.round(VIEW.x - this.camX);
    const oy = Math.round(VIEW.y - this.camY);
    ctx.drawImage(this.cache, ox, oy);

    // the room Iris is in
    const here = this.rooms.find((r) => r.name === opts.currentRoom);
    if (here) {
      const o = this.toMap(here.x, here.y);
      ctx.strokeStyle = C.echo;
      ctx.strokeRect(ox + o.x + 0.5, oy + o.y + 0.5, here.level.cols * SCALE - 1, here.level.rows * SCALE - 1);
    }

    // icons, only in visited rooms
    for (const r of this.rooms) {
      if (!opts.visited.has(r.name)) continue;
      r.level.checkpoints.forEach((c, i) => {
        const p = this.toMap(r.x + c.x, r.y + c.y);
        const x = Math.round(ox + p.x);
        const y = Math.round(oy + p.y);
        if (c.kind === "shrine") {
          draw.rect(x - 2, y - 5, 5, 4, C.gold);
          draw.rect(x - 1, y - 6, 3, 1, C.gold);
          draw.rect(x, y - 1, 1, 1, COLORS.a);
        } else {
          const color = opts.lit.has(`${r.name}:${i}`) ? COLORS.e : COLORS.c;
          draw.rect(x, y - 4, 1, 1, color);
          draw.rect(x - 1, y - 3, 3, 1, color);
          draw.rect(x, y - 2, 1, 1, color);
        }
      });
      for (const e of r.level.entities) {
        if (e.kind !== "npc") continue;
        const p = this.toMap(r.x + e.x, r.y + e.y);
        draw.rect(Math.round(ox + p.x) - 1, Math.round(oy + p.y) - 3, 2, 2, C.bone);
      }
    }

    // fast travel: the selected shrine pulses
    const targets = opts.travel ?? [];
    if (targets.length > 0) {
      const sel = targets[this.pick];
      const p = this.toMap(sel.x, sel.y);
      const rr = 6 + Math.round(Math.sin(t * 6) * 1.5);
      ctx.strokeStyle = C.echoLight;
      ctx.strokeRect(Math.round(ox + p.x) - rr + 0.5, Math.round(oy + p.y) - 3 - rr + 0.5, rr * 2, rr * 2);
    }

    // Iris's Eye: you are here
    if (Math.sin(t * 5) > -0.4) {
      const p = this.toMap(opts.player.x, opts.player.y);
      const x = Math.round(ox + p.x);
      const y = Math.round(oy + p.y);
      draw.rect(x - 2, y - 2, 5, 3, C.bone);
      draw.rect(x - 1, y - 1, 3, 1, C.echo);
    }
    ctx.restore();

    // footer
    if (targets.length > 0) {
      const sel = targets[this.pick];
      const room = this.rooms.find((r) => r.name === sel.room);
      draw.text(`TRAVEL TO ${(room?.title ?? sel.room).toUpperCase()}?`, WIDTH / 2, VIEW.y + VIEW.h + 9, C.gold, { align: "center" });
      draw.text(`LEFT RIGHT CHOOSE   ${opts.keys.jump} TRAVEL   ${opts.keys.map} CLOSE`, WIDTH / 2, HEIGHT - 10, C.slate, { align: "center", shadow: null });
    } else {
      draw.text(`ARROWS MOVE   ${opts.keys.map} CLOSE`, WIDTH / 2, HEIGHT - 10, C.slate, { align: "center", shadow: null });
    }
  }

  /** The key of a shrine, for "you are standing here" checks. */
  static key = shrineKey;
}
