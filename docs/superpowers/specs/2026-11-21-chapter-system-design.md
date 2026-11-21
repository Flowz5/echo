# Chapter system — design

Date: 2026-11-21 · Branch: `feature/chapter_system`

## Intent

Echo is told as a climb through chapters (SCRIPT.md §2, §5): The Quiet Vale, then Starfall Ruins, then higher.
Today the game can only load one world (`chapter0`). Before any chapter 1 level design, the game must be able
to hold several chapters and move between them, so that chapter 1 can be built and played straight after
chapter 0, saved, mapped and fast-travelled to like chapter 0 is.

## Goals

- Several chapters, each its own Tiled `.world` file (`chapter0.world`, `chapter1.world`, ...).
- Walk from The Overlook (0-15) into chapter 1, and back.
- A chapter transition: fade out, chapter title card (first entry only), fade in, chapter music.
- The save remembers the chapter; auto-save on every chapter change.
- The map shows the current chapter and lets the player browse other visited chapters.
- Fast travel to any lit shrine in any chapter.
- One music track per chapter.
- A tiny placeholder chapter 1 to test all of this.

## Non-goals

- Chapter 1 level design (next project; the placeholder rooms will be replaced).
- The map's world view, pins, collectible dots, gate locks.
- Lanternrest as a separate hub, chapter select screen, Ruins Shrine unlock of fast travel
  (fast travel stays available from the start, as the user chose).
- The final *Broken Bridges* track (a placeholder loop only).

## Anti-goals

- Existing saves must not break: a v1 save loads into chapter 0 exactly where it was.
- Chapter 0 must play exactly as before (same rooms, same solver results).
- The map stays calm (monochrome sepia parchment, no extra colours), per the map design.
- `?world=playground` keeps working for movement tests.

## Approaches considered

- **A. Separate worlds linked by exits (chosen by the user).** One `.world` per chapter; an `exit` object
  at a room edge switches chapter. Clear chapter beats (title card, music), keeps the Tiled/build/solver
  tooling per chapter.
- **B. One continuous world, chapters as regions.** Seamless, but one huge world, weaker chapter beats,
  and the build scripts and solver get harder.

## Design

### Chapter list — `src/game/chapters.ts`

```ts
export interface ChapterDef { id: string; number: number; title: string; music: TrackName }
export const CHAPTERS: ChapterDef[] = [
  { id: "chapter0", number: 0, title: "THE QUIET VALE", music: "vale" },
  { id: "chapter1", number: 1, title: "STARFALL RUINS", music: "ruins" },
];
```

Replaces `CHAPTER_TITLES` in `game-scene.ts`. Order of the list = order on the map.

### Loading

All chapters in `CHAPTERS` are loaded as `World`s when the game scene is built (the `.world`/`.tmj`
files are already bundled eagerly by `import.meta.glob`, and rooms are small). `GameScene` keeps a
`Map<string, World>` and a `currentWorld`. Keeping every world in memory means lit checkpoints, room
state and the map of other chapters need no special handling. *(Builder's call if this turns out slow.)*

`?world=<name>` still loads that single world on its own, with no exits to other chapters (playground).

### Room names are unique across the game

Save keys (`lit`, `lastCheckpoint`, `visited`, `talked` entity keys) use room names. Rather than
prefixing them with the chapter, room names must be unique game-wide. `tools/check_world.py` checks
this across all `chapter*.world` files. Each `RoomDef` gets a `chapter` field.

### Exits — Tiled object class `exit`

- Placed in a room as a rectangle object (or a point, treated as a 1-tile-wide, room-tall strip at that
  x). Properties: `chapter` (string, target chapter id) and `room` (string, target room name),
  optional `spawn` (int, index into the target room's spawns, default 0).
- When Iris's hitbox overlaps it (alive), the chapter transition starts.
- The Overlook gets an exit at its right edge to chapter 1's first room; chapter 1's first room gets an
  exit at its left edge back to The Overlook. The Overlook's sign ("CHAPTER 1: STARFALL RUINS" /
  "COMING SOON") is removed (`tools/build_chapter0.py` updated, then regenerated). *(Our call: the
  sign announced something that now simply happens.)*
- The Overlook's right column is solid wall: the exit rectangle sits inside the room, in front of that
  wall, so chapter 0's terrain and solver results do not change. The Overlook gets a second spawn near
  its right wall; chapter 1's return exit points at it with `spawn: 1` (its only spawn today is at the
  far left).
