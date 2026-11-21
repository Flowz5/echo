#!/usr/bin/env python3
"""Echo — Chapter 1, Starfall Ruins (PLACEHOLDER).

Two plain rooms so the chapter system can be tested: they will be replaced by the real
chapter 1 level design. Run from the repo root:  python3 tools/build_chapter1.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ascii_to_tiled import write_world  # noqa: E402
from room_builder import Room  # noqa: E402

rooms = []

# 1-1 Gorge Gate: back to The Overlook on the left, a first wide gap.
# abilities/echoSlots only matter when loading ?world=chapter1 directly.
r = Room("gorge_gate", "Gorge Gate", 40, 16, (0, 0), props={"abilities": "doubleJump, wallJump, dash", "echoSlots": 1})
r.ground(0, 39, 15)
r.fill(0, 0, 0, 10)                    # cliff above the way back
r.spikes(17, 22, 14)                   # the gap
r.put(3, 14, "S")
r.exit(0, 14, "chapter0", "overlook", spawn=1)
r.deco("ruin_house", 9, 15, "back")
r.deco("pillar_tall", 22, 15, "back")
r.deco("lantern_post_bent", 13, 15)
r.deco("rubble_m", 15, 15)
r.deco("balustrade", 26, 15)
r.deco("bell_fallen", 33, 15, "back")
r.deco("rose_bush", 37, 15)
rooms.append(r)

# Ruins Shrine: a Bell Shrine to test fast travel across chapters.
r = Room("ruins_shrine", "Ruins Shrine", 24, 16, (40, 0))
r.ground(0, 23, 15)
r.fill(23, 0, 23, 14)
r.put(12, 14, "H")
r.deco("ruin_arch", 6, 15, "back")
r.deco("statue", 18, 15, "back")
r.deco("column_fallen", 4, 15)
r.deco("rubble_l", 20, 15)
rooms.append(r)

write_world("chapter1", [room.export() for room in rooms])
