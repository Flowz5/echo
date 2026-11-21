#!/usr/bin/env python3
"""Echo — Chapter 1, Starfall Ruins.

Builds assets/levels/chapter1.world and its rooms. Run from the repo root:
    python3 tools/build_chapter1.py

Design (docs/superpowers/specs/2026-11-21-ch1-level-design.md): short, hard, mostly vertical
challenge rooms; respawn at each room's entrance; abilities here are double jump, wall jump
and dash (rewind comes in chapter 2). Mechanics: crumble stone "=", dash flowers, wind vents,
Drift (part 3 only). Movement budget and lessons: see tools/build_chapter0.py's header.

World layout (world tiles, y grows downward): part 1 climbs up and to the right from Gorge
Gate (which The Overlook's archway leads into) to the Ruins Shrine.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ascii_to_tiled import write_world  # noqa: E402
from room_builder import Room  # noqa: E402

START = {"abilities": "doubleJump, wallJump, dash", "echoSlots": 0}
rooms = []


def gorge_gate():
    """1-1 Gorge Gate: single-tile stone stumps rising over a thorn gorge; each gap is a jump that
    needs the double jump or the dash. Exit on the right, at the top ledge."""
    r = Room("gorge_gate", "Gorge Gate", 40, 16, (0, 0), props=START)
    r.ground(0, 8, 15)
    r.fill(0, 0, 0, 10)                    # cliff above the way back
    r.put(3, 14, "S")                      # spawn 0: arriving from The Overlook
    r.exit(0, 14, "chapter0", "overlook", spawn=1)
    r.spikes(9, 31, 14)                    # the gorge floor
    r.fill(16, 13, 16, 15)                 # stump 1 (stand row 12)
    r.fill(24, 11, 24, 15)                 # stump 2 (stand row 10)
    r.fill(32, 9, 39, 15)                  # the far ledge (stand row 8)
    r.fill(39, 0, 39, 4)                   # right wall above the way on (rows 5-8 open)
    r.deco("ruin_house", 5, 15, "back")
    r.deco("lantern_post_bent", 7, 15)
    r.deco("pillar_tall", 20, 15, "back")
    r.deco("bell_fallen", 28, 15, "back")
    r.deco("balustrade", 35, 9)
    r.deco("rose_bush", 37, 9)
    rooms.append(r)


def pips_web():
    """1-2 Pip's Web: a climb up hanging stone posts over thorns, wall jump to wall jump.
    At the top, a cobweb across the passage and someone stuck in it (Pip, placeholder)."""
    r = Room("pips_web", "Pip's Web", 22, 24, (40, -14))
    r.ground(0, 21, 23)                    # world row 9: level with Gorge Gate's far ledge
    r.fill(0, 0, 0, 18)                    # left wall above the way in
    r.put(2, 22, "S")
    r.spikes(6, 20, 22)
    r.fill(21, 0, 21, 23)                  # right wall
    r.fill(9, 14, 9, 19)                   # post 1
    r.fill(13, 9, 13, 14)                  # post 2
    r.fill(17, 4, 17, 9)                   # post 3
    r.fill(13, 3, 20, 3)                   # top ledge (stand row 2), exit up through cols 14..20
    r.fill(0, 0, 12, 0)                    # ceiling on the left
    r.hang("cobweb", 19, 3, exact=True)
    r.text(16, 1, "SOMEONE IS STUCK HERE...")
    r.deco("ruin_arch", 3, 23, "back")
    r.hang("rose_vine", 5, 0, exact=True)
    r.deco("statue", 18, 23, "back")
    rooms.append(r)


def crumbling_walk():
    """1-3 Crumbling Walk: the first crumble slabs, rising over a thorn floor to a floating ledge.
    Walls and the exit are out of reach without the slabs (no climbing round them): the floor ends
    16 tiles from the right wall, the exit opens 20 tiles from the left wall, under a ceiling."""
    r = Room("crumbling_walk", "Crumbling Walk", 30, 14, (52, -28))
    r.ground(0, 29, 13)
    r.clear(2, 13, 8, 13)                  # the hole Iris comes up through (from Pip's Web)
    r.put(10, 12, "S")
    r.fill(0, 0, 0, 12)                    # left wall
    r.fill(29, 0, 29, 12)                  # right wall
    r.fill(1, 0, 21, 0)                    # ceiling, the exit opens above the ledge (cols 22..28)
    r.spikes(13, 28, 12)
    r.crumble(14, 16, 11)                  # stand row 10
    r.crumble(19, 21, 9)                   # stand row 8
    r.fill(22, 5, 26, 6)                   # exit ledge (stand row 4)
    r.deco("ruin_house_small", 20, 13, "back")
    r.deco("lantern_post_bent", 12, 13)
    rooms.append(r)

def crumbling_stair():
    """1-4 Crumbling Stair: crumble slabs zig-zagging up over thorns to an opening in the middle of
    the ceiling; standing still is a fall. The walls are 9+ tiles from the safe platform and the
    opening 13 tiles from either wall, so the slabs are the only way up."""
    r = Room("crumbling_stair", "Crumbling Stair", 30, 24, (62, -52))
    r.ground(0, 29, 23)
    r.clear(13, 23, 16, 23)                # the hole from Crumbling Walk's exit
    r.put(11, 22, "S")
    r.spikes(1, 8, 22)
    r.spikes(21, 28, 22)
    r.fill(0, 0, 0, 22)                    # left wall
    r.fill(29, 0, 29, 22)                  # right wall
    r.fill(1, 0, 12, 0)                    # ceiling, opening at cols 13..16
    r.fill(17, 0, 28, 0)
    r.crumble(4, 5, 19)
    r.crumble(10, 11, 16)
    r.crumble(4, 5, 13)
    r.crumble(10, 11, 10)
    r.crumble(17, 18, 7)
    r.crumble(22, 23, 4)
    r.deco("pillar_tall", 18, 23, "back")
    r.hang("lantern_dead", 8, 0, exact=True)
    r.hang("banner", 20, 0, exact=True)
    r.hang("rose_vine", 25, 0, exact=True)
    rooms.append(r)

def rose_garden():
    """1-5 The Rose Garden: a thorn gap too wide for jump + double jump + dash (13 tiles); a dash
    flower in the middle gives the dash back: dash, flower, dash."""
    r = Room("rose_garden", "The Rose Garden", 40, 14, (55, -66))
    r.ground(0, 39, 13)
    r.clear(20, 13, 23, 13)                # the hole from Crumbling Stair's opening
    r.put(17, 12, "S")
    r.fill(0, 0, 0, 12)                    # left wall
    r.spikes(25, 37, 12)
    r.flower(31, 10)
    r.fill(39, 0, 39, 7)                   # right wall above the way on (rows 8..12 open)
    r.deco("rose_bush", 5, 13)
    r.deco("rose_bush", 12, 13)
    r.deco("ruin_house", 8, 13, "back")
    r.deco("statue", 3, 13, "back")
    rooms.append(r)


def rose_trellis():
    """1-6 Rose Trellis: a tall shaft over thorns climbed on a straight column of dash flowers, three
    tiles apart: dash straight up, the flower gives the dash back, dash again. Two stepping stones
    lead to the foot of the column. The walls and the ceiling gap are 12+ tiles apart, so no
    climbing round the flowers."""
    r = Room("rose_trellis", "Rose Trellis", 28, 24, (95, -74))
    r.fill(0, 21, 4, 23)                   # entrance platform (level with the garden's floor)
    r.put(2, 20, "S")
    r.ground(5, 26, 23)
    r.spikes(5, 26, 22)
    r.fill(7, 21, 7, 22)                   # stepping stone
    r.fill(12, 21, 14, 22)                 # the foot of the column (stand row 20)
    r.fill(0, 0, 0, 15)                    # left wall above the way in
    r.fill(27, 0, 27, 23)                  # right wall
    r.fill(1, 0, 11, 0)                    # ceiling, opening at cols 12..15
    r.fill(16, 0, 26, 0)
    for y in (17, 14, 11, 8, 5, 2):
        r.flower(13, y)
    r.hang("rose_vine", 4, 0, exact=True)
    r.hang("rose_vine", 21, 0, exact=True)
    r.hang("rose_vine", 9, 0, exact=True)
    r.deco("rose_bush", 2, 21)
    rooms.append(r)


def updraft_square():
    """1-7 Updraft Square: a wind fissure over thorns lifts Iris past a high ledge; dash out of the
    column to the left onto it (it floats 10 tiles above the floor). Both walls are 12+ tiles from
    the ledge, so climbing a wall doesn't get you there."""
    r = Room("updraft_square", "Updraft Square", 30, 16, (98, -90))
    r.ground(0, 29, 15)
    r.clear(11, 15, 14, 15)                # the hole from Rose Trellis's opening
    r.put(8, 14, "S")
    r.fill(0, 0, 0, 14)                    # left wall
    r.fill(29, 0, 29, 14)                  # right wall
    r.spikes(17, 28, 14)
    r.vent(19, 3, 13, w=2)                 # the air column over the fissure
    r.fill(19, 14, 20, 14)                 # rock with the fissure
    r.fill(12, 5, 16, 6)                   # the ledge (stand row 4), exit up above it
    r.fill(1, 0, 11, 0)                    # ceiling, opening at cols 12..16
    r.fill(17, 0, 28, 0)
    r.deco("ruin_arch", 5, 15, "back")
    r.deco("lantern_post_bent", 3, 15)
    r.deco("rubble_s", 16, 15)
    r.hang("banner", 24, 0, exact=True)
    rooms.append(r)


