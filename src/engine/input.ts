import { manifest } from "../config";
import type { Renderer } from "./renderer";

export type Bindable = "up" | "down" | "left" | "right" | "jump" | "dash" | "rewind" | "pause";
export type Action = Bindable | "confirm" | "back";
export type Bindings = Record<Bindable, string>;

/**
 * Bindings store physical keys (KeyboardEvent.code): the default WASD sits
 * under ZQSD on an AZERTY keyboard, so both layouts work out of the box.
 */
export const DEFAULT_BINDINGS: Bindings = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  rewind: "KeyR",
  pause: "Escape",
};

/** Arrow keys always work for movement and menus, whatever the bindings. */
const ARROWS: Partial<Record<Bindable, string>> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};
const MOVES: Bindable[] = ["up", "down", "left", "right"];

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
    learnLayout();
    window.addEventListener("keydown", (e) => {
      learnKey(e.code, e.key);
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
    const isMove = (code: string) => MOVES.some((m) => b[m] === code || ARROWS[m] === code);
    switch (action) {
      case "confirm": // the jump key confirms too, unless it doubles as a movement key
        return ["Enter", "NumpadEnter", ...(isMove(b.jump) ? [] : [b.jump])];
      case "back":
        return ["Escape", "Backspace", ...(isMove(b.pause) ? [] : [b.pause])];
      default: {
        const arrow = ARROWS[action];
        return arrow ? [b[action], arrow] : [b[action]];
      }
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

  /** Raw physical key, for debug shortcuts. */
  keyPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** The next key press goes to `cb` instead of the game (key rebinding). */
  captureNextKey(cb: (code: string) => void): void {
    this.capture = cb;
  }

  get capturing(): boolean {
    return this.capture !== null;
  }

  private isGameKey(code: string): boolean {
    return code === "Enter" || code === "Backspace" || code.startsWith("Arrow") || Object.values(this.bindings()).includes(code);
  }
}

// ---------------------------------------------------------------- key labels

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

/** What each physical key is labelled on *this* keyboard (KeyW -> "Z" on AZERTY). */
const layoutLabels = new Map<string, string>();
const FONT_CHARS = new Set(manifest.font.order);

function learnKey(code: string, key: string): void {
  if (key.length !== 1 || key === " ") return;
  const label = key.toUpperCase();
  if (FONT_CHARS.has(label)) layoutLabels.set(code, label);
}

/** Chromium exposes the keyboard layout; other browsers learn it as keys get pressed. */
function learnLayout(): void {
  const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
  kb?.getLayoutMap?.()
    .then((map) => map.forEach((key, code) => learnKey(code, key)))
    .catch(() => {});
}

/** Human (and bitmap-font friendly) name of a physical key. */
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  const learned = layoutLabels.get(code);
  if (learned) return learned;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "NUM " + code.slice(6).toUpperCase();
  return code.toUpperCase();
}
