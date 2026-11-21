# Chapter 1 mechanics — design

Date: 2026-11-21 · Project 1 of 3 for chapter 1 (then: ch. 1 decor & terrain, then ch. 1 level design)

## Intent

The user wants chapter 1 "Starfall Ruins" to be a real platforming chapter: much more vertical and much
harder than chapter 0 (which they found too easy and too flat), in the spirit of Celeste's difficulty,
built as short one-or-two-screen challenge rooms where a death costs seconds. That needs the four
chapter 1 mechanics from SCRIPT.md, none of which exist yet: **crumble stone, dash flowers, wind vents and
the Drift fracture**. This project builds them, tuned and testable, before any chapter 1 room is designed.

## Goals

- The four mechanics work in game, look and sound distinct, and are placed from Tiled / the Python builders.
- They work with echoes and rewind (rules below).
- The reachability solver simulates them, so hard rooms can be proven possible.
- A playground room per mechanic to feel and tune them.

## Non-goals

- Chapter 1 rooms, chapter 1 decor/terrain (projects 2 and 3).
- Pip, dark rooms, the chase, the Stillwarden ending.
- Other fractures (Weight, Haste…).

## Anti-goals

- Chapter 0 must play exactly as before (`npm run solve` 10/10, no tuning change to `TUNING`).
- No mechanic may be unreadable: each one must be recognisable *before* touching it (SCRIPT.md §4.12 rule
  for fractures applies to all four). The map stays monochrome sepia.
- Hard but fair: nothing random, every timing deterministic, so the solver and the player see the same world.

## Decisions taken with the user

- **Room structure for chapter 1:** short challenge rooms (≈1–2 screens), respawn at the room entrance.
  (Affects project 3; noted here because it drives tuning: deaths are cheap, precision can be high.)
- **Rewind restores crumble stones and dash flowers** (approach A): rewinding 2 s also rebuilds stones that
  fell and regrows flowers picked in that window. Doors/plates keep their current rule (they follow what
  stands on plates, as today).
- **An echo where a stone would reform keeps the stone gone** (1a): a stone never reforms while any body
  (Iris or echo) overlaps it, and that includes a stone restored by a rewind. Since echoes never move, an echo
  left in a fallen stone's place removes that stone until the echo shatters or the room resets — a deliberate
  tool. An echo standing *on* an intact slab triggers it like Iris does, so the slab cycles (shake, fall,
  reform under the echo, shake again…): accepted as a puzzle element.
- **The solver does not simulate rewind or echoes** (2: no): pure platforming rooms (most of chapter 1) are
  proven by the solver; the few echo puzzles are checked by hand in playtests.

## Approaches considered (rewind interaction)

