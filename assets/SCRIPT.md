# ECHO — Game Script & Design Bible

> A fast, precise 2D platformer where you rewind time and use your own frozen echoes to survive.

**Status:** living document, v0.2. Everything here is the target design; what is already implemented is marked ✅.

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
| 100 % | ~12 hours (collectibles, Lumi's moments, Echo Trials) |
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
| Fast fall | Hold down |
| Drop through | Down + jump on a one-way platform |
| Corner correction | Bumping a ceiling corner by ≤ 4 px nudges Iris around it |

**Unlock order:** run, jump and double jump from the start. **Dash** at the end of chapter 0 (the first Bell shard). **Rewind** in chapter 2 (the Eye awakens).

### 4.2 Rewind & echoes
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
| **Bell Shrine** | a small bronze bell in a moss-covered stone arch | Saves the game, heals the Stillness, Tamsin speaks through it. From chapter 3, fast travel between shrines and Lanternrest |
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

---

## 5. Chapters, room by room

> Rooms are single screens (320×180) or short scrolling corridors. **★** = optional room with a collectible. **?** = Pip hint available.

### Prologue: The Eleventh Toll
**A playable memory, 1 room.** The night of the Stilling, a hundred years ago. A Toller in a long robe (Corin, unnamed for now) climbs the belltower stairs in the rain. The player controls him: slow, no jump, only walking. At the top, the Bell is ringing its eleventh toll. A child's paper kite is tied to the railing. He lifts a heavy hammer. **Cut to white.** A crack sound. Silence. Title card: **ECHO**.

### Chapter 0: The Quiet Vale
**Music:** *First Steps* ✅ · **Teaches:** run, jump, double jump · **Shard:** Shard of Motion (unlocks dash)

Iris wakes up in Lanternrest on her "birthday", the day Tamsin decided she is old enough to climb. The Quiet Vale is mossy ruined farmland under the stars: soft, safe, beautiful.

| # | Room | Content |
|---|---|---|
| 0-1 | Lanternrest | Hub intro, talk to Tamsin, Moss & Bramble. Exit east |
| 0-2 | The Old Road | Running, first small gaps. Floating text teaches jump |
| 0-3 | Fence Steps | Variable jump height (low ceiling + high ledge) |
| 0-4 | The Orchard | First double jump. Echo villagers picking frozen apples |
| 0-5 | Well of Stars ★ | Optional: drop into the well, a tight double-jump climb. **Resonant Note I** |
| 0-6 | The Broken Mill | One-way platforms, drop-through. **Quill** sits on the mill wheel |
| 0-7 | Lumi's Field | **Lumi's Moment 1:** Lumi flying her kite, laughing |
| 0-8 | Spike Hollow | First spikes, first Echo Crystal |
| 0-9 | The Vale Shrine | First Bell Shrine. Tamsin speaks through the bell for the first time |
| 0-10 | Shard of Motion | The shard floats over a pit. Taking it unlocks the **dash**. The room is then crossed with a dash to exit |

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

**Ending beat:** Hask opens the old mine elevator to Clockwork Spire and a shortcut back to Lanternrest.

### Chapter 3: Clockwork Spire
**Music:** *Tick of the Spire* · **Teaches:** 2 echo slots, timed gates, cog platforms, levers, **Stillness fog** · **Shard:** Shard of Hours (unlocks fast travel)

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
| Rewind | R | RB | Planned (chapter 2) |
| Talk | Up | Up | Near an NPC |
| Pause | Esc ✅ | Start | Also "back" in menus |
| Debug overlay | F3 ✅ | — | Hitbox, speeds, dash and double-jump state |

Every key can be rebound in **Settings → Controls** ✅. Bindings use physical key positions, so the default WASD sits under ZQSD on an AZERTY keyboard, and the menu shows the label printed on *your* keyboard. Arrow keys always work for movement and menus.
