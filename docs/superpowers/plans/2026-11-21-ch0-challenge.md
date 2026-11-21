# Chapter 0 challenge + dash jump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A ground dash jump that keeps momentum and the double jump, plus a harder end-of-chapter-0 section (mandatory room, optional very hard branch, final overlook room).

**Architecture:** The dash jump lives in `Player` (`src/game/player.ts`) and is pinned by headless Vitest tests driving `Player` with a fake collider/input. Rooms are added to the Python generator `tools/build_chapter0.py`, which writes Tiled `.tmj` files. A reachability solver (scratchpad only) loads the real world through Vite SSR and searches input sequences with the real `Player` to prove routes and gates.

**Tech Stack:** TypeScript, Vite 8, Vitest 5 (new dev dependency), Python 3 level generator, Tiled JSON.

**Spec:** `docs/superpowers/specs/2026-11-21-ch0-challenge-design.md`

## Global Constraints

- Ground dash jump = dash started on the ground or touching ground during it; jump during the dash or within `dashJumpGrace` (~0.1 s) after it → normal jump, ends dash, keeps current horizontal speed, keeps the double jump.
- Air dash + jump → fires immediately, keeps momentum, **uses the double jump**.
- A straight-up ground dash (`dashDirX === 0 && dashDirY < 0`) is not a ground dash jump.
- All new tuning in `TUNING`. All in-game text in English, uppercase.
- No new mechanics, no NPCs, no rewind requirement in the new rooms.
- Mandatory path: chains of 2–3 actions, spikes over void, checkpoint before each beat. Optional branch: long chains, one checkpoint at its entrance, Lost Page reward, never required.
- Commits: plain messages, no Claude attribution. Work only on `feature/ch0_challenge`; no push/merge to `develop`/`main` without asking.

## Review Focus

1. Jump pressed *just before* a ground dash starts (buffered) → should still be a normal ground jump, not eaten by the dash. Test in Task 2.
2. Ground dash that runs off a ledge, jump pressed after leaving the ground but inside the dash → still a ground dash jump (the dash started grounded). Test in Task 2.
3. Dash jump near a wall → wall-jump rules must not steal it when Iris is rising past the wall with the double jump available. Test in Task 2.
4. Rewind `restore()` / respawn mid-dash must clear the new dash-jump state (no free dash jump after a rewind). Test in Task 2.
5. Dash gates in 0-9, 0-12 and 0-13 still require the dash and the old non-dash gates can't be skipped with the new range. Checked by the solver in Task 4.

---

### Task 1: Vitest harness for `Player`

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `src/game/player.test.ts`
- Create: `src/game/test-helpers.ts` — `flatLevel(rows: string[]): Collider` (ASCII rows, `#` solid, `-` platform, `^` spike, `S` spawn), `FakeInput` (`press(action)`, `hold(action)`, `release(action)`, `isDown`, `justPressed` cleared after each `step`), `noFx: Effects`, `step(p: Player, input: FakeInput, frames: number)` at dt = 1/60.

- [ ] Step 1: `npm i -D vitest` ; add the `test` script.
- [ ] Step 2: write a sanity test `"jump from the ground rises and lands"` (vy < 0 after 2 frames, grounded again after 60).
- [ ] Step 3: `npm test` → PASS ; `npm run typecheck` → no errors.
- [ ] Step 4: commit `test: headless harness for player movement`.

### Task 2: Dash jump

**Files:** Modify `src/game/player.ts` (`TUNING`, `update`, `updateJump`, `startDash`, `updateDash`, `respawnAt`, `restore`), test `src/game/player.test.ts`.

**Interfaces:** Produces `TUNING.dashJumpGrace = 0.1`; private `dashGrounded: boolean`, `dashJumpTimer: number`.

