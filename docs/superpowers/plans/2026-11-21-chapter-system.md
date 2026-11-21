# Chapter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load several chapters (one Tiled `.world` each), walk between them through `exit` objects with a title-card transition, and make saves, the map, fast travel and music chapter-aware.

**Architecture:** A `CHAPTERS` list declares chapters. `GameScene` builds one `World` per chapter up front and swaps `currentWorld`. Exits are a new Tiled object class parsed into `Level.exits`. The save gains `chapter` (v2, v1 still loads). Map and fast travel work over all worlds.

**Tech Stack:** TypeScript, Vite, raw canvas, Vitest, Python 3 level tools (`tools/`), playwright-core + headless chromium for playtests.

**Spec:** `docs/superpowers/specs/2026-11-21-chapter-system-design.md`

## Global Constraints

- Chapter 0 plays exactly as before: no terrain change in any chapter 0 room; `npm run solve` still passes all 10 cases.
- Existing saves keep working: storage key stays `echo.save.v1.slotN`; a v1 save loads as `chapter: "chapter0"`.
- Room names are unique across all chapters (save keys rely on it).
- The map stays monochrome sepia (existing `INK`/`PAPER` palette only).
- `?world=<name>` loads that single world alone (playground), no cross-chapter exits followed.
- Everything in-game is in English, uppercase in UI.
- No `Co-Authored-By` lines in commits.

## Review Focus