- Arrival point: the target room's spawn (by index). Rooms with an exit need a spawn placed so Iris does
  not land back on the exit. Exit and spawn placement is checked by `check_world.py` (exit target chapter
  and room exist; spawn index exists).

### Chapter transition

1. Fade to black (same duration feel as fast travel, `TRAVEL_FADE`).
2. Switch `currentWorld`, `setRoom(target)`, respawn point = target spawn, `lastCheckpoint` set there.
3. If the chapter was never visited before (no room of it in `visited`): show the title card for ~2.5 s
   on black — `CHAPTER 1` small, `STARFALL RUINS` big, centred, in the existing UI font. Skippable with
   jump/interact.
4. Switch music to the chapter's track (`playMusic`), fade in.
5. Auto-save.

Iris keeps her abilities, echo slots and collectibles (they are global).

A new game shows no title card for chapter 0 (it starts in Lanternrest as today). *(Our call.)*

### Save — version 2

- `SaveData` gains `chapter: string` and `version` becomes `2`.
- `SaveStore.load` accepts v1 (treated as `chapter: "chapter0"`) and v2. Storage key stays
  `echo.save.v1.slotN` (the key name is just a name; changing it would orphan saves). *(Builder may
  rename keys only with a migration.)*
- On load, unknown chapter or room → chapter 0 start room (as today for a removed room). The same applies
  in a `?world=` dev run when the save's chapter isn't loaded; dev runs keep writing the real slots, as
  today. *(Our call.)*
- `revealed` stays per chapter id (already the case).
- Slot screen: unchanged apart from showing the room title (already); optional chapter number is the
  builder's call.

### Map

- Opens on the current chapter.
- Left/right (`left`/`right` actions) switch between chapters the player has visited (at least one room
  visited), in `CHAPTERS` order. Header: `◄  CHAPTER 0 · THE QUIET VALE  ►`, arrows only shown when
  there is another chapter that way. Chapters never visited are not listed.
- `MapScreen` takes the rooms and title of the chapter being shown (today it gets them once in its
  constructor); "revealed" is looked up per chapter.
- The player marker only shows on the current chapter.
- In fast-travel mode, left/right still changes chapter; the target picker cycles the lit shrines of the
  shown chapter. *(How picker and chapter switching share left/right is the builder's call; must stay
  obvious with the existing key hints.)*

### Fast travel

- `travelTargets` works over all chapters' shrines; `ShrineSpot` gains `chapter`.
- Travelling to a shrine in another chapter: same fade, chapter switch in the middle, music switch, no
  title card (the chapter was visited, since its shrine is lit).

### Music

- `TRACKS` gains `ruins`: a placeholder loop for *Broken Bridges* composed in `tracks.ts` in the
  existing format, distinct mood from `vale` (SCRIPT.md ch. 1: ruins over a gorge, stars close).
- `GameScene.enter` plays the current chapter's track instead of always `"vale"`.

### Placeholder chapter 1

- `chapter1.world` with 2–3 simple rooms, generated by a small script in `tools/` like
  `build_chapter0.py` (or hand-made `.tmj`, builder's call): `gorge_gate` (exit back to The Overlook,
  spawn, flat ground and a wide gap) and `ruins_shrine` (a Bell Shrine). Titles from SCRIPT.md
  ("Gorge Gate"). Positioned to the right of / above chapter 0 is irrelevant (separate world).
- Chapter 1's first room carries the `abilities`/`echoSlots` properties only for direct loading via
  `?world=chapter1`; in normal play Iris keeps what she has.

## Testing

- Vitest: chapter list lookup, save v1 → v2 load, travel targets across chapters, visited-chapter list for
  the map.
- `check_world.py` over all chapters (unique names, exit targets).
- Headless playtest (playwright harness as before): walk Overlook → Gorge Gate (title card, music, save
  written with `chapter1`), walk back, fast travel chapter 1 shrine ↔ chapter 0 shrine, reload the save.
- `npm run solve` on chapter 0 still passes.

## Left to the builder

Exact fade/title timings, title card styling within the existing UI style, the placeholder track's notes,
placeholder room layouts, how the map's chapter switch and shrine picker share inputs.
