#!/usr/bin/env python3
"""Echo — the chapter 1 mechanics test world (dev only: ?world=mechanics).

One room per mechanic (crumble stone, dash flower, wind vent, Drift) plus a combo room,
to feel and tune them by hand and to give the solver something to check.
Run from the repo root:  python3 tools/build_mechanics.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ascii_to_tiled import write_world  # noqa: E402
from room_builder import Room  # noqa: E402

ALL = {"abilities": "doubleJump, wallJump, dash, rewind", "echoSlots": 3}
rooms = []

# mech_test: one of everything, used by the world parsing test
r = Room("mech_test", "Mechanics Test", 24, 14, (0, 0), props=ALL)
r.ground(0, 23, 13)
r.fill(0, 0, 0, 12)
r.fill(23, 0, 23, 12)
r.put(2, 12, "S")
r.crumble(6, 9, 10)
r.flower(13, 8)
r.vent(16, 4, 12)
r.drift(19, 2, 22, 12)
rooms.append(r)

write_world("mechanics", [room.export() for room in rooms])
