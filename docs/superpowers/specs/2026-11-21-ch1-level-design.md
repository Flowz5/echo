# Chapter 1 "Starfall Ruins" — level design

Date: 2026-11-21 · Project 3 of 3 for chapter 1 (after the mechanics and the decor/terrain, both merged)

## Intent

The user found chapter 0 "too easy and flat". Chapter 1 must be a real platforming chapter: **much
harder, much more vertical**, in the spirit of Celeste's difficulty, and **longer than chapter 0**. It keeps
the script's story beats and its two routes (SCRIPT.md §5, chapter 1), adds a mandatory vertical climb after
them, and is built from short challenge rooms so that precision can be demanding while a death costs seconds.

## Goals

- About 38 short rooms forming the chapter, from Gorge Gate (already linked to The Overlook) to the Shard of
  Light and an ending placeholder.
- A difficulty curve that starts just above the end of chapter 0 and climbs, with a few optional rooms that
  are frankly hard and hold the collectibles.
- Every mandatory beat proven possible by the solver (or by a recorded replay where open search is too slow,
  e.g. vents); strict gates proven impossible without what they gate.
- The new chapter 1 mechanics (crumble stone, dash flowers, wind vents, Drift) and the ruins decor used
  throughout, so rooms feel alive.
- Built and playtested **in tranches**: part 1 first, the user playtests, difficulty is re-tuned, then part 2,
  then part 3.

## Non-goals

- Pip as a character, the dark-room lantern, the scripted collapse chase, the Stillwarden ending, Tamsin's
  story at the shrine, the Starbloom Tea and Letters Never Sent quests: placeholders only (text signs /
  Lingering lines / markers), built later.
- The Shard of Light's power (lighting dark rooms): the shard is collected and named, its effect comes later.
- New mechanics beyond the four of chapter 1. No rewind or echoes (see constraints).

## Anti-goals

- Unfair difficulty: no blind jumps, no hazards that can't be seen before they matter, no "inhuman" inputs
  (the beat-3 lesson from chapter 0: beats are checked with natural-input replays too).
- Long run-backs: a death never sends Iris back more than one room.
- Flat rooms: most rooms go up; horizontal rooms are the exception (the Long Bridge, the market).
- Breaking chapter 0 or the chapter system (exits, saves, map, fast travel).

## Constraints from the script and the engine

- **Abilities in chapter 1: double jump, wall jump, dash.** Rewind comes in chapter 2 (SCRIPT.md §4.1 unlock
  order). So the Low Road's puzzles are crumble-stone puzzles (order of steps, timed bridges, reform timing),
  not echo puzzles — and the whole chapter is solver-checkable.
- Room-entrance respawn already works: entering a room picks the nearest spawn; a death respawns there unless
  a crystal was touched in the room. Every entrance gets a spawn. Crystals only in the few longer rooms.
- Going up into a room gives a small hop (`UP_BOOST`) so upward exits land.
- Rooms ≥ 20×12 tiles (the screen); "short" = one or two screens, typically 20–30 wide and 12–24 tall.
- Movement budget (tools/build_chapter0.py header) and level-design lessons: any tall wall is climbable with
  neutral wall jumps; crystals refill on touch; dash gates must target level-or-higher ledges.

## Decisions taken with the user

- Short challenge rooms, respawn at the room entrance.
- **Shape B:** the script's two routes after the Ruins Shrine (High Road = platforming, Low Road = puzzle),
  rejoining, **then a mandatory vertical climb** so the chapter is longer than chapter 0.
