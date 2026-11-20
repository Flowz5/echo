import type { Draw } from "../engine/draw";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
}

interface Afterimage {
  x: number;
  y: number;
  frame: number;
  flip: boolean;
  life: number;
}

const AFTERIMAGE_LIFE = 0.18;

/** One-pixel particles and dash afterimages. */
export class Effects {
  private particles: Particle[] = [];
  private afterimages: Afterimage[] = [];

  burst(
    x: number,
    y: number,
    count: number,
    opts: { colors: string[]; speed: number; spread?: number; angle?: number; life?: number; gravity?: number },
  ): void {
    const spread = opts.spread ?? Math.PI * 2;
    const angle = opts.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = opts.speed * (0.4 + Math.random() * 0.6);
      const life = (opts.life ?? 0.4) * (0.6 + Math.random() * 0.4);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        gravity: opts.gravity ?? 0,
      });
    }
  }

  afterimage(x: number, y: number, frame: number, flip: boolean): void {
    this.afterimages.push({ x, y, frame, flip, life: AFTERIMAGE_LIFE });
  }

  clear(): void {
    this.particles = [];
    this.afterimages = [];
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const a of this.afterimages) a.life -= dt;
    this.afterimages = this.afterimages.filter((a) => a.life > 0);
  }

  renderBehind(draw: Draw, camX: number, camY: number): void {
    for (const a of this.afterimages) {
      draw.frame(draw.img.player, a.frame, a.x - camX, a.y - camY, {
        flip: a.flip,
        row: 1,
        alpha: (a.life / AFTERIMAGE_LIFE) * 0.5,
      });
    }
  }

  renderFront(draw: Draw, camX: number, camY: number): void {
    for (const p of this.particles) {
      draw.rect(p.x - camX, p.y - camY, 1, 1, p.color, Math.min(1, (p.life / p.maxLife) * 1.5));
    }
  }
}
