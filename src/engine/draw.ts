import { C, manifest } from "../config";
import { uiRect, type Images, type UiName } from "./assets";
import { get2d } from "./renderer";

const FONT = manifest.font;
const GLYPH_W = FONT.glyph[0];
const GLYPH_H = FONT.glyph[1];
export const LINE_H = GLYPH_H + 2;

/** Sprite & text helpers bound to the loaded images. */
type Rect = { x: number; y: number; w: number; h: number };
const DECOR = manifest.decor.rects as Record<string, Rect>;

export class Draw {
  private readonly tinted = new Map<string, HTMLCanvasElement>();
  private darkDecor: HTMLCanvasElement | null = null;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly img: Images,
  ) {}

  // ------------------------------------------------------------------ text
  textWidth(s: string): number {
    return s.length ? s.length * FONT.advance - 1 : 0;
  }

  text(
    s: string,
    x: number,
    y: number,
    color: string = C.bone,
    opts: { align?: "left" | "center" | "right"; shadow?: string | null } = {},
  ): void {
    const str = s.toUpperCase();
    const w = this.textWidth(str);
    let px = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x);
    const py = Math.round(y);
    const shadow = opts.shadow === undefined ? C.void : opts.shadow;
    for (const ch of str) {
      const i = Math.max(0, FONT.order.indexOf(ch));
      if (shadow) this.glyph(i, px, py + 1, shadow);
      this.glyph(i, px, py, color);
      px += FONT.advance;
    }
  }

  private glyph(i: number, x: number, y: number, color: string): void {
    this.ctx.drawImage(this.tint(color), i * FONT.advance, 0, GLYPH_W, GLYPH_H, x, y, GLYPH_W, GLYPH_H);
  }

  /** The font is white; recoloured copies are cached per colour. */
  private tint(color: string): HTMLCanvasElement {
    let c = this.tinted.get(color);
    if (!c) {
      const src = this.img.font;
      c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      const g = get2d(c);
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      this.tinted.set(color, c);
    }
    return c;
  }

  // ------------------------------------------------------------------ sprites
  /** Draws frame `index` of a horizontal sheet of `fw`x`fh` frames, on row `row`. */
  frame(
    image: HTMLImageElement,
    index: number,
    x: number,
    y: number,
    opts: { fw?: number; fh?: number; row?: number; flip?: boolean; alpha?: number; sx?: number; sy?: number } = {},
  ): void {
    const fw = opts.fw ?? 16;
    const fh = opts.fh ?? 16;
    const ctx = this.ctx;
    const dx = Math.round(x);
    const dy = Math.round(y);
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    const sx = opts.sx ?? 1;
    const sy = opts.sy ?? 1;
    if (sx !== 1 || sy !== 1) {
      // squash & stretch, anchored at the feet (bottom centre)
      const w = Math.round(fw * sx);
      const h = Math.round(fh * sy);
      const ox = dx + Math.round((fw - w) / 2);
      const oy = dy + fh - h;
      if (opts.flip) {
        ctx.translate(ox + w, oy);
        ctx.scale(-1, 1);
        ctx.drawImage(image, index * fw, (opts.row ?? 0) * fh, fw, fh, 0, 0, w, h);
      } else {
        ctx.drawImage(image, index * fw, (opts.row ?? 0) * fh, fw, fh, ox, oy, w, h);
      }
    } else if (opts.flip) {
      ctx.translate(dx + fw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(image, index * fw, (opts.row ?? 0) * fh, fw, fh, 0, 0, fw, fh);
    } else {
      ctx.drawImage(image, index * fw, (opts.row ?? 0) * fh, fw, fh, dx, dy, fw, fh);
    }
    ctx.restore();
  }

  /** Size of a decor sprite (first frame for animated ones), or null if unknown. */
  decorSize(name: string): Rect | null {
    return DECOR[name] ?? DECOR[`${name}_0`] ?? null;
  }

  /**
   * Draws a decoration with its bottom-centre at (x, y).
   * Animated decor (name_0 / name_1, like grass) sways on its own rhythm.
   */
  decor(name: string, x: number, y: number, opts: { flip?: boolean; dark?: boolean; t?: number; alpha?: number } = {}): void {
    let r = DECOR[name];
    if (!r) {
      const frame = Math.floor((opts.t ?? 0) * 1.6 + x * 0.13) % 2;
      r = DECOR[`${name}_${frame}`];
      if (!r) return;
    }
    const src = opts.dark ? this.darkAtlas() : this.img.decor;
    const dx = Math.round(x - r.w / 2);
    const dy = Math.round(y - r.h);
    const ctx = this.ctx;
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    if (opts.flip) {
      ctx.save();
      ctx.translate(dx + r.w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      ctx.restore();
    } else {
      ctx.drawImage(src, r.x, r.y, r.w, r.h, dx, dy, r.w, r.h);
    }
    ctx.globalAlpha = 1;
  }

  /** The decor atlas blended towards the night: for far-away background props. */
  private darkAtlas(): HTMLCanvasElement {
    if (!this.darkDecor) {
      const src = this.img.decor;
      const c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      const g = get2d(c);
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.globalAlpha = 0.55;
      g.fillStyle = C.night1;
      g.fillRect(0, 0, c.width, c.height);
      this.darkDecor = c;
    }
    return this.darkDecor;
  }

  ui(name: UiName, x: number, y: number, w?: number): void {
    const r = uiRect(name);
    const dw = w ?? r.w;
    this.ctx.drawImage(this.img.ui, r.x, r.y, Math.min(dw, r.w), r.h, Math.round(x), Math.round(y), Math.min(dw, r.w), r.h);
  }

  /** 9-slice panel with 8px corners. */
  panel(name: "panel" | "panel_selected", x: number, y: number, w: number, h: number): void {
    const r = uiRect(name);
    const c = 8;
    const sx = [r.x, r.x + c, r.x + r.w - c];
    const sw = [c, r.w - 2 * c, c];
    const sy = [r.y, r.y + c, r.y + r.h - c];
    const sh = [c, r.h - 2 * c, c];
    const dx = [x, x + c, x + w - c];
    const dw = [c, w - 2 * c, c];
    const dy = [y, y + c, y + h - c];
    const dh = [c, h - 2 * c, c];
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 3; i++)
        if (dw[i] > 0 && dh[j] > 0)
          this.ctx.drawImage(this.img.ui, sx[i], sy[j], sw[i], sh[j], Math.round(dx[i]), Math.round(dy[j]), dw[i], dh[j]);
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
    this.ctx.globalAlpha = 1;
  }
}
