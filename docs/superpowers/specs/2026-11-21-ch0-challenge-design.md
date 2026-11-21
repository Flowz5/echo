# Chapter 0 challenge section + dash jump

Date: 2026-11-21 · Branch: `feature/ch0_challenge`

## Intent

Echo is meant to be a little hard. Chapter 0 currently ends on a gentle dash
tutorial (0-13 The Rise), so the player never has to *combine* dash, double jump
and wall jump before chapter 1. We add a harder platforming section at the end of
chapter 0 that teaches and tests those combinations, and fix a movement problem
that makes dash → jump feel bad.

## Part 1: the dash jump

### The problem today

- During a dash, `updateJump` is not run (`src/game/player.ts`, `update()`): a jump
  pressed mid-dash sits in the 0.12 s buffer and only fires when the dash ends.
- By then the 0.1 s coyote time is over (a dash lasts 0.175 s), so the jump is
  spent as the **double jump**, even when the dash started on the ground.
- The end of the dash clamps horizontal speed from ~285 to 130 px/s, so the jump
  also loses the dash's momentum.

### Decided behaviour (user picked option B: ground only)

- **Ground dash jump.** If the dash started on the ground, or Iris touches the
  ground during it, a jump pressed during the dash or within a short grace after
  it ends (`dashJumpGrace`, ~0.1 s) is a **normal jump**:
  - it ends the dash immediately (no wait for the dash to finish);
  - it keeps the horizontal speed the dash had at that moment (no clamp to 130);
    the extra speed then bleeds off through the existing `overspeedDecel`;
  - the **double jump stays available**.
- **Air dash.** A jump during or right after a dash that started in the air also
  fires immediately and keeps the momentum, but it **still uses the double jump**
  (no extra jump in the air).
- Jump buffering into the dash still works: a jump pressed just before landing
  from a ground dash, etc., resolves through the same rules.

### My calls (check these)

- A purely vertical dash (straight up) from the ground does not count as a
  ground dash jump, so up-dash + jump + double jump doesn't become a huge free
  climb. Diagonal and horizontal ground dashes count.
- Movement budget changes: ground dash jump + double jump will reach further than
  the documented 9.9 tiles. Every existing dash gate (0-9 floating island, 0-12
  pit, 0-13 The Rise) is re-checked so the intended route still works and the
  non-dash gates still can't be skipped.
- Tuning constants live in `TUNING` like everything else (`dashJumpGrace`).

## Part 2: the challenge section (user picked option C)

### Placement

The dash is unlocked in 0-12, so the section goes after it. 0-13 The Rise keeps
its role as the gentle dash tutorial, minus the overlook. New rooms follow it,
and the overlook ("Chapter 1: Starfall Ruins, coming soon") moves to the very end.

```
0-12 Shard of Motion → 0-13 The Rise (tutorial) → 0-14 challenge (mandatory)
                                                     ├─ optional harder branch (reward)
                                                     → 0-15 The Overlook (end)
```

### 0-14, mandatory path: "firm but fair"

- Teaches the **ground dash jump** first, with a hint text
  (`{dash} THEN {jump}: KEEP YOUR SPEED`), on a gap only a dash jump clears.
- Then 3 to 4 beats that each combine abilities, for example:
  1. dash jump across a long gap, then double jump up to a ledge;
  2. wall-jump chimney, dash sideways out of it to a far ledge;
  3. dash into a wall over spikes, slide, wall-jump back, double jump;
  4. a short finale chaining dash jump → double jump → wall jump → dash.
- Chains of 2–3 actions, spikes rather than void where possible, a checkpoint
  before each beat. Target: a typical player dies 5–10 times.

### Optional branch: "really demanding"

- A side route off 0-14 with long chains and no ground, tight windows, fewer
  checkpoints (one at the entrance). Target: 20+ deaths.
- Reward: a **Lost Page** (plus a crystal if it fits). It is never required.
- Reachable only with the full kit (checked by the solver).

### Constraints

- Built in `tools/build_chapter0.py` like the other rooms (Tiled stays the
  output); world coordinates must not overlap existing rooms.
- Same art direction: the Quiet Vale's mossy ruins, moving towards the
  Starfall Ruins look; decorated like the other rooms (the user wants lots of
  decoration, few NPCs: none here).
- Every exit and collectible checked with a reachability solver using the real
  physics, including the dash jump; the optional branch and dash gates checked
  as *not* reachable without the needed ability. The old solver lived in a lost
  scratchpad, so it gets rewritten (scratchpad only, not in the repo).
- `assets/SCRIPT.md` updated: movement table (dash jump), chapter 0 room table,
  measured movement budget in the builder's header.

## Approaches considered

- **Dash jump.** A, anywhere (an extra air jump, much longer range, would have
  needed the dash rooms redone) vs. **B, ground only** (fixes the reported
  problem, keeps the game demanding, becomes a technique to learn). User picked B.
- **Difficulty.** A, firm but fair only · B, very demanding only (blocks less
  skilled players at the end of the prologue) · **C, A mandatory + B optional
  with a reward**. User picked C.

## Non-goals

- No new mechanics besides the dash jump (no crumble blocks, wind, dash flowers:
  those belong to chapter 1).
- No dialogue or NPCs in the new rooms.
- No rewind requirements (rewind arrives in chapter 2).

## Left to the builder

Exact room geometry, names of the new rooms, decoration, crystal placement, and
the exact `dashJumpGrace` value (tuned by feel, then verified by the solver).
