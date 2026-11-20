#!/usr/bin/env python3
"""Echo — Chapter 0, The Quiet Vale: room blockout.

Builds assets/levels/chapter0.world and its rooms (Tiled .tmj files).
Run from the repo root:  python3 tools/build_chapter0.py

Coordinates are in tiles. Each room is drawn with fill operations on a grid
(clearer and safer than typing ASCII by hand). Once polished in Tiled, Tiled
becomes the source of truth and this script should not be re-run on those rooms.

Movement budget used for the design (measured in game):
  full jump ≈ 2.5 tiles high, tap ≈ 1.4, double jump ≈ 4.3 high
  running jump gap ≈ 4 tiles, double jump gap ≈ 6.5, + dash (2.7) ≈ 9
  wall-jump chimneys are 3 tiles wide
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ascii_to_tiled import write_world  # noqa: E402


class Room:
    def __init__(self, name, title, w, h, at, echoes=3, props=None):
        self.name, self.title, self.w, self.h, self.at = name, title, w, h, at
        self.grid = [["."] * w for _ in range(h)]
        self.objects = []
        self.echoes = echoes
        self.props = {"title": title, **(props or {})}

    def fill(self, x0, y0, x1, y1, ch="#"):
        """Inclusive rectangle."""
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                assert 0 <= x < self.w and 0 <= y < self.h, f"{self.name}: ({x},{y}) outside {self.w}x{self.h}"
                self.grid[y][x] = ch

    def clear(self, x0, y0, x1, y1):
        self.fill(x0, y0, x1, y1, ".")

    def put(self, x, y, ch):
        self.fill(x, y, x, y, ch)

    def obj(self, kind, x, y, **props):
        self.objects.append({"type": kind, "at": (x, y), "props": props} if props else {"type": kind, "at": (x, y)})

    def npc(self, x, y, name):
        self.obj("npc", x, y, name=name)

    def text(self, x, y, text):
        self.obj("text", x, y, text=text)

    def lingering(self, x, y, text, flip=False):
        if flip:
            self.obj("lingering", x, y, text=text, flip=True)
        else:
            self.obj("lingering", x, y, text=text)

    def export(self):
        return {
            "name": self.name,
            "at": self.at,
            "echoes": self.echoes,
            "props": self.props,
            "objects": self.objects,
            "rows": ["".join(r) for r in self.grid],
        }


rooms = []

# ---------------------------------------------------------------- 0-1 Lanternrest (hub)
# The village under the big tree. Tamsin, Moss & Bramble, the first Bell Shrine.
# A small secret: a Lost Page on the high branch (double jump from the lower one).
r = Room("lanternrest", "Lanternrest", 30, 14, (0, 0), props={"abilities": "doubleJump, wallJump", "echoSlots": 0})
r.fill(0, 0, 29, 0)            # canopy
r.fill(0, 0, 0, 13)            # trunk (left wall)
r.fill(29, 0, 29, 7)           # right wall, open below: the road east
r.fill(0, 12, 29, 13)          # ground
r.fill(10, 8, 15, 8, "-")      # lower branch
r.fill(20, 6, 25, 6, "-")      # high branch
r.put(2, 11, "S")
r.put(9, 11, "H")
r.npc(5, 11, "TAMSIN")
r.npc(14, 11, "MOSS")
r.npc(16, 11, "BRAMBLE")
r.obj("page", 23, 5)
r.text(4, 8, "MOVE: {left} {right}")
r.text(25, 9, "EAST: THE QUIET VALE")
rooms.append(r)

# ---------------------------------------------------------------- 0-2 The Old Road
# Running and the first jumps. Ditches are shallow: falling in is harmless.
r = Room("old_road", "The Old Road", 36, 14, (30, 0))
r.fill(0, 12, 35, 13)
r.clear(8, 12, 9, 12)          # ditch (2 wide, 1 deep)
r.clear(15, 12, 17, 12)        # ditch (3 wide)
r.fill(22, 11, 29, 11)         # steps up…
r.fill(26, 10, 29, 10)
r.put(1, 11, "S")
r.text(6, 8, "JUMP: {jump}")
r.lingering(12, 11, "ONE MORE LOAF BEFORE THE TWELFTH TOLL.")
r.lingering(32, 11, "THE STARS LOOK STUCK TONIGHT.", flip=True)
rooms.append(r)

# ---------------------------------------------------------------- 0-3 Fence Steps
# Variable jump height: a low tunnel (tap = small hop) then a high ledge (hold).
r = Room("fence_steps", "Fence Steps", 30, 14, (66, 0))
r.fill(0, 12, 29, 13)
r.clear(6, 12, 8, 12)          # shallow ditch inside the tunnel
r.fill(6, 6, 13, 8)            # low roof: a full jump bonks, a tap clears the ditch
r.fill(18, 10, 25, 11)         # high ledge (2 tiles): needs a held jump
r.put(1, 11, "S")
r.text(6, 10, "TAP {jump} FOR A SMALL HOP")
r.text(16, 7, "HOLD {jump} TO JUMP HIGHER")
r.lingering(27, 11, "I'LL TELL HER TOMORROW.", flip=True)
rooms.append(r)

# ---------------------------------------------------------------- 0-4 The Orchard
# The double jump. A 4-tile wall, a 6-tile gap between plateaus (falling = lower
# ground, try again). A well in the ground leads down to an optional room.
r = Room("orchard", "The Orchard", 40, 14, (96, 0))
r.fill(0, 12, 39, 13)
r.fill(8, 8, 17, 11)           # first plateau (4 tiles up)
r.fill(23, 8, 29, 11)          # second plateau (5-tile gap: comfortable double jump)
r.fill(33, 8, 39, 11)          # third plateau, exit east at this height
r.fill(39, 0, 39, 7, ".")
r.clear(30, 8, 32, 13)         # the Well of Stars (through the ground)
r.fill(13, 4, 16, 4, "-")      # apple tree branches
r.fill(25, 5, 27, 5, "-")
r.put(1, 11, "S")
r.put(20, 11, "S")             # respawn on the lower ground
r.text(6, 7, "PRESS {jump} AGAIN IN THE AIR")
r.text(31, 6, "THE WELL OF STARS")
r.lingering(21, 11, "THE APPLES WON'T FALL ANYMORE.")
r.obj("page", 14, 3)
rooms.append(r)

# ---------------------------------------------------------------- 0-5 Well of Stars (optional, below the orchard)
# Drop down the shaft into a quiet chamber with the first Resonant Note.
# Getting back up: double-jump up the ledges, then wall-jump up the shaft.
r = Room("well_of_stars", "Well of Stars", 20, 28, (112, 14), props={"indoor": True})
r.fill(0, 0, 19, 27)
r.clear(14, 0, 16, 17)         # the shaft (under the orchard's well)
r.clear(2, 16, 17, 25)         # the chamber
r.fill(13, 18, 17, 18, "-")    # landing under the shaft
r.fill(6, 21, 9, 21, "-")
r.fill(2, 24, 5, 24, "-")
r.put(15, 17, "S")
r.put(10, 25, "C")
r.obj("note", 3, 25)
r.text(9, 19, "IT IS QUIET DOWN HERE")
rooms.append(r)

# ---------------------------------------------------------------- 0-6 The Broken Mill
# One-way platforms up to Quill, drop-through to come back down, then the
# wall-jump chimney: the only way up to the exit.
r = Room("broken_mill", "The Broken Mill", 28, 24, (136, -12), props={"indoor": True})
r.fill(0, 0, 27, 23)
r.clear(1, 1, 26, 19)          # inside the mill
r.clear(0, 12, 0, 19)          # door from the orchard (west)
r.clear(27, 2, 27, 5)          # exit (east, high)
r.fill(1, 9, 18, 9)            # upper floor (only reachable by the chimney)
r.fill(19, 9, 19, 17)          # chimney, left wall (open at the bottom)
r.fill(23, 6, 26, 19)          # chimney, right wall / block under the exit
r.fill(3, 16, 9, 16, "-")      # stairs of planks to Quill
r.fill(5, 12, 11, 12, "-")
r.put(1, 19, "S")
r.put(17, 19, "C")
r.put(4, 8, "S")               # upper floor respawn
r.npc(7, 11, "QUILL")
r.obj("page", 3, 8)
r.text(8, 14, "{down} + {jump}: DROP THROUGH")
r.text(15, 15, "SLIDE DOWN A WALL")
r.text(15, 16, "AND JUMP FROM IT")
r.lingering(13, 19, "THE WHEEL STOPPED WITH THE BELL.")
rooms.append(r)

# ---------------------------------------------------------------- 0-7 Lumi's Field
# A hill under the stars and Lumi's first moment. The first gap over the void.
# Come back with the dash: a floating island with a Lost Page.
r = Room("lumis_field", "Lumi's Field", 36, 16, (164, -19))
r.fill(0, 0, 0, 8)             # wall above the way in
r.fill(0, 13, 21, 15)          # ground
r.fill(10, 10, 15, 12)         # the hill
r.fill(12, 8, 13, 9)           # hilltop
r.fill(25, 13, 35, 15)         # ground after the gap (cols 22-24 = the void)
r.fill(35, 0, 35, 9)           # cliff above the way down to Spike Hollow
r.fill(22, 7, 24, 7)           # island over the gap, 6 tiles up (its side is out of reach too): double jump + dash only
r.put(1, 12, "S")
r.put(26, 12, "S")
r.obj("moment", 13, 6)
r.obj("page", 23, 6)
r.lingering(5, 12, "THE KITES ALWAYS FLEW HERE.")
rooms.append(r)

# ---------------------------------------------------------------- 0-8 Spike Hollow
# First spikes, first Echo Crystal. Steps going down over spike pits.
# Come back with the rewind: a hanging plate over the first pit opens a hidden alcove.
r = Room("spike_hollow", "Spike Hollow", 32, 16, (200, -9))
r.fill(0, 3, 5, 15)            # starting ledge
r.fill(6, 15, 7, 15)
r.fill(6, 14, 7, 14, "^")      # first spikes: a short, forgiving gap
r.fill(8, 6, 13, 15)           # second step
r.fill(14, 15, 17, 15)
r.fill(14, 14, 17, 14, "^")
r.fill(18, 9, 22, 15)          # third step
r.clear(19, 10, 21, 11)        # hidden alcove inside it…
r.fill(22, 10, 22, 11, "D")    # …behind a door facing the last pit
r.fill(23, 15, 25, 15)
r.fill(23, 14, 25, 14, "^")
r.fill(26, 12, 31, 15)         # bottom, exit east
r.put(15, 10, "b")             # the hanging plate (an echo frozen mid-air can hold it)
r.put(1, 2, "S")
r.put(3, 2, "C")
r.put(11, 5, "C")
r.obj("page", 20, 11)
r.text(7, 9, "SPIKES. CAREFUL.")
r.lingering(29, 11, "WHY IS THE BELL SO QUIET?", flip=True)
rooms.append(r)

# ---------------------------------------------------------------- 0-9 The Vale Shrine
# A calm room with the first Bell Shrine. The road forks: up (Orchard Way) or
# down through the floor (the Millrace).
r = Room("vale_shrine", "The Vale Shrine", 24, 14, (232, -8))
r.fill(0, 11, 23, 13)
r.clear(18, 11, 20, 13)        # way down to the Millrace
r.fill(23, 5, 23, 10)          # wall, open above: Orchard Way
r.fill(12, 8, 15, 8, "-")
r.fill(17, 5, 21, 5, "-")
r.put(2, 10, "S")
r.put(8, 10, "H")
r.text(14, 3, "UP: ORCHARD WAY")
r.text(19, 9, "DOWN: THE MILLRACE")
rooms.append(r)

# ---------------------------------------------------------------- 0-9a Orchard Way (platforming route)
# Treetops over the drop. Falling sends you down into the Millrace.
r = Room("orchard_way", "Orchard Way", 34, 14, (256, -10))
r.fill(0, 7, 3, 7)             # start ledge
r.fill(0, 8, 0, 13)
r.fill(6, 7, 8, 7, "-")
r.fill(11, 6, 13, 6, "-")
r.fill(16, 8, 17, 8, "-")
r.fill(20, 5, 22, 5, "-")
r.fill(25, 7, 27, 7, "-")
r.fill(29, 8, 33, 13)          # end ledge, exit east
r.put(1, 6, "S")
r.put(31, 7, "C")
r.obj("page", 21, 4)
r.text(5, 4, "DON'T LOOK DOWN")
rooms.append(r)

# ---------------------------------------------------------------- 0-9b The Millrace (puzzle route)
# Drop through the right planks, crawl under the wall, climb back up, cross over.
r = Room("millrace", "The Millrace", 46, 14, (244, 6), props={"indoor": True})
r.fill(0, 0, 45, 13)
r.clear(1, 1, 44, 12)
r.clear(6, 0, 8, 0)            # hole from the shrine
r.clear(45, 2, 45, 5)          # exit east (into the Shard of Motion)
r.fill(4, 4, 10, 4, "-")       # section 1: drop-through stack
r.fill(3, 7, 11, 7, "-")
r.fill(2, 10, 11, 10, "-")
r.fill(12, 1, 12, 9)           # wall: crawl under it (rows 10-12)
r.fill(14, 10, 17, 10, "-")    # section 2: climb
r.fill(19, 7, 22, 7, "-")
r.fill(23, 4, 26, 4, "-")
r.fill(27, 4, 27, 12)          # wall: walk over it
r.fill(33, 6, 35, 6, "-")      # section 3: a plank halfway across
r.fill(30, 9, 33, 9, "-")      # …and a way back up if you fell
r.fill(40, 6, 44, 12)          # exit block
r.put(7, 3, "S")
r.put(15, 12, "C")
r.obj("page", 20, 2)
r.text(7, 6, "{down} + {jump}")
r.lingering(37, 12, "THE WATER STOPPED MID-SPLASH.", flip=True)
rooms.append(r)

# ---------------------------------------------------------------- 0-10 Shard of Motion
# Both routes meet above a pit too wide to cross. The shard floats over it:
# grab it mid-jump, dash the rest of the way.
r = Room("shard_of_motion", "Shard of Motion", 30, 24, (290, -10))
r.fill(29, 0, 29, 23)          # east wall (end of the chapter for now)
r.fill(0, 8, 4, 8)             # upper ledge (from Orchard Way)
r.fill(0, 9, 0, 17)
r.fill(6, 11, 9, 11, "-")      # way down
r.fill(2, 14, 5, 14, "-")
r.fill(7, 17, 10, 17, "-")
r.fill(0, 22, 13, 23)          # lower floor (from the Millrace)
r.fill(22, 22, 28, 23)         # far side (cols 14-21: the pit)
r.put(2, 7, "S")
r.put(2, 21, "S")
r.put(11, 21, "C")
r.put(25, 21, "H")
r.obj("shard", 16, 19, unlocks="dash")
r.text(25, 17, "END OF CHAPTER 0")
r.text(25, 18, "THANKS FOR PLAYING")
rooms.append(r)

write_world("chapter0", [room.export() for room in rooms])
