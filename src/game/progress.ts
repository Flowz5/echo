/** What Iris has unlocked and collected during a run. */

export type Ability = "doubleJump" | "wallJump" | "dash" | "rewind";
export type CollectibleKind = "shard" | "note" | "page" | "moment";

export const ABILITIES: Ability[] = ["doubleJump", "wallJump", "dash", "rewind"];

export class Progress {
  readonly abilities = new Set<Ability>();
  /** how many echoes Iris can hold (rooms can lower it, never raise it) */
  echoSlots = 0;
  /** collectibles secured at a checkpoint (or shards, secured at once), by unique key */
  private readonly secured = new Map<string, CollectibleKind>();
  /** picked up since the last checkpoint: lost on death */
  pending: { key: string; kind: CollectibleKind }[] = [];

  reset(abilities: Ability[], echoSlots: number): void {
    this.abilities.clear();
    for (const a of abilities) this.abilities.add(a);
    this.echoSlots = echoSlots;
    this.secured.clear();
    this.pending = [];
  }

  /** Back to a saved state (pending collectibles are never saved). */
  restore(abilities: Ability[], echoSlots: number, secured: [string, CollectibleKind][]): void {
    this.reset(abilities, echoSlots);
    for (const [key, kind] of secured) this.secured.set(key, kind);
  }

  /** Secured collectibles, for the save file. */
  securedEntries(): [string, CollectibleKind][] {
    return [...this.secured.entries()];
  }

  has(a: Ability): boolean {
    return this.abilities.has(a);
  }

  unlock(a: Ability): void {
    this.abilities.add(a);
    if (a === "rewind") this.echoSlots = Math.max(this.echoSlots, 1);
  }

  /** Taken already (secured or pending)? */
  taken(key: string): boolean {
    return this.secured.has(key) || this.pending.some((p) => p.key === key);
  }

  secure(key: string, kind: CollectibleKind): void {
    this.secured.set(key, kind);
  }

  /** Checkpoint reached: everything pending is kept for good. Returns what was secured. */
  securePending(): CollectibleKind[] {
    const kinds = this.pending.map((p) => p.kind);
    for (const p of this.pending) this.secured.set(p.key, p.kind);
    this.pending = [];
    return kinds;
  }

  /** Death: pending collectibles go back where they were. */
  dropPending(): void {
    this.pending = [];
  }

  count(kind: CollectibleKind): number {
    let n = 0;
    for (const k of this.secured.values()) if (k === kind) n++;
    return n;
  }
}

/** Parses "doubleJump, wallJump" into abilities (unknown names are ignored with a warning). */
export function parseAbilities(list: string): Ability[] {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      if (!(ABILITIES as string[]).includes(s)) {
        console.warn(`Unknown ability "${s}" (expected one of ${ABILITIES.join(", ")})`);
        return false;
      }
      return true;
    }) as Ability[];
}
