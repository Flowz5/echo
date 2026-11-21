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
r.fill(23, 0, 23, 10)                  # open at the bottom right: on to the next room
r.put(2, 12, "S")
r.crumble(6, 9, 10)
r.flower(13, 8)
r.vent(16, 4, 12)
r.drift(19, 2, 22, 12)
rooms.append(r)

# mech_crumble: short slabs over thorns; standing still is death, running across works
r = Room("mech_crumble", "Crumbling Walk", 32, 16, (24, 0), props=ALL)
r.ground(0, 3, 13)
r.fill(0, 0, 0, 10)
r.spikes(4, 27, 14)
for x0 in (6, 11, 16, 21):
    r.crumble(x0, x0 + 2, 12)
r.ground(28, 31, 13)
r.put(2, 12, "S")
rooms.append(r)

# mech_flower: a thorn gap too wide for jump + double jump + dash, crossable with the flower
r = Room("mech_flower", "Rose Gap", 32, 16, (56, 0), props=ALL)
r.ground(0, 5, 13)
r.spikes(6, 19, 14)
r.ground(20, 31, 13)
r.flower(13, 10)
r.put(2, 12, "S")
rooms.append(r)

# mech_vent: a ledge too high for the double jump from the top of the updraft; dash out of it
r = Room("mech_vent", "Updraft", 32, 24, (88, -8), props=ALL)
r.ground(0, 31, 21)
r.fill(0, 0, 0, 7)                     # above the previous room
r.vent(10, 10, 20, w=2)
r.fill(15, 6, 31, 7)                   # the high ledge (floating, its face too short to climb)
r.fill(31, 0, 31, 3)
r.put(3, 20, "S")
rooms.append(r)

# mech_drift: a floating jump over a long thorn pit
r = Room("mech_drift", "Drift Pit", 32, 16, (120, 0), props=ALL)
r.ground(0, 4, 13)
r.spikes(5, 19, 14)
r.ground(20, 31, 10)
r.drift(3, 0, 19, 13)
r.put(2, 12, "S")
rooms.append(r)

# mech_combo: crumble, flower, vent, drift in one line, exit at the top right
r = Room("mech_combo", "All Together", 40, 24, (152, -8), props=ALL)
r.ground(0, 3, 21)
r.spikes(4, 39, 22)
r.crumble(5, 7, 19)
r.crumble(10, 12, 19)
r.flower(16, 17)
r.ground(19, 25, 21)
r.vent(26, 11, 21, w=2)
r.drift(29, 0, 39, 12)
r.fill(34, 8, 39, 9)                   # the exit ledge, inside the Drift zone
r.fill(39, 0, 39, 21)
r.fill(0, 0, 0, 7)
r.put(1, 20, "S")
rooms.append(r)

write_world("mechanics", [room.export() for room in rooms])
