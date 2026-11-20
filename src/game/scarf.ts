import { COLORS } from "../config";
import type { Draw } from "../engine/draw";

const SEGMENTS = 7;
const SEG_LEN = 2.2;
const DAMPING = 0.86;
const GRAVITY = 210; // px/s²
const TRAIL = 300; // px/s² pushing the scarf behind Iris
const ITERATIONS = 3;

/**
 * Iris's scarf tail as a little verlet rope: it trails behind her, flutters
 * when she runs, whips during a dash and settles when she stands still.
 */
export class Scarf {
  private readonly x = new Float32Array(SEGMENTS);
  private readonly y = new Float32Array(SEGMENTS);
  private readonly ox = new Float32Array(SEGMENTS);
  private readonly oy = new Float32Array(SEGMENTS);
  private t = 0;

  reset(ax: number, ay: number, facing: number): void {
    for (let i = 0; i < SEGMENTS; i++) {
      this.x[i] = this.ox[i] = ax - facing * i * SEG_LEN;
      this.y[i] = this.oy[i] = ay + i * 0.8;
    }
  }

  /**
   * @param ax,ay anchor (the collar) in world pixels
   * @param speed how fast Iris moves (px/s): the faster, the more the scarf streams behind
   * @param windX extra horizontal push in px/s (e.g. the menu's scrolling ground)
   */
  update(dt: number, ax: number, ay: number, facing: number, speed: number, windX = 0): void {
    const trail = TRAIL * (0.15 + 0.85 * Math.min(1, speed / 100));
    this.t += dt;
    const dt2 = dt * dt;
    for (let i = 1; i < SEGMENTS; i++) {
      const vx = (this.x[i] - this.ox[i]) * DAMPING;
      const vy = (this.y[i] - this.oy[i]) * DAMPING;
      this.ox[i] = this.x[i];
      this.oy[i] = this.y[i];
      const flutter = Math.sin(this.t * 14 - i * 0.9) * 40 * (i / SEGMENTS);
      this.x[i] += vx + (-facing * trail) * dt2 + windX * dt * 0.08;
      this.y[i] += vy + (GRAVITY + flutter) * dt2;
    }
    this.x[0] = this.ox[0] = ax;
    this.y[0] = this.oy[0] = ay;
    for (let k = 0; k < ITERATIONS; k++) {
      for (let i = 1; i < SEGMENTS; i++) {
        const dx = this.x[i] - this.x[i - 1];
        const dy = this.y[i] - this.y[i - 1];
        const d = Math.hypot(dx, dy) || 0.001;
        const f = (d - SEG_LEN) / d;
        this.x[i] -= dx * f;
        this.y[i] -= dy * f;
      }
    }
  }

  render(draw: Draw, camX: number, camY: number, spent: boolean, alpha = 1): void {
    const body = spent ? COLORS.G : COLORS.P;
    const tip = spent ? COLORS.g : COLORS.q;
    const pts: [number, number, number][] = []; // x, y, thickness
    for (let i = 1; i < SEGMENTS; i++) {
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        pts.push([
          this.x[i - 1] + (this.x[i] - this.x[i - 1]) * t,
          this.y[i - 1] + (this.y[i] - this.y[i - 1]) * t,
          i <= 3 ? 2 : 1,
        ]);
      }
    }
    pts.push([this.x[SEGMENTS - 1], this.y[SEGMENTS - 1], 1]);
    const px = (x: number) => Math.round(x - camX);
    const py = (y: number) => Math.round(y - camY);
    for (const [x, y, w] of pts) draw.rect(px(x) - 1, py(y) - 1, w + 2, w + 2, COLORS.K, alpha);
    pts.forEach(([x, y, w], i) => draw.rect(px(x), py(y), w, w, i > pts.length - 4 ? tip : body, alpha));
  }
}
