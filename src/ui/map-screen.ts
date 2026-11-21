import { C, COLORS, HEIGHT, WIDTH } from "../config";
import type { Draw } from "../engine/draw";
import type { Input } from "../engine/input";
import { cellState, chapterTargets, mapBounds, shrineKey, type MapRoom, type ShrineSpot } from "../game/map";
import type { RoomDef } from "../game/world";

const SCALE = 3; // map pixels per tile
const TILE = 16;
const SHEET = { x: 6, y: 5, w: WIDTH - 12, h: HEIGHT - 10 }; // the parchment
const VIEW = { x: 14, y: 22, w: WIDTH - 28, h: 118 }; // the drawn area on it
const PAN_SPEED = 200; // map px per second

/** Quill's map: ink on paper (SCRIPT.md §4.9), in the game palette. */
const PAPER = COLORS.W;
const INK = COLORS.a; // sepia: almost everything is drawn with it
const INK_DARK = COLORS.K;
const INK_FAINT = COLORS.g;
const WASH = 0.22; // rock: a light wash of the sepia ink

/** A chapter the map can show (one Iris has visited). */
export interface MapChapter {
  id: string;
  number: number;
  title: string;
  rooms: RoomDef[];
  /** Quill revealed this chapter's room outlines */
  revealed: boolean;
}

export interface MapOpenOptions {
  /** visited chapters, in chapter order */
  chapters: MapChapter[];
  /** the chapter Iris is in */
  current: string;
  visited: Set<string>;
  lit: Set<string>;
  /** Iris, in world pixels */
  player: { x: number; y: number };
  currentRoom: string;
  /** fast travel destinations in every chapter (null = just browsing) */
  travel: ShrineSpot[] | null;
  /** key names shown in the footer */
  keys: { map: string; jump: string };
}

export type MapResult = { close: true } | { travel: ShrineSpot } | null;

/**
 * The chapter map overlay: Quill's drawing of the rooms, icons, and the fast-travel picker.
 * Left/right past the edge of the drawing (or past the first/last shrine when travelling)
 * turns to the previous/next visited chapter.
 */
export class MapScreen {
  private bounds = { x: 0, y: 0, w: 1, h: 1 };
  private rooms: RoomDef[] = [];
  private cache: HTMLCanvasElement | null = null;
  private opts: MapOpenOptions | null = null;
  /** index of the chapter shown, in opts.chapters */
  private shown = 0;
  private camX = 0;
  private camY = 0;
  /** index of the chosen shrine among the shown chapter's targets */
  private pick = 0;

  constructor(private readonly draw: Draw) {}

  private get chapter(): MapChapter | null {
    return this.opts?.chapters[this.shown] ?? null;
  }

  /** Travel targets in the shown chapter. */
  private get targets(): ShrineSpot[] {
    const ch = this.chapter;
    return ch && this.opts?.travel ? chapterTargets(this.opts.travel, ch.id) : [];
  }

  private show(index: number): void {
    const opts = this.opts!;
    this.shown = index;
    this.rooms = opts.chapters[index].rooms;
    this.bounds = mapBounds(this.rooms.map((r) => this.tileRect(r)));
    this.cache = this.drawRooms(opts);
    this.pick = 0;
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
    if (opts.chapters.length === 0) return;
    this.show(Math.max(0, opts.chapters.findIndex((c) => c.id === opts.current)));
    const focus = this.targets[0] ?? opts.player;
    this.centerOn(focus.x, focus.y);
  }

  private centerOn(wx: number, wy: number): void {
    const p = this.toMap(wx, wy);
    this.camX = this.clampX(p.x - VIEW.w / 2);
    this.camY = this.clampY(p.y - VIEW.h / 2);
  }

  private clampX(x: number): number {
    return Math.max(0, Math.min(this.bounds.w * SCALE - VIEW.w, x));
  }

  private clampY(y: number): number {
    return Math.max(0, Math.min(Math.max(0, this.bounds.h * SCALE - VIEW.h), y));
  }

