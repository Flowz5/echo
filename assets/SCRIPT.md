# ECHO — Game Script & Design Bible

> A fast, precise 2D platformer where you rewind time and use your own frozen echoes to survive.

**Status:** living document, v0.4. Everything here is the target design; what is already implemented is marked ✅.

---

## Contents

1. [Overview](#1-overview)
2. [The world](#2-the-world)
3. [Characters](#3-characters)
4. [Gameplay systems](#4-gameplay-systems)
5. [Chapters, room by room](#5-chapters-room-by-room)
6. [Dialogue script](#6-dialogue-script)
7. [Endings & post-game](#7-endings--post-game)
8. [Audio](#8-audio)
9. [Art direction](#9-art-direction)
10. [Sprites](#10-sprites)
11. [Menus, HUD & UI text](#11-menus-hud--ui-text)
12. [Controls](#12-controls)

---

## 1. Overview

### Logline
In a valley stuck in a hundred-year night, a small wanderer with a single glowing eye climbs toward the cracked Bell that stopped time, using frozen echoes of her past self to reach places no one else can.

### Pitch
*Echo* is a precision platformer about **time as a tool, not an undo button**. Iris can pull herself two seconds back in time. The spot she left does not vanish: it freezes into a **solid echo** of her. Jump into the void to hit a switch, rewind before you fall, and the switch stays pressed while your echo hangs in the air, ready to be used as a stepping stone.

### Design pillars
1. **Tight and fair.** Every death is the player's fault and every input is respected (coyote time, jump buffer, corner correction).
2. **Time is a tool.** The rewind creates things. Puzzles are solved by *planning* echoes, not by trial and error.
3. **A quiet world, kind people.** The valley is empty and melancholic, but the few people left are warm, funny and worth talking to.
4. **Every echo matters.** The story mirrors the mechanic: the game asks what it means to let a moment go.

### Scope
| | |
|---|---|
| Main story | 5 chapters + prologue + epilogue, ~5–7 hours |
| 100 % | ~12 hours (collectibles, side quests, Lumi's moments, Echo Trials) |
| Structure | Linear story spine with a **connected world**: branching routes in every chapter, ability gates that send you back to earlier areas, NPC side quests and shrine-to-shrine fast travel |
| Platforms | Web first, desktop build later |
| Rating | Everyone. No gore: death is a burst of light, not violence |

---

## 2. The world

### The Hushed Valley
A deep valley carved into the mountains, climbing from mossy fields at the bottom to a lonely belltower at the summit. The player travels **upward** the whole game. Every chapter is literally higher than the last, and the Belltower is visible on the horizon from almost everywhere.

```
            ▲  THE BELLTOWER ............ chapter 4
            │  Clockwork Spire .......... chapter 3
            │  The Mirror Caves ......... chapter 2
            │  Starfall Ruins ........... chapter 1
            │  The Quiet Vale ........... chapter 0 (prologue)
            │  Lanternrest (hub village)
```

### History
- **The Tollers** were an order of bell-ringers who lived in the valley. Their great work was **Aurel, the Great Bell**. Each toll of Aurel pushed the valley's time forward, hour by hour. The valley lived by the Bell: farmers sowed at the first toll, lamps were lit at the twelfth.
- **The Stilling.** One hundred years ago, at the eleventh toll of a winter night, the Bell **cracked**. The twelfth toll never came. Time in the valley stopped *flowing* and started *stuttering*: moments loop, linger and leave **echoes** behind. Dawn never arrived. **It has been night in the valley for a hundred years**, which is why the stars never move and the moon never sets.
- **The Lingering.** Most of the valley's people were caught mid-moment and became echoes themselves: translucent figures repeating the last thing they were doing. They are not dead and not alive, just *stuck*. A few people were spared, mostly those who were asleep or underground that night. They are the NPCs.
- **The Heartshard.** When Aurel cracked, a splinter of it flew down the valley and lodged in a newborn's crib. That child was Iris. The shard became her **Eye**. Old Tamsin carved a bone-white mask to hold it safely. Because Iris carries a piece of the Bell, she is the only being in the valley who moves freely through time.

### Rules of time (lore ↔ mechanics)
| Lore | Mechanic |
|---|---|
| The Eye can pull Iris a heartbeat back | Rewind: Iris returns to where she was 2 s ago |
| A moment left behind becomes an echo | A solid, frozen echo appears where she rewound from |
| Echoes fade when time moves on | Echoes vanish on death or room restart |
| The Eye can only hold so many moments | Echo limit per room (1 → 3 over the game) |
| The Stillness: places where time stopped completely | Purple fog that slowly freezes Iris if she stays in it |
| Bell chimes: small bells cast from Aurel's metal | Ringing one makes all echoes intangible for 3 s |

### Lanternrest, the hub
A tiny village of lanterns hanging from a giant dead tree at the bottom of the valley, the last place where people still live. NPCs met during the adventure move here and their homes light up one by one. It contains:
- **The Bell Shrine** (save, chapter select, fast travel).
- **The Teahouse** (Moss & Bramble, gossip and secret hints).
- **Quill's map table** (collectible tracker).
- **Ottoline's workshop** (unlocked in chapter 3).
- **Lumi's tree swing** (the side quest's finale).

---

## 3. Characters

> All in-game text is in English and rendered in uppercase by the bitmap font. Each NPC has a **voice blip**: a pitched chiptune sound per letter while their text types out.

### Iris (the player)
- **Look:** small, bone-white mask, a single cyan **Eye**, dark navy cloak, long rose scarf.
- **Personality:** curious, brave, a bit stubborn. **She never speaks.** She answers with the Eye (brightens = happy or determined, flickers = afraid, dims = sad) and small animations (head tilt, scarf flutter).
- **Feedback on her body:** the scarf turns **grey** when the dash is spent ✅. The Eye **flares** while rewinding, and **dims** when no echo slot is free.
- **Arc:** she starts the game wanting to fix the Bell because Tamsin told her to. She ends it understanding what fixing it costs, and choosing for herself.

### Tamsin, the Old Bellkeeper — *mentor*
- **Look:** a tiny, very old woman under a huge bell-shaped hat, carrying a lantern on a pole.
- **Voice:** low, slow blip. Speaks in short sentences and old sayings. Dry humour.
- **Role:** raised Iris. Last living Toller. Tutorial voice in chapter 0. Afterwards she speaks through the **Bell Shrines** ("the bells carry my voice, child") and gives story context between chapters.
- **Secret:** she was there the night of the Stilling and knows who cracked the Bell. She hasn't told Iris because she was ashamed she could not stop him.

### Pip — *the hint moth*
- **Look:** a moth the size of Iris's head, fluffy, pale gold wings, attracted to the Eye's glow.
- **Voice:** fast, high blip. Overexcited, speaks in fragments, loves shiny things.
- **Role:** joins in chapter 1 and floats near Iris. Pip is the **hint system** (see 4.7). In puzzle rooms, Pip hovers near a "?" spot. Talking to Pip gives up to three hints of increasing precision.
- **Running gag:** Pip keeps trying to land on the Eye.

### Quill — *the cartographer*
- **Look:** a lanky crow in a patched coat with ink-stained feathers and spectacles.
- **Voice:** clipped, fussy blip. Talks like a scholar, gets flustered easily.
- **Role:** found in every chapter, always somewhere slightly hard to reach. Talking to him reveals the chapter map. In Lanternrest, his table tracks every collectible. Bring him **Lost Pages** and he marks secret areas on the map.
- **Arc:** he is mapping the valley "for when the sun comes back". He secretly fears it never will.

### Moss & Bramble — *the teahouse snails*
- **Look:** two snail brothers. Moss is tall, slow and kind. Bramble is short, grumpy and loud. Each carries a teapot in his shell.
- **Role:** comic relief in Lanternrest. Their gossip changes after every chapter and always hides a hint toward a secret ("Bramble swears he saw a light *behind* the waterfall in the caves").
- **Voice:** Moss = very low and slow. Bramble = mid, fast, sharp.

### Hask — *the stuck miner*
- **Look:** a big, round beetle miner with a pickaxe and a headlamp.
- **Role:** chapter 2. Trapped behind a collapsed tunnel since the Stilling. Freeing him is the chapter's mid-point. He teaches **echo weight** on an old mine cart scale, then moves to Lanternrest and opens a shortcut elevator.
- **Voice:** booming, cheerful. Calls Iris "little lamp".

### Ottoline Gearwhistle — *the clockwright*
- **Look:** a young inventor with goggles, oil-stained apron and a mechanical arm she built herself.
- **Voice:** quick, enthusiastic, technical. Interrupts herself.
- **Role:** chapter 3. Lives inside Clockwork Spire, trying to restart the valley's clocks by hand. Explains buttons, doors and timed gates. Gives Iris the **second echo slot** by tuning the mask ("hold still, this might tickle your soul a little").
- **Arc:** obsessed with fixing time *mechanically*. Learns that some things are not machines.

### Lumi — *the echo girl* (side quest)
- **Look:** a translucent cyan echo of a little girl with a paper kite.
- **Role:** found in every chapter, frozen in a different moment of the same evening, the evening of the Stilling: flying her kite, laughing, looking for her father, calling out, falling asleep. Finding all five **Lumi's Moments** unlocks the true ending (7.3).
- **Twist:** Lumi is the Stillwarden's daughter.
- She never speaks directly. Her moments are short silent scenes with one line of text, like a memory.

### Corin Vael, the Stillwarden — *antagonist*
- **Look:** a tall figure in a long Toller robe, face hidden by a cracked bell-shaped helm, surrounded by violet Stillness fog.
- **Voice:** deep, slow, sad. No blip: his text appears instantly, all at once, like a frozen moment.
- **Who:** the last Head Toller. A hundred years ago his daughter Lumi fell gravely ill. The healer said she would not see the morning. So on the eleventh toll, Corin **cracked the Bell himself** so that morning would never come. Lumi did not die. She became an echo, forever in her last evening.
- **Goal:** protect the Stilling at any cost. He sees Iris as the one thing that can end it.
- **Not evil:** he never tries to kill Iris directly. He sends the Stillness after her, seals doors and begs her to stop. The final chapter is a **chase and a conversation**, not a fight.

### The Lingering — *ambient echoes*
Translucent villagers frozen mid-action throughout the valley (a baker holding a loaf, two friends mid-handshake, a dog mid-jump). Walking past one shows a **floating thought** of a few words, which builds the world without any lore dumps:
- "ONE MORE LOAF BEFORE THE TWELFTH TOLL."
- "I'LL TELL HER TOMORROW."
- "WHY IS THE BELL SO QUIET?"
- "THE STARS LOOK STUCK TONIGHT."

---

## 4. Gameplay systems

### 4.1 Movement ✅
| Move | Details |
|---|---|
| Run | 96 px/s, very fast acceleration, short skid, momentum kept in the air after a dash |
| Jump | ~2.5 tiles. Variable height (release early = short hop), coyote time 0.1 s, jump buffer 0.12 s, floatier apex while holding jump |
| Double jump | One per airtime, refreshed on landing (and on standing on an echo) |
| Dash | 8 directions, 0.14 s, tiny hit-stop, afterimages. Refreshed on landing. Scarf turns grey while spent |
| Wall slide ✅ | Push against a wall while falling: Iris grabs it and slides at a slow, constant speed. Sliding gives the double jump back |
| Wall jump ✅ | Jump while touching (or just after leaving) a wall. Pushing away = a long kick across; neutral = a short kick to climb the same wall. The kick briefly overrides the stick so Iris doesn't re-grab instantly |
| Fast fall | Hold down |
| Drop through | Down + jump on a one-way platform |
| Corner correction | Bumping a ceiling corner by ≤ 4 px nudges Iris around it |

**Unlock order:** run, jump, double jump and wall jump from the start (wall jump taught in 0-6, The Broken Mill's chimney). **Dash** at the end of chapter 0 (the first Bell shard). **Rewind** in chapter 2 (the Eye awakens).

### 4.2 Rewind & echoes ✅ (core implemented: recording, reverse playback, solid echoes, echo limit, void grace, plates & doors)
1. The game always records Iris's last **2 seconds** (position, velocity, pose, dash and double-jump state).
2. **Rewind** snaps her back to her state 2 s ago, with a short cyan whoosh, screen ripple and reversed afterimage trail.
3. A **frozen echo** appears where she rewound *from*, in the exact pose she had.
4. **Echoes are solid** from every side: stand on them, wall-touch them, bonk your head on them. They **hold buttons down**.
5. **The world remembers.** Buttons pressed, doors opened, collectibles picked up and crumbled blocks stay as they are.
6. **Resources rewind too.** If Iris had her dash 2 s ago, she has it again. This is the key to long routes.
7. **Echo limit** per room: 1 (chapter 2), 2 (chapter 3), 3 (chapter 4). At the limit, a new echo replaces the oldest, which shatters into light.
8. **Rewind cooldown:** 0.6 s. The Eye dims while recharging.
9. An echo can't appear inside a wall. If it would, the rewind still happens but no echo is left (shown with a soft fizzle).
10. **The void is not instant death.** Falling below the screen gives a 0.5 s "falling" window (camera stops, the screen dims) during which a rewind still saves you. This is what makes the *leap of faith* possible.
11. Echoes vanish on death or room restart.

**Signature techniques** (taught in order):
- **Echo step:** rewind mid-air over a gap, then use the echo as a platform.
- **Leap of faith:** jump into the void to hit a switch, rewind before dying. The switch stays on.
- **Echo weight:** leave an echo standing on a pressure plate.
- **Echo ladder:** chain 2–3 echoes vertically to climb a wall.
- **Echo shield:** an echo blocks Stillness fog streams and moving hazards.
- **Phase step** (chapter 4): ring a chime so echoes go intangible, pass through, and they become solid again behind you.

### 4.3 Checkpoints & saving
| Type | Look | Function |
|---|---|---|
| **Echo Crystal** | cyan crystal on a stone base, dim grey until touched ✅ sprite | Room checkpoint. On death, Iris respawns at the last touched crystal instantly. Touching one refills dash and double jump |
| **Bell Shrine** | a small bronze bell in a moss-covered stone arch | Saves the game, heals the Stillness, Tamsin speaks through it. From chapter 1, fast travel between every visited shrine and Lanternrest (see 4.9) |
| **Room start** | invisible | If no crystal was touched in a room, respawn at its entrance |

- **Death** resets the current room: echoes, buttons, crumble blocks and enemies' positions. Everything since the last crystal is replayed.
- **Collectibles** are only *secured* when Iris reaches the next crystal or shrine after picking them up (shown as a small icon following her until then).
- **Saving:** 3 save slots, auto-save at every shrine and at chapter transitions. Stored locally.
- **Death counter and timer** per chapter, shown on the chapter end screen, never during play.

### 4.4 Collectibles
| Item | Count | Purpose |
|---|---|---|
| **Bell Shards** | 5 | Story progression, one at the end of each chapter. Each restores a Bell "voice" and unlocks an ability (dash, echo slots…) |
| **Resonant Notes** | 7 | Hidden in hard optional rooms (one per chapter + 2 in Echo Trials). All 7 are needed for the true ending |
| **Lost Pages** | 30 | Lore fragments (diaries of the Tollers, letters, Corin's journal). Give them to Quill to reveal secret areas |
| **Lumi's Moments** | 5 | One per chapter. Silent memory scenes. All 5 are needed for the true ending |

### 4.5 Interactables & hazards
| Element | Colour rule | Behaviour | Introduced |
|---|---|---|---|
| Spikes ✅ | danger | Instant death (bottom 9 px only) | 0 |
| The void ✅ | — | Death after the 0.5 s falling window | 0 |
| One-way platform ✅ | neutral | Solid from above, drop through with down + jump | 0 |
| Crumble stone | neutral | Shakes for 0.4 s when stood on, falls, reforms after 2 s | 1 |
| Dash flower | rose | Refills the dash mid-air, regrows after 2.5 s | 1 |
| Wind vent | neutral | Pushes Iris up while she's above it | 1 |
| Pressure plate ✅ sprite | amber | Held down while something stands on it | 2 |
| Lever | amber | Toggles on hit (stays) | 2 |
| Door ✅ sprite | amber | Opens while its plate or lever is active | 2 |
| Mirror pool | time (cyan rim) | Rewinding near it puts the echo at the mirrored position across the pool's axis | 2 |
| Timed gate | amber | Opens for N seconds after a plate is touched, ticking sound | 3 |
| Cog platform | amber | Moves along a rail while its plate is held | 3 |
| Stillness fog | violet | Freezes Iris after 1.5 s inside it (frost overlay fills up). Echoes block it | 3 |
| Bell chime | amber + cyan | Hitting it makes every echo intangible for 3 s | 4 |
| Stillwarden's seal | violet | Wall that only opens when every echo slot is in use | 4 |

### 4.6 Dialogue system
- Walk up to an NPC: a small **"UP"** key prompt (the player's actual up key) floats above them.
- Press up: the **dialogue box** opens at the bottom of the screen (panel, 32×32 portrait on the left, name in the NPC's colour, text typing at 40 characters per second with the voice blip).
- **Jump** = show the full line, then next line. **Pause** = skip the conversation.
- Some lines offer **choices** (up/down + jump). Choices never lock content. They change a reply or a later line.
- NPCs have a **first talk**, **repeat talk** (short) and **after-chapter** lines.
- Gameplay never pauses for dialogue outside of NPC talks. Story beats inside rooms use **floating text** above characters so the action keeps flowing.

### 4.7 Hint system (Pip)
In every puzzle room, Pip hovers near a "?" spot. Talking to Pip:
1. **Hint 1, the nudge:** a direction to think in. "THAT BUTTON LOOKS LONELY."
2. **Hint 2, the method:** names the technique. "WHAT IF YOUR ECHO WAITED THERE FOR YOU?"
3. **Hint 3, the solution:** describes the steps. "STAND ON THE PLATE, WAIT, REWIND. THEN RUN."
Hints never count against completion. Pip can be dismissed in the settings ("PIP HINTS: ON/OFF").

### 4.8 Assist mode
Under SETTINGS → ASSIST (no penalty, no lock):
- **GAME SPEED:** 100 / 90 / 80 / 70 / 60 %
- **INFINITE DASH:** ON / OFF
- **INFINITE ECHOES:** ON / OFF
- **INVINCIBLE:** ON / OFF (spikes and void respawn you at the last safe spot)
- **REWIND WINDOW:** 2 / 3 / 4 s

### 4.9 Map & fast travel
**Opening the map:** MAP key (default **M**, rebindable) or **PAUSE → MAP**.

**Two zoom levels**
- **World view:** the whole valley as a vertical cross-section, from Lanternrest at the bottom to the Belltower at the top. Each chapter shows its completion (shards, notes, pages, moments, quests).
- **Chapter view:** a grid of rooms, one cell per screen, joined by their exits.

**How the map fills in**
1. Rooms appear as you **visit** them (filled cell).
2. Talking to **Quill** in a chapter reveals the **outline** of every room of that chapter (empty cells), so you can see where you haven't been.
3. **Lost Pages** given to Quill mark **secret rooms** with a "?".
4. After the **Shard of Hours** (chapter 3), each room shows small dots for the collectibles still inside it.

**Map icons**
| Icon | Meaning |
|---|---|
| Bronze bell | Bell Shrine (fast travel point) |
| Cyan diamond | Echo Crystal (checkpoint) |
| Face | NPC (with a "!" when they have something new to say) |
| Gold star | Side quest objective |
| Lock + ability icon | A gate you can't pass yet (dash, rewind, 2 echoes, Hask's pickaxe, Pip's lantern…) |
| Open lock | A gate you *can* pass now: the game's nudge to backtrack |
| Shard / note / page / kite | Collectibles (once revealed) |
| Iris's Eye | You are here |

**Fast travel**
- Unlocked at the **Ruins Shrine** (chapter 1), when Tamsin realises "the bells can carry *you* too, child".
- Works from **any Bell Shrine** to **any visited shrine** or **Lanternrest**: open the map at a shrine, pick a bell, confirm.
- Short transition: Iris rings the shrine bell, dissolves into cyan light, and reappears at the other shrine as the bell there answers.
- Fast travel is never available mid-room or during chase sequences.
- Every chapter has **3–4 shrines**, so no backtracking trip is longer than a couple of minutes.

**Custom markers:** the player can place up to 8 pins on the map (UP/DOWN/LEFT/RIGHT to move the cursor, JUMP to place, DASH to remove) to remember things like "come back with 2 echoes".

### 4.10 Exploration: branching paths & ability gates
**Branching routes.** Every chapter (except the finale) splits into **two routes** after its first shrine and joins again before the chapter's shard:
- one route leans on **platforming** (speed, precision, chases);
- the other leans on **puzzles** (echo planning, plates and doors).

Both get you to the end. Each hides **different collectibles, a different Lumi encounter angle and different NPC lines**, so the other route is worth a return trip via fast travel. The map shows both branches once Quill has revealed the outline.

**Ability gates.** Some passages can only be opened by an ability earned later. They are visible from the start (shown on the map with a lock) to tease the return trip.

| Gate | Looks like | Opened by | Earned in | Found in |
|---|---|---|---|---|
| Long gap | A gap too wide to jump, a dash flower missing | Dash | end of ch. 0 | ch. 0 |
| Dark passage | Pitch-black tunnel, eyes blinking inside | Pip's lantern (Shard of Light) | end of ch. 1 | ch. 0, 1 |
| Hanging switch | A switch over a bottomless pit | Rewind (leap of faith) | ch. 2 | ch. 0, 1 |
| Twin plates | Two pressure plates, one door | 2 echoes | ch. 3 | ch. 1, 2 |
| Cracked wall | Wall with glowing cracks | Hask's pickaxe (side quest) | ch. 2 → quest | ch. 0–3 |
| Echo seal | Violet seal with three sockets | 3 echoes | ch. 4 | ch. 1–3 (post-game shortcuts) |

Behind gates you'll find: Lost Pages, Resonant Notes, side-quest items, shortcuts between shrines and a few **"memory rooms"** (short silent lore scenes about the Tollers).

### 4.11 Side quests & backtracking
Side quests are given by NPCs, tracked in **PAUSE → JOURNAL** and marked on the map with a gold star. None is required for an ending except where noted.

| Quest | Given by | What you do | Requires | Reward |
|---|---|---|---|---|
| **Starbloom Tea** | Moss (after ch. 1) | Pick a Starbloom from the rose garden's roof (ch. 1, high route) and bring it back to the teahouse before it wilts (60 s timer, fast travel allowed) | Dash | A Lost Page + Moss & Bramble's best secret hint |
| **Hask's Lucky Pickaxe** | Hask (after ch. 2) | His pickaxe fell down the Well of Stars (ch. 0) during the Stilling. Climb down, then back up the well with echo steps | Rewind | Hask breaks every **cracked wall** in the valley (new paths in ch. 0–3) |
| **Ottoline's Missing Gears** | Ottoline (ch. 3) | Find 4 brass gears: one behind twin plates in ch. 1, one behind twin plates in ch. 2, one behind a cracked wall in ch. 0, one in the Clock Face (ch. 3) | 2 echoes, Hask's pickaxe | Ottoline restarts the **Spire lifts**: shortcuts between all ch. 3 shrines, and a music-box version of the soundtrack in Lanternrest |
| **Letters Never Sent** | A Lingering postman (ch. 1) | Three frozen echoes hold letters they never sent. Carry each letter to its recipient's echo in another chapter (ch. 0 ↔ ch. 2, ch. 1 ↔ ch. 3, ch. 2 ↔ ch. 0). When a letter arrives, both echoes move for one second | Fast travel | 3 Lost Pages, new Lingering thoughts, a short memory scene |
| **Pip's Shiny Collection** | Pip (ch. 1) | Pip wants 10 shiny things hidden in the corners of rooms (sparkle on screen) | — | Pip's nest in Lanternrest + Pip's hints get funnier |
| **Bramble's Rematch** | Bramble (after ch. 2) | Race Bramble's "champion", an echo of a racing snail, through a Vale course. Best ghost time to beat | Dash | Bramble admits defeat (a first). Lost Page |
| **Quill's Atlas** | Quill (ch. 0) | Ongoing: bring Lost Pages | — | Secret rooms on the map; at 30 pages, Quill's finished atlas and an epilogue scene |
| **Lumi's Moments** | — (discovered) | Find the 5 moments | Varies | **Required for the true ending** |

**Backtracking rhythm.** The game nudges the player back at three natural moments:
1. **After the dash (end of ch. 0):** Tamsin mentions "the old road had gaps you couldn't cross before".
2. **After the rewind (ch. 2):** Hask's quest sends you to the Well of Stars in ch. 0, through hanging-switch gates.
3. **After 2 echoes (ch. 3):** Ottoline's gears pull you back through twin-plate gates in ch. 1 and 2.

Each return trip is short (fast travel), and the old areas *change* slightly when you come back: more NPC lines, new Lingering thoughts and new Lumi's Moment angles.

### 4.12 Time fractures (zone variations)
The crack in Aurel did not break time evenly. In some places it **bent** instead of stopping: these are **time fractures**, bounded zones where the rules of movement change. They are the valley's "weather" and give each chapter its own flavour.

**Rules**
- A fracture is always **clearly bounded**: a shimmering outline, its own particles, a colour tint and a change in the music (filter or pitch), so the player knows *before* entering.
- Effects apply the moment Iris's hitbox enters and stop when she leaves (with a 0.1 s blend so the change never feels like a glitch).
- **Echoes keep the rules of the zone they were created in.** An echo frozen in low gravity stays floating; an echo created in a fast zone keeps vibrating.
- The rewind records which zone Iris was in. Rewinding *out of* a fracture is a valid technique.
- Fractures never stack: the latest one entered wins.

| Fracture | Effect | Look & sound | Main chapter | Puzzle idea |
|---|---|---|---|---|
| **Drift** (low gravity) | Gravity ×0.45, max fall ×0.6, jumps ~2× higher, longer airtime | Slow-falling dust motes, bluish tint, music low-passed and reverb up | 1 Starfall Ruins | Long floating jumps over the gorge, dash in the air to steer, echoes left mid-float become high platforms |
| **Weight** (heavy gravity) | Gravity ×1.6, jump ~60 %, but dash ×1.3 | Dust falls fast, darker tint, deeper bass | 2 Mirror Caves | Jumps can't reach, so dashes and echo steps must |
| **Haste** (fast time) | Everything in the zone (Iris, platforms, hazards) runs at 1.4× speed | Particles streak, music pitched up a semitone | 3 Clockwork Spire | Timed gates that are impossible outside the zone, possible inside |
| **Linger** (slow time) | Everything runs at 0.6× speed, *except* Iris's dash | Particles crawl, music slows and stretches | 3 Clockwork Spire | Slip between slowed pendulums and crushers |
| **Inversion** (upside-down gravity) | Gravity points up: Iris walks on ceilings, the camera rolls 180° smoothly | Stars fall upward, the music plays its melody backwards | 4 Belltower | Echoes left before entering stay "down", echoes left inside stay "up": two-sided puzzles |
| **Stutter** | Time skips: every 0.8 s the zone freezes for 0.2 s (Iris keeps moving, the world doesn't) | Flickering frames, a tape-stop sound on each skip | 2 Mirror Caves | Cross moving hazards during the freezes |
| **Undertow** | Time flows *backwards* inside: moving platforms rewind their path, falling rocks rise | Reversed particles, reversed cymbals | 4 Belltower | Ride a collapsing bridge that rebuilds itself backwards |
| **Echo storm** | Every 4 s the zone rewinds *everything except Iris* by 2 s | Cyan pulses, a heartbeat-like whoosh | 4 Belltower (finale) | Use the storm as a free extra "echo": what the world undoes, you keep |

**Chapter distribution:** ch. 0 has none (clean tutorial). Ch. 1 introduces **Drift** in its second half. Ch. 2 adds **Weight** and **Stutter**. Ch. 3 adds **Haste** and **Linger**. Ch. 4 adds **Inversion**, **Undertow** and the **Echo storm**, and remixes all of them. The post-game Echo Trials combine two fractures per room.

**Lore:** Ottoline studies fractures ("they're like the valley's clock skipping teeth"), and Pip loves Drift zones because "FLOATING IS JUST FLYING FOR PEOPLE WITHOUT WINGS!".

---

## 5. Chapters, room by room

> Rooms are single screens (320×180) or short scrolling corridors. **★** = optional room with a collectible. **?** = Pip hint available.

### Prologue: The Eleventh Toll
**A playable memory, 1 room.** The night of the Stilling, a hundred years ago. A Toller in a long robe (Corin, unnamed for now) climbs the belltower stairs in the rain. The player controls him: slow, no jump, only walking. At the top, the Bell is ringing its eleventh toll. A child's paper kite is tied to the railing. He lifts a heavy hammer. **Cut to white.** A crack sound. Silence. Title card: **ECHO**.

### Chapter 0: The Quiet Vale
**Music:** *First Steps* ✅ · **Teaches:** run, jump, double jump · **Shard:** Shard of Motion (unlocks dash)

Iris wakes up in Lanternrest on her "birthday", the day Tamsin decided she is old enough to climb. The Quiet Vale is mossy ruined farmland under the stars: soft, safe, beautiful.

**Built (v1 blockout ✅, `assets/levels/chapter0.world`, generated by `tools/build_chapter0.py`):**

| # | Room | Content |
|---|---|---|
| 0-1 | Lanternrest | Hub: Tamsin, Moss & Bramble, the first Bell Shrine. Secret: a Lost Page on the high branch |
| 0-2 | The Old Road | Running, first jumps over shallow ditches (harmless), steps up. Two Lingering villagers |
| 0-3 | Fence Steps | Variable jump: a low roof (tap = small hop) then a 2-tile ledge (hold) |
| 0-4 | The Orchard | The double jump: a 4-tile wall, a 5-tile gap between plateaus (falling = lower ground, try again). Lost Page in an apple tree. The well in the ground leads down |
| 0-5 | Well of Stars ★ | Optional room below the orchard: **Resonant Note I** and a crystal. Back up: double jumps on planks, then wall jumps up the shaft |
| 0-6 | The Broken Mill | Planks up to **Quill**, drop-through to come down, then the **wall-jump chimney** (the only way up). Lost Page on the upper floor |
| 0-7 | Lumi's Field | The hill and **Lumi's Moment 1**. The first gap over the void. Dash gate: a floating island with a Lost Page |
| 0-8 | Spike Hollow | First spikes, first Echo Crystals, steps down over spike pits. Rewind gate: a hanging plate over a pit opens a hidden alcove (Lost Page) |
| 0-9 | The Vale Shrine | Bell Shrine. The road forks: up = Orchard Way, down through the floor = the Millrace |
| 0-9a | Orchard Way | Platforming route: treetop planks over the void. Lost Page |
| 0-9b | The Millrace | Puzzle route: drop through the right planks, crawl under a wall, climb back up, cross over. Lost Page |
| 0-10 | Shard of Motion | Both routes meet above a pit too wide to cross: grab the **Shard of Motion** mid-jump, it unlocks the **dash**, dash across. End of the chapter for now |

Every required exit and collectible was checked with a reachability solver using the game's real physics (and the gates checked as *not* reachable without their ability).

**Routes:** after the Vale Shrine (0-9) the road forks.
- **The Orchard Way** (platforming): treetops and swinging lantern ropes. Hides a Lost Page and a shiny thing.
- **The Millrace** (puzzle): drop-through platforms and a water wheel you stop by standing on its paddles. Hides a Lost Page and a view of Lumi's field from above.

**Come back later:** a long gap behind the mill (dash), the dark bottom of the Well of Stars (Pip's lantern, Hask's pickaxe), a hanging switch over the old quarry (rewind), a cracked wall in the old mill's cellar (pickaxe: Ottoline's gear).

**Ending beat:** as Iris lifts the shard, a violet fog seeps from the cliffs above. A tall silhouette watches her from the ridge (the Stillwarden, first sighting), then disappears.

### Chapter 1: Starfall Ruins
**Music:** *Broken Bridges* · **Teaches:** dash, crumble stone, dash flowers, wind vents · **Shard:** Shard of Light (Pip's lantern, unlocks dark rooms)

The ruins of the Tollers' old town, built on stone bridges over a bottomless gorge. Stars seem close enough to touch. Fallen bell towers lie across the gaps.

| # | Room | Content |
|---|---|---|
| 1-1 | Gorge Gate | Dash across the first wide gap |
| 1-2 | Meeting Pip | Pip is stuck in a cobweb, freed by dashing through it. Pip joins |
| 1-3 | Crumbling Walk ? | Crumble stone: keep moving |
| 1-4 | The Rose Garden ? | Dash flowers: chain dash, flower, dash |
| 1-5 | Updraft Square | Wind vents with a dash out of the updraft |
| 1-6 | Library Ruins ★ | Optional dark room lit by Pip. **3 Lost Pages** + **Resonant Note II** |
| 1-7 | Quill's Perch | Quill on top of a broken spire, shows the map |
| 1-8 | The Lantern Market | Echo villagers mid-shopping. **Lumi's Moment 2:** Lumi tugging a stranger's sleeve, asking where her father is |
| 1-9 | The Long Bridge | Scrolling chase: the bridge collapses behind Iris (crumble cascade) |
| 1-10 | Ruins Shrine | Bell Shrine. Tamsin tells the story of the Tollers |
| 1-11 | Shard of Light | Mini gauntlet using everything, then the shard |

**Routes:** after the Ruins Shrine (1-10).
- **The High Road** (platforming): rooftops, wind vents, the rose garden roof (Starbloom Tea quest).
- **The Low Road** (puzzle): under the bridges, crumble-stone puzzles, the Lingering postman (Letters Never Sent).

**Come back later:** twin plates in the Bell Foundry (2 echoes: Ottoline's gear), a hanging switch over the gorge (rewind: a Resonant Note shortcut), an echo seal on the Archive door (3 echoes: post-game shortcut).

**Ending beat:** the Stillwarden blocks the way up and speaks for the first time ("Go home, little bell."). He seals the bridge with Stillness. Iris falls into the gorge… and lands in the caves below.

### Chapter 2: The Mirror Caves
**Music:** *Glass Underneath* · **Teaches:** **REWIND & ECHOES** (1 slot), mirror pools, pressure plates, doors · **Shard:** Shard of Memory (second echo slot comes from Ottoline later)

Crystal caves under the gorge, cyan reflections everywhere, deep pits, underground lakes as still as glass. The Eye reacts to the crystals and **awakens**.

| # | Room | Content |
|---|---|---|
| 2-1 | The Fall | Iris wakes in the dark. The Eye glows by itself |
| 2-2 | The Eye Awakens | A ledge too far: she falls, and the Eye **pulls her back** (scripted first rewind). Prompt: "REWIND: R" |
| 2-3 | First Echo ? | Rewind mid-air, use the echo as a platform (echo step) |
| 2-4 | The Plate ? | First pressure plate + door: echo weight |
| 2-5 | Leap of Faith ? | A switch hanging over the void: jump, hit it, rewind before dying |
| 2-6 | Hask's Tunnel | **Hask** behind a collapsed wall. Talk through the rocks |
| 2-7 | Mirror Lake ? | Mirror pools: the echo appears across the water |
| 2-8 | The Cart Scale ? | Free Hask: balance an old mine-cart scale with echoes (two plates, one echo, a timed run) |
| 2-9 | Waterfall Secret ★ | Hidden behind the waterfall (Moss & Bramble's hint). **Resonant Note III** |
| 2-10 | Crystal Hollow | **Lumi's Moment 3:** Lumi hiding in a crystal alcove, counting for hide-and-seek, alone |
| 2-11 | Cave Shrine | Bell Shrine. Tamsin, shaken, admits she knows the Stillwarden |
| 2-12 | Shard of Memory | Puzzle using every technique of the chapter |

**Routes:** after the Cave Shrine (2-11).
- **The Flooded Tunnels** (platforming): rising and falling water, a race against the current.
- **The Crystal Galleries** (puzzle): mirror pools in chains, light beams bounced off echoes.

**Come back later:** twin plates at the mine office (2 echoes: Ottoline's gear), cracked walls in the lower mines (pickaxe: Hask's old stash, a Resonant Note shortcut).

**Ending beat:** Hask opens the old mine elevator to Clockwork Spire and a shortcut back to Lanternrest.

### Chapter 3: Clockwork Spire
**Music:** *Tick of the Spire* · **Teaches:** 2 echo slots, timed gates, cog platforms, levers, **Stillness fog** · **Shard:** Shard of Hours (the map now shows what's left to find in each room)

A giant tower of brass gears and stopped clocks clinging to the cliff. Everything is amber, steam leaks from pipes, and pendulums hang motionless.

| # | Room | Content |
|---|---|---|
| 3-1 | The Lift | Arrival by Hask's elevator |
| 3-2 | Ottoline's Workshop | **Ottoline** tunes the mask: **second echo slot** |
| 3-3 | Two Hands ? | Two plates at once, two echoes |
| 3-4 | The Pendulum Hall ? | Timed gates: plate, sprint, dash, before the gate closes |
| 3-5 | Cog Rails ? | Cog platforms moving only while a plate is held: leave an echo on the plate and ride |
| 3-6 | Fog Vents | **Stillness fog** introduced: get through before the frost fills |
| 3-7 | Echo Shield ? | Echoes block fog streams: build a safe corridor |
| 3-8 | The Clock Face ★ | Climb the outside of the giant clock face. **Resonant Note IV** |
| 3-9 | Archive of Hours | **Lost Pages:** Corin's journal (the truth starts to show). **Lumi's Moment 4:** Lumi asleep at her father's desk, the kite on her lap |
| 3-10 | The Escapement | Stillwarden chase: fog rising from below, climb fast with echo ladders |
| 3-11 | Spire Shrine | Bell Shrine. Tamsin tells the whole truth about Corin and Lumi |
| 3-12 | Shard of Hours | Ottoline restarts one clock: the first time anything has ticked in a hundred years |

**Routes:** after the Spire Shrine (3-11).
- **Inside the Gears** (puzzle): cog platforms and timed gates in the clock's heart.
- **Outside the Clock Face** (platforming): wind, the giant hands as moving platforms, the Clock Face ★ room.

**Come back later:** echo seals on the Archive vault (3 echoes: Corin's last journal pages, post-game).

**Ending beat:** for one second, the stars move. Everyone in the valley sees it.

### Chapter 4: The Belltower
**Music:** *Aurel* · **Teaches:** 3 echo slots, bell chimes, phase steps, Stillwarden's seals · **Shard:** the Heartshard (Iris's own Eye)

The tower from the prologue, frozen in the rain of a hundred years ago: raindrops hang in the air like glass beads (they're solid platforms!). The Stillness is everywhere.

| # | Room | Content |
|---|---|---|
| 4-1 | Rain That Stopped | Frozen raindrops as tiny platforms |
| 4-2 | Third Voice | The Bell Shards resonate: **third echo slot** |
| 4-3 | First Chime ? | Bell chimes: echoes go intangible for 3 s |
| 4-4 | Phase Step ? | Echo wall, chime, pass through, it becomes solid again behind you as a floor |
| 4-5 | The Seal ? | Stillwarden's seal: open it by having all 3 echoes out at once |
| 4-6 | Stairs of the Eleventh | The prologue's staircase, now the player climbs it with full powers |
| 4-7 | Toller's Rest ★ | Hardest optional room of the main game. **Resonant Note V** |
| 4-8 | The Kite | **Lumi's Moment 5:** Lumi's kite tied to the railing, Lumi reaching for it, exactly the image from the prologue |
| 4-9 | Last Shrine | Final save. Tamsin: "Whatever you choose, child, choose it yourself." |
| 4-10 | The Stillwarden | Final sequence (see below) |
| 4-11 | Aurel | The cracked Bell. The choice |

**Final sequence, "The Stillwarden":** a non-combat finale in three phases.
1. **The Chase:** a vertical climb while Corin floods the tower with fog from below.
2. **The Argument:** a slow walk across the bell chamber while Corin talks. Each line of his makes the floor crumble behind you, so you have to keep moving.
3. **The Mirror:** Corin uses the Stillness to freeze Iris's own echoes and turn them against her as moving walls. The only way through is to rewind *into* them and reclaim them, one by one.

At the end, Corin falls to his knees beside the Bell. He doesn't fight anymore.

**Routes:** the Belltower has two ascents that meet at the Last Shrine. **The Rain Stairs** go up the outside on frozen raindrops (platforming); **the Rope Lift** goes up the inside by balancing counterweights with echoes (puzzle). After the Last Shrine, the finale is linear on purpose.

### World connections

```
                         ┌───────────── THE BELLTOWER (4) ─────────────┐
                         │  Rain Stairs ──┐        ┌── Rope Lift       │
                         │                └─ Last Shrine ─ Finale      │
                         └────────────────────────▲────────────────────┘
                                                  │
     ┌───────────── CLOCKWORK SPIRE (3) ──────────┴─────────────┐
     │  Inside the Gears ──┐            ┌── Outside the Clock   │◄── Spire lifts (Ottoline's quest)
     │                     └─ Shard of Hours                    │
     └───────────────▲──────────────────────────────────────────┘
                     │ Hask's elevator
     ┌───────────── MIRROR CAVES (2) ────────────────────────────┐
     │  Flooded Tunnels ──┐            ┌── Crystal Galleries     │
     │                    └─ Shard of Memory                     │◄── mine shortcut to Lanternrest
     └───────────────▲───────────────────────────────────────────┘
                     │ the fall from the bridge
     ┌───────────── STARFALL RUINS (1) ──────────────────────────┐
     │  High Road ──┐                  ┌── Low Road              │
     │              └─ Shard of Light                            │
     └───────────────▲───────────────────────────────────────────┘
                     │
     ┌───────────── THE QUIET VALE (0) ──────────────────────────┐
     │  Orchard Way ──┐                ┌── Millrace              │
     │                └─ Shard of Motion                         │
     └───────────────▲───────────────────────────────────────────┘
                     │
                LANTERNREST (hub) ◄── fast travel from every Bell Shrine
```

---

## 6. Dialogue script

> Format: **SPEAKER:** line. `[stage directions]`. Choices are listed as `> CHOICE`. Every line is shown in uppercase in-game.

### 6.1 Chapter 0: Waking up

`[Lanternrest. Iris sleeps in a hammock under a lantern. Tamsin taps her with her lantern pole.]`

**TAMSIN:** Up, up. Stars are out.
**TAMSIN:** …Stars are always out. Up anyway.
`[Iris sits up, the Eye flickers on.]`
**TAMSIN:** Today you are old enough to climb. I said so a hundred times. Today I mean it.
**TAMSIN:** See that tower? Top of the valley. That's Aurel. The Great Bell.
**TAMSIN:** It's broken, child. Has been since before you. Since before *me*, almost.
**TAMSIN:** That eye of yours is a piece of it. It wants to go home.
> NOD
> TILT HEAD

**TAMSIN** (nod): Good. Stubborn like me.
**TAMSIN** (tilt): Don't look at me like that. I don't know everything. Just most things.
**TAMSIN:** Go east. Jump when the road ends. Jump again in the air if your legs are brave.
**TAMSIN:** And come back for tea. Moss worries.

**Repeat:** "EAST, CHILD. THE TOWER WON'T CLIMB ITSELF."

### 6.2 Moss & Bramble (teahouse, rotating lines)
**After chapter 0**
**BRAMBLE:** You're going up there? With *those* legs?
**MOSS:** …Bramble. Be… nice.
**BRAMBLE:** I AM nice. I'm being nicely realistic.
**MOSS:** Take… a biscuit… little one.

**After chapter 1**
**BRAMBLE:** A MOTH? You brought a moth into a TEAHOUSE?
**PIP:** HI! IS THAT A LAMP? CAN I SIT ON IT?
**BRAMBLE:** THAT IS MY HEAD.

**After chapter 2** *(secret hint)*
**MOSS:** Hask says… there's a light… behind the… waterfall.
**BRAMBLE:** Hask says a lot of things. Hask says rocks have feelings.
**MOSS:** …They might.

**After chapter 3**
**BRAMBLE:** Did you see it? The stars. They MOVED.
**MOSS:** I spilled… my tea. First time… in a hundred years… the tea… got cold.
**MOSS:** It was… wonderful.

### 6.3 Pip (chapter 1, meeting)
`[Pip is tangled in a glowing web. Iris dashes through it.]`
**PIP:** FREE! FREE FREE FREE! THANK YOU, LAMP PERSON!
**PIP:** OH. OH WOW. YOUR EYE. IT'S THE SHINIEST THING I'VE EVER SEEN.
**PIP:** CAN I COME? I'LL BE USEFUL! I'M VERY GOOD AT LOOKING AT THINGS!
`[Pip tries to land on the Eye. Iris leans back.]`
**PIP:** OKAY, NOT THERE. NOTED. NEARBY. I'LL BE NEARBY.
**SYSTEM:** PIP JOINED YOU. TALK TO PIP WHEN YOU'RE STUCK.

**Example hints, room 2-5 "Leap of Faith"**
- **PIP (1):** THAT SWITCH IS HANGING OVER NOTHING. BRAVE SWITCH.
- **PIP (2):** FALLING IS ONLY BAD IF YOU STAY FALLEN. YOUR EYE CAN UN-FALL YOU!
- **PIP (3):** JUMP INTO THE PIT, HIT THE SWITCH, THEN REWIND BEFORE YOU DROP AWAY. THE SWITCH REMEMBERS!

### 6.4 Quill (one per chapter)
**First meeting (0-6)**
**QUILL:** Ah! Careful! You nearly stepped on the vale. I mean, my map OF the vale.
**QUILL:** Quill. Cartographer. Former Royal Assistant Sub-Cartographer, technically.
**QUILL:** I'm mapping everything. For when the sun comes back. People will want to know where things are.
> WILL IT COME BACK?
> SHOW ME THE MAP

**QUILL** (back): …Of course it will. Probably. Maps don't care either way. That's what I like about them.
**QUILL** (map): Here. Everything I've drawn so far. If you find any loose pages lying about, bring them. Paper is precious.
**SYSTEM:** MAP UPDATED.

**Chapter 3, the Archive**
**QUILL:** These journals… they're Corin Vael's. The Head Toller.
**QUILL:** "She asked me if the morning would be bright. I couldn't tell her she wouldn't see it."
**QUILL:** …I don't think I want to map this room.

### 6.5 Hask (chapter 2)
**Through the rocks (2-6)**
**HASK:** HELLO? IS SOMEONE THERE? IS IT A ROCK? PLEASE DON'T BE A ROCK.
**HASK:** Oh, a little lamp! Hello, little lamp!
**HASK:** I've been stuck here since the bell went quiet. Lovely tunnel. Terrible exit.
**HASK:** There's an old cart scale up ahead. Two plates. You need weight on both. You've only got one of you, mind…
**HASK:** …unless you've got another trick in that lamp of yours?

**Freed (2-8)**
**HASK:** FREE! Oh, the air! It's exactly the same air! But it's FREE air!
**HASK:** I owe you, little lamp. I'll get the old elevator running. Straight up to the Spire, and back home too.

### 6.6 Ottoline (chapter 3)
**OTTOLINE:** Don't touch that. Or that. Actually, touch nothing. Hi! Ottoline. Clockwright.
**OTTOLINE:** I'm restarting the clocks. All of them. By hand. It's going great. It's going terribly.
**OTTOLINE:** Wait. Hold still. Your mask. That's a resonance housing! Who carved this, a Toller?
**OTTOLINE:** It's tuned to hold one moment. ONE. That's like a clock with one tooth.
**OTTOLINE:** Hold still. This might tickle your soul a little.
`[Clank. Sparkle. The Eye pulses twice.]`
**SYSTEM:** YOU CAN NOW HOLD 2 ECHOES.
**OTTOLINE:** Ha! Two! Imagine what I could do with a screwdriver that isn't bent.

**Shard of Hours (3-12)**
**OTTOLINE:** Okay. Okay okay okay. If the shard is in place, then this lever should…
`[A single clock ticks. Then another. Above, the stars shift for one second.]`
**OTTOLINE:** …It moved. The sky MOVED.
**OTTOLINE:** I thought time was a machine. You fix the gears and it runs.
**OTTOLINE:** But it only moved because you carried that up here. That's not a gear. That's a choice.

### 6.7 Tamsin through the Bell Shrines
**Vale Shrine (0-9):**
**TAMSIN:** Can you hear me? Good. The bells carry my voice. They were made to carry things.
**TAMSIN:** Rest here when you're tired. The shrine will remember you, even when you fall.

**Ruins Shrine (1-10):**
**TAMSIN:** The Tollers lived where you're standing. We rang the hours. Sowing, harvest, lamps.
**TAMSIN:** People forget a bell isn't for noise. It's for *agreeing*. Everyone hears it, everyone moves on, together.

**Cave Shrine (2-11):**
**TAMSIN:** The tall one in the fog. You've seen him.
**TAMSIN:** …I know him. I knew him. Don't ask me more yet, child. I'm old and I'm a coward.

**Spire Shrine (3-11), the truth:**
**TAMSIN:** His name is Corin Vael. He was our Head Toller. My friend.
**TAMSIN:** His girl, Lumi, was sick. The healer said she'd be gone by morning.
**TAMSIN:** So on the eleventh toll, he took the great hammer, and he made sure morning never came.
**TAMSIN:** She didn't die. She didn't live either. She's still in that evening. So are all of us.
**TAMSIN:** I was on the stairs. I saw him lift the hammer. I didn't stop him.
**TAMSIN:** I've been sorry for a hundred years. It doesn't make the sun come up.

**Last Shrine (4-9):**
**TAMSIN:** Whatever you find up there, whatever you choose…
**TAMSIN:** …choose it yourself. Not for me. Not for the valley. For you.

### 6.8 Lumi's Moments (silent scenes, one line each)
| # | Where | Scene | Line |
|---|---|---|---|
| 1 | Lumi's Field (0-7) | Flying her kite, laughing, spinning | "LOOK, PAPA! IT'S TOUCHING THE STARS!" |
| 2 | Lantern Market (1-8) | Tugging a stranger's sleeve | "HAVE YOU SEEN MY PAPA? HE RINGS THE BELL." |
| 3 | Crystal Hollow (2-10) | Counting with her eyes closed, alone | "…NINE, TEN! READY OR NOT!" `[nobody comes]` |
| 4 | Archive of Hours (3-9) | Asleep at her father's desk | "IS THE MORNING GOING TO BE BRIGHT?" |
| 5 | The Kite (4-8) | Reaching for her kite on the railing | "PAPA, I'M NOT SCARED. YOU CAN RING IT." |

Moment 5 reframes everything: Lumi *knew*, and she *wanted* him to ring the twelfth toll.

### 6.9 The Stillwarden
**First words (end of chapter 1):**
**STILLWARDEN:** Go home, little bell.
**STILLWARDEN:** Nothing up here needs fixing.
`[The bridge freezes in violet light and shatters.]`

**The Escapement (chapter 3), floating text during the chase:**
- "THE CLOCKS ARE QUIET. LET THEM SLEEP."
- "EVERY STEP YOU TAKE, SHE GETS CLOSER TO MORNING."
- "PLEASE."

**The Argument (chapter 4), one line per crumbling floor section:**
**STILLWARDEN:** Do you know what's at the end of that toll?
**STILLWARDEN:** Morning. And in the morning, she's gone.
**STILLWARDEN:** A hundred years of one evening. Every night her kite, every night her laugh.
**STILLWARDEN:** You'd take that from me? For what? For *sunlight*?
**STILLWARDEN:** You don't even know what she sounds like.
`[Iris's Eye flares. All five Lumi's Moments play back as echoes around them, if collected.]`
**STILLWARDEN** (if all 5 moments): …She asked me to ring it. She said she wasn't scared.
**STILLWARDEN** (if all 5 moments): I was. I was the one who was scared.

---

## 7. Endings & post-game

At the Bell, Iris places the Heartshard (her own Eye) into the crack. The game asks: **RING THE BELL** or **LEAVE IT SILENT**.

### 7.1 Ending A, "Morning" (ring the Bell)
The twelfth toll rings for the first time in a hundred years. The sky turns from night to **dawn**: the palette shifts to rose, gold and blue. Every echo in the valley, the Lingering and Lumi included, fades into light. Corin weeps. Iris, now without her Eye (her mask is dark), walks down the tower in the sunrise. In Lanternrest, Tamsin waits with tea. Bittersweet.

### 7.2 Ending B, "The Long Night" (leave it silent)
Iris takes back the Heartshard and walks away. Corin bows his head, grateful. The valley stays in its endless, beautiful night. Lumi keeps flying her kite. Back in Lanternrest, Tamsin says nothing, pours tea, and the stars stay still. A quiet, melancholic ending, and not "wrong". The credits roll over the unmoving sky.

### 7.3 True ending, "Resonance" (requires the 7 Resonant Notes + the 5 Lumi's Moments)
A third option appears: **RETUNE THE BELL**. The seven notes play as a melody (the main theme, finally complete) and the Bell is mended instead of rung. The twelfth toll rings *softly*. Time flows again, and the echoes do not vanish: they become **memories**, visible only at night as faint lights. Lumi gets one last moment, real this time: she turns to her father and hugs him, says "GOOD MORNING, PAPA," and fades into a single cyan light that floats up into the dawn. Iris keeps a dimmer, softer Eye. Final shot: Lanternrest at sunrise, every NPC outside, Pip finally sitting on Iris's mask.

### 7.4 Post-game
- **Echo Trials:** 10 remixed, very hard rooms (one per chapter + 5 finales), unlocked after any ending. 2 hidden Resonant Notes (VI and VII).
- **Chapter select** with best time and deaths per chapter.
- **Dawn mode:** replay any chapter in the new daylight palette after ending A or the true ending.

### 7.5 Easter eggs
Hard-to-find secrets, never mentioned by any NPC or hint. None is needed for 100 %, but each unlocks a small reward listed in **EXTRAS** (main menu) once found.

| # | Name | How to find it | Reward |
|---|---|---|---|
| 1 | **The Thirteenth Toll** | On the main menu, click the moon exactly 12 times, then wait without touching anything until the music loops once | A thirteenth bell tolls, the logo reads **OHCE** for one loop, and the menu music plays backwards. Unlocks the "Backwards" music option |
| 2 | **Bell Motif** | In the Belltower, hit four bell chimes in the order of the Bell motif (E–C–D–E: low, lowest, middle, low), within 6 seconds, without touching the ground | The chimes play a full chord, and a hidden room opens behind the bells with a music box. Unlocks the **Music Box** soundtrack |
| 3 | **Finally** | In Lanternrest, stand perfectly still for 2 real minutes with Pip nearby (no input at all) | Pip finally lands on the Eye. Achievement **FINALLY**. Pip sits there in every cutscene from then on |
| 4 | **The First Fall** | The game silently remembers where you died for the very first time | In the true ending's final shot, a faint echo of Iris stands exactly at that spot and waves |
| 5 | **Reflection** | In Mirror Lake (2-7), stand still on the shore facing the water for 60 seconds | Iris's reflection waves at her, takes off its mask (we never see its face, only light) and walks out of frame. A Lost Page appears on the shore |
| 6 | **One More Bug** | In the Lantern Market (1-8), dash *through* the market stall roof from below while holding down (only possible with a precise down-diagonal dash into a corner) | A secret back room with a Lingering figure frozen at a desk, typing. Thought: "ONE MORE BUG BEFORE THE TWELFTH TOLL." A sign reads "FLOWZ WAS HERE" |
| 7 | **Moss's Sentence** | Talk to Moss 50 times across the game (the counter is never shown) | Moss finally finishes the sentence he has been starting since chapter 0: "…and that is why… tea… should always… be shared." Bramble is speechless |
| 8 | **Kite String** | After the true ending, return to Lumi's Field (0-7) and double jump off the kite's echo at the top of the screen, three times in a row without landing | You climb above the map into a hidden sky room: the kite is real now. Iris holds it for a moment. The game's last unseen line: "THANK YOU." |
| 9 | **Golden Scarf** | Finish any chapter without dying | That chapter's scarf turns gold in chapter select. All 5 chapters: a golden scarf you can wear anywhere |
| 10 | **Twelve Seconds** | In the prologue, wait in front of the hammer for 12 real seconds before lifting it | Corin hums the first notes of Lumi's lullaby. Only noticeable with sound on. Unlocks a hidden extra Lost Page in the Archive |

**Design rules for easter eggs:** never block progress, never punish experimenting, and always reward with something *small and charming* rather than power.

---

## 8. Audio

All music is original chiptune composed in code (`src/audio/tracks.ts`) and played by a small Web Audio sequencer ✅. The lead melody always goes through a feedback **delay**, the "echo" signature of the soundtrack.

| Track | Where | Mood | Status |
|---|---|---|---|
| *Starlit Vale* | Main menu | Slow, starry, melancholic (84 BPM, A minor) | ✅ |
| *First Steps* | Chapter 0 / test room | Hopeful, made for running (132 BPM, D minor) | ✅ |
| *Lanternrest* | Hub | Warm, cosy, music-box arpeggios | planned |
| *Broken Bridges* | Chapter 1 | Driving, wind-swept | planned |
| *Glass Underneath* | Chapter 2 | Sparse, reverberant, crystal bells | planned |
| *Tick of the Spire* | Chapter 3 | Mechanical, syncopated, ticking hi-hat | planned |
| *Aurel* | Chapter 4 | Grand, choir-like pads, slowly building | planned |
| *The Stillwarden* | Final chase | Fast, minor, relentless | planned |
| *Morning* | Endings / credits | The main theme, complete at last | planned |

**Music rules:** each chapter's theme hides the 4-note **"Bell motif"** (E–C–D–E, from *Starlit Vale*). The motif is never resolved until the true ending.

**Sound effects** (synthesized) ✅ jump, double jump, dash, land, death, respawn, menu move/select/back/toggle, pause. **Planned:** rewind (reversed whoosh), echo appear (glass chime), echo shatter, crystal checkpoint, shrine bell, plate click, door rumble, crumble, dash flower, fog frost, Pip giggle, voice blips per NPC.

**Mixing:** music ducks under dialogue and in the pause menu ✅.

---

## 9. Art direction

### Technical rules
- Internal resolution **320 × 180**, scaled by whole numbers only (×4 = 1280×720, ×6 = 1920×1080) ✅.
- Tiles **16 × 16**. Player **16 × 16** frame (character ≈ 10 × 15 px, hitbox 8 × 12).
- No smoothing (`imageSmoothingEnabled = false`), camera snapped to whole pixels ✅.
- 1 px dark outline (`Void #0d0b1e`) around characters, echoes, props and interactables.

### Palette, "Echo" (26 colours)
Files: `palette/echo.hex` (Lospec), `palette/echo.gpl` (Pixelorama / Aseprite / GIMP), `palette/palette.png`.

| Key | Hex | Name | Usage |
|---|---|---|---|
| K | `#0d0b1e` | Void | outlines, darkest shadow |
| 1 | `#161433` | Night 1 | deep sky, panel fill |
| 2 | `#1f1d4a` | Night 2 | terrain base |
| 3 | `#2b2a63` | Night 3 | cloak, mountains |
| 4 | `#3c3b80` | Night 4 | cloak highlight, horizon |
| v | `#4e3a7a` | Dusk violet | horizon glow, **Stillness** |
| V | `#6b4c9a` | Lilac | accents, **Stillness** highlight |
| p | `#9c5a9c` | Mauve | scarf shadow |
| P | `#d8749b` | Rose | scarf, dash flowers |
| q | `#f2a3a3` | Blush | scarf highlight |
| W | `#f4f1e8` | Bone | mask, text, stars, moon |
| g | `#8a8aa8` | Ash | mask shadow, metal, inactive |
| G | `#5a5a7a` | Slate | metal shadow, inactive |
| c | `#1b6f8a` | Echo deep | echo outline, eye pupil |
| C | `#2bb5c9` | Echo | echoes, rewind, the Eye |
| e | `#6ff2f2` | Echo light | echo fill, glow |
| E | `#d4ffff` | Echo flash | eye glint, flashes |
| a | `#8a4b1f` | Amber deep | interactable shadow |
| A | `#d9822b` | Amber | plates, doors, levers |
| y | `#ffc24d` | Gold | interactable highlight, Pip |
| Y | `#fff0a8` | Pale gold | interactable glint |
| r | `#8f2340` | Danger deep | hazard shadow |
| R | `#d9415e` | Danger | hazards |
| m | `#1f4a4a` | Moss deep | moss shadow |
| M | `#2f7a6a` | Moss | moss, grass |
| n | `#5fb08a` | Moss light | grass tips |

**Colour language (never break it):**
- **Cyan = time.** Only the Eye, echoes, rewind effects, checkpoints, mirror pools and Lumi.
- **Amber = interactable.** Anything the player can change.
- **Red = danger.** Hazards only.
- **Violet = the Stillness.** The Stillwarden, his fog and seals.
- Everything else lives in the night blues. The **dawn palette** (endings, Dawn mode) swaps the night ramp for rose, gold and pale blue.

### Chapter palettes (accent over the night base)
| Chapter | Accent | Signature props |
|---|---|---|
| 0 Quiet Vale | moss greens | fences, frozen apple trees, the mill |
| 1 Starfall Ruins | lilac + bone | broken bridges, fallen bells, lanterns |
| 2 Mirror Caves | cyan + deep blue | crystals, still lakes, mine carts |
| 3 Clockwork Spire | amber + slate | gears, pendulums, steam pipes |
| 4 Belltower | violet + bone | frozen rain, ropes, the cracked Bell |

---

## 10. Sprites

Placeholders are generated by `tools/gen_sprites.py` (`npm run sprites`). Replace any PNG with hand-drawn art as long as you keep the same size and layout. Full metadata lives in `sprites.json`.

### Done ✅
| File | Size | Content |
|---|---|---|
| `sprites/player.png` | 9 × 3 frames of 16×16 | Columns: idle (2), run (4), jump, fall, dash. Rows: `normal`, `spent` (grey scarf), `power` (bright Eye) |
| `sprites/echo.png` | 9 frames of 16×16 | Echo version of every player frame |
| `sprites/tiles.png` | 16 tiles of 16×16 | Autotile: index = top·1 + right·2 + bottom·4 + left·8 (bit = side exposed to air) |
| `sprites/props.png` | 6 × 16×16 | spikes, button_up, button_down, checkpoint_off, checkpoint_on, platform |
| `sprites/door.png` | 2 × 16×32 | closed, open |
| `ui/ui.png` | atlas | panels (9-slice), cursor, sliders, toggles |
| `ui/font.png` | 5×7 glyphs | Uppercase bitmap font |
| `ui/title.png` | logo | "ECHO" with trailing echoes and the Eye in the O |
| `backgrounds/*.png` | 320 wide | sky, mountains (parallax 0.15), hills (parallax 0.35) |

### To do
| Sprite | Size | Frames |
|---|---|---|
| Iris extra | 16×16 | land squash, rewind pose, talk, sit, death burst |
| Rewind FX | 32×32 | ripple ring (6), echo spawn (4), echo shatter (5) |
| Pip | 12×12 | fly loop (4), excited (2), sit (1) |
| Tamsin, Quill, Moss, Bramble, Hask, Ottoline | 16×24 | idle (2), talk (2) |
| Lumi (echo) | 16×16 | one pose per moment (5) |
| Stillwarden | 24×32 | idle (2), float (4), raise hand (3) |
| NPC portraits | 32×32 | neutral, happy, sad per NPC |
| Lingering villagers | 16×24 | 8 frozen poses |
| Interactables | 16×16 | lever (2), crumble stone (4), dash flower (3), wind vent (3), timed gate (2), cog platform, bell chime (3), mirror pool rim, Bell Shrine (16×32) |
| Collectibles | 12×12 | Bell shard (4 shine), Resonant Note (4), Lost Page (2) |
| Tilesets | 16×16 | one autotile set per chapter |
| Backgrounds | 320×180 | per chapter: far, mid, near layers + dawn variants |

---

## 11. Menus, HUD & UI text

All in-game text is **English** and **uppercase** (bitmap font).

### Main menu ✅
Background: parallax night sky, Iris running and leaving echoes behind her. Title logo bobbing.
```
ECHO
  > PLAY
    SETTINGS
    CREDITS
V0.1                     SPACE TO SELECT
```
Planned: `CONTINUE` (when a save exists), `CHAPTER SELECT` (after chapter 0).

### Settings ✅
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
Planned: `ASSIST >`, `PIP HINTS [ON]`, `LANGUAGE` (later).

### Controls ✅
```
CONTROLS
  UP / DOWN / LEFT / RIGHT     W S A D (shown as Z S Q D on AZERTY)
  JUMP                         SPACE
  DASH                         L-SHIFT
  REWIND                       R
  PAUSE                        ESC
  RESET TO DEFAULT
  BACK
PRESS A KEY...      (while rebinding)
```

### Pause ✅
```
PAUSED
  > RESUME
    MAP          (planned)
    JOURNAL      (planned: side quests, collectibles, Lost Pages)
    RESTART ROOM
    SETTINGS
    MAIN MENU
```

### HUD (minimal by design)
- No permanent HUD. The scarf and the Eye carry the information.
- **Echo slots:** small cyan diamonds top-left, shown for 2 s after each rewind or when an echo shatters.
- **Collectible picked up:** icon + count slides in top-right for 2 s.
- **Room name:** fades in at the bottom-left when entering a new room ("2-5  LEAP OF FAITH").

### Dialogue box
Bottom panel, 32×32 portrait left, name in the NPC's colour, typewriter text, small bouncing arrow when the line is complete.

### Chapter screens
- **Start:** "CHAPTER 2" (slate), "THE MIRROR CAVES" (echo light), over a still of the chapter.
- **End:** time, deaths, shards, notes, pages, moments. "PRESS JUMP TO CONTINUE".

### Credits ✅
```
ECHO
A GAME BY FLOWZ
MADE WITH TYPESCRIPT AND A CANVAS
THANKS FOR PLAYING
```

### Tutorial prompts
- `JUMP: SPACE` · `PRESS JUMP AGAIN IN THE AIR` · `DASH: L-SHIFT` · `REWIND: R`
- `YOUR ECHO STAYS BEHIND` · `ECHOES HOLD PLATES DOWN` · `THE SWITCH REMEMBERS`
- `CHECKPOINT` · `GAME SAVED`
(All prompts show the player's *current* bindings.)

---

## 12. Controls

| Action | Keyboard (default) | Gamepad (planned) | Notes |
|---|---|---|---|
| Move | W A S D (Z Q S D on AZERTY) / arrows ✅ | Left stick / D-pad | Down = fast fall, down + jump = drop through |
| Jump / double jump | Space ✅ | A | Also confirms in menus |
| Dash | Left Shift ✅ | X | 8 directions |
| Rewind | R ✅ | RB | Rewinds 2 s and leaves a solid echo |
| Talk | Up | Up | Near an NPC |
| Pause | Esc ✅ | Start | Also "back" in menus |
| Map | M | Select | Planned. World / chapter map, fast travel at shrines |
| Debug overlay | F3 ✅ | — | Hitbox, speeds, dash and double-jump state |

Every key can be rebound in **Settings → Controls** ✅. Bindings use physical key positions, so the default WASD sits under ZQSD on an AZERTY keyboard, and the menu shows the label printed on *your* keyboard. Arrow keys always work for movement and menus.
