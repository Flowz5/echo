import manifest from "../assets/sprites.json";

export const WIDTH = manifest.resolution.width;
export const HEIGHT = manifest.resolution.height;
export const TILE = manifest.resolution.tile;
export const VERSION = "V0.1";

/** Simulation runs at a fixed 60 steps per second, whatever the screen refresh rate. */
export const STEP = 1 / 60;

export const COLORS = manifest.palette as Record<string, string>;

/** Named colours used by code, so the palette keys stay in one place. */
export const C = {
  void: COLORS.K,
  night1: COLORS["1"],
  night2: COLORS["2"],
  bone: COLORS.W,
  ash: COLORS.g,
  slate: COLORS.G,
  echo: COLORS.C,
  echoLight: COLORS.e,
  gold: COLORS.y,
} as const;

export { manifest };
