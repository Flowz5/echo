# Chapter 1 Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add crumble stone, dash flowers, wind vents and the Drift fracture: they play in game, work with echoes and rewind, are placed from the builders/Tiled, and are simulated by the solver.

**Architecture:** A `Mechanics` object owned by each `Level` keeps crumble and flower timers (snapshot/restore for rewind and solver). Vents and Drift are positional fields read by `Player` through a new `Collider.fieldAt`. The data pipeline gains tile `=` (id 5) and rectangle objects `vent` / `drift` plus point `flower`.

**Tech Stack:** TypeScript, Vite, raw canvas, Vitest, Python 3 tools, playwright-core (scratchpad) for playtests.

**Spec:** `docs/superpowers/specs/2026-11-21-ch1-mechanics-design.md`

## Global Constraints

- Chapter 0 plays exactly as before: `TUNING` values unchanged; `npm run solve` 10/10.
- Crumble: shake **0.4 s** (solid) → gone **2 s** → reforms only when no body overlaps it; a whole connected horizontal run of `=` triggers together.
- Flower: refills **the dash only**, only when the dash is spent; closed **2.5 s**; touch box 12×12 centred on the point.
- Vent: lift **1700 px/s²**, upward speed cap **200 px/s** inside the column, no effect while dashing (numbers tunable, shape fixed).
- Drift: gravity **×0.45**, every fall cap **×0.6** (maxFall, fastFall, wallSlideSpeed), blend **0.1 s** in/out, zone test = hitbox centre in rect.
- Rewind restores crumble/flower state; a restored stone overlapping any body (Iris or echo) goes back to "gone, waiting".
- Solver does not simulate rewind or echoes.
- Map stays monochrome sepia; English UI; no `Co-Authored-By` in commits.

## Review Focus

