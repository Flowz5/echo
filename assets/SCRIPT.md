# ECHO — Game Script & Art Bible

> A fast, precise 2D platformer where you rewind time and use your own frozen echoes to survive.

---

## 1. Story

### Logline
In a valley where time has cracked, a small wanderer with a single glowing eye climbs toward the silent Bell — using echoes of her past self to reach places no one else can.

### The world
**The Hushed Valley** was once kept in rhythm by **the Great Bell**, whose toll made every moment follow the next. One night the Bell cracked. Since then, time in the valley *stutters*: moments repeat, linger, and leave behind **echoes** — frozen imprints of whatever stood there a heartbeat ago.

Most living things fear the echoes. The valley is now still, starlit and empty, its ruins slowly covered in moss.

### The protagonist — Iris
- A small wanderer in a bone-white mask, a dark cloak and a long rose scarf.
- Through the mask shines **the Eye**: a single cyan eye, a shard of the Great Bell lodged in her mask. It is the source of her power.
- The Eye lets Iris **pull herself back a few seconds in time**. When she does, the moment she left does not disappear: it stays behind as a **solid echo** of herself.
- Iris doesn't speak. Her emotions show through the Eye (dim, bright, flickering) and the scarf.

### Goal
Climb from the bottom of the valley to the Belltower, find the missing shards of the Bell, and decide whether to ring it again — restoring time and erasing every echo, including the ones that helped her.

### Tone
Quiet, melancholic, a little hopeful. Starry nights, soft moss, cold ruins. The challenge is hard; the world is gentle.

---

## 2. Core mechanics

| Action | Default key (keyboard) | Gamepad | Notes |
|---|---|---|---|
| Move | W A S D (Z Q S D on AZERTY) / arrows | Left stick / D-pad | Fast acceleration, short skid. Down = fast fall, down + jump drops through platforms |
| Jump | Space | A | Variable height, coyote time, jump buffer |
| Double jump | Jump in mid-air | A | Refreshed on landing (or on touching an echo) |
| Dash | Left Shift | X | 8 directions, short, refreshed on landing |
| Rewind | R | RB | Pull back in time and leave an echo |
| Pause | Esc | Start | |

Every key can be rebound in **Settings → Controls**. Bindings use physical key positions, so the default WASD is ZQSD on an AZERTY keyboard, and the menu shows the label printed on *your* keyboard. Arrow keys always work for movement and menus.

### Rewind & echoes (the heart of the game)
1. The game constantly records Iris's last **2 seconds** of movement.
2. Pressing **Rewind** snaps Iris back to where she was 2 seconds ago (with a short cyan rewind effect).
3. At the exact spot she rewound *from*, a **frozen echo** appears — a solid cyan silhouette in the pose she was in.
4. **Echoes are solid**: Iris can stand on them, jump off them, and they keep **buttons pressed**.
5. **The world remembers**: anything changed before the rewind (a button pressed, a door opened) stays changed.
6. Each room sets a **maximum number of echoes** (1 to 3). Creating a new one when at the limit erases the oldest.
7. Echoes vanish when the room is restarted or Iris dies.

**Signature moves**
- *Leap of faith*: jump into the void to hit a button, rewind before falling — the button stays pressed and the echo hangs in the air.
- *Echo step*: rewind mid-air over a gap, then use the echo as a platform to double jump further.
- *Echo weight*: leave an echo standing on a pressure button while Iris goes through the door.

### Feedback
- **Scarf** = movement resources. Rose = dash + double jump available. Grey (`spent`) = used.
- **Eye** = rewind power. Flares bright (`power`) while rewinding; dims when no echo slot is free.

---

## 3. Chapters (draft)

| # | Name | Teaches | Feel |
|---|---|---|---|
| 0 | **The Quiet Vale** | Run, jump, double jump | Tutorial, grassy ruins, first sight of the Bell |
| 1 | **Starfall Ruins** | Dash | Broken bridges, wide gaps under the stars |
| 2 | **The Mirror Caves** | Rewind, echoes as platforms | Crystals, cyan reflections, deep pits |
| 3 | **Clockwork Spire** | Buttons, doors, echo weight | Amber machinery, timing puzzles |
| 4 | **The Belltower** | Everything combined | Final climb, the cracked Bell |

Each chapter is a chain of single-screen (or short scrolling) rooms with a **checkpoint crystal** at the start.

---

## 4. Art direction

### Technical rules
- Internal resolution **320 × 180**, scaled by whole numbers only (×4 = 1280×720, ×6 = 1920×1080).
- Tiles **16 × 16**. Player **16 × 16** frame (character ≈ 10 × 15 px).
- No smoothing (`imageSmoothingEnabled = false`), camera snapped to whole pixels.
- 1 px dark outline (`Void #0d0b1e`) around the player, echoes, props and interactables.

### Palette — "Echo" (26 colours)
Files: `palette/echo.hex` (Lospec), `palette/echo.gpl` (Pixelorama / Aseprite / GIMP), `palette/palette.png`.

