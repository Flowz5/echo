import { HEIGHT, TILE, WIDTH, manifest } from "../config";
import type { Draw } from "../engine/draw";

const ANIM = manifest.player.animations;
const SPEED = 42; // ground scroll, px/s
const GROUND_Y = HEIGHT - 24;
const IRIS_X = 56;
const JUMP_TIME = 0.7;
const JUMP_HEIGHT = 30;
const ECHO_LIFE = 2.6;

interface FrozenEcho {
  x: number;
  y: number;
  frame: number;
  age: number;
}

/**
 * Animated backdrop shared by every menu: parallax night sky, and Iris running
 * along the ground, hopping now and then and leaving frozen echoes behind her.
 */
export class MenuBackground {
  private t = 0;
  private scroll = 0;
  private jumpT = -1;
  private nextJump = 1.6;
  private nextEcho = 0.8;
  private echoes: FrozenEcho[] = [];

  constructor(private readonly draw: Draw) {}

  update(dt: number): void {
    this.t += dt;
    this.scroll += SPEED * dt;

    this.nextJump -= dt;
    if (this.jumpT < 0 && this.nextJump <= 0) {
      this.jumpT = 0;
      this.nextJump = 2.2 + Math.random() * 1.6;
    }
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      if (this.jumpT >= JUMP_TIME) this.jumpT = -1;
    }

    this.nextEcho -= dt;
    if (this.nextEcho <= 0) {
      this.echoes.push({ x: IRIS_X, y: this.irisY(), frame: this.irisFrame(), age: 0 });
      this.nextEcho = 0.9 + Math.random() * 0.6;
    }
    for (const e of this.echoes) {
      e.x -= SPEED * dt;
      e.age += dt;
    }
    this.echoes = this.echoes.filter((e) => e.age < ECHO_LIFE && e.x > -16);
  }

  private irisY(): number {
    const base = GROUND_Y - 16;
    if (this.jumpT < 0) return base;
    const p = this.jumpT / JUMP_TIME;
    return base - JUMP_HEIGHT * 4 * p * (1 - p);
  }

  private irisFrame(): number {
    if (this.jumpT >= 0) return this.jumpT < JUMP_TIME / 2 ? ANIM.jump[0] : ANIM.fall[0];
    return ANIM.run[Math.floor(this.t * manifest.player.fps.run) % ANIM.run.length];
  }

  render(): void {
    const { draw } = this;
    const { img, ctx } = draw;
    ctx.drawImage(img.sky, 0, 0);
    this.layer(img.mountains, manifest.backgrounds.mountains.parallax);
    this.layer(img.hills, manifest.backgrounds.hills.parallax);

    const off = -Math.floor(this.scroll % TILE);
    for (let x = off; x < WIDTH; x += TILE) {
      draw.frame(img.tiles, 1, x, GROUND_Y); // grass top
      draw.frame(img.tiles, 0, x, GROUND_Y + TILE);
    }

    for (const e of this.echoes) {
      const fade = 1 - e.age / ECHO_LIFE;
      const shimmer = 0.85 + 0.15 * Math.sin(this.t * 9 + e.x);
      draw.frame(img.echo, e.frame, e.x, e.y, { alpha: manifest.echo.drawAlpha * fade * shimmer });
    }
    draw.frame(img.player, this.irisFrame(), IRIS_X, this.irisY());
  }

  /** Bottom-anchored layer that repeats horizontally. */
  private layer(image: HTMLImageElement, parallax: number): void {
    const x = -Math.floor((this.scroll * parallax) % image.width);
    const y = HEIGHT - image.height;
    this.draw.ctx.drawImage(image, x, y);
    this.draw.ctx.drawImage(image, x + image.width, y);
  }
}