def quills_perch():
    """1-8 Quill's Perch: two screens up a broken spire — a crumble step, a wind fissure, a crystal
    ledge, another slab and fissure — to Quill's perch under the roof, and out through a gap in the
    roof on the left. The walls are 13 tiles from the safe platform, so no climbing round."""
    r = Room("quills_perch", "Quill's Perch", 36, 32, (94, -122))
    r.ground(0, 35, 31)
    r.clear(16, 31, 19, 31)                # the hole from Updraft Square's exit
    r.put(15, 30, "S")
    r.spikes(1, 12, 30)
    r.spikes(23, 34, 30)
    r.fill(0, 0, 0, 30)                    # left wall
    r.fill(35, 0, 35, 30)                  # right wall
    r.fill(6, 0, 34, 0)                    # the spire's roof; the way out is the gap at cols 1..5
    r.crumble(8, 10, 27)                   # stand row 26
    r.vent(4, 14, 25, w=2)
    r.fill(4, 26, 5, 26)                   # rock with the first fissure
    r.fill(9, 12, 14, 13)                  # crystal ledge (stand row 11)
    r.put(11, 11, "C")
    r.crumble(18, 20, 9)                   # stand row 8
    r.vent(24, 2, 10, w=2)
    r.fill(24, 11, 25, 11)                 # rock with the second fissure
    r.fill(6, 3, 20, 4)                    # the perch, running left to under the gap (stand row 2)
    r.npc(17, 2, "QUILL", script="quill_ch1")
    r.hang("lantern_dead", 28, 0, exact=True)
    r.hang("banner", 12, 0, exact=True)
    r.hang("rose_vine", 32, 0, exact=True)
    r.deco("statue", 12, 3, "back")
    rooms.append(r)


def ruins_shrine():
    """1-11 Ruins Shrine (for now right after Quill's Perch; moved to the end of part 1 later)."""
    r = Room("ruins_shrine", "Ruins Shrine", 24, 16, (88, -138))
    r.ground(0, 23, 15)
    r.clear(7, 15, 11, 15)                 # the hole from the gap in the spire's roof
    r.fill(23, 0, 23, 14)
    r.fill(0, 0, 0, 14)
    r.put(16, 14, "H")
    r.deco("ruin_arch", 3, 15, "back")
    r.deco("statue", 20, 15, "back")
    rooms.append(r)


for build in (gorge_gate, pips_web, crumbling_walk, crumbling_stair, rose_garden, rose_trellis,
              updraft_square, quills_perch, ruins_shrine):
    build()

write_world("chapter1", [room.export() for room in rooms])
