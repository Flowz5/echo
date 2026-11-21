# Map & fast travel (first version)

Date: 2026-11-21 · Branch: `feature/map`

## Intent

SCRIPT.md §4.9. The save already records visited rooms; the map shows them, and fast
travel between Bell Shrines makes backtracking (e.g. the 0-9 island page once Iris has
the dash) quick. Chapter 1 doesn't exist yet, so fast travel is available now (user
picked option B); it can be moved to the Ruins Shrine unlock later.

## Decided (with the user)

- **MAP** action, default key **C** (`KeyC`), rebindable in SETTINGS → CONTROLS (the
  script said M: changed). Also **PAUSE → MAP**.
- Chapter view of the current chapter: rooms to scale, filled in as they are visited.
- **Fast travel now**: open the map while standing at a Bell Shrine → pick another lit
  shrine → travel.
- **Quill** ("SHOW ME THE MAP") reveals the outline of every room of the chapter.

## Behaviour

- Scale 2 px per tile; each visited room is drawn as its real terrain silhouette;
  revealed-but-unvisited rooms as an outline only; unknown rooms not at all.
- Icons in visited rooms: Bell Shrine (gold bell), Echo Crystal (cyan diamond, bright when
  lit), NPC (bone dot). Iris's Eye blinks where she is. Title = chapter name.
- Browsing: the map opens centred on Iris; arrows/move keys pan; MAP, PAUSE or back
  closes it. The game is paused while it's open.
- At a shrine: the map opens in travel mode: LEFT/RIGHT cycle through lit shrines (map
  pans to the selection), JUMP/INTERACT confirms. Travel = shrine chime, a cyan fade
  (~0.35 s out, ~0.35 s in), Iris appears at the destination shrine, the game saves.
- The revealed outline is saved (`revealed` chapters in the save).

## My calls (check these)

- Collectible icons, ability-gate locks, NPC "!" and custom pins are left for later
  (the script ties them to later chapters).
- No world view yet (one chapter).
- Fast travel can't be opened mid-room: only standing at a shrine, alive, grounded.

## Approaches considered

- Draw room cells as plain rectangles vs **terrain silhouettes** (chosen: rooms are big
  and irregular; silhouettes read much better and are cached once per opening).

## Non-goals

World view, pins, collectible dots, gate locks, fast-travel unlock story beat.
