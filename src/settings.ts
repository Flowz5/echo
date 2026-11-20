import { DEFAULT_BINDINGS, type Bindable, type Bindings } from "./engine/input";

export interface Settings {
  /** 0..10 */
  music: number;
  /** 0..10 */
  sfx: number;
  screenShake: boolean;
  /** 0 = auto (largest whole scale that fits), otherwise a fixed multiplier */
  pixelScale: number;
  bindings: Bindings;
}

const KEY = "echo.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  music: 7,
  sfx: 8,
  screenShake: true,
  pixelScale: 0,
  bindings: { ...DEFAULT_BINDINGS },
};

export const PIXEL_SCALES = [0, 1, 2, 3, 4, 5, 6];

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      bindings: { ...DEFAULT_BINDINGS, ...saved.bindings },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked (private mode…): settings just won't persist
  }
}

/** Assigns `code` to `action`; if another action used that key, they swap. */
export function rebind(s: Settings, action: Bindable, code: string): void {
  const other = (Object.keys(s.bindings) as Bindable[]).find((a) => a !== action && s.bindings[a] === code);
  if (other) s.bindings[other] = s.bindings[action];
  s.bindings[action] = code;
}
