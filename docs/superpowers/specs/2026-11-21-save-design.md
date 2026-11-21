# Save system

Date: 2026-11-21 · Branch: `feature/save`

## Intent

Nothing survives closing the tab today. Saving comes before the map and fast travel,
which depend on it (visited rooms, lit shrines). SCRIPT.md §4.3: 3 save slots, auto-save,
stored locally; §11: CONTINUE in the main menu.

## Decided (with the user)

- **Option B:** every Echo Crystal and Bell Shrine touched auto-saves; Continue resumes at
  the last one touched. Shrines keep their special role for later (fast travel, Tamsin).
- 3 slots. Main menu: `CONTINUE` (only when a save exists, loads the last used slot),
  `PLAY` opens the slot screen: `FILE n  <ROOM TITLE>  SHARDS n  PAGES n  H:MM`, or `EMPTY`.
  Empty slot = new game, full slot = resume. An `ERASE A FILE` entry erases a slot after a
  second confirming press.
- Stored in localStorage, versioned format.

## What is saved

abilities, echo slots, secured collectibles, lit checkpoints, the respawn point per room
(last crystal touched there), the resume room + point, NPCs already talked to, **visited
rooms** (for the map), play time, save date.

## My calls (check these)

- Pending (not yet secured) collectibles are never saved: same rule as dying.
- Quitting through PAUSE → MAIN MENU doesn't save by itself: the last crystal is the save.
- If a saved room no longer exists (levels changed), the game resumes at the chapter start
  with the rest of the progress kept.
- Play time counts only while playing (not paused, not in menus).

## Approaches considered

- Shrines only (script as written): ruled out by the user, chapter 0 has 3 shrines and a
  quit could cost ~5 rooms.
- **Shrines + crystals** (chosen).

## Non-goals

Map, fast travel, chapter select, cloud saves, death counter.
