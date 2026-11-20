import { C } from "../config";
import { uiRect } from "../engine/assets";
import type { Ctx } from "../scenes/scene";

export type Option =
  | { kind: "action"; label: string; run: () => void; value?: () => string }
  | { kind: "slider"; label: string; max: number; get: () => number; set: (v: number) => void }
  | { kind: "toggle"; label: string; get: () => boolean; set: (v: boolean) => void }
  | { kind: "choice"; label: string; options: string[]; get: () => number; set: (i: number) => void };

type Layout =
  | { style: "center"; cx: number; y: number; rowH: number }
  | { style: "rows"; x: number; y: number; w: number; rowH: number };

type Rect = { x: number; y: number; w: number; h: number };

const SLIDER_W = uiRect("slider_empty").w;

/** A navigable list of menu options (keyboard + mouse). */
export class OptionList {
  index = 0;
  private rects: Rect[] = [];
  private sliderX: number[] = [];

  constructor(
    private readonly ctx: Ctx,
    readonly items: Option[],
    private readonly layout: Layout,
  ) {
    this.computeRects();
  }

  update(): void {
    const { input } = this.ctx;
    const n = this.items.length;

    if (input.pressedOrRepeat("up")) this.select((this.index + n - 1) % n);
    if (input.pressedOrRepeat("down")) this.select((this.index + 1) % n);

    const item = this.items[this.index];
    if (input.pressedOrRepeat("left")) this.adjust(item, -1);
    if (input.pressedOrRepeat("right")) this.adjust(item, +1);
    if (input.justPressed("confirm")) this.activate(item);

    const m = input.mouse;
    const hit = this.rects.findIndex((r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h);
    if (hit >= 0 && m.moved) this.select(hit);
    if (hit >= 0 && m.clicked) {
      this.index = hit;
      const it = this.items[hit];
      if (it.kind === "slider") {
        const v = Math.round(((m.x - this.sliderX[hit]) / SLIDER_W) * it.max);
        it.set(Math.max(0, Math.min(it.max, v)));
        this.ctx.sfx("toggle");
      } else {
        this.activate(it);
      }
    }
  }

  private select(i: number): void {
    if (i === this.index) return;
    this.index = i;
    this.ctx.sfx("move");
  }

  private adjust(item: Option, dir: number): void {
    switch (item.kind) {
      case "slider": {
        const v = Math.max(0, Math.min(item.max, item.get() + dir));
        if (v !== item.get()) {
          item.set(v);
          this.ctx.sfx("toggle");
        }
        break;
      }
      case "toggle":
        item.set(!item.get());
        this.ctx.sfx("toggle");
        break;
      case "choice":
        item.set((item.get() + dir + item.options.length) % item.options.length);
        this.ctx.sfx("toggle");
        break;
      case "action":
        break;
    }
  }

  private activate(item: Option): void {
    switch (item.kind) {
      case "action":
        this.ctx.sfx("select");
        item.run();
        break;
      case "toggle":
      case "choice":
        this.adjust(item, +1);
        break;
      case "slider":
        break;
    }
  }

  private computeRects(): void {
    const L = this.layout;
    this.rects = this.items.map((it, i) => {
      if (L.style === "center") {
        const w = this.ctx.draw.textWidth(it.label) + 20;
        return { x: Math.round(L.cx - w / 2), y: L.y + i * L.rowH - 3, w, h: 13 };
      }
      return { x: L.x, y: L.y + i * L.rowH - 3, w: L.w, h: L.rowH };
    });
    if (L.style === "rows") this.sliderX = this.items.map(() => L.x + L.w - 10 - SLIDER_W);
  }

  render(t: number): void {
    const L = this.layout;
    const { draw } = this.ctx;
    this.items.forEach((it, i) => {
      const sel = i === this.index;
      const r = this.rects[i];
      const y = L.y + i * L.rowH;
      if (L.style === "center") {
        if (sel) {
          draw.panel("panel_selected", r.x, r.y, r.w, r.h);
          draw.ui("cursor", r.x + 2 + (Math.sin(t * 6) > 0.6 ? 1 : 0), y);
        }
        draw.text(it.label, L.cx, y, sel ? C.bone : C.ash, { align: "center" });
        return;
      }
      if (sel) {
        draw.rect(r.x + 2, r.y, r.w - 4, r.h, C.night2, 0.9);
        draw.ui("cursor", r.x + 5 + (Math.sin(t * 6) > 0.6 ? 1 : 0), y);
      }
      draw.text(it.label, r.x + 16, y, sel ? C.bone : C.ash);
      this.renderValue(it, i, y, sel);
    });
  }

  private renderValue(it: Option, i: number, y: number, sel: boolean): void {
    if (this.layout.style !== "rows") return;
    const { draw } = this.ctx;
    const right = this.layout.x + this.layout.w - 10;
    const color = sel ? C.bone : C.ash;
    switch (it.kind) {
      case "slider": {
        const x = this.sliderX[i];
        draw.ui("slider_empty", x, y + 1);
        const fill = Math.round((SLIDER_W * it.get()) / it.max);
        if (fill > 0) draw.ui("slider_full", x, y + 1, fill);
        draw.ui("slider_knob", x + fill - 2, y - 1);
        break;
      }
      case "toggle":
        draw.text(it.get() ? "ON" : "OFF", right - 20, y, color, { align: "right" });
        draw.ui(it.get() ? "toggle_on" : "toggle_off", right - 16, y - 1);
        break;
      case "choice":
        draw.text(`< ${it.options[it.get()]} >`, right, y, color, { align: "right" });
        break;
      case "action":
        if (it.value) draw.text(it.value(), right, y, color, { align: "right" });
        break;
    }
  }
}
