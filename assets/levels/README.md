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
| Cracked block | **Crumble stone** (chapter 1). A horizontal run of them is one slab: standing on it (or wall-sliding against it) makes it shake 0.4 s, fall, and come back 2 s later once nothing is in the way. Echoes trigger it too |

The layer **must be named `terrain`**.

### The `objects` layer (object layer)
Place **point objects** (Insert Point, shortcut `I`) and set their **Class** in the Properties panel:

| Class | Meaning |
|---|---|
| `spawn` | Where Iris's **feet** appear. Put one near each entrance: when Iris enters a room, she respawns at the closest one if she dies |
| `checkpoint` | An **Echo Crystal**. Place the point on the ground (the crystal's base). Touching it makes it the respawn point, refills the dash and double jump, and keeps the collectibles picked up since the last checkpoint |
| `shrine` | A **Bell Shrine** (on the ground). Works like a checkpoint for now; later: saving and fast travel |
| `flower` | A **dash flower** (chapter 1). A point at the flower's centre. Touching it with the dash spent gives the dash back (not the double jump); it regrows after 2.5 s |
| `vent` | A **wind vent** (chapter 1). A rectangle: the air column, rising from a fissure in the rock just under its bottom edge (so put ground right below it). Iris rises inside it (up to 200 px/s); dashing ignores it |
| `drift` | A **Drift fracture** (chapter 1). A rectangle: inside, gravity ×0.45 and falls ×0.6 (jumps go about twice as high) |
| `exit` | A **chapter exit**. Properties `chapter` (string, e.g. `chapter1`) and `room` (string, a room of that chapter), optional `spawn` (int, which spawn of that room Iris arrives on, default 0). A point marks the whole column it stands in, top to bottom; a rectangle marks just its area. Put it against the room edge, and make sure the arrival spawn is not on the other side's exit (`tools/check_world.py` checks it). Room names must be unique across all chapters |
| `shard` | A **Bell Shard**. Property `unlocks` (string): `dash`, `rewind`, `doubleJump`, `wallJump` or `echo` (+1 echo slot). Kept immediately, shows a tutorial banner |
| `note` | A **Resonant Note** (collectible) |
| `page` | A **Lost Page** (collectible) |
| `moment` | A **Lumi's Moment** (collectible) |
| `npc` | A character. Property `name` (string), shown above them when Iris comes close. Placeholder sprite until each NPC gets its own |
| `lingering` | A villager frozen in the Stilling (a faint echo). Property `text`: the thought shown when Iris passes by. Optional `flip` (bool) |
| `text` | A tutorial text in the world, fading in as Iris gets close. Property `text`; `{jump}`, `{dash}`, `{rewind}`, `{left}`, `{right}`, `{up}`, `{down}` are replaced by the player's keys |
| `deco` | A decoration (not solid). Point = where it stands (bottom-centre). Properties: `sprite` (a name from `sprites.json` → `decor`, e.g. `house`, `pine`, `apple_tree`, `fence`, `lantern_post`, `mill_wheel`, `crate`…), `layer` = `back` (behind the tiles, darkened), `mid` (default, behind Iris) or `front` (in front of Iris), `flip` (bool) |

Grass, flowers, rocks, mushrooms, vines, cobwebs and stalactites are added **automatically** on every ground top and ceiling, so only the big props need placing by hand.

Collectibles (`note`, `page`, `moment`) float above Iris after she picks them up and are only **kept once she reaches a checkpoint or shrine**. If she dies first, they go back where they were.

Rectangles also work: their bottom-centre is used.

### Room properties
In Map → Map Properties, add a custom property:

| Name | Type | Meaning |
|---|---|---|
| `echoes` | int | Max echoes at once in this room (default 3). Iris can never hold more than her unlocked echo slots |
| `title` | string | Name shown when entering the room (default: the file name) |
| `indoor` | bool | A dark stone back wall instead of the night sky, indoor props (cobwebs, crates) and dust instead of fireflies |
| `abilities` | string | **First room of a chapter only.** What Iris starts with, e.g. `doubleJump, wallJump` (others: `dash`, `rewind`) |
| `echoSlots` | int | **First room of a chapter only.** How many echoes Iris starts able to hold (unlocking `rewind` gives at least 1) |

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
