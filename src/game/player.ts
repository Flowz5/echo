import { COLORS, manifest } from "../config";
import type { SfxName } from "../engine/audio";
import type { Draw } from "../engine/draw";
import type { Input } from "../engine/input";
import type { Level, Rect } from "./level";
import type { Effects } from "./particles";

/**
 * Movement tuning. Units: pixels and seconds. One tile = 16 px.
 * Tweak these to change the feel; everything else reads from here.
 */
export const TUNING = {
  runSpeed: 96,
  groundAccel: 1000,
  groundDecel: 1400,
  airAccel: 760,
  airDecel: 480,

  gravity: 1100,
  maxFall: 250,
  fastFall: 340, // holding down
  apexThreshold: 45, // |vy| under this while holding jump = floatier apex
  apexGravityMult: 0.5,

  jumpSpeed: 300, // ≈ 2.5 tiles high
  jumpCutMult: 0.45, // releasing jump early cuts the upward speed
  doubleJumpSpeed: 270,
  coyoteTime: 0.1, // can still jump this long after leaving a ledge
  jumpBuffer: 0.12, // a jump pressed this early before landing still counts
  cornerCorrection: 4, // px nudged around a ceiling corner when bonking it

  dashSpeed: 290,
  dashTime: 0.14,
  dashEndMult: 0.5, // speed kept once the dash ends
  dashCooldown: 0.2,
  dashFreeze: 0.05, // tiny hit-stop when the dash starts
  afterimageEvery: 0.025,

  platformDropTime: 0.2,
};

const ANIM = manifest.player.animations;
const FPS = manifest.player.fps;

/** Hitbox inside the 16x16 sprite: 8 wide, 12 tall, feet on the sprite's bottom row. */
const HB_W = 8;
const HB_H = 12;
const SPRITE_OX = -4;
const SPRITE_OY = HB_H - 16;

