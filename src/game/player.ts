import { COLORS, manifest } from "../config";
import type { SfxName } from "../engine/audio";
import type { Draw } from "../engine/draw";
import type { Input } from "../engine/input";
import type { Rect } from "./level";
import type { Effects } from "./particles";
import type { Ability } from "./progress";
import type { Collider } from "./room";
import { Scarf } from "./scarf";

/**
 * Movement tuning. Units: pixels and seconds. One tile = 16 px.
 * Tweak these to change the feel; everything else reads from here.
 */
export const TUNING = {
  // running
  runSpeed: 100,
  groundAccel: 900,
  groundDecel: 1250,
  turnAccel: 1900, // reversing direction on the ground is extra snappy
  airAccel: 720,
  airDecel: 320,
  overspeedDecel: 260, // how fast extra speed (after a dash) bleeds off in the air

  // gravity: lighter going up, heavier coming down = floaty rise, punchy fall
  gravityUp: 950,
  gravityDown: 1350,
  apexThreshold: 40, // |vy| under this while holding jump…
  apexGravityMult: 0.5, // …halves gravity: a soft hang at the top of the jump
  maxFall: 235,
  fastFall: 330, // holding down

  // jumping: holding jump sustains the take-off speed for a short time,
  // releasing just lets gravity take over (no abrupt cut)
  jumpSpeed: 205,
  varJumpTime: 0.11, // ≈ 2.8 tiles at full hold, ≈ 1.4 tiles on a tap
  jumpHBoost: 24, // extra horizontal push when jumping while running
  doubleJumpSpeed: 195,
  doubleVarJumpTime: 0.08,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  cornerCorrection: 4,

  // dashing
  dashSpeed: 285,
  dashTime: 0.175, // ≈ 2.7 tiles from a standstill, plus the momentum kept afterwards
  dashEase: 0.4, // the dash slows down by this fraction towards its end
  dashEndSpeed: 130, // horizontal speed kept after a dash (momentum)
  dashUpEndSpeed: 110, // upward speed kept after an upward dash
  dashCooldown: 0.18,
  dashFreeze: 0.02,
  afterimageEvery: 0.03,

  // walls
  wallSlideSpeed: 55, // max fall speed while sliding down a wall
  wallSlideAccel: 700, // how fast Iris slows down when she grabs a wall while falling fast
  wallJumpSpeed: 210,
  wallJumpVarTime: 0.1,
  wallJumpPush: 150, // horizontal kick away from the wall (also when still holding towards it)
  wallJumpNeutralPush: 85, // jumping with no direction held: a smaller kick, to climb a single wall
  wallJumpLock: 0.16, // seconds the kick direction overrides the stick (no instant re-grab)
  wallJumpSoftLock: 0.15, // then, for this long, pushing back towards the old wall only works weakly
  wallJumpSoftMult: 0.3, // …at this fraction of the normal air acceleration
  wallCoyote: 0.08, // can still wall jump this long after leaving a wall
  wallCheck: 2, // px: how close to a wall counts as touching it
  wallChainTime: 0.7, // after a wall jump, touching the next wall is enough to wall jump again

  platformDropTime: 0.2,
  voidGrace: 0.5, // seconds of falling below the room before death: time to rewind
};

/** Everything needed to put Iris back exactly where she was (used by the rewind). */
export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  remX: number;
  remY: number;
  facing: 1 | -1;
  canDash: boolean;
  canDoubleJump: boolean;
  frame: number;
}

const ANIM = manifest.player.animations;
const RUN_STRIDE = 7; // px travelled per run frame (keeps the legs in sync with speed)

/** Hitbox inside the 16x16 sprite: 8 wide, 12 tall, feet on the sprite's bottom row. */
const HB_W = 8;
const HB_H = 12;
const SPRITE_OX = -4;
const SPRITE_OY = HB_H - 16;

/** Collar position inside each player frame (facing right), where the scarf tail starts. */
export function scarfAnchor(frame: number): { x: number; y: number } {
  const down = frame === ANIM.idle[1] || frame === ANIM.run[1] || frame === ANIM.run[3];
  return { x: frame === ANIM.dash[0] ? 5 : 4, y: down ? 10 : 9 };
}

