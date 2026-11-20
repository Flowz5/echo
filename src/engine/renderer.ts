import { HEIGHT, WIDTH, C } from "../config";

/**
 * Draws the game into a small 320x180 buffer, then blits it to the real canvas
 * scaled by a whole number so pixels stay perfectly square and crisp.
 */
export class Renderer {
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly screen: CanvasRenderingContext2D;
  private dpr = 1;
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  /** @param scaleSetting returns 0 for "auto" (largest fit) or a fixed multiplier. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scaleSetting: () => number,
  ) {
    this.buffer = document.createElement("canvas");
    this.buffer.width = WIDTH;
    this.buffer.height = HEIGHT;
    this.ctx = get2d(this.buffer);
    this.screen = get2d(canvas);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * this.dpr);
    this.canvas.height = Math.floor(window.innerHeight * this.dpr);
    const maxFit = Math.max(1, Math.floor(Math.min(this.canvas.width / WIDTH, this.canvas.height / HEIGHT)));
    const wanted = this.scaleSetting();
    this.scale = wanted > 0 ? Math.min(wanted, maxFit) : maxFit;
    this.offsetX = Math.floor((this.canvas.width - WIDTH * this.scale) / 2);
    this.offsetY = Math.floor((this.canvas.height - HEIGHT * this.scale) / 2);
  }

  present(): void {
    const s = this.screen;
    s.imageSmoothingEnabled = false;
    s.fillStyle = C.void;
    s.fillRect(0, 0, this.canvas.width, this.canvas.height);
    s.drawImage(this.buffer, this.offsetX, this.offsetY, WIDTH * this.scale, HEIGHT * this.scale);
  }

  /** Converts a mouse position (CSS pixels) to game pixels. */
  toVirtual(clientX: number, clientY: number): { x: number; y: number } {
    return {
      x: (clientX * this.dpr - this.offsetX) / this.scale,
      y: (clientY * this.dpr - this.offsetY) / this.scale,
    };
  }
}

export function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not supported");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
