# NPC dialogues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Talk to Tamsin, Quill and the Lingering villagers with an INTERACT key (E), in an Undertale-style box (typewriter, voice blips, choices).

**Architecture:** A pure `Conversation` class (src/game/dialogue.ts) runs a script: typing, punctuation pauses, blip events, choices. Scripts live in src/game/dialogues.ts. The game scene owns the open conversation, stops updating Iris while it is open, and draws the box (src/ui/dialogue-box.ts). Voices are a new `AudioEngine.blip(voice)`.

**Tech Stack:** TypeScript, canvas, Web Audio synth, Vitest, Python sprite generator.

**Spec:** `docs/superpowers/specs/2026-11-21-dialogues-design.md`

## Global Constraints

- INTERACT action, default `KeyE`, rebindable in SETTINGS → CONTROLS (label "INTERACT").
- Text uppercase, 40 chars/s; pause after `,` (0.12 s) and after `.` `!` `?` `…` (0.3 s); blip every 2 letters, never on spaces/punctuation.
- JUMP or INTERACT: finish the line, then next. PAUSE: end the conversation. Choices: UP/DOWN, confirm with JUMP/INTERACT.
- First talk = full script (SCRIPT.md §6.1 / §6.4 verbatim), then repeat line; remembered per run.
- Commits: plain messages, no Claude attribution; branch `feature/dialogues`.

## Review Focus

1. Opening a conversation with the same key press that then also advances it (E pressed once must not skip line 1). Test in Task 1.
2. Pressing JUMP to close the last line must not make Iris jump on the next frame. Checked in Task 3 (buffer cleared / input swallowed for one frame).
3. Rebinding INTERACT onto a key used by another action swaps them (existing `rebind`), and old saved settings without `interact` get `KeyE`. Test in Task 2.
4. Dying/room transition while a prompt is shown: no conversation opens mid-transition. Task 3 only opens when Iris is alive and grounded.
5. A choice line reached by fast-skipping: confirm must not pick a choice before the choices are fully shown. Test in Task 1.

---

### Task 1: Conversation logic

**Files:** Create `src/game/dialogue.ts`, `src/game/dialogue.test.ts`.

**Interfaces — Produces:**
```ts
export type Voice = "tamsin" | "quill" | "system" | "lingering";
export interface Speaker { name: string; color: string; voice: Voice; portrait: number | null }
export type Line = { speaker: Speaker; text: string } | { speaker: Speaker; text: string; choices: { label: string; reply: Line[] }[] };
export class Conversation {
  constructor(lines: Line[]);
  readonly done: boolean; readonly line: Line; readonly shown: string; readonly lineComplete: boolean;
  choice: number; // highlighted choice
  update(dt: number): { blip: boolean };
  confirm(): void;      // finish line / next line / pick choice
  move(dir: -1 | 1): void; // choices
  skip(): void;         // end
}
export const CHARS_PER_SECOND = 40;
```
- [ ] Tests (fail first): types at 40 cps; `,` pauses 0.12 s and `.` 0.3 s; blips every 2nd letter and not on spaces; `confirm` mid-line shows full line, again goes next; last confirm → `done`; choices: `move` wraps, confirm inserts the chosen reply lines next; confirm while a choice line is still typing only completes it (Review 5); `skip` → done; the first `update` after construction types (Review 1 handled in scene by opening without consuming confirm: test that a new Conversation shows "" until updated).
- [ ] Implement; `npm test` green; commit `feat: dialogue conversation logic`.

### Task 2: INTERACT key + voices + scripts + portraits

**Files:** `src/engine/input.ts` (Bindable + `interact: "KeyE"`), `src/scenes/controls-menu.ts` (row "INTERACT" after DASH… order: UP DOWN LEFT RIGHT JUMP DASH REWIND INTERACT PAUSE), `src/settings.test.ts` (new), `src/engine/audio.ts` (`blip(voice: Voice)`), `src/game/dialogues.ts` (scripts), `tools/gen_sprites.py` + `assets/sprites/portraits.png` + manifest `portraits` (frames 32×32: 0 tamsin, 1 quill), `src/engine/assets.ts`.

- [ ] Tests (fail first): `loadSettings` with stored bindings lacking `interact` → `KeyE`; `rebind(s,"interact","KeyR")` swaps with rewind. Tests for `dialogues.ts`: `tamsinFirst()` first line text "UP, UP. STARS ARE OUT." and has a choice with labels ["NOD","TILT HEAD"]; `quillFirst()` choice labels ["WILL IT COME BACK?","SHOW ME THE MAP"] and the map branch ends with a SYSTEM line "MAP UPDATED."
- [ ] `blip`: tamsin triangle ~D4 ±1 semitone, 0.05 s; quill pulse12 ~A5 ±2 semitones, 0.035 s; system pulse25 E5 fixed; lingering sine ~C5 quiet with a soft echo tap. Gain ≈ 0.12.
- [ ] Portraits: hand-drawn placeholder grids in the palette (Tamsin: grey hair bun, lantern glow; Quill: round glasses, quill behind ear).
- [ ] `npm test`, `npm run typecheck`, `python3 tools/gen_sprites.py` green; commit `feat: interact key, voices, chapter 0 scripts and portraits`.

### Task 3: Box + game scene wiring

**Files:** Create `src/ui/dialogue-box.ts` (`drawDialogueBox(draw, conv, t)`); modify `src/scenes/game-scene.ts`.

- [ ] Prompt: within 20 px horizontally and 24 px vertically of an `npc` or `lingering` entity, Iris alive and grounded, no transition → show the INTERACT key label above them (replaces the lingering floating text). INTERACT opens the conversation (Tamsin/Quill by `props.name`, first vs repeat via a per-run `Set<string>` of talked keys; lingering → one line with its `text`).
- [ ] While open: `conv.update(dt)` → `blip`; JUMP/INTERACT → confirm; UP/DOWN → move; PAUSE → skip; Iris not updated; music ducked (`setDucked`). On close: undo duck, `player.clearInput()`-equivalent so the closing JUMP doesn't buffer a jump (Review 2) — add `Player.cancelJumpBuffer(): void` (sets buffer 0), with a test in player.test.ts.
- [ ] Box: panel at the bottom (x 8, y 124, w 304, h 48), portrait 32×32 at left if any, name in speaker colour, text wrapped to the panel width, blinking ▼ when the line is complete, choices drawn as rows with the menu cursor.
- [ ] Browser check (playwright): open game, teleport next to Tamsin, press E, screenshot mid-typing and at a choice; no console errors. `npm test`, `npm run build` green. Commit `feat: talk to NPCs in a dialogue box`.

### Task 4: Docs

- [ ] SCRIPT.md §4.6: INTERACT key (E) instead of UP, ✅ built; Lingering villagers talkable; note Lost Pages may carry lore later (§ Lost Pages). README/controls text if any lists keys. Commit `docs: dialogue system in the script`.