- [ ] Step 1: failing tests:
  - `"ground dash then jump keeps the double jump"`: ground, dash right, jump 4 frames later → `canDoubleJump === true`, `dashing === false`, `vx > TUNING.dashEndSpeed`.
  - `"jump right after a ground dash ends still counts"`: jump 3 frames after the dash ends → `canDoubleJump === true`.
  - `"too late is a double jump"`: jump 15 frames after the dash ends (in the air) → `canDoubleJump === false`.
  - `"air dash then jump uses the double jump but keeps speed"`: jump, dash right in the air, jump → `canDoubleJump === false`, `vx > TUNING.dashEndSpeed`.
  - `"straight up ground dash is not a dash jump"`: dash up, jump → `canDoubleJump === false`.
  - Review Focus 1–4: buffered jump before dash; dash off a ledge then jump; dash jump rising past a wall keeps the double jump; `restore()` mid-dash then jump → double jump used.
- [ ] Step 2: `npm test` → the new tests FAIL.
- [ ] Step 3: implement: during a dash run jump handling too; `dashGrounded` set at dash start (grounded/coyote) or when grounded during the dash (unless straight up); on dash end start `dashJumpTimer = dashJumpGrace` if `dashGrounded`; in `updateJump`, a buffered jump with (`dashing` or `dashJumpTimer > 0`) and `dashGrounded` → end dash, `jump(jumpSpeed, varJumpTime)`, keep `vx`; an air jump while dashing → end dash, keep `vx`, then the normal double-jump branch. Clear both fields in `respawnAt` and `restore`.
- [ ] Step 4: `npm test` → PASS ; `npm run typecheck` → clean.
- [ ] Step 5: commit `feat: dash jump keeps momentum and the double jump`.

### Task 3: The challenge rooms

**Files:** Modify `tools/build_chapter0.py` (remove the overlook from `the_rise`; add `0-14` mandatory room with the optional branch room off it; add `0-15` overlook), regenerate `assets/levels/*.tmj` + `chapter0.world`.

- [ ] Step 1: The Rise ends on a plain exit at the right edge (keep its 3 tutorial beats, drop the shrine/"coming soon").
- [ ] Step 2: 0-14: dash-jump lesson gap with text `{dash} THEN {jump}: KEEP YOUR SPEED`, then the 4 beats from the spec, checkpoint (`C`) before each, spikes under the hard parts, decorated (ruins, pillars, dead trees, lanterns).
- [ ] Step 3: optional branch room above/below 0-14: one checkpoint at its entrance, long chains, `page` at the end, a way back into 0-14.
- [ ] Step 4: 0-15 The Overlook: Bell Shrine (`H`), the "CHAPTER 1: STARFALL RUINS / COMING SOON" texts, decor.
- [ ] Step 5: `python3 tools/build_chapter0.py && python3 tools/check_world.py chapter0` → no errors.
- [ ] Step 6: commit `feat: chapter 0 challenge rooms and the overlook`.

### Task 4: Reachability solver (scratchpad) + tuning pass

**Files:** scratchpad only: `solver.mjs` (Vite `createServer` + `ssrLoadModule` of `src/game/world.ts`, `src/game/room.ts`, `src/game/player.ts`); room edits back in `tools/build_chapter0.py`.

- [ ] Step 1: solver = best-first search over input macros (hold left/right/none × jump hold length × dash direction) every 4 frames, state hashed on rounded x/y/vx/vy/resources, using the real `Player` and room collider; goals = exits, checkpoints, collectibles.
- [ ] Step 2: run on every chapter 0 room with the room's abilities: all required exits reachable; 0-14 beats reachable; optional page reachable only with dash.
- [ ] Step 3: run gates without dash: 0-9 island, 0-12 pit, 0-13 gaps, 0-14, branch → unreachable.
- [ ] Step 4: adjust geometry where a check fails, regenerate, re-run until clean.
- [ ] Step 5: commit `fix: chapter 0 routes checked with the dash jump`.

### Task 5: Docs, playtest in the browser, memory

- [ ] Step 1: `assets/SCRIPT.md`: dash jump row in the movement table, chapter 0 table (0-13 trimmed, 0-14, branch, 0-15), room count; builder header movement budget.
- [ ] Step 2: headless chromium + playwright: load the game, teleport to 0-13/0-14 via `window.__echo`, screenshot each new room to check the look.
- [ ] Step 3: `npm run build` → success.
- [ ] Step 4: commit `docs: chapter 0 challenge and dash jump in the script`.