export type PlayerState = "idle" | "run" | "jump" | "fall" | "dash";

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = false;
  canDoubleJump = true;
  canDash = true;
  dead = false;
  /** Seconds of hit-stop requested (read & cleared by the scene). */
  freeze = 0;

  private remX = 0;
  private remY = 0;
  private coyote = 0;
  private buffer = 0;
  private jumpHeld = false;
  private jumpCut = false;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirY = 0;
  private afterimageTimer = 0;
  private dropTimer = 0;
  private animTime = 0;

  constructor(
    private readonly level: Level,
    private readonly fx: Effects,
    private readonly sound: (name: SfxName) => void = () => {},
  ) {
    this.respawn();
  }

  respawn(): void {
    const s = this.level.spawn;
    this.x = s.x + 4;
    this.y = s.y + 16 - HB_H;
    this.vx = this.vy = this.remX = this.remY = 0;
    this.facing = 1;
    this.dead = false;
    this.canDash = this.canDoubleJump = true;
    this.dashTimer = this.dashCooldown = this.buffer = this.coyote = 0;
  }

  get hitbox(): Rect {
    return { x: this.x, y: this.y, w: HB_W, h: HB_H };
  }

  get dashing(): boolean {
    return this.dashTimer > 0;
  }

  get state(): PlayerState {
    if (this.dashing) return "dash";
    if (!this.grounded) return this.vy < 0 ? "jump" : "fall";
    return Math.abs(this.vx) > 8 ? "run" : "idle";
  }

  // ------------------------------------------------------------------ update
  update(dt: number, input: Input): void {
    if (this.dead) return;
    const T = TUNING;
    const mx = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
    const my = (input.isDown("down") ? 1 : 0) - (input.isDown("up") ? 1 : 0);
    this.animTime += dt;

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.buffer = input.justPressed("jump") ? T.jumpBuffer : Math.max(0, this.buffer - dt);
    this.jumpHeld = input.isDown("jump");

    const wasGrounded = this.grounded;
    this.grounded = this.onGround();
    if (this.grounded) {
      this.coyote = T.coyoteTime;
      this.canDoubleJump = true;
      if (!this.dashing && this.dashCooldown <= 0) this.canDash = true;
    }

    // ---- dash
    if (input.justPressed("dash") && this.canDash && this.dashCooldown <= 0) this.startDash(mx, my);

    if (this.dashing) {
      this.dashTimer -= dt;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = T.afterimageEvery;
        this.fx.afterimage(this.x + SPRITE_OX, this.y + SPRITE_OY, this.frame(), this.facing < 0);
      }
      if (this.dashTimer <= 0) {
        this.vx *= T.dashEndMult;
        this.vy *= this.dashDirY < 0 ? T.dashEndMult : 1;
      }
    } else {
      // ---- run
      const target = mx * T.runSpeed;
      const accel = this.grounded ? (mx !== 0 ? T.groundAccel : T.groundDecel) : mx !== 0 ? T.airAccel : T.airDecel;
      // keep extra speed (e.g. after a dash) in the air when pushing the same way
      const keepMomentum = !this.grounded && mx !== 0 && Math.sign(this.vx) === mx && Math.abs(this.vx) > T.runSpeed;
      this.vx = approach(this.vx, target, (keepMomentum ? T.airDecel * 0.5 : accel) * dt);
      if (mx !== 0) this.facing = mx as 1 | -1;

      // ---- jumps
      if (this.buffer > 0) {
        if (this.grounded && my > 0 && this.level.platformBelow(this.x, HB_W, this.y + HB_H) && !this.level.solidAt({ ...this.hitbox, y: this.y + 1 })) {
          this.dropTimer = T.platformDropTime; // down + jump drops through one-way platforms
          this.buffer = 0;
        } else if (this.coyote > 0) {
          this.jump(T.jumpSpeed);
          this.dust(6);
          this.sound("jump");
        } else if (this.canDoubleJump) {
          this.canDoubleJump = false;
          this.jump(T.doubleJumpSpeed);
          this.sound("doubleJump");
          this.fx.burst(this.x + HB_W / 2, this.y + HB_H, 8, { colors: [COLORS.P, COLORS.q, COLORS.W], speed: 60, angle: Math.PI / 2, spread: Math.PI * 0.9, life: 0.3 });
        }
      }
      if (this.vy < 0 && !this.jumpHeld && !this.jumpCut) {
        this.vy *= T.jumpCutMult;
        this.jumpCut = true;
      }

      // ---- gravity
      const apex = Math.abs(this.vy) < T.apexThreshold && this.jumpHeld;
      const g = T.gravity * (apex ? T.apexGravityMult : 1);
      const maxFall = my > 0 ? T.fastFall : T.maxFall;
      this.vy = approach(this.vy, maxFall, g * dt);
    }

    // ---- move
    const landingSpeed = this.vy;
    this.moveX(this.vx * dt);
    this.moveY(this.vy * dt);

    if (!wasGrounded && this.onGround() && landingSpeed > 120) {
      this.dust(Math.round(landingSpeed / 40));
      this.sound("land");
    }

    // ---- death
    if (this.level.hazardAt(this.hitbox) || this.y > this.level.height + 24) this.die();
  }

  private startDash(mx: number, my: number): void {
    const T = TUNING;
    let dx = mx;
    let dy = my;
    if (dx === 0 && dy === 0) dx = this.facing;
    const len = Math.hypot(dx, dy);
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.vx = this.dashDirX * T.dashSpeed;
    this.vy = this.dashDirY * T.dashSpeed;
    this.dashTimer = T.dashTime;
    this.dashCooldown = T.dashCooldown;
    this.canDash = false;
    this.freeze = T.dashFreeze;
    this.sound("dash");
    this.afterimageTimer = 0;
    this.buffer = 0;
    if (dx !== 0) this.facing = Math.sign(dx) as 1 | -1;
    this.fx.burst(this.x + HB_W / 2, this.y + HB_H / 2, 10, {
      colors: [COLORS.W, COLORS.P, COLORS.q],
      speed: 70,
      angle: Math.atan2(-this.dashDirY, -this.dashDirX),
      spread: 1.2,
      life: 0.3,
    });
  }

  private jump(speed: number): void {
    this.vy = -speed;
    this.buffer = 0;
    this.coyote = 0;
    this.jumpCut = false;
    this.grounded = false;
  }

  private die(): void {
    this.dead = true;
    this.sound("death");
    this.fx.burst(this.x + HB_W / 2, this.y + HB_H / 2, 24, {
      colors: [COLORS.W, COLORS.P, COLORS.q, COLORS.C],
      speed: 120,
      life: 0.6,
      gravity: 200,
    });
  }

  private dust(n: number): void {
    this.fx.burst(this.x + HB_W / 2, this.y + HB_H - 1, n, {
      colors: [COLORS.g, COLORS.G],
      speed: 40,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 0.35,
      gravity: 60,
    });
  }

  // ------------------------------------------------------------------ collisions
  private onGround(): boolean {
    if (this.level.solidAt({ ...this.hitbox, y: this.y + 1 })) return true;
    return this.vy >= 0 && this.dropTimer <= 0 && this.level.platformBelow(this.x, HB_W, this.y + HB_H);
  }

  /** Moves pixel by pixel; stops at walls. */
  private moveX(amount: number): void {
    this.remX += amount;
    let move = Math.round(this.remX);
    this.remX -= move;
    const step = Math.sign(move);
    while (move !== 0) {
      if (this.level.solidAt({ ...this.hitbox, x: this.x + step })) {
        this.vx = 0;
        this.remX = 0;
        return;
      }
      this.x += step;
      move -= step;
    }
  }

  private moveY(amount: number): void {
    this.remY += amount;
    let move = Math.round(this.remY);
    this.remY -= move;
    const step = Math.sign(move);
    while (move !== 0) {
      const next = { ...this.hitbox, y: this.y + step };
      const blocked =
        this.level.solidAt(next) ||
        (step > 0 && this.dropTimer <= 0 && this.level.platformBelow(this.x, HB_W, this.y + HB_H));
      if (blocked) {
        if (step < 0 && this.cornerCorrect()) continue; // slid around a ceiling corner
        if (step > 0) this.grounded = true;
        this.vy = 0;
        this.remY = 0;
        if (this.dashing && step < 0) this.dashTimer = 0;
        return;
      }
      this.y += step;
      move -= step;
    }
  }

  /** When the head clips a ceiling corner by a few px, nudge sideways instead of stopping. */
  private cornerCorrect(): boolean {
    for (let d = 1; d <= TUNING.cornerCorrection; d++) {
      for (const dir of [-1, 1]) {
        const x = this.x + d * dir;
        if (!this.level.solidAt({ ...this.hitbox, x }) && !this.level.solidAt({ ...this.hitbox, x, y: this.y - 1 })) {
          this.x = x;
          return true;
        }
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ render
  private frame(): number {
    switch (this.state) {
      case "dash":
        return ANIM.dash[0];
      case "jump":
        return ANIM.jump[0];
      case "fall":
        return ANIM.fall[0];
      case "run":
        return ANIM.run[Math.floor(this.animTime * FPS.run) % ANIM.run.length];
      default:
        return ANIM.idle[Math.floor(this.animTime * FPS.idle) % ANIM.idle.length];
    }
  }

  render(draw: Draw, camX: number, camY: number): void {
    if (this.dead) return;
    // row 0 = rose scarf (dash ready), row 1 = grey scarf (dash spent)
    const row = this.canDash ? 0 : 1;
    draw.frame(draw.img.player, this.frame(), this.x + SPRITE_OX - camX, this.y + SPRITE_OY - camY, {
      flip: this.facing < 0,
      row,
    });
  }
}
