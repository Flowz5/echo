import type { Renderer } from "./renderer";

export type Bindable = "jump" | "dash" | "rewind" | "pause";
type Fixed = "up" | "down" | "left" | "right" | "confirm" | "back";
export type Action = Fixed | Bindable;
export type Bindings = Record<Bindable, string>;

export const DEFAULT_BINDINGS: Bindings = {
  jump: "Space",
  dash: "ShiftLeft",
  rewind: "KeyR",
  pause: "Escape",
};

const FIXED: Record<Fixed, string[]> = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  confirm: ["Enter", "NumpadEnter"],
  back: ["Escape", "Backspace"],
};

/**
 * Keyboard + mouse state, sampled once per fixed step so "just pressed" is
 * never missed or seen twice.
 */
export class Input {
  private readonly held = new Set<string>();
  private pressedQueue = new Set<string>();
  private repeatQueue = new Set<string>();
  private pressed = new Set<string>();
  private repeated = new Set<string>();
  private capture: ((code: string) => void) | null = null;

  readonly mouse = { x: -1, y: -1, moved: false, clicked: false };
  private mouseMovedQueue = false;
  private mouseClickQueue = false;

  constructor(
    renderer: Renderer,
    private readonly bindings: () => Bindings,
  ) {
    window.addEventListener("keydown", (e) => {
      if (this.capture) {
        e.preventDefault();
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
        return;
      }
      if (this.isGameKey(e.code)) e.preventDefault();
      (e.repeat ? this.repeatQueue : this.pressedQueue).add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    window.addEventListener("blur", () => this.held.clear());
    window.addEventListener("mousemove", (e) => {
      const p = renderer.toVirtual(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouseMovedQueue = true;
    });
    window.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const p = renderer.toVirtual(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouseClickQueue = true;
    });
  }

  /** Call once at the start of every fixed step. */
  update(): void {
    this.pressed = this.pressedQueue;
    this.repeated = this.repeatQueue;
    this.pressedQueue = new Set();
    this.repeatQueue = new Set();
    this.mouse.moved = this.mouseMovedQueue;
    this.mouse.clicked = this.mouseClickQueue;
    this.mouseMovedQueue = this.mouseClickQueue = false;
  }

  keysFor(action: Action): string[] {
    const b = this.bindings();
    switch (action) {
      case "confirm":
        return [...FIXED.confirm, b.jump];
      case "back":
        return [...FIXED.back, b.pause];
      case "jump":
      case "dash":
      case "rewind":
      case "pause":
        return [b[action]];
      default:
        return FIXED[action];
    }
  }

  isDown(action: Action): boolean {
    return this.keysFor(action).some((k) => this.held.has(k));
  }

  justPressed(action: Action): boolean {
    return this.keysFor(action).some((k) => this.pressed.has(k));
  }

  /** Just pressed, or held long enough for the OS key repeat (menu navigation). */
  pressedOrRepeat(action: Action): boolean {
    return this.keysFor(action).some((k) => this.pressed.has(k) || this.repeated.has(k));
  }

  /** The next key press goes to `cb` instead of the game (key rebinding). */
  captureNextKey(cb: (code: string) => void): void {
    this.capture = cb;
  }

  get capturing(): boolean {
    return this.capture !== null;
  }

  private isGameKey(code: string): boolean {
    return Object.values(FIXED).some((ks) => ks.includes(code)) || Object.values(this.bindings()).includes(code);
  }
}

const KEY_NAMES: Record<string, string> = {
  Space: "SPACE",
  Escape: "ESC",
  Enter: "ENTER",
  Backspace: "BACKSPACE",
  Tab: "TAB",
  ShiftLeft: "L-SHIFT",
  ShiftRight: "R-SHIFT",
  ControlLeft: "L-CTRL",
  ControlRight: "R-CTRL",
  AltLeft: "L-ALT",
  AltRight: "R-ALT",
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  CapsLock: "CAPS",
};

/** Human (and bitmap-font friendly) name of a KeyboardEvent.code. */
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "NUM " + code.slice(6).toUpperCase();
  return code.toUpperCase();
}
