import { COLORS, manifest } from "../config";
import type { Draw } from "../engine/draw";
import type { Rect } from "./level";

/** A frozen, solid moment of Iris left behind by a rewind. */
export class Echo {
  /** Echoes stay intangible until Iris stops overlapping them (she may rewind into one). */
  armed = false;
  private t = Math.random() * 10;
  private spawnFx = 1;

  constructor(
    readonly hitbox: Rect,
    private readonly frame: number,
    private readonly facing: 1 | -1,
    /** where the 16x16 sprite is drawn */
    private readonly spriteX: number,
    private readonly spriteY: number,
  ) {}

  update(dt: number): void {
    this.t += dt;
    this.spawnFx = Math.max(0, this.spawnFx - dt * 4);
  }

  render(draw: Draw, camX: number, camY: number): void {
    const shimmer = 0.85 + 0.15 * Math.sin(this.t * 5);
    const alpha = (this.armed ? manifest.echo.drawAlpha : 0.35) * shimmer + this.spawnFx * 0.35;
    draw.frame(draw.img.echo, this.frame, this.spriteX - camX, this.spriteY - camY, {
      flip: this.facing < 0,
      alpha: Math.min(1, alpha),
      sx: 1 + this.spawnFx * 0.3,
      sy: 1 + this.spawnFx * 0.3,
    });
    if (this.spawnFx > 0) {
      // expanding ring when the echo appears
      const r = Math.round((1 - this.spawnFx) * 14) + 2;
      const cx = Math.round(this.hitbox.x + this.hitbox.w / 2 - camX);
      const cy = Math.round(this.hitbox.y + this.hitbox.h / 2 - camY);
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        draw.rect(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), 1, 1, COLORS.e, this.spawnFx);
      }
    }
  }
}