- Drift first appears in the climb (the chapter's second half, as the script says), so every player learns
  it whichever route they took.
- Tranches with a playtest between each.
- The user does not need to review sprites; rooms just have to fit the chapter 1 script.
- **Come-back-later gates get their space now** (SCRIPT.md "Come back later": twin plates in the Bell
  Foundry, a hanging switch over the gorge, an echo seal on the Archive door). Each is built as a visible,
  sealed alcove — a door with no plate in its room (so it never opens) and a sign — at a spot that won't need
  re-tuning when the real mechanism arrives in a later chapter. No solver "impossible without echoes" cases
  for them (the door simply never opens yet).
- **"One More Bug" without a new engine feature:** the opening into the secret room is hidden behind the
  market stall drawn in the *front* decor layer; it's entered by a precise down-diagonal dash into a corner
  under the stall roof (SCRIPT.md secret 6). An attentive player can spot the gap.
- **A real Quill at Quill's Perch** with chapter 1 lines that reveal the chapter 1 map (room outlines), so
  both routes and the ★ rooms show on the map before they're visited.

## Approaches considered (how the rooms are built)

- **Python builder `tools/build_chapter1.py` (chosen):** the same `Room` helper as chapter 0 and the
  mechanics world; precise, diffable, regenerated in one command, easy to tweak after a playtest. One function
  per room keeps it readable.
- Hand-made in Tiled: nicer for free-form drawing, but harder to keep consistent across 38 rooms and to
  re-tune numerically. (Rooms can still be polished in Tiled later; the builder then stops owning them.)

## Structure

World layout: rooms placed in world tiles so that going up means going up on the map. Each part is a
column/staircase of rooms; the routes branch sideways from the Ruins Shrine and rejoin at the Crossing.

### Part 1 — Into the ruins (mandatory, ~11 rooms)

Teach each mechanic in a safe room, then a practice room with risk.

| # | Room | Content | Difficulty |
|---|---|---|---|
| 1-1 | Gorge Gate | (exists) first wide dash gap over thorns; re-dressed, made harder: dash + double jump line | ch. 0 end + |
| 1-2 | Pip's Web | placeholder: a cobweb across a passage, sign "SOMEONE IS STUCK HERE…"; a short vertical wall-jump shaft | + |
| 1-3 | Crumbling Walk | crumble intro: safe slabs over a floor, then over a short drop | teach |
| 1-4 | Crumbling Stair | crumble staircase upward over thorns, no stopping | ++ |
| 1-5 | The Rose Garden | flower intro: a gap only crossable dash → flower → dash, safe floor below | teach |
| 1-6 | Rose Trellis | vertical: flowers chain up a shaft between thorned walls | ++ |
| 1-7 | Updraft Square | vent intro: ride a vent to a ledge, dash out sideways | teach |
| 1-8 | Quill's Perch | climb a broken spire with vents + crumble; **Quill** at the top (chapter 1 lines, reveals the chapter 1 map); first crystal | ++ |
| 1-9 | The Lantern Market | wider room, stalls and lanterns, **Lumi's Moment 2** hidden high; secret "One More Bug" side room (down-diagonal dash into a corner, SCRIPT.md secret 6) | + |
| 1-10 | The Long Bridge | 2-screen-wide bridge of crumble slabs: they cascade as you run; flowers bridge the broken spans | +++ |
| 1-11 | Ruins Shrine | (exists) Bell Shrine; the branch point: High Road up, Low Road down | rest |

### Part 2 — The two routes (~7 rooms each), rejoining at The Crossing (shrine)

- **High Road** (platforming): rooftops of the old town, vents between roofs, flower chains, crumbling
  chimneys; ends on the rose garden's roof (Starbloom marker for the future quest). One ★ room off it:
  **Belfry Ledge ★** (hard, a Lost Page).
- **Low Road** (puzzle): under the bridges, in the arches; crumble-stone routing puzzles where the order you
  step on slabs matters and reform timing opens the way back; the Lingering postman (placeholder line from
  SCRIPT.md). One ★ room off it: **Library Ruins ★** (hard; 3 Lost Pages + Resonant Note II; lit normally
  until Pip's lantern exists).
- **The Crossing**: both routes enter it, a Bell Shrine, the climb starts above.

### Part 3 — The gorge climb (mandatory, ~10 rooms, the most vertical)

- Drift introduced in a safe room (a floating jump over a safe floor), then combined: Drift + vents (very high
  floats), Drift + crumble (slabs falling slowly? no — slabs fall normally; Iris floats), Drift + flowers.
- One ★ room off it: **Starfall Overhang ★** (hard, a Lost Page).
- A crystal before the hardest pair of rooms; a Bell Shrine before the end.
- **1-S Shard of Light**: a mini gauntlet using everything, then the shard (`unlocks: "light"`, banner
  "SHARD OF LIGHT").
- **1-E The Stillwarden's Gate** (placeholder ending): a calm room with a sign "CHAPTER 2 COMING SOON".

### Collectibles

Lost Pages: 3 (Library) + 1 (Belfry Ledge) + 1 (Starfall Overhang) + 1 hidden in part 1 = 6.
Resonant Note II: Library Ruins. Lumi's Moment 2: Lantern Market. Bell Shard: Shard of Light.

### Shrines & map

Ruins Shrine (exists), The Crossing, and one before the Shard. All work with fast travel and the map.

## Engine additions needed

- Ability `"light"` in `progress.ts` (no effect yet) and its unlock banner text in the game scene.
- Chapter-aware NPC dialogue: an `npc` object may carry a `script` property (e.g. `quill_ch1`) selecting its
  dialogue (default: its name, as today); `quill_ch1` lines come from SCRIPT.md's Quill and end with the
  `revealMap` effect, which already reveals the current chapter.
- Nothing else: everything else exists (mechanics, decor, exits, doors, NPC/text/lingering objects,
  collectibles, front-layer decor).

## Verification

- `tools/check_world.py` clean for all chapters.
- Solver cases in `tools/solver/chapter1.cases.json`: per mandatory room, entrance → exit reachable; each
  strict gate impossible without its key (e.g. a flower gap not crossable without the dash); collectibles
  reachable. Vent-heavy beats checked with `npm run solve:replay` recordings instead of open search.
- Natural-input replays for the hardest beats (no frame-perfect or "inhuman" lines).
- Headless playtest: walk the chapter room to room via the exits; no console errors.
- The user's playtest after each tranche decides the final difficulty.

## Left to the builder

Exact room layouts and sizes, decor placement, room titles beyond those named here, where the hidden part-1
page goes, the details of each Low Road puzzle, how each tranche's rooms stack on the world map.
