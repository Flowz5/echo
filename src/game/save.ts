/**
 * Save slots, stored locally (SCRIPT.md §4.3). Every crystal or shrine Iris touches
 * writes the current slot. Anything unreadable or from another format version is
 * treated as an empty slot, never as a crash.
 */
import type { Ability, CollectibleKind } from "./progress";

export interface SaveData {
  version: 1;
  /** room to resume in, and Iris's feet position there */
  room: string;
  /** the room's title, for the slot screen */
  roomTitle?: string;
  point: { x: number; y: number };
  abilities: Ability[];
  echoSlots: number;
  secured: [string, CollectibleKind][];
  /** checkpoints lit, as "room:index" */
  lit: string[];
  /** respawn point per room (the last crystal touched there) */
  lastCheckpoint: Record<string, { x: number; y: number }>;
  /** NPC entity keys already talked to */
  talked: string[];
  /** room names entered at least once (for the map) */
  visited: string[];
  /** seconds of actual play */
  playTime: number;
  /** Date.now() of the save */
  savedAt: number;
}

export const SLOTS = 3;
const slotKey = (slot: number) => `echo.save.v1.slot${slot}`;
const LAST_KEY = "echo.save.lastSlot";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class SaveStore {
  private readonly storage: Store | null;

  constructor(storage: Store | null = defaultStorage()) {
    this.storage = storage;
  }

  load(slot: number): SaveData | null {
    const raw = this.get(slotKey(slot));
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as SaveData;
      return data && data.version === 1 && typeof data.room === "string" ? data : null;
    } catch {
      return null;
    }
  }

  write(slot: number, data: SaveData): void {
    this.set(slotKey(slot), JSON.stringify(data));
    this.lastSlot = slot;
  }

  erase(slot: number): void {
    try {
      this.storage?.removeItem(slotKey(slot));
    } catch {
      // storage blocked: nothing to erase
    }
    if (this.lastSlot === slot) this.lastSlot = null;
  }

  /** The slot written most recently (what CONTINUE loads), or null. */
  get lastSlot(): number | null {
    const n = Number(this.get(LAST_KEY));
    return Number.isInteger(n) && n >= 1 && n <= SLOTS ? n : null;
  }

  set lastSlot(slot: number | null) {
    if (slot === null) {
      try {
        this.storage?.removeItem(LAST_KEY);
      } catch {
        // ignore
      }
    } else {
      this.set(LAST_KEY, String(slot));
    }
  }

  private get(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private set(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // storage blocked or full: the game goes on without saving
    }
  }
}

/** What the slot screen shows for a save. */
export function slotSummary(d: SaveData | null): { room: string; time: string; shards: number; pages: number } | null {
  if (!d) return null;
  const count = (kind: CollectibleKind) => d.secured.filter(([, k]) => k === kind).length;
  return {
    room: (d.roomTitle ?? d.room.replace(/_/g, " ")).toUpperCase(),
    time: formatPlayTime(d.playTime),
    shards: count("shard"),
    pages: count("page"),
  };
}

/** 2520 s -> "0:42" (hours:minutes). */
export function formatPlayTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