- **A. Rewind restores crumble/flower state (chosen).** World state for these two is recorded with the
  player history and restored on rewind. Logical (time goes back) and opens puzzles ("drop the stone, leave
  an echo, come back with the stone rebuilt").
- **B. The world keeps its state, only Iris goes back.** Matches switches, but a stone that fell just
  before a rewind leaves the player stranded.

## Design

### Shared: per-room mechanic state

- New `src/game/mechanics.ts` holds the state of a room's crumble stones and flowers (timers), with
  `update(dt, bodies: Rect[])`, `snapshot(): MechSnapshot` and `restore(s: MechSnapshot)`. One instance
  per `Room` (built from its `Level`), reset with the room (death, restart, entering).
- Rewind: each recorded history step also stores the mech snapshot (small: a number per stone and per
  flower). When the rewind playback ends, in this order: the echo is placed (as today, checked against the
  current world), then the state of the step Iris lands on is restored, then every restored-intact stone
  that overlaps a body (Iris or an echo) is put back to "gone, waiting to reform" — so it reforms only once
  free, per rule 1a.
- *Our call:* the mech state lives on `Level` (next to `doorsOpen`), since the solver uses a `Level`
  directly as its collider; `Room.update` drives it with the bodies (Iris + echoes).
- Solver: its search state becomes player snapshot + mech snapshot, so time-varying stones are simulated
  exactly.

### Crumble stone — terrain tile

- New tileset id **5 "crumble"**, ASCII char **`=`** in the builders (`tools/ascii_to_tiled.py`
  `TILE_NAMES`/`GID`, `world.ts` `TILE_BY_ID`, `Level` tile type).
- Solid like ground while intact. **Triggered** when Iris or an echo stands on it (grounded with it under
  the feet) or Iris wall-slides against it. Triggering one stone triggers the whole connected horizontal run
  it belongs to (a "slab" breaks as one), so platforms read as units.
- Timeline: **shake 0.4 s** (still solid) → **gone 2 s** (not solid, not drawn except faint outline dust) →
  **reforms** — but only when no body overlaps it; otherwise it waits.
- Look: cut stone with visible cracks, distinct from ground (sprite in the terrain atlas); shakes by a pixel
  while triggered; falls as debris particles. Sound: a short crackle on trigger, a crumble on fall, a soft
  click on reform.
- Not autotiled with ground (always its own cracked look).

### Dash flower — object `flower`

- Point object (centre of the flower). Touching it (Iris's hitbox overlaps a 12×12 box) while the dash is
  spent **refills the dash only** (not the double jump — that's what crystals are for), plays a pop, and the
  flower closes for **2.5 s** then regrows. Touching it with the dash available does nothing (it stays open),
  so it can't be wasted.
- Rose colour (SCRIPT.md §4.5): bud closed / bloom open sprite, petals burst on use.
- Echoes don't use flowers.

### Wind vent — object `vent`

- Rectangle object: the vent's grate is the rect's bottom edge, the air column is the rect. While Iris's
  hitbox overlaps the column and she is not dashing, an upward acceleration applies: **lift 1700 px/s²**
  against gravity, capped so upward speed in the column never exceeds **200 px/s**. Net effect: Iris rises
  steadily to the top of the column and bobs there. Leaving the column (or dashing) drops the effect at once.
  Exact numbers are the builder's to tune in the playground; the shape (rise, cap, dash cancels) is fixed.
- Look (changed after the user's review: a metal grate didn't fit the game): a fissure cut into the rock under
  the column, pale wisps of the gorge's wind curling up the whole column (always visible, so its height is
  readable) and a few pebbles riding it; a soft looping whoosh while inside (deferred).
- Echoes are frozen: vents don't move them.

### Drift fracture — object `drift`

- Rectangle object = the zone. Inside (Iris's hitbox centre in the rect): **gravity ×0.45, max fall
  speed ×0.6**, blended over **0.1 s** in and out (SCRIPT.md §4.12). Dash, run speed and jump impulse are
  unchanged (so jumps go ~2× higher). *Our call:* every fall-speed cap is scaled by ×0.6 inside (normal
  fall, fast fall, wall slide), so falling feels consistently slow.
- Look: shimmering outline of the zone (cyan-blue, dotted, slowly moving), slow-falling dust motes inside,
  bluish tint of the area. Sound: music low-passed while Iris is inside (if the audio engine allows a
  filter; otherwise a volume dip — builder's call), a soft chime on entering.
- Echoes are frozen solid platforms; "echoes keep the zone rules" is trivially true. Rewinding out of a zone
  works because the zone is purely positional.
- Fractures never stack (only Drift exists for now).

### Player physics hook

- `Collider` gains `fieldAt(r: Rect): { gravity: number; fall: number; lift: number; liftCap: number }`
  (multipliers and vent lift; neutral = `{1, 1, 0, 0}`), used by `Player` when integrating vertical speed.
  `Level` implements it from its vents and drift zones; `Room` delegates. Chapter 0 rooms have none, so
  their physics are byte-identical.
- Crumble solidity goes through the existing `solidAt` (the Level asks its mech state whether a crumble
  tile is currently solid).

### Builders, checks, Tiled

- `tools/room_builder.py`: `crumble(x0, x1, y)` (fills `=`), `flower(x, y)`, `vent(x, y0, y1)` (column from
  row y0 up to y1), `drift(x0, y0, x1, y1)`.
- Rectangle objects: `ascii_to_tiled.py` exports objects with a size (today only points).
- `tools/check_world.py`: knows `flower`, `vent`, `drift` (not "unknown"), treats `=` as standable/solid for
  object checks, and reports a vent column whose top is inside a wall.
- `assets/levels/README.md` documents the new tile and objects.

### Playground

- Four test rooms added to the playground world (`?world=playground`), one per mechanic, plus one that
  combines them, so feel and timings can be tuned by hand.

### Solver

- Simulates `fieldAt` (automatic via `Player`) and crumble (via mech state in the search state; the
  dedupe key includes the mech state).
- Flowers: touching one refills the dash in the simulation (same code path as the game).
- One case per mechanic in a new `tools/solver/mechanics.cases.json` on the playground rooms
  (e.g. "this ledge is only reachable by dashing out of the vent", "this gap needs the flower").

## Testing

- Vitest: crumble timeline (trigger, shake, gone, reform blocked by a body), slab propagation, flower refill
  and regrow, vent lift cap, drift multipliers and blend, mech snapshot/restore round-trip.
- `npm run solve` chapter 0 still 10/10; mechanics cases pass.
- Headless playtest in the playground: each mechanic triggers, rewind rebuilds a fallen stone.

## Left to the builder

Exact sprites and particles, sound design, vent tuning within the stated shape, playground room layouts,
how the mech snapshot is encoded.
