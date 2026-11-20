# Making levels for Echo with Tiled

Levels are made in **[Tiled](https://www.mapeditor.org/)**, a free map editor. The game reads Tiled's own files directly: save in Tiled, refresh the browser, play.

```bash
sudo pacman -S tiled      # Arch
```

## Files in this folder

| File | What it is |
|---|---|
| `*.world` | A **chapter**: places rooms next to each other. Open this in Tiled (File → Open World…) to see and edit the whole chapter at once |
| `*.tmj` | A **room** (one Tiled map) |
| `terrain.tsj` + `terrain.png` | The tileset used to paint rooms |
| `README.md` | This guide |

The game currently loads `playground.world` (set in `src/scenes/game-scene.ts`, constant `WORLD`).

## How a room works

### The `terrain` layer (tile layer)
Paint with the 5 tiles of the `terrain` tileset:

| Tile | Meaning |
|---|---|
| Stone block | **Ground**. Paint it plainly: the game picks the right edges, corners and grass by itself (autotiling) |
| Thin slab | **One-way platform**: you can jump up through it and stand on it. Down + jump drops through |
| Spikes | **Spikes**: instant death (only their lower half hurts) |
| Gold button | **Pressure plate**: held down by Iris or an echo standing on it |
| Amber gate | **Door**: solid while closed. Stack two vertically for a normal door. All doors in a room open while any plate is held |

The layer **must be named `terrain`**.

### The `objects` layer (object layer)
Place **point objects** (Insert Point, shortcut `I`) and set their **Class** in the Properties panel:

| Class | Meaning |
|---|---|
| `spawn` | Where Iris's **feet** appear. Put one near each entrance: when Iris enters a room, she respawns at the closest one if she dies |
| `checkpoint` | An **Echo Crystal**. Place the point on the ground (the crystal's base). Touching it makes it the respawn point and refills the dash and double jump |

Rectangles also work: their bottom-centre is used.

### Room properties
In Map → Map Properties, add a custom property:

| Name | Type | Meaning |
|---|---|---|
| `echoes` | int | Max echoes at once in this room (default 3) |

### Rules
- Tiles are **16×16**. Map → Map Properties → **Infinite: off**.
- A room must be at least **20×12 tiles** (the screen is 20×11.25 tiles).
- The **first room** listed in the `.world` is where the chapter starts.

## Connecting rooms

Open the `.world` file in Tiled (File → Open World…). Rooms are shown side by side; drag them with the **World tool** (`N`) to place them.

**Rooms that touch are connected.** Wherever a room's edge has no wall, Iris walks (or falls, or climbs) into the neighbouring room, and the camera slides across.

- Line rooms up so their openings match (same tiles on both sides of the edge).
- An edge with **no neighbour** is a solid wall (left, right, top) or **the void** (bottom).
- Keep rooms aligned to the 16 px grid (Tiled snaps to it by default).
- Going **up** into a room gives Iris a small hop, so put a ledge right above the opening.

## Drafting quickly in ASCII (optional)

`tools/ascii_to_tiled.py` turns ASCII sketches into these Tiled files, which is handy to block out a chapter fast before polishing in Tiled. Careful: running it **overwrites** the rooms it defines. Once a room has been edited in Tiled, Tiled is the source of truth.

```
#  ground   -  platform   ^  spikes   b  plate   D  door   S  spawn   C  checkpoint   .  empty
```