1. **v1 save from before this branch** → loads in chapter 0 at the same room/point (test in Task 1).
2. **Save pointing at an unknown chapter or room** (chapter removed, or `?world=playground` run) → chapter 0 start room, no crash (test in Task 1 for the store; Task 6 step for the scene).
3. **Arriving on the far side of an exit** → Iris must not stand inside the return exit, or she ping-pongs between chapters (check in Task 2's `check_world.py`; exit also ignored while dead, rewinding, or during any fade — Task 6).
4. **Map in fast-travel mode on a chapter with no lit shrine** → no crash, no picker; browse/switch still works (test in Task 7 via `chapterTargets`).
5. **Same room name in two chapters** → `check_world.py` reports it (Task 2).

---

### Task 1: Chapter list and save v2

**Files:**
- Create: `src/game/chapters.ts`, `src/game/chapters.test.ts`
- Modify: `src/game/save.ts`, `src/game/save.test.ts`

**Interfaces:**
- Produces:
  - `interface ChapterDef { id: string; number: number; title: string; music: TrackName }`
  - `const CHAPTERS: ChapterDef[]` = `[{ id: "chapter0", number: 0, title: "THE QUIET VALE", music: "vale" }, { id: "chapter1", number: 1, title: "STARFALL RUINS", music: "ruins" }]`
  - `chapterDef(id: string): ChapterDef | null`
  - `SaveData.version: 2`, `SaveData.chapter: string`; `SaveStore.load` returns v2-shaped data for v1 and v2 input.
- Note: `music: "ruins"` needs `TRACKS.ruins` (Task 5). Until then, type `music` as `TrackName` and add a temporary `ruins: FIRST_STEPS` alias in `TRACKS` in this task; Task 5 replaces it.

- [ ] **Step 1: Write failing tests**

`chapters.test.ts`:
```ts
it("knows chapters by id", () => {
  expect(chapterDef("chapter1")?.title).toBe("STARFALL RUINS");
  expect(chapterDef("nope")).toBeNull();
  expect(CHAPTERS.map((c) => c.number)).toEqual([0, 1]);
});
```
`save.test.ts`: change `sample()` to `version: 2, chapter: "chapter0"`, and replace the "old saves" case:
```ts
it("loads a v1 save as chapter 0", () => {
  const m = memory();
  const { chapter, ...v1 } = sample();
  m.data["echo.save.v1.slot1"] = JSON.stringify({ ...v1, version: 1 });
  expect(new SaveStore(m).load(1)).toEqual({ ...sample(), version: 2, chapter: "chapter0" });
});
it("treats broken or unknown-version saves as empty", () => {
  const m = memory();
  m.data["echo.save.v1.slot1"] = "{not json";
  m.data["echo.save.v1.slot2"] = JSON.stringify({ ...sample(), version: 3 });
  const s = new SaveStore(m);
  expect(s.load(1)).toBeNull();
  expect(s.load(2)).toBeNull();
});
it("keeps an unknown chapter as written (the scene falls back)", () => {
  const s = new SaveStore(memory());
  s.write(1, { ...sample(), chapter: "chapter9" });
  expect(s.load(1)?.chapter).toBe("chapter9");
});
```

- [ ] **Step 2: Run** `npx vitest run src/game/chapters.test.ts src/game/save.test.ts` — Expected: FAIL (module missing, v1 rejected/v2 shape).

- [ ] **Step 3: Implement** `chapters.ts`; in `save.ts` set `version: 2`, add `chapter: string`, and in `load` accept `version === 1` (add `chapter: "chapter0"`, set `version: 2`) or `version === 2` with string `chapter`. Update the file header comment.

- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — Expected: all pass. (`game-scene.ts` `buildSave` will fail to typecheck: set `version: 2, chapter: WORLD` there for now; Task 6 replaces it.)

- [ ] **Step 5: Commit** `git commit -m "feat: chapter list and save v2 with chapter"`

---

### Task 2: Level tools — shared room builder, exits, placeholder chapter 1, multi-chapter checks

**Files:**
- Create: `tools/room_builder.py` (the `Room` class moved out of `build_chapter0.py`, unchanged plus `exit()`), `tools/build_chapter1.py`
- Modify: `tools/build_chapter0.py` (import `Room`; Overlook changes), `tools/check_world.py`, `assets/levels/README.md` (document `exit`)
- Generated: `assets/levels/overlook.tmj`, `assets/levels/chapter1.world`, `assets/levels/gorge_gate.tmj`, `assets/levels/ruins_shrine.tmj`

**Interfaces:**
- Produces (Tiled data read by Task 3): point object `type: "exit"` with string props `chapter`, `room` and optional int `spawn`. A point exit means the full-height, 1-tile-wide strip of the column containing the point.
- `Room.exit(x, y, chapter, room, spawn=0)` in `room_builder.py` → `self.obj("exit", x, y, chapter=..., room=..., spawn=...)`.

- [ ] **Step 1: Move `Room`** to `tools/room_builder.py`; `build_chapter0.py` does `from room_builder import Room`. Run `python3 tools/build_chapter0.py && git status --short assets/levels` — Expected: no changed files (byte-identical output proves the move).

- [ ] **Step 2: Overlook** in `build_chapter0.py`: delete both `r.text(...)` lines; add `r.put(21, 14, "S")` (second spawn, index 1: grid markers export row-major, so (21,14) follows (1,14)); add `r.exit(22, 14, "chapter1", "gorge_gate")`. Keep the `sign` deco or drop it (builder's call). Terrain untouched.

- [ ] **Step 3: `build_chapter1.py`**: `write_world("chapter1", [...])` with
  - `gorge_gate` ("Gorge Gate", 40x16, at (0,0), props `abilities: "doubleJump, wallJump, dash"`, `echoSlots: 1` for direct loading): flat ground, one wide gap with spikes, spawn S at (2,14), `exit(0, 14, "chapter0", "overlook", spawn=1)` on column 0 (left wall open), open right edge into `ruins_shrine`.
  - `ruins_shrine` ("Ruins Shrine", 24x16, at (40,0)): ground, a Bell Shrine `H`, closed right wall.
  - Spawn S at (2,14) must not be on column 0 (the exit).
  Layout details are the builder's call; keep them plain, they will be replaced.

- [ ] **Step 4: `check_world.py`**: accept several worlds (`python3 tools/check_world.py` with no args = every `chapter*.world`), run existing checks per world, then add cross-world checks:
  - duplicate room name across worlds → problem `"<name> is in both chapterA and chapterB"`
  - each `exit`: `chapter` world exists, `room` exists in it, `spawn` index exists among that room's spawns → else problem
  - arrival spawn's tile column equals the target room's exit column → problem `"<room>: arriving spawn stands on an exit"`
  - `exit` is not in `GROUNDED` (it's a strip, not a standing object).

- [ ] **Step 5: Run** `python3 tools/build_chapter0.py && python3 tools/build_chapter1.py && python3 tools/check_world.py` — Expected: no problems for chapter0 and chapter1. Then temporarily rename `ruins_shrine` to `overlook` in `build_chapter1.py`, rerun build+check — Expected: duplicate-name problem reported; revert and rebuild.

- [ ] **Step 6: Run** `git diff --stat assets/levels` — Expected: only `overlook.tmj` changed among chapter 0 files, plus the new chapter 1 files.

- [ ] **Step 7: Commit** `git commit -m "feat: exit objects, placeholder chapter 1, cross-chapter world checks"`

---

### Task 3: Parse exits and tag rooms with their chapter

**Files:**
- Modify: `src/game/level.ts` (Exit type, `exits` field), `src/game/world.ts`
- Create: `src/game/world.test.ts`

**Interfaces:**
- Consumes: Task 2 data.
- Produces:
  - `interface Exit { x: number; y: number; w: number; h: number; chapter: string; room: string; spawn: number }` (room-local px rect) in `level.ts`; `Level.exits: Exit[]` (default `[]`).
  - `RoomDef.chapter: string` (= the world name passed to `new World(...)`).
  - `World.id: string`; `World.room(name: string): RoomDef | null`.
- Rect for a point exit: `x = floor(o.x / 16) * 16, y = 0, w = 16, h = level.height`. For a rectangle object (`width > 0`): its own rect.

- [ ] **Step 1: Write failing tests** (`world.test.ts`, real assets via `import.meta.glob`):
```ts
it("tags rooms with their chapter and finds them by name", () => {
  const w = new World("chapter1");
  expect(w.id).toBe("chapter1");
  expect(w.room("gorge_gate")?.chapter).toBe("chapter1");
  expect(w.room("overlook")).toBeNull();
});
it("parses the Overlook exit as a full-height strip", () => {
  const exit = new World("chapter0").room("overlook")!.level.exits[0];
  expect(exit).toEqual({ x: 22 * 16, y: 0, w: 16, h: 16 * 16, chapter: "chapter1", room: "gorge_gate", spawn: 0 });
});
it("the return exit points at the Overlook's second spawn", () => {
  const exit = new World("chapter1").room("gorge_gate")!.level.exits[0];
  expect(exit).toMatchObject({ chapter: "chapter0", room: "overlook", spawn: 1 });
  expect(new World("chapter0").room("overlook")!.level.spawns).toHaveLength(2);
});
```

- [ ] **Step 2: Run** `npx vitest run src/game/world.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**: in `parseMap`, an `exit` branch builds the `Exit` (needs raw `o.x/o.width`, not the feet point; `spawn` defaults to 0, missing `chapter`/`room` → `console.warn` and skip). Pass `exits` to `Level` (add `exits?: Exit[]` to its opts). Add `chapter`, `id`, `room()`.

- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — Expected: pass.

- [ ] **Step 5: Commit** `git commit -m "feat: parse exit objects and tag rooms with their chapter"`

---

### Task 4: Chapter-aware map logic

**Files:**
- Modify: `src/game/map.ts`, `src/game/map.test.ts`

**Interfaces:**
- Produces:
  - `ShrineSpot.chapter: string` (new field; `shrineKey` unchanged since room names are unique).
  - `travelTargets(shrines, lit, here)` unchanged signature, now given every chapter's shrines; sort by `CHAPTERS` order then `x`.
  - `visitedChapters(visited: Set<string>, roomChapter: (room: string) => string | null): string[]` → chapter ids with ≥1 visited room, in `CHAPTERS` order.
  - `chapterTargets(targets: ShrineSpot[], chapter: string): ShrineSpot[]` → the subset in that chapter (order kept).

- [ ] **Step 1: Write failing tests**:
```ts
it("travel targets span chapters, chapter order first", () => {
  const shrines: ShrineSpot[] = [
    { chapter: "chapter1", room: "ruins_shrine", index: 0, x: 100, y: 0 },
    { chapter: "chapter0", room: "overlook", index: 0, x: 11500, y: 50 },
    { chapter: "chapter0", room: "lanternrest", index: 0, x: 150, y: 200 },
  ];
  const lit = new Set(["ruins_shrine:0", "overlook:0", "lanternrest:0"]);
  expect(travelTargets(shrines, lit, "overlook:0").map((s) => s.room)).toEqual(["lanternrest", "ruins_shrine"]);
});
it("lists visited chapters in order", () => {
  const of = (r: string) => (r === "gorge_gate" ? "chapter1" : r === "lanternrest" ? "chapter0" : null);
  expect(visitedChapters(new Set(["gorge_gate", "lanternrest"]), of)).toEqual(["chapter0", "chapter1"]);
  expect(visitedChapters(new Set(["lanternrest"]), of)).toEqual(["chapter0"]);
});
it("chapter targets may be empty", () => {
  expect(chapterTargets([{ chapter: "chapter0", room: "a", index: 0, x: 0, y: 0 }], "chapter1")).toEqual([]);
});
```
Update the existing travel-targets test fixtures with `chapter: "chapter0"`.

- [ ] **Step 2: Run** `npx vitest run src/game/map.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** in `map.ts` (import `CHAPTERS`).
- [ ] **Step 4: Run** `npm test` — Expected: pass (typecheck of `game-scene.ts` may need `chapter: WORLD` added in `shrines()`; Task 6 replaces it).
- [ ] **Step 5: Commit** `git commit -m "feat: chapter-aware travel targets and visited chapters"`

---

### Task 5: Placeholder *Broken Bridges* track

**Files:**
- Modify: `src/audio/tracks.ts`

**Interfaces:**
- Produces: `TRACKS.ruins: TrackDef` with `title: "Broken Bridges"` (replaces Task 1's alias).

- [ ] **Step 1: Compose** `BROKEN_BRIDGES` in the existing `TrackDef` format: a 4–8 bar loop, slower and more open than `vale` (spec: ruins over a gorge, stars close — e.g. ~100 bpm, minor/suspended chords, more delay). Notes are the builder's call.
- [ ] **Step 2: Verify** `npm test && npx tsc --noEmit` pass; then listen in the browser via the dev console (`window.__echo` / audio `playMusic("ruins")`) or Task 8's playtest. Expected: plays, loops cleanly, no clipping relative to `vale`.
- [ ] **Step 3: Commit** `git commit -m "feat: placeholder Broken Bridges track for chapter 1"`

---

### Task 6: GameScene — several worlds, exits, title card, saves, music, cross-chapter fast travel

**Files:**
- Modify: `src/scenes/game-scene.ts`

**Interfaces:**
- Consumes: `CHAPTERS`, `chapterDef` (Task 1); `World.id`, `World.room`, `RoomDef.chapter`, `Level.exits` (Task 3); `ShrineSpot.chapter`, `travelTargets` (Task 4); `TRACKS.ruins` (Task 5).
- Produces (used by Task 7): `private worlds: Map<string, World>`, `private world: World` (current), `private gotoChapter(chapter: string, room: string, point: Point, opts: { titleCard: boolean }): void` called mid-fade.

Behaviour (spec §Loading, §Exits, §Chapter transition, §Save, §Fast travel, §Music):
- [ ] **Step 1: Worlds.** Replace `readonly world = new World(WORLD)` with `worlds`: if `?world=` is given, only that world; else one `World` per `CHAPTERS` entry. `world` = current. Remove `CHAPTER_TITLES`. Every loop over `this.world.rooms` that concerns save state (`startRun` lit restore and checkpoint reset, `buildSave` lit, `litCheckpoints`, `shrines`) iterates all worlds' rooms.
- [ ] **Step 2: Save/load.** `buildSave` writes `version: 2, chapter: this.world.id`. `startRun(save)`: pick `worlds.get(save.chapter)`; if missing, or room missing in it → first world's start room and its spawn (Review Focus 2). New game → first world (`chapter0`, or the `?world=` one).
- [ ] **Step 3: Music.** `enter()` plays `chapterDef(this.world.id)?.music ?? "vale"` after `startRun` (so a chapter 1 save starts on `ruins`).
- [ ] **Step 4: Exit trigger.** Each update, when not dead, not rewinding, no transition/fast travel/chapter change in progress, and not in a conversation/moment/map: if `player.hitbox` overlaps an `exit` of the current level → start a chapter change. The exit's target world must exist in `worlds` (else ignore: `?world=` runs). Target point = target room `level.spawns[exit.spawn]` (fallback `level.spawn`).
- [ ] **Step 5: Chapter change.** Reuse the fast-travel fade pattern (`TRAVEL_FADE` out, act, in). State: `chapterChange: { t, exit, arrived, card: number /* seconds left */ } | null`. At black: `gotoChapter(...)` = switch `world`, `setRoom`, `respawnPoint`, `lastCheckpoint.set`, `restartRoom()`, `playMusic(new chapter)`; `titleCard` = no room of the target chapter in `visited` *before* `setRoom`. Then hold black for the title card (2.5 s, skippable with jump/interact), then fade in, then auto-save (`ctx.saves.write(ctx.session.slot, buildSave())`). Player input is ignored throughout. New game shows no card.
- [ ] **Step 6: Title card render.** On black: `CHAPTER <number>` small and `<title>` large, centred, existing UI font and palette (no new colours). Simple fade of the text in/out.
- [ ] **Step 7: Fast travel across chapters.** `updateFastTravel`: target room found via `worlds.get(target.chapter)`; if it's another chapter, `gotoChapter(..., { titleCard: false })` (which switches music) instead of the same-chapter path.
- [ ] **Step 8: Verify** `npm test && npx tsc --noEmit && npm run build` — Expected: pass. Manual smoke in `npm run dev`: walk right at The Overlook → card "CHAPTER 1 / STARFALL RUINS", ruins music; walk left at Gorge Gate → Overlook near the right wall, vale music, no card.
- [ ] **Step 9: Commit** `git commit -m "feat: walk between chapters, chapter title card, chapter-aware saves and music"`

---

### Task 7: Map — browse chapters, travel to any chapter

**Files:**
- Modify: `src/ui/map-screen.ts`, `src/scenes/game-scene.ts` (`openMap`, map construction)

**Interfaces:**
- Consumes: `visitedChapters`, `chapterTargets` (Task 4); `worlds` (Task 6).
- Produces: `MapScreen` constructed with `(draw: Draw)` only; `MapOpenOptions` gains `chapters: { id: string; number: number; title: string; rooms: RoomDef[]; revealed: boolean }[]` (visited chapters, in order) and `current: string` (current chapter id); `revealed: boolean` removed (now per chapter). `travel` stays the full cross-chapter list.

- [ ] **Step 1: Per-chapter drawing.** `MapScreen` keeps `shown: number` (index into `chapters`); `bounds` and the room cache are recomputed when `shown` changes. Opens on `current`. The player marker is drawn only when `shown` is the current chapter.
- [ ] **Step 2: Header.** `CHAPTER <n> · <TITLE>` centred where the title is today; `◄` / `►` in `INK` only when there is a visited chapter that way.
- [ ] **Step 3: Input.** Browsing: up/down/left/right pan as today; a left/right *press while the view is already at its left/right pan limit* switches chapter (no new keys, panning keeps working, same on keyboard and pad). A map smaller than the view is always at both limits, so one press switches. Travel mode: left/right cycle `chapterTargets(travel, shown)`; past the first/last target, switch to the previous/next visited chapter that has targets and select its last/first. On a chapter with no targets (Review Focus 4), left/right switches chapter; confirm does nothing. Footer hint text unchanged apart from the arrows.
- [ ] **Step 4: Scene.** `openMap` builds `chapters` from `visitedChapters(visited, name → room's chapter)` over `worlds`; `revealed` per chapter from `this.revealed`; `current: this.world.id`.
- [ ] **Step 5: Verify** `npm test && npx tsc --noEmit`; manual: after visiting chapter 1, open the map in chapter 1, pan to the left limit, press left → chapter 0 map, no player marker; at the Ruins Shrine, travel picker reaches chapter 0 shrines.
- [ ] **Step 6: Commit** `git commit -m "feat: map browses visited chapters, travel picker spans chapters"`

---

### Task 8: End-to-end verification

**Files:**
- Scratchpad only: a playwright-core script (headless `/usr/bin/chromium`, dev server, `window.__echo`), as in earlier sessions.
- Modify: `assets/SCRIPT.md` (§4.3 save, §4.9 map: note chapters; 0-15 row no longer "coming soon"), `assets/levels/README.md` if not done in Task 2.

- [ ] **Step 1: Playtest script** checks, failing loudly on each:
  1. New game → chapter 0, `vale`. Teleport (via `__echo`) to The Overlook, hold right → within 5 s the card is visible, then Iris is in `gorge_gate`, music `ruins`, slot save has `chapter: "chapter1"`.
  2. Hold left → back in `overlook`, x within 2 tiles of column 21, music `vale`, no card, save `chapter: "chapter0"`.
  3. Go back to chapter 1, light the Ruins Shrine, open map → chapter 1 header; travel to Lanternrest → `chapter0`, `lanternrest`, no card.
  4. Reload the page, CONTINUE → resumes in the saved chapter/room with the right music.
  5. Inject a v1 save (no `chapter`) into slot 3, load it → chapter 0, same room.
  6. Inject a v2 save with `chapter: "chapter9"` → chapter 0 start room, no console errors.
  Expose whatever `__echo` needs (current chapter id, music track name) in dev only.
- [ ] **Step 2: Run** the playtest — Expected: all 6 pass, no console errors.
- [ ] **Step 3: Run** `npm test && npx tsc --noEmit && npm run build && python3 tools/check_world.py` — Expected: pass, no problems.
- [ ] **Step 4: Run** `npm run solve` (~7 min) — Expected: 10/10 OK (chapter 0 unchanged).
- [ ] **Step 5: Update docs** (SCRIPT.md notes above), commit `git commit -m "docs: chapters in the script"`.
