#!/usr/bin/env python3
"""Echo — Chapter 0, The Quiet Vale (v2 blockout).

Builds assets/levels/chapter0.world and its rooms (Tiled .tmj files).
Run from the repo root:  python3 tools/build_chapter0.py

Coordinates are in tiles. Rooms are drawn with fill operations on a grid
(clearer and safer than typing ASCII by hand). Once polished in Tiled, Tiled
becomes the source of truth and this script should not be re-run on those rooms.

Measured movement budget (from take-off to landing, same height):
  tap jump 2.6 tiles / 1.4 high, full jump 4.0 / 2.4 high (running), double jump 6.8 (4.4 high max),
  jump + double jump + dash ≈ 10, ground dash jump 8.5 (2.7 high), dash jump + double jump ≈ 11.4,
  jump + air dash + double jump ≈ 11.8. Wall-jump chimneys are 3 tiles wide.
  Any tall wall can be climbed alone with neutral wall jumps: gates must not leave one within reach.
  Crystals refill the dash and double jump on touch: keep them away from take-off edges.
  Dash gates: the target must be level with or above the take-off (falling stretches a jump
  almost as far as the dash does) and must not be a long wall face reachable while falling.

Layout (world tiles): band A = y 0..15 (the valley floor), band B = y -16..-1 (the heights),
band C = y 16..31 (below ground).
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

    # ---- terrain
    def fill(self, x0, y0, x1, y1, ch="#"):
        """Inclusive rectangle."""
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                assert 0 <= x < self.w and 0 <= y < self.h, f"{self.name}: ({x},{y}) outside {self.w}x{self.h}"
                self.grid[y][x] = ch

    def clear(self, x0, y0, x1, y1):
        self.fill(x0, y0, x1, y1, ".")

    def ground(self, x0, x1, top):
        """Solid from row `top` down to the bottom of the room."""
        self.fill(x0, top, x1, self.h - 1)

    def plank(self, x0, x1, y):
        self.fill(x0, y, x1, y, "-")

    def spikes(self, x0, x1, y):
        """Spikes on row y, solid ground under them."""
        self.fill(x0, y, x1, y, "^")
        self.fill(x0, y + 1, x1, self.h - 1)

    def put(self, x, y, ch):
        assert self.grid[y][x] not in "SCH", f"{self.name}: ({x},{y}) already holds a {self.grid[y][x]} marker"
        self.fill(x, y, x, y, ch)

    # ---- objects
    def obj(self, kind, x, y, **props):
        self.objects.append({"type": kind, "at": (x, y), "props": props} if props else {"type": kind, "at": (x, y)})

    def npc(self, x, y, name):
        self.obj("npc", x, y, name=name)

    def text(self, x, y, text):
        self.obj("text", x, y, text=text)

    def lingering(self, x, y, text, flip=False):
        self.obj("lingering", x, y, text=text, **({"flip": True} if flip else {}))

    def deco(self, sprite, x, ground_row, layer="mid", flip=False):
        """A decoration standing on the ground whose top is `ground_row`."""
        props = {"sprite": sprite, "layer": layer}
        if flip:
            props["flip"] = True
        self.obj("deco", x, ground_row - 1, **props)

    def hang(self, sprite, x, ceiling_row, layer="back"):
        """A decoration hanging under the solid tile at `ceiling_row` (bottom at its length)."""
        lengths = {"hanging_lantern": 1, "vine": 1, "vine_long": 2, "cobweb": 1, "stalactite": 1}
        self.obj("deco", x, ceiling_row + lengths.get(sprite, 1), sprite=sprite, layer=layer)

    def export(self):
        return {"name": self.name, "at": self.at, "echoes": self.echoes, "props": self.props,
                "objects": self.objects, "rows": ["".join(r) for r in self.grid]}


rooms = []

# ================================================================ 0-1 Lanternrest (hub)
# The village at the foot of the valley. Tamsin, the first Bell Shrine, houses.
# A small climb up the big tree's branches hides a Lost Page.
r = Room("lanternrest", "Lanternrest", 40, 16, (0, 0), props={"abilities": "doubleJump, wallJump", "echoSlots": 0})
r.fill(0, 0, 0, 15)                    # the cliff behind the village
r.ground(0, 39, 13)
r.plank(12, 16, 10)                    # the big tree's branches
r.plank(19, 23, 7)
r.plank(26, 29, 4)
r.put(3, 12, "S")
r.put(9, 12, "H")
r.npc(6, 12, "TAMSIN")
r.obj("page", 27, 3)
r.text(6, 8, "MOVE: {left} {right}")
r.text(34, 9, "EAST: THE QUIET VALE")
r.deco("house", 16, 13, "back")
r.deco("house_small", 30, 13, "back", flip=True)
r.deco("apple_tree", 21, 13, "back")
r.deco("pine", 37, 13, "back")
r.deco("pine_small", 2, 13, "back")
r.deco("lantern_post", 12, 13)
r.deco("lantern_post", 25, 13)
r.deco("barrel", 19, 13)
r.deco("crate", 33, 13)
r.deco("crate", 34, 13)
r.deco("fence", 3, 13)
r.deco("sign", 37, 13)
r.deco("bush", 27, 13)
rooms.append(r)

# ================================================================ 0-2 The Old Road
# A long road out of the village: ditches, a fallen log, a hill with a hidden
# tunnel under it (Lost Page), a deeper ditch, steps.
r = Room("old_road", "The Old Road", 64, 16, (40, 0))
r.ground(0, 63, 13)
r.clear(7, 13, 8, 13)                  # ditch (1 deep)
r.fill(12, 12, 13, 12)                 # fallen log
r.clear(17, 13, 19, 13)                # wider ditch
r.fill(24, 10, 38, 12)                 # the hill…
r.clear(24, 12, 38, 12)                # …with a crawl tunnel underneath (open at both ends)
r.clear(41, 13, 45, 14)                # deep ditch (2 deep)
r.fill(43, 13, 43, 13)                 # a stepping stone in it
r.fill(49, 12, 52, 12)                 # steps up
r.fill(53, 11, 56, 12)
r.put(1, 12, "S")
r.obj("page", 31, 12)
r.text(6, 9, "JUMP: {jump}")
r.text(31, 7, "OVER… OR UNDER?")
r.lingering(21, 12, "ONE MORE LOAF BEFORE THE TWELFTH TOLL.")
r.deco("lantern_post", 4, 13)
r.deco("lantern_post", 22, 13)
r.deco("lantern_post", 47, 13)
r.deco("cart", 59, 13)
r.deco("pine", 10, 13, "back")
r.deco("tree", 31, 10, "back")
r.deco("pine_small", 40, 13, "back")
r.deco("dead_tree", 61, 13, "back")
r.deco("house_small", 15, 13, "back")
r.deco("fence", 50, 12)
r.deco("rock_l", 37, 10)
r.deco("bush", 2, 13)
r.deco("sign", 23, 13)
rooms.append(r)

# ================================================================ 0-3 Fence Steps
# Variable jump height: tap under low roofs, hold for the ledges.
r = Room("fence_steps", "Fence Steps", 44, 16, (104, 0))
r.ground(0, 43, 13)
r.fill(5, 8, 12, 10)                   # low roof: a full jump bonks, a tap clears the ditch
r.clear(8, 13, 9, 13)
r.fill(16, 11, 19, 12)                 # ledges: 2 up, 2 up, back down
r.fill(22, 9, 25, 12)
r.fill(28, 11, 31, 12)
r.fill(33, 9, 37, 10)                  # second low roof over a ditch
r.clear(34, 13, 35, 13)
r.put(1, 12, "S")
r.text(8, 6, "TAP {jump} FOR A SMALL HOP")
r.text(20, 6, "HOLD {jump} TO JUMP HIGHER")
for x in (2, 14, 40):
    r.deco("fence", x, 13)
r.deco("pine", 3, 13, "back")
r.deco("apple_tree", 24, 9, "back")
r.deco("pine_small", 42, 13, "back")
r.deco("ruin_pillar", 30, 11, "back")
r.deco("bush_small", 39, 13)
r.deco("rock_m", 17, 11)
rooms.append(r)

# ================================================================ 0-4 The Orchard
# The double jump: a 4-tile wall, gaps between plateaus (falling = lower ground,
# try again), the well in the ground, then the big apple tree to climb (Lost Page).
r = Room("orchard", "The Orchard", 60, 16, (148, 0))
r.ground(0, 59, 13)
r.fill(8, 9, 17, 12)                   # plateau 1 (4 up)
r.fill(23, 9, 30, 12)                  # plateau 2 (5-tile gap)
r.clear(31, 9, 33, 15)                 # the Well of Stars, through the ground
r.fill(34, 9, 41, 12)                  # plateau 3
r.plank(44, 47, 10)                    # the big tree: branches up to the canopy
r.plank(49, 52, 7)
r.plank(44, 47, 4)
r.plank(54, 57, 6)
r.put(1, 12, "S")
r.put(20, 12, "S")
r.put(46, 12, "S")
r.text(5, 7, "PRESS {jump} AGAIN IN THE AIR")
r.text(32, 6, "THE WELL OF STARS")
r.obj("page", 45, 3)
r.lingering(51, 6, "THE APPLES WON'T FALL ANYMORE.")
r.deco("well_post", 30, 9)
r.deco("well_post", 34, 9)
r.deco("apple_tree", 4, 13, "back")
r.deco("apple_tree", 13, 9, "back", flip=True)
r.deco("apple_tree", 27, 9, "back")
r.deco("apple_tree", 38, 9, "back", flip=True)
r.deco("apple_tree", 50, 13, "back")
r.deco("tree", 57, 13, "back", flip=True)
r.deco("fence", 20, 13)
r.deco("crate", 42, 13)
r.deco("barrel", 43, 13)
r.deco("bush", 1, 13)
rooms.append(r)

# ================================================================ 0-5 Well of Stars (optional, below the orchard)
# Drop down the shaft into a quiet chamber: Resonant Note I.
# Back up: double-jump up the planks, then wall-jump up the shaft.
r = Room("well_of_stars", "Well of Stars", 24, 30, (164, 16), props={"indoor": True})
r.fill(0, 0, 23, 29)
r.clear(15, 0, 17, 17)                 # the shaft (under the orchard's well)
r.clear(2, 16, 21, 26)                 # the chamber
r.plank(14, 18, 18)
r.plank(7, 10, 21)
r.plank(2, 5, 24)
r.plank(18, 21, 23)
r.put(16, 17, "S")
r.put(11, 26, "C")
r.obj("note", 3, 26)
r.obj("page", 20, 22)
r.text(11, 20, "IT IS QUIET DOWN HERE")
for x in (4, 8, 13, 19):
    r.deco("crystals", x, 27)
r.deco("rock_l", 16, 27)
rooms.append(r)

# ================================================================ 0-6 The Old Bridge
# A broken stone bridge over the void: double-jump chains between the arches.
r = Room("old_bridge", "The Old Bridge", 52, 16, (208, 0))
r.ground(0, 5, 13)
r.fill(4, 11, 5, 12)                   # a step up to the deck
r.fill(6, 9, 11, 10)                   # arch A
r.fill(8, 11, 9, 15)
r.fill(16, 9, 20, 10)                  # arch B (crystal)
r.fill(18, 11, 18, 15)
r.fill(26, 8, 29, 9)                   # arch C (a bit higher)
r.fill(27, 10, 28, 15)
r.fill(33, 9, 38, 10)                  # arch D
r.fill(35, 11, 36, 15)
r.fill(44, 9, 47, 10)                  # arch E
r.ground(46, 51, 13)                   # the far bank
r.fill(46, 11, 47, 12)
r.put(1, 12, "S")
r.put(18, 8, "C")
r.put(49, 12, "S")
r.obj("page", 27, 2)
r.deco("ruin_pillar", 7, 9, "mid")
r.deco("ruin_pillar", 37, 9, "mid", flip=True)
r.deco("lantern_post", 3, 13)
r.deco("lantern_post", 50, 13)
r.deco("dead_tree", 2, 13, "back")
r.deco("pine", 48, 13, "back")
rooms.append(r)

# ================================================================ 0-7 The Broken Mill
# Planks up to Quill, drop-through to come back down, then the wall-jump chimney.
# Upstairs, spikes on the floor force a plank route to the exit.
r = Room("broken_mill", "The Broken Mill", 32, 32, (260, -16), props={"indoor": True})
r.fill(0, 0, 31, 31)
r.clear(1, 1, 30, 28)                  # inside the mill
r.clear(0, 25, 0, 28)                  # door from the bridge (west)
r.clear(31, 4, 31, 7)                  # exit to the roof (east, high)
r.fill(1, 17, 18, 17)                  # upper floor
r.fill(19, 17, 19, 26)                 # chimney, left wall (open at the bottom)
r.fill(23, 8, 30, 28)                  # chimney, right wall / block under the exit
r.plank(3, 9, 25)                      # stairs of planks to Quill
r.plank(5, 11, 21)
r.fill(5, 16, 16, 16, "^")             # upstairs: spikes on the floor…
r.plank(13, 16, 13)                    # …so climb the planks from the chimney's top
r.plank(8, 11, 10)
r.plank(13, 17, 7)                     # then jump over the chimney to the exit block
r.put(1, 28, "S")
r.put(17, 28, "C")
r.put(18, 16, "S")
r.put(17, 16, "C")
r.npc(8, 20, "QUILL")
r.obj("page", 9, 9)
r.text(8, 23, "{down} + {jump}: DROP THROUGH")
r.text(15, 24, "SLIDE DOWN A WALL")
r.text(15, 25, "AND JUMP FROM IT")
r.deco("mill_wheel", 12, 29, "back")
r.deco("crate", 2, 29)
r.deco("crate", 3, 29)
r.deco("barrel", 4, 29)
r.deco("barrel", 2, 17)
r.hang("hanging_lantern", 6, 0)
r.hang("hanging_lantern", 26, 0)
r.hang("hanging_lantern", 12, 17)
rooms.append(r)

# ================================================================ 0-8 Mill Roof
# Out on the roof: hop the chimney stacks, wall-jump up the tall pair. Spikes below.
r = Room("mill_roof", "Mill Roof", 44, 16, (292, -16))
r.ground(0, 4, 8)                      # landing from the mill
r.spikes(5, 38, 13)                    # the spiky roof
r.fill(7, 7, 8, 13)                    # stack A
r.fill(11, 5, 12, 13)                  # stack B
r.fill(16, 8, 17, 13)                  # stack C
r.fill(20, 4, 21, 13)                  # tall pair: wall-jump up between them
r.fill(25, 1, 26, 13)
r.ground(32, 43, 8)                    # far side
r.put(2, 7, "S")
r.put(4, 7, "C")
r.put(34, 7, "C")
r.obj("page", 25, 0)
r.text(22, 9, "WALL JUMP UP")
r.deco("barrel", 1, 8)
r.deco("crate", 40, 8)
r.deco("lantern_post", 37, 8)
r.deco("pine", 42, 8, "back")
rooms.append(r)

# ================================================================ 0-9 Lumi's Field
# A hill under the stars and Lumi's first moment. A gap over the void.
# Come back with the dash: the floating island above the gap (Lost Page).
r = Room("lumis_field", "Lumi's Field", 48, 16, (336, -16))
r.ground(0, 3, 8)
r.ground(4, 6, 10)
r.ground(7, 25, 12)
r.fill(12, 9, 18, 11)                  # the hill
r.fill(14, 7, 16, 8)                   # hilltop
r.ground(29, 47, 12)                   # after the gap (cols 26-28 = the void)
r.fill(26, 3, 28, 3)                   # island: high over the gap, out of reach even with a wall kick off the hill
r.put(1, 7, "S")
r.put(30, 11, "S")
r.obj("moment", 15, 6, index=1)
r.obj("page", 27, 2)
r.lingering(38, 11, "THE KITES ALWAYS FLEW HERE.")
r.deco("tree", 15, 7, "back")
r.deco("dead_tree", 44, 12, "back")
r.deco("pine", 22, 12, "back")
r.deco("pine_small", 33, 12, "back")
r.deco("rock_l", 9, 12)
r.deco("bush", 42, 12)
r.deco("fence", 34, 12)
rooms.append(r)

# ================================================================ 0-10 Spike Hollow
# First spikes, first Echo Crystals. A long way down: steps over spike pits,
# planks over a spike floor. Rewind gate: a hanging plate opens a hidden alcove.
r = Room("spike_hollow", "Spike Hollow", 40, 32, (384, -16))
r.ground(0, 6, 12)                     # S1
r.spikes(7, 8, 30)
r.ground(9, 14, 15)                    # S2
r.spikes(15, 18, 30)
r.ground(19, 23, 18)                   # S3 (with the hidden alcove)
r.clear(20, 20, 22, 21)
r.fill(23, 20, 23, 21, "D")
r.spikes(24, 32, 28)                   # the spike floor…
r.plank(25, 27, 24)                    # …crossed on planks
r.plank(29, 31, 26)
r.ground(33, 39, 29)                   # bottom, exit east
r.fill(39, 0, 39, 15)                  # cliff above the way out
r.put(16, 20, "b")                     # the hanging plate (an echo frozen mid-air holds it)
r.put(1, 11, "S")
r.put(3, 11, "C")
r.put(12, 14, "C")
r.put(36, 28, "C")
r.obj("page", 21, 21)
r.text(8, 9, "SPIKES. CAREFUL.")
r.lingering(38, 28, "WHY IS THE BELL SO QUIET?", flip=True)
r.deco("dead_tree", 4, 12, "back")
r.deco("ruin_pillar", 11, 15, "back")
r.deco("dead_tree", 21, 18, "back")
r.deco("ruin_pillar", 35, 29, "back", flip=True)
r.deco("rock_m", 13, 15)
r.deco("rock_l", 34, 29)
rooms.append(r)

# ================================================================ 0-11 The Vale Shrine
# A calm room with a Bell Shrine. The road forks: up the planks (Orchard Way)
# or down through the floor (the Millrace).
r = Room("vale_shrine", "The Vale Shrine", 32, 16, (424, 0))
r.ground(0, 31, 13)
r.clear(22, 13, 24, 15)                # way down to the Millrace
r.fill(31, 5, 31, 12)                  # wall, open above: Orchard Way
r.plank(14, 17, 10)
r.plank(19, 22, 7)
r.plank(25, 30, 5)
r.put(2, 12, "S")
r.put(10, 12, "H")
r.text(19, 3, "UP: ORCHARD WAY")
r.text(23, 11, "DOWN: THE MILLRACE")
r.deco("pine", 4, 13, "back")
r.deco("apple_tree", 14, 13, "back", flip=True)
r.deco("lantern_post", 7, 13)
r.deco("lantern_post", 13, 13)
r.deco("sign", 20, 13)
r.deco("well_post", 21, 13)
r.deco("well_post", 25, 13)
rooms.append(r)

# ================================================================ 0-11a Orchard Way (platforming route)
# Treetop planks over a thorny ground. A crystal halfway, a high plank with a page.
r = Room("orchard_way", "Orchard Way", 48, 16, (456, 0))
r.ground(0, 3, 5)                      # start ledge
r.spikes(4, 41, 14)                    # thorns all along the bottom
r.plank(6, 8, 5)
r.plank(11, 13, 4)
r.plank(16, 17, 6)
r.plank(20, 22, 3)
r.plank(25, 27, 5)
r.fill(29, 6, 31, 13)                  # a trunk to rest on (crystal)
r.plank(33, 35, 2)                     # high plank (page)
r.plank(36, 38, 5)
r.ground(42, 47, 7)                    # end ledge, exit east
r.put(1, 4, "S")
r.put(30, 5, "C")
r.obj("page", 34, 1)
r.text(5, 2, "DON'T LOOK DOWN")
r.deco("tree", 12, 15, "back")         # trees grow from below the thorns
r.deco("apple_tree", 26, 15, "back", flip=True)
r.deco("tree", 40, 15, "back")
r.deco("lantern_post", 45, 7)
rooms.append(r)

# ================================================================ 0-11b The Millrace (puzzle route)
# Drop through the right planks, crawl under a wall, climb, cross a spiky channel.
r = Room("millrace", "The Millrace", 64, 16, (440, 16), props={"indoor": True})
r.fill(0, 0, 63, 15)
r.clear(1, 1, 62, 13)
r.clear(6, 0, 8, 0)                    # hole from the shrine
r.clear(63, 1, 63, 4)                  # exit east (into the Shard of Motion)
r.plank(4, 10, 4)                      # 1: drop-through stack
r.plank(3, 11, 7)
r.plank(2, 11, 10)
r.fill(12, 1, 12, 10)                  # wall: crawl under it
r.plank(14, 17, 11)                    # 2: climb
r.plank(19, 22, 8)
r.plank(23, 26, 5)
r.fill(27, 5, 27, 13)                  # wall: walk over it
r.plank(33, 35, 7)                     # 3: a plank halfway across
r.plank(30, 33, 10)                    # …and a way back up
r.fill(38, 7, 41, 13)                  # resting block (crystal)
r.spikes(42, 55, 13)                   # 4: the spiky channel
r.plank(44, 46, 9)
r.plank(49, 51, 7)
r.plank(53, 55, 10)
r.fill(58, 5, 62, 13)                  # exit block
r.put(7, 3, "S")
r.put(15, 13, "C")
r.put(40, 6, "C")
r.obj("page", 24, 4)
r.obj("page", 50, 6)
r.text(7, 6, "{down} + {jump}")
r.deco("mill_wheel", 33, 14, "back")
r.deco("crate", 2, 14)
r.deco("barrel", 3, 14)
r.deco("crate", 60, 5)
r.hang("hanging_lantern", 20, 0)
r.hang("hanging_lantern", 46, 0)
rooms.append(r)

# ================================================================ 0-12 Shard of Motion
# Both routes meet above a pit too wide to cross: grab the shard mid-jump, dash across.
r = Room("shard_of_motion", "Shard of Motion", 36, 32, (504, 0))
r.fill(0, 7, 4, 7)                     # upper ledge (from Orchard Way)
r.fill(0, 8, 0, 16)
r.plank(6, 9, 10)                      # way down
r.plank(2, 5, 13)
r.plank(7, 10, 16)
r.ground(0, 7, 21)                     # lower floor (from the Millrace)…
r.fill(8, 21, 13, 22)                  # …ending on a lip over the void (no tall wall to kick off)
r.clear(0, 17, 0, 20)
r.fill(22, 21, 27, 22)                 # far side: a lip too (cols 14-21: the pit), so falling short
r.ground(28, 35, 21)                   # can't be saved by climbing a wall
r.fill(12, 0, 23, 16)                  # a ruined arch over the pit: no flying over it from the planks,
                                       # and inside, jumps are capped: grab the shard, dash out
r.clear(35, 17, 35, 20)                # on to the Rise
r.fill(35, 0, 35, 7)                   # wall above
r.put(2, 6, "S")
r.put(2, 20, "S")
r.put(11, 20, "C")
r.put(24, 20, "C")
r.obj("shard", 16, 18, unlocks="dash")
r.deco("ruin_pillar", 13, 21, "back")
r.deco("ruin_pillar", 22, 21, "back", flip=True)
r.deco("dead_tree", 30, 21, "back")
r.deco("lantern_post", 3, 7)
rooms.append(r)

# ================================================================ 0-13 The Rise
# The dash tutorial: dash across, dash up, then dash + double jump over the void.
# Leads on to the Thorn Steps.
r = Room("the_rise", "The Rise", 56, 16, (540, 8))
r.ground(0, 5, 13)
r.ground(14, 19, 13)                   # after an 8-tile gap: dash needed
r.ground(22, 27, 7)                    # a high ledge: dash up
r.fill(37, 8, 40, 8)                   # a lone slab over the void
r.ground(47, 55, 7)                    # the way on to the Thorn Steps
r.put(2, 12, "S")
r.put(16, 12, "S")
r.put(24, 6, "C")
r.put(50, 6, "S")
r.put(52, 6, "C")
r.text(4, 9, "{dash}: DASH, IN ANY DIRECTION")
r.text(17, 9, "{up} + {dash}: DASH UP")
r.deco("dead_tree", 3, 13, "back")
r.deco("ruin_pillar", 18, 13, "back")
r.deco("pine", 26, 7, "back")
r.deco("ruin_pillar", 49, 7, "back")
r.deco("lantern_post", 54, 7)
rooms.append(r)

# ================================================================ 0-14 The Thorn Steps
# The chapter's exam: dash jump, wall jumps and the double jump chained over a
# thorn pit. Mandatory and "firm but fair": a crystal before every beat.
# Everything floats (slabs and short walls): long walls rising from the pit could
# be climbed with wall jumps and would skip the beats.
#   beat 1  the dash jump: an 8-tile gap under an arch (dash jump, then double jump)
#   beat 2  in under a chimney, wall-jump up, dash out to a far ledge (8 tiles, from a standstill)
#   beat 3  drop to a rest, dash jump + double jump up onto a two-tile stone (8), then up to a slab (7)
#   beat 4  dash jump + double jump onto a second stone (8), then up to the exit ledge (5 out, 2 up)
# The chimney's top opens on a hole in the ceiling: the optional Thorn Spire.
r = Room("thorn_steps", "The Thorn Steps", 108, 24, (596, 0))
r.spikes(0, 106, 22)                   # the thorn pit
r.fill(107, 22, 107, 23)
r.ground(0, 6, 15)                     # entry ledge (from the Rise)
r.fill(0, 0, 0, 7)                     # rock above the way in
r.fill(8, 0, 16, 7)                    # beat 1: an arch over the gap (high enough for the double jump)
r.fill(15, 14, 19, 15)                 # landing slab, 8 tiles out
r.fill(25, 3, 25, 7)                   # beat 2: the chimney's left wall (jump in under it)
r.fill(29, 3, 29, 21)                  # …and its right wall
r.fill(38, 4, 46, 5)                   # beat 2 landing slab, 8 tiles out (no run-up on the chimney top)
r.fill(48, 9, 52, 10)                  # a rest: drop down onto it
r.fill(61, 8, 62, 8)                   # beat 3: a two-tile stone, 8 tiles out and one up
r.fill(70, 7, 74, 8)                   # the slab, 7 tiles further and one up
r.fill(83, 6, 84, 6)                   # beat 4: a second stone, 8 tiles out and one up
r.fill(90, 4, 107, 5)                  # the exit ledge, 5 tiles out and two up
r.fill(107, 6, 107, 21)
r.put(1, 14, "S")
r.put(4, 14, "C")
r.put(16, 13, "C")
r.put(42, 3, "C")
r.put(70, 6, "C")
r.put(104, 3, "S")
r.text(3, 11, "{dash} THEN {jump}: KEEP YOUR SPEED")
r.deco("ruin_pillar", 2, 15, "back")
r.deco("lantern_post", 5, 15)
r.deco("dead_tree", 18, 14, "back")
r.deco("ruin_pillar", 44, 4, "back")
r.deco("pine_small", 71, 7, "back")
r.deco("ruin_pillar", 105, 4, "back", flip=True)
r.deco("lantern_post", 93, 4)
r.deco("rock_m", 6, 15)
r.deco("bush_small", 3, 15)
r.deco("crystals", 39, 4)
r.deco("rock_s", 73, 7)
r.deco("bush", 99, 4)
r.deco("flower_bone", 19, 14)
r.deco("mushroom", 50, 9)
r.hang("vine", 9, 7)              # under the arch
r.hang("hanging_lantern", 12, 7)
r.hang("vine", 15, 7)
r.hang("vine", 17, 15)                 # under the slabs
r.hang("vine", 43, 5)
r.hang("vine", 50, 10)
r.hang("vine", 61, 8)            # under the stone
r.hang("vine", 72, 8)
r.hang("vine", 84, 6)            # the second stone
r.hang("hanging_lantern", 100, 5)
rooms.append(r)

# ================================================================ 0-14a The Thorn Spire (optional)
# Above the Thorn Steps: long chains with no ground and one crystal at the door.
# A Lost Page at the far end, then a drop back down onto the Steps' exit ledge.
r = Room("thorn_spire", "The Thorn Spire", 108, 16, (596, -16))
r.spikes(1, 106, 14)                    # thorns on the Steps' roof
r.fill(0, 0, 0, 15)
r.fill(107, 0, 107, 15)
r.ground(22, 32, 11)                   # the door ledge, around the hole
r.clear(26, 11, 28, 15)                # the way up from the chimney
r.fill(41, 3, 41, 9)                   # lone wall, 8 tiles out
r.fill(49, 8, 50, 8)                   # small slab
r.fill(58, 2, 58, 8)                   # second wall
r.fill(66, 6, 66, 6)                   # one-tile stone
r.fill(74, 2, 74, 9)                   # last wall
r.fill(80, 8, 85, 9)                   # the page's ledge
r.clear(98, 14, 100, 15)               # the drop back down onto the exit ledge (cols 91-107)
r.put(24, 10, "C")
r.put(30, 10, "S")
r.obj("page", 83, 7)
r.deco("ruin_pillar", 23, 11, "back")
r.deco("dead_tree", 81, 8, "back")
r.deco("lantern_post", 30, 11)
r.deco("crystals", 84, 8)
r.hang("vine", 41, 9)
r.hang("hanging_lantern", 58, 8)
r.hang("vine", 66, 6)
r.hang("vine", 74, 9)
r.hang("hanging_lantern", 82, 9)
rooms.append(r)

# ================================================================ 0-15 The Overlook
# The end of the Quiet Vale: a Bell Shrine and the ruins of chapter 1 in the distance.
r = Room("overlook", "The Overlook", 24, 16, (704, -11))
r.ground(0, 23, 15)
r.fill(0, 0, 0, 10)
r.fill(23, 0, 23, 14)
r.put(1, 14, "S")
r.put(14, 14, "H")
r.text(12, 9, "CHAPTER 1: STARFALL RUINS")
r.text(12, 10, "COMING SOON")
r.deco("ruin_pillar", 4, 15, "back")
r.deco("pine", 20, 15, "back")
r.deco("lantern_post", 10, 15)
r.deco("sign", 18, 15)
r.deco("bush", 7, 15)
r.deco("rock_l", 21, 15)
r.deco("flower_lilac", 12, 15)
r.deco("dead_tree", 2, 15, "back")
rooms.append(r)

write_world("chapter0", [room.export() for room in rooms])