| Key | Hex | Name | Usage |
|---|---|---|---|
| K | `#0d0b1e` | Void | outlines, darkest shadow |
| 1 | `#161433` | Night 1 | deep sky, panel fill |
| 2 | `#1f1d4a` | Night 2 | terrain base |
| 3 | `#2b2a63` | Night 3 | cloak, mountains |
| 4 | `#3c3b80` | Night 4 | cloak highlight, horizon |
| v | `#4e3a7a` | Dusk violet | horizon glow |
| V | `#6b4c9a` | Lilac | accents |
| p | `#9c5a9c` | Mauve | scarf shadow |
| P | `#d8749b` | Rose | scarf |
| q | `#f2a3a3` | Blush | scarf highlight |
| W | `#f4f1e8` | Bone | mask, text, stars, moon |
| g | `#8a8aa8` | Ash | mask shadow, metal, inactive |
| G | `#5a5a7a` | Slate | metal shadow, inactive |
| c | `#1b6f8a` | Echo deep | echo outline, eye pupil |
| C | `#2bb5c9` | Echo | echoes, rewind, the Eye |
| e | `#6ff2f2` | Echo light | echo fill, glow |
| E | `#d4ffff` | Echo flash | eye glint, flashes |
| a | `#8a4b1f` | Amber deep | interactable shadow |
| A | `#d9822b` | Amber | buttons, doors |
| y | `#ffc24d` | Gold | interactable highlight |
| Y | `#fff0a8` | Pale gold | interactable glint |
| r | `#8f2340` | Danger deep | hazard shadow |
| R | `#d9415e` | Danger | hazards |
| m | `#1f4a4a` | Moss deep | moss shadow |
| M | `#2f7a6a` | Moss | moss, grass |
| n | `#5fb08a` | Moss light | grass tips |

**Colour language (never break it):**
- **Cyan = time.** Only the Eye, echoes, rewind effects and checkpoints use cyan.
- **Amber = interactable.** Buttons, doors, levers, anything the player can change.
- **Red = danger.** Hazards only.
- Everything else lives in the night blues and violets.

### Echo look
Cyan silhouette in the exact pose Iris had, checkerboard dither (`e` / `C`), `c` outline, the Eye glowing `E`. Drawn at ~65 % opacity with a slow shimmer.

---

## 5. Sprites (base set)

All placeholders are generated by `tools/gen_sprites.py` (`python3 tools/gen_sprites.py`). Replace any PNG with hand-drawn art as long as you keep the same size and layout. Full metadata lives in `sprites.json`.

| File | Size | Content |
|---|---|---|
| `sprites/player.png` | 9 × 3 frames of 16×16 | Columns: idle (2), run (4), jump, fall, dash. Rows: `normal`, `spent` (grey scarf), `power` (bright Eye) |
| `sprites/echo.png` | 9 frames of 16×16 | Echo version of every player frame |
| `sprites/tiles.png` | 16 tiles of 16×16 | Autotile: index = top·1 + right·2 + bottom·4 + left·8 (bit = side exposed to air) |
| `sprites/props.png` | 6 × 16×16 | spikes, button_up, button_down, checkpoint_off, checkpoint_on, platform (one-way) |
| `sprites/door.png` | 2 × 16×32 | closed, open |
| `ui/ui.png` | atlas | panel, panel_selected (9-slice, 8 px corners), cursor, slider_empty, slider_full, slider_knob, toggle_off, toggle_on |
| `ui/font.png` | 5×7 glyphs, 6 px advance | Uppercase bitmap font (order in `sprites.json`) |
| `ui/title.png` | logo | "ECHO" with trailing echoes and the Eye in the O |
| `backgrounds/sky.png` | 320×180 | Night gradient, stars, moon (static) |
| `backgrounds/mountains.png` | 320×110 | Far mountains, parallax 0.15, tiles horizontally |
| `backgrounds/hills.png` | 320×80 | Pine hills, parallax 0.35, tiles horizontally |
| `preview/*.png` | — | Contact sheet + main menu mockup (not used in game) |

**Next sprites to draw:** death / respawn burst, rewind particles, dust puffs, collectible Bell shard, moving platform, lever, NPC (the Bellkeeper).

---

## 6. Menus & UI text

All in-game text is **English** and **uppercase** (bitmap font).

### Main menu
Background: sky + parallax layers slowly scrolling, title logo, Iris idle on the ground with a few echoes floating behind her.

```
ECHO
  > PLAY
    SETTINGS
    CREDITS
V0.1                     SPACE TO SELECT
```
- **PLAY** → continue from the last checkpoint (or start chapter 0 if no save).
- **SETTINGS** → settings screen.
- **CREDITS** → credits screen.

### Settings
```
SETTINGS
  MUSIC VOLUME      [=======---]
  SFX VOLUME        [=========-]
  SCREEN SHAKE      [ON ]
  FULLSCREEN        [OFF]
  PIXEL SCALE       < AUTO >
  CONTROLS          >
  BACK
```
Settings are saved locally.

### Controls
```
CONTROLS
  UP                W
  DOWN              S
  LEFT              A
  RIGHT             D
  JUMP              SPACE
  DASH              L-SHIFT
  REWIND            R
  PAUSE             ESC
  RESET TO DEFAULT
  BACK
PRESS A KEY...      (while rebinding)
```

### Pause menu
```
PAUSED
  > RESUME
    RESTART ROOM
    SETTINGS
    MAIN MENU
```

### Credits
```
ECHO
A GAME BY FLOWZ
MADE WITH TYPESCRIPT AND A CANVAS
THANKS FOR PLAYING
```

### In-game prompts (tutorial)
- `JUMP: SPACE`
- `PRESS JUMP AGAIN IN THE AIR`
- `DASH: SHIFT`
- `REWIND: R`
- `YOUR ECHO STAYS BEHIND`
- `ECHOES HOLD BUTTONS DOWN`
- `CHECKPOINT`