export type PlayerState = "idle" | "run" | "jump" | "fall" | "dash" | "wall";

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
  /** Seconds spent below the room (the void). Death when it reaches TUNING.voidGrace. */
  voidTime = 0;
  /** Eye glow after a rewind (0..1). */
  power = 0;

  private remX = 0;
  private remY = 0;
  private coyote = 0;
  private buffer = 0;
  private jumpHeld = false;
  private varJumpTimer = 0;
  private varJumpSpeed = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirY = 0;
  private afterimageTimer = 0;
  private dropTimer = 0;
  private animTime = 0;
  private runDistance = 0;
  private dustDistance = 0;
  private wallSliding = false;
  private wallDir: -1 | 0 | 1 = 0; // wall touched last (for the wall coyote time)
  private wallCoyote = 0;
  private wallChain = 0; // time left in a wall-jump chain (chimneys)
  private touchedSlide = false; // the wall in the coyote window was slid on, not just brushed
  private forceMoveTimer = 0;
  private forceMoveDir = 0;
  private softLockTimer = 0;
  private softLockDir = 0; // direction of the wall Iris just kicked off
  private slideFxTimer = 0;
  private scaleX = 1;
  private scaleY = 1;
  private readonly scarf = new Scarf();

  constructor(
    private level: Collider,
    private readonly fx: Effects,
    private readonly sound: (name: SfxName) => void = () => {},
    /** which abilities are unlocked (all by default) */
    private readonly can: (a: Ability) => boolean = () => true,
  ) {
    this.respawn();
  }

  /** Moves Iris into another room (the scene converts her position). */
  setCollider(level: Collider): void {
    this.level = level;
  }

  /** Respawns at the room's default spawn. */
  respawn(): void {
    this.respawnAt(this.level.spawn);
  }

  /** Respawns with her feet on `feet` (bottom-centre). */
  respawnAt(feet: { x: number; y: number }): void {
    this.x = Math.round(feet.x - HB_W / 2);
    this.y = Math.round(feet.y - HB_H);
    this.vx = this.vy = this.remX = this.remY = 0;
    this.facing = 1;
    this.dead = false;
    this.canDash = this.canDoubleJump = true;
    this.dashTimer = this.dashCooldown = this.buffer = this.coyote = this.varJumpTimer = 0;
    this.wallSliding = false;
    this.wallCoyote = this.forceMoveTimer = this.softLockTimer = this.wallChain = 0;
    this.touchedSlide = false;
    this.voidTime = 0;
    this.power = 0;
    this.scaleX = 0.6; // pop in
    this.scaleY = 1.4;
    const a = this.scarfWorldAnchor();
    this.scarf.reset(a.x, a.y, this.facing);
  }

  get hitbox(): Rect {
    return { x: this.x, y: this.y, w: HB_W, h: HB_H };
  }

  /** Gives the dash and double jump back (checkpoints, refills). */
  refill(): void {
    if (!this.canDash) this.fx.burst(this.x + HB_W / 2, this.y + 4, 6, { colors: [COLORS.P, COLORS.q], speed: 35, life: 0.3 });
    this.canDash = true;
    this.canDoubleJump = true;
  }

  /** Shifts Iris by a vector (room transitions), keeping her momentum. */
  shift(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.scarf.shift(dx, dy);
  }

  get dashing(): boolean {
    return this.dashTimer > 0;
  }

  get state(): PlayerState {
    if (this.dashing) return "dash";
    if (this.wallSliding) return "wall";
    if (!this.grounded) return this.vy < 0 ? "jump" : "fall";
    return Math.abs(this.vx) > 8 ? "run" : "idle";
  }

  // ------------------------------------------------------------------ update
  update(dt: number, input: Input): void {
    if (this.dead) return;
    const T = TUNING;
    let mx = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
    const my = (input.isDown("down") ? 1 : 0) - (input.isDown("up") ? 1 : 0);
    this.animTime += dt;
    this.power = Math.max(0, this.power - dt * 2);

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.wallCoyote = Math.max(0, this.wallCoyote - dt);
    this.wallChain = Math.max(0, this.wallChain - dt);
    if (this.forceMoveTimer > 0 && this.forceMoveTimer - dt <= 0) this.softLockTimer = TUNING.wallJumpSoftLock;
    this.forceMoveTimer = Math.max(0, this.forceMoveTimer - dt);
    this.softLockTimer = Math.max(0, this.softLockTimer - dt);
    this.buffer = input.justPressed("jump") ? T.jumpBuffer : Math.max(0, this.buffer - dt);
    this.jumpHeld = input.isDown("jump");

    const wasGrounded = this.grounded;
    this.grounded = this.onGround();
    if (this.grounded) {
      this.coyote = T.coyoteTime;
      this.canDoubleJump = true;
      if (!this.dashing && this.dashCooldown <= 0 && !this.canDash && this.can("dash")) {
        this.canDash = true;
        this.fx.burst(this.x + HB_W / 2, this.y + 4, 4, { colors: [COLORS.P, COLORS.q], speed: 30, life: 0.25 });
      }
    }

    // ---- dash
    if (input.justPressed("dash") && this.can("dash") && this.canDash && this.dashCooldown <= 0) this.startDash(mx, my);

    if (this.dashing) {
      this.wallSliding = false;
      this.updateDash(dt);
    } else {
      if (this.forceMoveTimer > 0) mx = this.forceMoveDir; // just kicked off a wall
      this.updateWalls(dt, mx);
      this.updateRun(dt, mx);
      this.updateJump(mx, my);
      this.updateGravity(dt, my);
    }

    // ---- move
    const fallSpeed = this.vy;
    this.moveX(this.vx * dt);
    this.moveY(this.vy * dt);

    if (!wasGrounded && this.onGround()) this.land(fallSpeed);
    if (this.grounded && Math.abs(this.vx) > 8) this.runEffects(Math.abs(this.vx * dt));

    // ---- squash & stretch eases back to normal
    const k = 1 - Math.exp(-dt * 14);
    this.scaleX += (1 - this.scaleX) * k;
    this.scaleY += (1 - this.scaleY) * k;

    const a = this.scarfWorldAnchor();
    this.scarf.update(dt, a.x, a.y, this.facing, Math.hypot(this.vx, this.vy));

    // ---- death
    if (this.y > this.level.height + 4) this.voidTime += dt;
    if (this.level.hazardAt(this.hitbox) || this.voidTime >= TUNING.voidGrace) this.die();
  }

  private updateRun(dt: number, mx: number): void {
    const T = TUNING;
    const target = mx * T.runSpeed;
    let accel: number;
    if (this.grounded) {
      const turning = mx !== 0 && this.vx !== 0 && Math.sign(this.vx) !== mx;
      accel = mx === 0 ? T.groundDecel : turning ? T.turnAccel : T.groundAccel;
      if (turning && Math.abs(this.vx) > 60) this.skid();
    } else if (mx !== 0 && Math.sign(this.vx) === mx && Math.abs(this.vx) > T.runSpeed) {
      accel = T.overspeedDecel; // keep dash momentum in the air
    } else {
      accel = mx !== 0 ? T.airAccel : T.airDecel;
      // just kicked off a wall: holding back towards it barely pulls (time to switch keys)
      if (this.softLockTimer > 0 && mx === this.softLockDir) accel *= T.wallJumpSoftMult;
    }
    this.vx = approach(this.vx, target, accel * dt);
    if (mx !== 0) this.facing = mx as 1 | -1;
  }

  /** Detects walls, handles sliding and remembers the wall for the wall-jump coyote time. */
  private updateWalls(dt: number, mx: number): void {
    const T = TUNING;
    this.wallSliding = false;
    if (this.grounded || !this.can("wallJump")) return;
    const right = this.level.solidAt({ ...this.hitbox, x: this.x + T.wallCheck });
    const left = this.level.solidAt({ ...this.hitbox, x: this.x - T.wallCheck });
    if (right || left) {
      this.wallDir = right && (!left || mx >= 0) ? 1 : -1;
      this.wallCoyote = T.wallCoyote;
      this.touchedSlide = false;
    }
    const pushing = (mx > 0 && right) || (mx < 0 && left);
    const touching = this.level.solidAt({ ...this.hitbox, x: this.x + mx });
    if (pushing && touching && this.vy > 0) {
      this.wallSliding = true;
      this.touchedSlide = true;
      this.facing = mx as 1 | -1;
      this.canDoubleJump = true; // touching a wall gives the double jump back
      this.slideFxTimer -= dt;
      if (this.slideFxTimer <= 0) {
        this.slideFxTimer = 0.07;
        this.fx.burst(this.x + (mx > 0 ? HB_W : 0), this.y + 3, 1, {
          colors: [COLORS.W, COLORS.g],
          speed: 25,
          angle: -Math.PI / 2 - mx * 0.6,
          spread: 0.8,
          life: 0.25,
          gravity: 80,
        });
      }
    }
  }

  /**
   * Near a wall, a jump is a wall jump when Iris slides on it, chains wall jumps,
   * is already coming down, or has no double jump left. Rising past a wall with
   * the double jump available (e.g. jumping up onto a ledge) keeps the double jump,
   * so she isn't kicked away from where she wants to go.
   */
  private wantsWallJump(): boolean {
    return this.wallSliding || this.touchedSlide || this.wallChain > 0 || this.vy >= 0 || !this.canDoubleJump || !this.can("doubleJump");
  }

  private wallJump(mx: number): void {
    const T = TUNING;
    const away = -this.wallDir as 1 | -1;
    // only a jump with no direction held is the short "climb the same wall" kick;
    // holding towards the wall (natural while sliding) still gives the full kick away
    const neutral = mx === 0;
    this.jump(T.wallJumpSpeed, T.wallJumpVarTime);
    this.vx = away * (neutral ? T.wallJumpNeutralPush : T.wallJumpPush);
    this.facing = away;
    this.forceMoveDir = away;
    this.forceMoveTimer = neutral ? T.wallJumpLock * 0.5 : T.wallJumpLock;
    this.softLockDir = this.wallDir;
    this.softLockTimer = 0;
    this.wallChain = T.wallChainTime;
    this.wallSliding = false;
    this.wallCoyote = 0;
    this.sound("wallJump");
    this.stretch(0.75, 1.3);
    this.fx.burst(this.x + (this.wallDir > 0 ? HB_W : 0), this.y + HB_H / 2, 7, {
      colors: [COLORS.W, COLORS.g, COLORS.G],
      speed: 55,
      angle: away > 0 ? 0 : Math.PI,
      spread: 1.4,
      life: 0.3,
    });
  }

  private updateJump(mx: number, my: number): void {
    const T = TUNING;
    if (this.buffer > 0) {
      const onPlatform =
        this.grounded && my > 0 && this.level.platformBelow(this.x, HB_W, this.y + HB_H) && !this.level.solidAt({ ...this.hitbox, y: this.y + 1 });
      if (onPlatform) {
        this.dropTimer = T.platformDropTime; // down + jump drops through one-way platforms
        this.buffer = 0;
      } else if (this.coyote > 0 && !this.wallSliding) {
        this.jump(T.jumpSpeed, T.varJumpTime);
        this.vx += Math.sign(this.vx) * T.jumpHBoost * Math.min(1, Math.abs(this.vx) / T.runSpeed);
        this.dust(6);
        this.sound("jump");
        this.stretch(0.7, 1.35);
      } else if (this.wallCoyote > 0 && this.wantsWallJump()) {
        this.wallJump(mx);
      } else if (this.canDoubleJump && this.can("doubleJump")) {
        this.canDoubleJump = false;
        this.jump(T.doubleJumpSpeed, T.doubleVarJumpTime);
        this.sound("doubleJump");
        this.stretch(0.75, 1.3);
        this.fx.burst(this.x + HB_W / 2, this.y + HB_H, 10, {
          colors: [COLORS.P, COLORS.q, COLORS.W],
          speed: 70,
          angle: Math.PI / 2,
          spread: Math.PI * 0.8,
          life: 0.35,
        });
      }
    }
    // sustain the take-off speed while jump is held
    if (this.varJumpTimer > 0) {
      if (this.jumpHeld) this.vy = Math.min(this.vy, -this.varJumpSpeed);
      else this.varJumpTimer = 0;
    }
  }

  private updateGravity(dt: number, my: number): void {
    const T = TUNING;
    this.varJumpTimer = Math.max(0, this.varJumpTimer - dt);
    const apex = Math.abs(this.vy) < T.apexThreshold && this.jumpHeld;
    const g = (this.vy < 0 ? T.gravityUp : T.gravityDown) * (apex ? T.apexGravityMult : 1);
    if (this.wallSliding) {
      // grab the wall: brake smoothly down to the slide speed
      this.vy = this.vy > T.wallSlideSpeed ? approach(this.vy, T.wallSlideSpeed, T.wallSlideAccel * dt) : approach(this.vy, T.wallSlideSpeed, g * dt);
      return;
    }
    const maxFall = my > 0 ? T.fastFall : T.maxFall;
    this.vy = approach(this.vy, maxFall, g * dt);
  }

  snapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      remX: this.remX,
      remY: this.remY,
      facing: this.facing,
      canDash: this.canDash,
      canDoubleJump: this.canDoubleJump,
      frame: this.frame(),
    };
  }

  /** Puts Iris back into a recorded moment (position, momentum and resources). */
  restore(s: PlayerSnapshot): void {
    this.x = s.x;
    this.y = s.y;
    this.vx = s.vx;
    this.vy = s.vy;
    this.remX = s.remX;
    this.remY = s.remY;
    this.facing = s.facing;
    this.canDash = s.canDash;
    this.canDoubleJump = s.canDoubleJump;
    this.dashTimer = this.varJumpTimer = this.buffer = this.forceMoveTimer = this.wallCoyote = 0;
    this.wallSliding = false;
    this.dead = false;
    this.voidTime = 0;
    this.power = 1;
    this.stretch(0.7, 1.35);
    const a = this.scarfWorldAnchor();
    this.scarf.reset(a.x, a.y, this.facing);
  }

  /** Current sprite frame and where it is drawn (to freeze an echo in this exact pose). */
  get pose(): { frame: number; facing: 1 | -1; spriteX: number; spriteY: number } {
    return { frame: this.frame(), facing: this.facing, spriteX: this.x + SPRITE_OX, spriteY: this.y + SPRITE_OY };
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
    this.varJumpTimer = 0;
    this.canDash = false;
    this.freeze = T.dashFreeze;
    this.sound("dash");
    this.afterimageTimer = 0;
    this.buffer = 0;
    if (dx !== 0) this.facing = Math.sign(dx) as 1 | -1;
    // stretch along the dash direction
    const horiz = Math.abs(this.dashDirX);
    this.stretch(1 + 0.4 * horiz - 0.3 * (1 - horiz), 1 - 0.3 * horiz + 0.4 * (1 - horiz));
    this.fx.burst(this.x + HB_W / 2, this.y + HB_H / 2, 12, {
      colors: [COLORS.W, COLORS.P, COLORS.q],
      speed: 80,
      angle: Math.atan2(-this.dashDirY, -this.dashDirX),
      spread: 1.1,
      life: 0.3,
    });
  }

  private updateDash(dt: number): void {
    const T = TUNING;
    this.dashTimer -= dt;
    // ease out: full speed at the start, slowing towards the end
    const progress = 1 - Math.max(0, this.dashTimer) / T.dashTime;
    const speed = T.dashSpeed * (1 - T.dashEase * progress * progress);
    this.vx = this.dashDirX * speed;
    this.vy = this.dashDirY * speed;

    this.afterimageTimer -= dt;
    if (this.afterimageTimer <= 0) {
      this.afterimageTimer = T.afterimageEvery;
      this.fx.afterimage(this.x + SPRITE_OX, this.y + SPRITE_OY, this.frame(), this.facing < 0);
    }
    if (this.dashTimer <= 0) {
      // hand momentum back to normal movement smoothly
      if (Math.abs(this.vx) > T.dashEndSpeed) this.vx = Math.sign(this.vx) * T.dashEndSpeed;
      if (this.vy < -T.dashUpEndSpeed) this.vy = -T.dashUpEndSpeed;
    }
  }

  private jump(speed: number, varTime: number): void {
    this.vy = -speed;
    this.varJumpSpeed = speed;
    this.varJumpTimer = varTime;
    this.buffer = 0;
    this.coyote = 0;
    this.grounded = false;
  }

  private land(fallSpeed: number): void {
    const impact = Math.min(1, fallSpeed / TUNING.maxFall);
    this.stretch(1 + 0.35 * impact, 1 - 0.3 * impact);
    if (fallSpeed > 110) {
      this.dust(3 + Math.round(impact * 6));
      this.sound("land");
    }
  }

  private die(): void {
    this.dead = true;
    this.sound("death");
    this.fx.burst(this.x + HB_W / 2, this.y + HB_H / 2, 26, {
      colors: [COLORS.W, COLORS.P, COLORS.q, COLORS.C],
      speed: 120,
      life: 0.6,
      gravity: 200,
    });
  }

  private stretch(sx: number, sy: number): void {
    this.scaleX = sx;
    this.scaleY = sy;
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

  /** Little puffs behind the feet while running, in step with the legs. */
  private runEffects(dist: number): void {
    this.runDistance += dist;
    this.dustDistance += dist;
    if (this.dustDistance > 18) {
      this.dustDistance = 0;
      this.fx.burst(this.x + HB_W / 2 - this.facing * 3, this.y + HB_H - 1, 2, {
        colors: [COLORS.g, COLORS.G],
        speed: 18,
        angle: this.facing > 0 ? -Math.PI * 0.85 : -Math.PI * 0.15,
        spread: 0.8,
        life: 0.3,
      });
    }
  }

  private skid(): void {
    if (Math.random() < 0.5) {
      this.fx.burst(this.x + HB_W / 2 + Math.sign(this.vx) * 3, this.y + HB_H - 1, 1, {
        colors: [COLORS.g, COLORS.W],
        speed: 30,
        angle: -Math.PI / 2,
        spread: 1.5,
        life: 0.25,
      });
    }
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
        if (step < 0) {
          this.varJumpTimer = 0;
          this.stretch(1.15, 0.85); // head bonk
        }
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
      case "wall":
        return ANIM.wall[0];
      case "run":
        return ANIM.run[Math.floor(this.runDistance / RUN_STRIDE) % ANIM.run.length];
      default:
        return ANIM.idle[Math.floor(this.animTime * manifest.player.fps.idle) % ANIM.idle.length];
    }
  }

  private scarfWorldAnchor(): { x: number; y: number } {
    const a = scarfAnchor(this.frame());
    const lx = this.facing > 0 ? a.x : 15 - a.x;
    // follow the squash so the scarf stays attached to the collar
    const sy = this.y + SPRITE_OY + 16 - (16 - a.y) * this.scaleY;
    const sx = this.x + SPRITE_OX + 8 + (lx - 8) * this.scaleX;
    return { x: sx, y: sy };
  }

  render(draw: Draw, camX: number, camY: number): void {
    if (this.dead) return;
    this.scarf.render(draw, camX, camY, !this.canDash);
    // row 0 = rose collar (dash ready), row 1 = grey collar (dash spent)
    draw.frame(draw.img.player, this.frame(), this.x + SPRITE_OX - camX, this.y + SPRITE_OY - camY, {
      flip: this.facing < 0,
      // row 0 = rose collar, 1 = grey collar (dash spent), 2 = glowing Eye (just rewound)
      row: this.power > 0.3 ? 2 : this.canDash ? 0 : 1,
      sx: this.scaleX,
      sy: this.scaleY,
    });
  }
}