1. **Iris standing in a reforming stone's tile** (e.g. she jumped into the gap) → it must not reform on her (test in Task 1).
2. **Rewind to a moment when Iris stood where a stone is now intact** → no getting stuck inside rock (Task 1 `restoreAfterRewind` test with Iris's body).
3. **Dashing through a flower with the dash still available** → flower stays open (Task 1 test).
4. **Entering and leaving Drift every few frames (zone edge)** → no velocity jump; blend is continuous (Task 2 test).
5. **A room with no mechanics** → physics byte-identical to before (Task 2 test comparing a jump arc with and without an empty field; plus solver 10/10 in Task 7).

---

### Task 1: Mechanics core — crumble runs and flowers

**Files:**
- Create: `src/game/mechanics.ts`, `src/game/mechanics.test.ts`
- Modify: `src/game/level.ts` (tile `=`, `Level.mech`, `Level.flowers`, `solidAt`)

**Interfaces:**
- Produces:
  - `type Tile` gains `"="`.
  - `interface Flower { x: number; y: number }` (point, centre) in `level.ts`; `Level` opts `flowers?: Flower[]`; `Level.flowers: Flower[]`.
  - `class Mechanics` (in `mechanics.ts`), built by `Level` as `readonly mech: Mechanics` from its `=` tiles and flowers:
    - `crumbleSolid(tx: number, ty: number): boolean` — intact or shaking.
    - `crumbleState(tx, ty): { phase: "intact" | "shaking" | "gone"; t: number }` (for rendering).
    - `update(dt: number, touches: Rect[], bodies: Rect[]): MechEvent[]` — `touches` trigger stones (caller builds them); `bodies` block reform.
    - `flowerOpen(i: number): boolean`; `useFlower(hitbox: Rect, canDash: boolean): number` → index of the flower used (closes it) or `-1` (none touched, or `canDash` true).
    - `snapshot(): MechSnapshot` / `restore(s: MechSnapshot): void` / `restoreAfterRewind(s: MechSnapshot, bodies: Rect[]): void` / `reset(): void`.
  - `type MechEvent = { kind: "shake" | "fall" | "reform"; run: number } | { kind: "regrow"; flower: number }` (for sfx/particles).
  - `const CRUMBLE_SHAKE = 0.4, CRUMBLE_GONE = 2, FLOWER_REGROW = 2.5`.
  - `Level.solidAt` treats `=` as solid when `mech.crumbleSolid`. `=` is not `-`, not a hazard, and ends ground autotiling (`mask` treats it as air for `#`).
- Runs: maximal horizontal runs of `=` in the same row are one unit (index = run number, in row-major order).

- [ ] **Step 1: Write failing tests** (`mechanics.test.ts`, using `new Level([...])` ASCII rooms):
```ts
const ROOM = ["..........", "..........", "...====...", "..........", "##########"];
const on = (tx: number) => ({ x: tx * 16 + 4, y: 2 * 16 - 1, w: 8, h: 1 }); // 1-px strip under feet standing on row 2
it("a touched run shakes 0.4 s (still solid), then is gone 2 s, then reforms", () => {
  const lv = new Level(ROOM);
  lv.mech.update(1 / 60, [on(4)], []);
  expect(lv.mech.crumbleState(6, 2).phase).toBe("shaking"); // whole run
  lv.mech.update(0.39, [], []); expect(lv.mech.crumbleSolid(3, 2)).toBe(true);
  lv.mech.update(0.02, [], []); expect(lv.mech.crumbleSolid(3, 2)).toBe(false);
  lv.mech.update(1.97, [], []); expect(lv.mech.crumbleSolid(3, 2)).toBe(false);
  lv.mech.update(0.05, [], []); expect(lv.mech.crumbleSolid(3, 2)).toBe(true);
});
it("does not reform on a body", () => {
  const lv = new Level(ROOM);
  lv.mech.update(1 / 60, [on(4)], []); lv.mech.update(0.41, [], []);
  const inside = { x: 4 * 16 + 4, y: 2 * 16 + 2, w: 8, h: 12 };
  lv.mech.update(3, [], [inside]); expect(lv.mech.crumbleSolid(4, 2)).toBe(false);
  lv.mech.update(0.01, [], []); expect(lv.mech.crumbleSolid(4, 2)).toBe(true);
});
it("separate runs break separately", () => {
  const lv = new Level(["..==.==...", "##########"]);
  lv.mech.update(1 / 60, [{ x: 2 * 16 + 4, y: -1, w: 8, h: 1 }], []);
  expect(lv.mech.crumbleState(5, 0).phase).toBe("intact");
});
it("solidAt follows the crumble state", () => {
  const lv = new Level(ROOM);
  const box = { x: 3 * 16, y: 2 * 16, w: 8, h: 8 };
  expect(lv.solidAt(box)).toBe(true);
  lv.mech.update(1 / 60, [on(4)], []); lv.mech.update(0.41, [], []);
  expect(lv.solidAt(box)).toBe(false);
});
it("flowers refill only a spent dash, then regrow after 2.5 s", () => {
  const lv = new Level(["..........", "##########"], { flowers: [{ x: 40, y: 8 }] });
  const hb = { x: 36, y: 4, w: 8, h: 12 };
  expect(lv.mech.useFlower(hb, true)).toBe(-1);
  expect(lv.mech.flowerOpen(0)).toBe(true);
  expect(lv.mech.useFlower(hb, false)).toBe(0);
  expect(lv.mech.useFlower(hb, false)).toBe(-1);
  lv.mech.update(2.49, [], []); expect(lv.mech.flowerOpen(0)).toBe(false);
  lv.mech.update(0.02, [], []); expect(lv.mech.flowerOpen(0)).toBe(true);
});
it("snapshot/restore round-trips; restoreAfterRewind keeps stones off bodies", () => {
  const lv = new Level(ROOM);
  const before = lv.mech.snapshot();
  lv.mech.update(1 / 60, [on(4)], []); lv.mech.update(0.5, [], []);
  lv.mech.restore(before);
  expect(lv.mech.crumbleState(4, 2).phase).toBe("intact");
  lv.mech.update(1 / 60, [on(4)], []); lv.mech.update(0.5, [], []);
  const echoInGap = { x: 4 * 16 + 4, y: 2 * 16 + 2, w: 8, h: 12 };
  lv.mech.restoreAfterRewind(before, [echoInGap]);
  expect(lv.mech.crumbleSolid(4, 2)).toBe(false); // waits: the echo is in the way
  lv.mech.update(5, [], [echoInGap]); expect(lv.mech.crumbleSolid(4, 2)).toBe(false);
});
```
- [ ] **Step 2: Run** `npx vitest run src/game/mechanics.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `mechanics.ts` and the `level.ts` changes. A body "overlaps" a run if it overlaps any of its tile rects. `restoreAfterRewind` restores, then sets any non-gone run overlapping a body to `gone` with its timer already elapsed (so it reforms as soon as it's free).
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — Expected: all pass.
- [ ] **Step 5: Commit** `git commit -m "feat: crumble stone and dash flower state (mechanics core)"`

---

### Task 2: Fields — wind vents and Drift in the player physics

**Files:**
- Modify: `src/game/level.ts` (vents, drift zones, `fieldAt`), `src/game/room.ts` (`Collider.fieldAt`, delegate), `src/game/player.ts` (`updateGravity`, blend, `refillDash`, `wallSide`)
- Test: `src/game/fields.test.ts`

**Interfaces:**
- Produces:
  - `interface Field { gravity: number; fall: number; lift: number; liftCap: number }`; `const NEUTRAL_FIELD: Field = { gravity: 1, fall: 1, lift: 0, liftCap: 0 }` (in `level.ts`).
  - `Level` opts `vents?: Rect[]`, `drifts?: Rect[]`; fields `vents`, `drifts`; `Level.fieldAt(r: Rect): Field` — Drift if the rect's centre is in a drift rect (`gravity: 0.45, fall: 0.6`); vent if the rect overlaps a vent column (`lift: 1700, liftCap: 200`); both combine.
  - `Collider.fieldAt(r: Rect): Field` (Room delegates to its level; test helpers use `Level` directly).
  - `Player.refillDash(): void` (dash only, small burst); `Player.wallSide: -1 | 0 | 1` (getter: `wallSliding ? wallDir : 0`).
  - Constants in `player.ts`: `DRIFT_BLEND = 0.1`.
- Player: keeps a blended `gravity`/`fall` factor moving toward the target field at `dt / DRIFT_BLEND` per step; gravity `g *= gravityFactor`; every cap (`maxFall`, `fastFall`, `wallSlideSpeed`) `*= fallFactor`. Vent: when not dashing and `lift > 0`, `vy = max(vy - lift*dt, -liftCap)` applied after gravity (never pushes faster up than the cap; if already faster up, leaves it).

- [ ] **Step 1: Write failing tests** (`fields.test.ts`, ASCII level via `new Level(rows, { vents, drifts })` + `Player`):
```ts
it("no fields: a jump arc is identical to before", () => { /* record player.y over 60 frames of a held jump in FLAT with and without an empty drifts/vents list: arrays equal */ });
it("Drift: gravity ×0.45 and fall caps ×0.6 once blended", () => {
  // tall empty room, drift covering everything; let Iris fall 3 s: |vy| settles at 235*0.6 = 141 (±1)
});
it("Drift blend: speed changes smoothly over 0.1 s at the zone edge", () => {
  // Iris falls through a drift top edge; the per-frame change in vy never exceeds what gravity*1 would give
});
it("vent: rises and is capped at 200 px/s, dashing ignores it", () => {
  // Iris stands under a vent column 8 tiles tall; after 0.5 s vy ≈ -200 (±1) and y decreased;
  // a dash inside the column keeps dash speed (vy === dashDirY * dashSpeed on the dash frame)
});
it("refillDash gives the dash back, not the double jump", () => {
  // spend dash and double jump in the air; refillDash(); canDash true, canDoubleJump false
});
```
Write each body concretely with `makePlayer`/`step`; exact numbers: `TUNING.maxFall * 0.6`, cap `200`.
- [ ] **Step 2: Run** `npx vitest run src/game/fields.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as in Interfaces. `Player` stores its collider as today; call `this.level.fieldAt(this.hitbox)` once per update.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — Expected: pass, existing 12 player tests unchanged.
- [ ] **Step 5: Commit** `git commit -m "feat: wind vents and the Drift fracture in the player physics"`

---

### Task 3: Data pipeline — Tiled, builders, checks

**Files:**
- Modify: `src/game/world.ts` (tile id 5, `flower`, `vent`, `drift`), `tools/ascii_to_tiled.py` (tile `crumble`, rect objects), `tools/room_builder.py`, `tools/check_world.py`, `tools/gen_sprites.py` (editor tile for crumble in `levels/terrain.png`), `assets/levels/README.md`
- Test: `src/game/world.test.ts` (fixture world), generated `assets/levels/mechanics.world` + rooms (Task 6 fills them; this task adds one tiny `mech_test` room used by the test)

**Interfaces:**
- Consumes: `Level` opts `flowers`, `vents`, `drifts` (Tasks 1–2).
- Produces:
  - `TILE_BY_ID = ["#", "-", "^", "b", "D", "="]`; `ascii_to_tiled.TILE_NAMES` adds `"crumble"`, `GID["="] = 6`.
  - Objects: `flower` (point), `vent` (rectangle: the column; grate = bottom edge), `drift` (rectangle). World parses rect objects with their raw `x, y, width, height`.
  - `ascii_to_tiled` object entries may carry `"size": (w_tiles, h_tiles)`; exported as non-point rectangles whose top-left is `at` (tile coords).
  - `room_builder.Room`: `crumble(x0, x1, y)`, `flower(x, y)`, `vent(x, y_top, y_bottom, w=1)` (column from row `y_top` to `y_bottom` inclusive, `w` tiles wide), `drift(x0, y0, x1, y1)`.
  - New `tools/build_mechanics.py` → `assets/levels/mechanics.world` (dev world, `?world=mechanics`); this task creates room `mech_test` (one run of `=`, one flower, one vent, one drift).
  - `check_world.py`: `=` counts as solid/standable for object checks; `flower`/`vent`/`drift` known; problem if a vent column's top row is inside solid ground.

- [ ] **Step 1: Write failing test** (`world.test.ts`):
```ts
it("parses crumble, flowers, vents and drift", () => {
  const r = new World("mechanics").room("mech_test")!;
  expect(r.level.ownTile(/* x,y of the first = in mech_test */)).toBe("=");
  expect(r.level.flowers).toHaveLength(1);
  expect(r.level.vents[0]).toEqual({ x: /*px*/, y: /*px*/, w: /*px*/, h: /*px*/ });
  expect(r.level.drifts).toHaveLength(1);
});
```
(Fill the literal coordinates from the `mech_test` layout you write in `build_mechanics.py`.)
- [ ] **Step 2: Run** `python3 tools/build_mechanics.py && npx vitest run src/game/world.test.ts` — Expected: FAIL (parse missing).
- [ ] **Step 3: Implement** parsing, builders, exporter, checker, editor tile, README rows.
- [ ] **Step 4: Run** `python3 tools/build_chapter0.py && git status --short assets/levels` — Expected: chapter 0 `.tmj` files unchanged except `terrain.tsj` (new tile; `terrain.png` too). Then `python3 tools/check_world.py && python3 tools/check_world.py mechanics && npm test` — Expected: no problems, tests pass.
- [ ] **Step 5: Commit** `git commit -m "feat: crumble tile, flower/vent/drift objects in Tiled, builders and checks"`

---

### Task 4: Game integration — rooms, echoes, rewind

**Files:**
- Modify: `src/game/room.ts`, `src/scenes/game-scene.ts`

**Interfaces:**
- Consumes: `Mechanics.update/useFlower/snapshot/restoreAfterRewind/reset`, `Player.refillDash`, `Player.wallSide` (Tasks 1–2).
- Produces: `Room.update(dt, player: Rect, wallSide?: -1 | 0 | 1): { doorsChanged: boolean; events: MechEvent[] }` (replaces the boolean return; update its one caller).

Behaviour:
- [ ] **Step 1: Room drives mechanics.** In `Room.update`: touches = 1-px strip under each body's feet (Iris + armed echoes) + for Iris when `wallSide !== 0` a 1-px strip on that side; bodies = Iris + all echoes. Call `level.mech.update(dt, touches, bodies)`. Add a vitest in `src/game/room.test.ts`: an armed echo standing on a run triggers it; an echo inside a gone run blocks its reform.
- [ ] **Step 2: Run** `npx vitest run src/game/room.test.ts` — Expected: FAIL first, then PASS after implementing.
- [ ] **Step 3: Scene.** Each step (alive): `if (level.mech.useFlower(p.hitbox, p.canDash) >= 0) p.refillDash()` (+ sfx). `resetRoom()` calls `level.mech.reset()`. History entries become `{ player: PlayerSnapshot; mech: MechSnapshot }` (update `rewindSample` and all users). `finishRewind`: place the echo (unchanged), then `level.mech.restoreAfterRewind(past.mech, [p hitbox at past position, ...echo hitboxes])`, then `p.restore(past.player)`.
- [ ] **Step 4: Verify** `npm test && npx tsc --noEmit && npm run build` — Expected: pass.
- [ ] **Step 5: Commit** `git commit -m "feat: mechanics in rooms: echoes trigger crumble, flowers refill, rewind restores"`

---

### Task 5: Look and sound

**Files:**
- Modify: `tools/gen_sprites.py` (crumble tile art in the terrain atlas), `tools/decor_art.py` or `tools/gen_sprites.py` (flower bud/bloom frames, vent grate), `src/game/level.ts` (render crumble / flowers / vent grates), `src/scenes/game-scene.ts` (particles: debris on fall, petals on use, vent streaks, drift motes + outline + tint), `src/engine/audio.ts` + `src/audio/synth.ts` (sfx `crumbleShake`, `crumbleFall`, `crumbleReform`, `flower`, `driftIn`; music low-pass while in Drift via `setFiltered(on: boolean)`)

**Interfaces:**
- Consumes: `MechEvent` from `Room.update` (Task 4), `Mechanics.crumbleState`, `flowerOpen`, `Level.vents/drifts`.
- Produces: `Audio.setFiltered(on: boolean): void` (low-pass on the music bus, ~800 Hz, ramped 0.1 s; if no music bus filter can be inserted, a 30 % volume dip — ledger the ruling).

- [ ] **Step 1: Art.** Crumble: cut stone with cracks, clearly different from ground (no grass top). Flower: rose bud (closed) and bloom (open) 2 frames. Vent: metal/stone grate, 1 tile per column width. Palette only. Run `npm run sprites`; check the generated sheet image by eye (Read the PNG).
- [ ] **Step 2: Render.** Crumble shaking: ±1 px horizontal jitter; gone: nothing drawn except a faint dotted outline (so the player sees where it will reform); reform: 0.1 s fade-in. Flowers: open/closed frame. Vents: grate at the bottom of the column + continuous faint rising streaks over the whole column height. Drift: dotted shimmering outline (cyan `C.echo` family, slow dash offset), slow-falling motes inside, a translucent blue-ish tint over the zone.
- [ ] **Step 3: Sound.** Events → sfx; entering/leaving Drift → `setFiltered`.
- [ ] **Step 4: Verify** in `?world=mechanics` with a headless screenshot of `mech_test` (each element visible) and `npm test && npx tsc --noEmit && npm run build`.
- [ ] **Step 5: Commit** `git commit -m "feat: crumble, flower, vent and Drift visuals and sounds"`

---

### Task 6: Mechanics test world and solver support

**Files:**
- Modify: `tools/build_mechanics.py` (rooms below), `tools/solver/solver.ts`, `tools/solver/cases.solve.ts` (world per case file via `SOLVE_WORLD`, already supported)
- Create: `tools/solver/mechanics.cases.json`

**Interfaces:**
- Consumes: everything above.
- Produces: rooms `mech_crumble`, `mech_flower`, `mech_vent`, `mech_drift`, `mech_combo` (each ≥ 20×12, spawn on the left, goal = exit on the right or top), connected left-to-right after `mech_test`.

- [ ] **Step 1: Rooms.** Each teaches its mechanic with one beat where it's required: crumble — a run over spikes that must be crossed without stopping; flower — a gap reachable only with dash → flower → dash; vent — a ledge reachable only by dashing out of the top of the updraft; drift — a high ledge reachable only with the Drift-boosted jump; combo — all four in one line.
- [ ] **Step 2: Solver.** Search node = `{ p: Player, held, mech: MechSnapshot }`; before simulating a node, `level.mech.restore(node.mech)`; per frame call `level.mech.update(DT, touches(p), [p.hitbox])` (same touch builder as `Room`, exported from `room.ts` as `touchStrips(body: Rect, wallSide: -1|0|1): Rect[]`) and `if (level.mech.useFlower(p.hitbox, p.canDash) >= 0) p.refillDash()`; after, store `level.mech.snapshot()`. Dedupe key appends a compact string of the mech snapshot.
- [ ] **Step 3: Cases** in `mechanics.cases.json`: per room, one `true` case (goal reachable with all abilities). Strict gates that depend on the dash get a `false` case with abilities `["doubleJump","wallJump"]` (flower room, vent room). Drift and crumble have no "without" variant (the solver can't remove a zone or a tile); their `true` case is enough.
- [ ] **Step 4: Run** `SOLVE_WORLD=mechanics SOLVE_CASES=tools/solver/mechanics.cases.json npm run solve` — Expected: all OK. Then `npm run solve` — Expected: chapter 0 10/10.
- [ ] **Step 5: Commit** `git commit -m "feat: mechanics test rooms and solver support for crumble and flowers"`

---

### Task 7: End-to-end verification and docs

**Files:**
- Scratchpad: playwright playtest for `?world=mechanics`.
- Modify: `assets/SCRIPT.md` (§4.5 rows ✅ for the 3 interactables, §4.12 Drift ✅ with the rewind/echo rules decided), `assets/levels/README.md` if not done.

- [ ] **Step 1: Playtest** (headless, `?world=mechanics`): (1) standing on a run makes it vanish after ~0.4 s and come back after ~2 s; (2) a flower refills a spent dash and closes; (3) rising in a vent caps near 200 px/s; (4) Drift lowers fall speed and turns the music filter on; (5) fall through a gone stone, rewind → the echo stays in the gap and the stone stays gone; (6) no console errors.
- [ ] **Step 2: Run** `npm test && npx tsc --noEmit && npm run build && python3 tools/check_world.py && npm run solve` — Expected: all pass, solver 10/10.
- [ ] **Step 3: Docs** updated; commit `git commit -m "docs: chapter 1 mechanics in the script"`.
