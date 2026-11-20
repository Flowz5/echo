import { STEP } from "../config";

/**
 * Fixed-timestep loop: update() always receives STEP seconds, render() runs once
 * per animation frame. Keeps physics identical on 60 Hz and 144 Hz screens.
 */
export function startLoop(update: (dt: number) => void, render: () => void): void {
  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    acc += Math.min((now - last) / 1000, 0.25); // avoid a spiral after a tab switch
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