  /** Quill's ink drawing of the rooms, made once per opening. */
  private drawRooms(opts: MapOpenOptions): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.bounds.w * SCALE;
    canvas.height = this.bounds.h * SCALE;
    const ctx = canvas.getContext("2d")!;
    const px = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    };
    const revealed = this.chapter?.revealed ?? false;
    for (const r of this.rooms) {
      const state = cellState(r.name, opts.visited, revealed);
      if (state === "hidden") continue;
      const o = this.toMap(r.x, r.y);
      const w = r.level.cols * SCALE;
      const h = r.level.rows * SCALE;
      if (state === "revealed") {
        // dotted outline: Quill knows the room is there
        for (let x = 0; x < w; x += 3) px(o.x + x, o.y, INK), px(o.x + x, o.y + h - 1, INK);
        for (let y = 0; y < h; y += 3) px(o.x, o.y + y, INK), px(o.x + w - 1, o.y + y, INK);
        continue;
      }
      const solid = (tx: number, ty: number) => {
        if (tx < 0 || ty < 0 || tx >= r.level.cols || ty >= r.level.rows) return false;
        const t = r.level.ownTile(tx, ty);
        return t === "#" || t === "D";
      };
      for (let ty = 0; ty < r.level.rows; ty++) {
        for (let tx = 0; tx < r.level.cols; tx++) {
          const t = r.level.ownTile(tx, ty);
          const x0 = o.x + tx * SCALE;
          const y0 = o.y + ty * SCALE;
          if (t === "#" || t === "D") {
            // rock: a light sepia wash, its outline inked
            ctx.globalAlpha = WASH;
            ctx.fillStyle = INK;
            ctx.fillRect(x0, y0, SCALE, SCALE);
            ctx.globalAlpha = 1;
            if (!solid(tx, ty - 1)) ctx.fillRect(x0, y0, SCALE, 1);
            if (!solid(tx, ty + 1)) ctx.fillRect(x0, y0 + SCALE - 1, SCALE, 1);
            if (!solid(tx - 1, ty)) ctx.fillRect(x0, y0, 1, SCALE);
            if (!solid(tx + 1, ty)) ctx.fillRect(x0 + SCALE - 1, y0, 1, SCALE);
          } else if (t === "-") {
            ctx.fillStyle = INK; // planks: a thin line
            ctx.fillRect(x0, y0, SCALE, 1);
          } else if (t === "^") {
            px(x0 + 1, y0 + SCALE - 2, INK); // thorns: little ink ticks
            px(x0 + 1, y0 + SCALE - 1, INK);
          } else if (t === "b") {
            ctx.fillStyle = INK;
            ctx.fillRect(x0, y0 + SCALE - 1, SCALE, 1);
          }
        }
      }
      // the room's frame: a very light dotted line
      ctx.globalAlpha = 0.35;
      for (let x = 0; x < w; x += 4) px(o.x + x, o.y, INK), px(o.x + x, o.y + h - 1, INK);
      for (let y = 0; y < h; y += 4) px(o.x, o.y + y, INK), px(o.x + w - 1, o.y + y, INK);
      ctx.globalAlpha = 1;
    }
    return canvas;
  }

  update(dt: number, input: Input): MapResult {
    const opts = this.opts;
    if (!opts || !this.chapter) return { close: true };
    if (input.justPressed("map") || input.justPressed("pause") || input.justPressed("back")) return { close: true };
    if (opts.travel?.length) {
      // choosing a shrine: past the first/last one, the previous/next chapter
      if (input.pressedOrRepeat("left")) this.step(-1);
      else if (input.pressedOrRepeat("right")) this.step(1);
      const t = this.targets[this.pick];
      if (t) {
        this.centerOn(t.x, t.y);
        if (input.justPressed("jump") || input.justPressed("interact")) return { travel: t };
      }
      return null;
    }
    // browsing: pan; a fresh press against the edge turns the page
    if (input.justPressed("left") && this.camX <= 0 && this.shown > 0) {
      this.show(this.shown - 1);
      this.camX = this.clampX(Infinity);
      this.camY = this.clampY(this.camY);
      return null;
    }
    if (input.justPressed("right") && this.camX >= this.clampX(Infinity) && this.shown < opts.chapters.length - 1) {
      this.show(this.shown + 1);
      this.camX = 0;
      this.camY = this.clampY(this.camY);
      return null;
    }
    const mx = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
    const my = (input.isDown("down") ? 1 : 0) - (input.isDown("up") ? 1 : 0);
    this.camX = this.clampX(this.camX + mx * PAN_SPEED * dt);
    this.camY = this.clampY(this.camY + my * PAN_SPEED * dt);
    return null;
  }

  /** Travel picker: the next/previous shrine, turning to another chapter past the ends (wrapping when alone). */
  private step(dir: -1 | 1): void {
    const n = this.targets.length;
    const next = this.pick + dir;
    if (next >= 0 && next < n) {
      this.pick = next;
      return;
    }
    const chapters = this.opts!.chapters.length;
    const other = this.shown + dir;
    if (other >= 0 && other < chapters) {
      this.show(other);
      this.pick = dir < 0 ? Math.max(0, this.targets.length - 1) : 0;
      if (!this.targets.length) this.centerOn(...this.middle());
    } else if (n > 0) this.pick = dir < 0 ? n - 1 : 0;
  }

  /** The middle of the shown chapter, in world pixels. */
  private middle(): [number, number] {
    return [(this.bounds.x + this.bounds.w / 2) * TILE, (this.bounds.y + this.bounds.h / 2) * TILE];
  }

  render(t: number): void {
    const { draw } = this;
    const opts = this.opts;
    const chapter = this.chapter;
    if (!opts || !this.cache || !chapter) return;
    draw.rect(0, 0, WIDTH, HEIGHT, C.void, 0.75);
    this.drawSheet();
    const title = `CHAPTER ${chapter.number} - ${chapter.title}`;
    draw.text(title, WIDTH / 2, SHEET.y + 6, INK_DARK, { align: "center", shadow: null });
    const half = draw.textWidth(title) / 2;
    if (this.shown > 0) draw.text("<", WIDTH / 2 - half - 14, SHEET.y + 6, INK, { shadow: null });
    if (this.shown < opts.chapters.length - 1) draw.text(">", WIDTH / 2 + half + 9, SHEET.y + 6, INK, { shadow: null });
    const isCurrent = chapter.id === opts.current;

    const ctx = draw.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    ctx.clip();
    const ox = Math.round(VIEW.x - this.camX);
    const oy = Math.round(VIEW.y - this.camY);
    ctx.drawImage(this.cache, ox, oy);

    // the room Iris is in: its frame inked solid
    const here = isCurrent ? this.rooms.find((r) => r.name === opts.currentRoom) : undefined;
    if (here) {
      const o = this.toMap(here.x, here.y);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = INK;
      ctx.strokeRect(ox + o.x + 0.5, oy + o.y + 0.5, here.level.cols * SCALE - 1, here.level.rows * SCALE - 1);
      ctx.globalAlpha = 1;
    }

    for (const r of this.rooms) {
      if (!opts.visited.has(r.name)) continue;
      const o = this.toMap(r.x, r.y);
      // the place's name, written in ink above the room when there's room for it
      const name = r.title.toUpperCase();
      const tw = draw.textWidth(name);
      const left = ox + o.x;
      const right = left + r.level.cols * SCALE;
      if (tw < r.level.cols * SCALE - 6) {
        // keep the name on the visible part of the room, on a scrap of paper
        const lx = Math.max(left + 3, Math.min(VIEW.x + 3, right - tw - 3));
        const top = oy + o.y;
        const ly = Math.max(top + 3, Math.min(VIEW.y + 3, top + r.level.rows * SCALE - 12));
        draw.rect(lx - 1, ly - 1, tw + 2, 9, PAPER);
        draw.text(name, lx, ly, INK, { shadow: null });
      }
      r.level.checkpoints.forEach((c, i) => {
        const p = this.toMap(r.x + c.x, r.y + c.y);
        const x = Math.round(ox + p.x);
        const y = Math.round(oy + p.y);
        if (c.kind === "shrine") this.bell(x, y);
        else {
          draw.rect(x, y - 6, 1, 1, INK);
          draw.rect(x - 1, y - 5, 1, 1, INK);
          draw.rect(x + 1, y - 5, 1, 1, INK);
          draw.rect(x, y - 4, 1, 1, INK);
          if (opts.lit.has(`${r.name}:${i}`)) draw.rect(x, y - 5, 1, 1, INK); // lit: filled
        }
      });
      for (const e of r.level.entities) {
        if (e.kind !== "npc") continue;
        const p = this.toMap(r.x + e.x, r.y + e.y);
        const x = Math.round(ox + p.x);
        const y = Math.round(oy + p.y);
        draw.rect(x - 1, y - 5, 2, 2, INK); // a little ink dot
      }
    }

    // fast travel: the chosen shrine is circled
    const targets = this.targets;
    if (targets.length > 0) {
      const sel = targets[this.pick];
      const p = this.toMap(sel.x, sel.y);
      const rr = 7 + Math.round(Math.sin(t * 6) * 1.5);
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(Math.round(ox + p.x) + 0.5, Math.round(oy + p.y) - 3.5, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Iris's Eye: you are here
    if (isCurrent && Math.sin(t * 5) > -0.4) {
      const p = this.toMap(opts.player.x, opts.player.y);
      const x = Math.round(ox + p.x);
      const y = Math.round(oy + p.y) - 4;
      draw.rect(x - 3, y - 1, 7, 4, INK_DARK);
      draw.rect(x - 2, y, 5, 2, C.bone);
      draw.rect(x - 1, y, 2, 2, C.echo);
    }
    ctx.restore();

    this.compass(SHEET.x + SHEET.w - 18, SHEET.y + 9);
    draw.text("- Q.", SHEET.x + SHEET.w - 8, VIEW.y + VIEW.h + 3, INK, { align: "right", shadow: null });

    if (targets.length > 0) {
      const sel = targets[this.pick];
      const room = this.rooms.find((r) => r.name === sel.room);
      draw.text(`TRAVEL TO ${(room?.title ?? sel.room).toUpperCase()}?`, WIDTH / 2, VIEW.y + VIEW.h + 4, INK_DARK, { align: "center", shadow: null });
      draw.text(`LEFT RIGHT CHOOSE   ${opts.keys.jump} TRAVEL   ${opts.keys.map} CLOSE`, WIDTH / 2, SHEET.y + SHEET.h - 10, INK_FAINT, { align: "center", shadow: null });
    } else if (opts.travel?.length) {
      draw.text("NO OTHER BELL RINGS HERE", WIDTH / 2, VIEW.y + VIEW.h + 4, INK_DARK, { align: "center", shadow: null });
      draw.text(`LEFT RIGHT CHAPTER   ${opts.keys.map} CLOSE`, WIDTH / 2, SHEET.y + SHEET.h - 10, INK_FAINT, { align: "center", shadow: null });
    } else {
      draw.text(`ARROWS MOVE   ${opts.keys.map} CLOSE`, WIDTH / 2, SHEET.y + SHEET.h - 10, INK_FAINT, { align: "center", shadow: null });
    }
  }

  /** The parchment: paper, a darker worn edge and a double inked border. */
  private drawSheet(): void {
    const { draw } = this;
    const s = SHEET;
    draw.rect(s.x + 2, s.y + 2, s.w, s.h, C.void, 0.5); // shadow
    draw.rect(s.x, s.y, s.w, s.h, PAPER);
    for (const [x, y, w, h] of [
      [VIEW.x - 3, VIEW.y - 3, VIEW.w + 6, 1],
      [VIEW.x - 3, VIEW.y + VIEW.h + 2, VIEW.w + 6, 1],
      [VIEW.x - 3, VIEW.y - 3, 1, VIEW.h + 6],
      [VIEW.x + VIEW.w + 2, VIEW.y - 3, 1, VIEW.h + 6],
    ])
      draw.rect(x, y, w, h, INK);
  }

  /** A small inked compass rose with an N. */
  private compass(cx: number, cy: number): void {
    const { draw } = this;
    draw.rect(cx, cy - 4, 1, 9, INK);
    draw.rect(cx - 4, cy, 9, 1, INK);
    draw.rect(cx - 1, cy - 2, 3, 5, INK);
    draw.rect(cx - 2, cy - 1, 5, 3, INK);
    draw.rect(cx, cy, 1, 1, PAPER);
    draw.text("N", cx + 4, cy - 7, INK_DARK, { shadow: null });
  }

  /** A little bronze bell (Bell Shrine). */
  private bell(x: number, y: number): void {
    const { draw } = this;
    draw.rect(x - 1, y - 7, 3, 1, INK);
    draw.rect(x - 2, y - 6, 5, 4, INK);
    draw.rect(x - 3, y - 2, 7, 1, INK);
    draw.rect(x, y - 1, 1, 1, INK);
    draw.rect(x - 1, y - 5, 1, 1, C.gold); // a glint
  }

  /** The key of a shrine, for "you are standing here" checks. */
  static key = shrineKey;
}
