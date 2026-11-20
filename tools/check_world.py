#!/usr/bin/env python3
"""Echo — sanity checks for a Tiled world.

    python3 tools/check_world.py chapter0

Reports: overlapping rooms, rooms smaller than the screen, edge openings that lead
nowhere (into a wall, or into the void at the bottom), and objects placed inside
walls or floating where they should stand on the ground.
"""
import json
import os
import sys

LEVELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "levels")
TILE = 16
SOLID = {1, 5}          # ground, door (closed)
STANDABLE = {1, 2, 5}   # + one-way platform
GROUNDED = {"spawn", "checkpoint", "shrine", "npc", "lingering"}


def load(world):
    w = json.load(open(os.path.join(LEVELS, f"{world}.world")))
    rooms = []
    for m in w["maps"]:
        t = json.load(open(os.path.join(LEVELS, m["fileName"])))
        layer = next(l for l in t["layers"] if l["name"] == "terrain")
        objs = next((l["objects"] for l in t["layers"] if l["type"] == "objectgroup"), [])
        rooms.append({"name": m["fileName"][:-4], "x": m["x"] // TILE, "y": m["y"] // TILE,
                      "w": t["width"], "h": t["height"], "data": layer["data"], "objects": objs})
    return rooms


def tile(room, tx, ty):
    return room["data"][ty * room["w"] + tx]


def room_at(rooms, wx, wy, skip=None):
    for r in rooms:
        if r is not skip and r["x"] <= wx < r["x"] + r["w"] and r["y"] <= wy < r["y"] + r["h"]:
            return r
    return None


def main(world):
    rooms = load(world)
    problems, notes = [], []
    for i, a in enumerate(rooms):
        if a["w"] < 20 or a["h"] < 12:
            problems.append(f"{a['name']}: smaller than the screen ({a['w']}x{a['h']}, min 20x12)")
        for b in rooms[i + 1:]:
            if a["x"] < b["x"] + b["w"] and b["x"] < a["x"] + a["w"] and a["y"] < b["y"] + b["h"] and b["y"] < a["y"] + a["h"]:
                problems.append(f"{a['name']} and {b['name']} overlap")

    for r in rooms:
        edges = [((tx, 0), (tx, -1), "top") for tx in range(r["w"])] + \
                [((tx, r["h"] - 1), (tx, r["h"]), "bottom") for tx in range(r["w"])] + \
                [((0, ty), (-1, ty), "left") for ty in range(r["h"])] + \
                [((r["w"] - 1, ty), (r["w"], ty), "right") for ty in range(r["h"])]
        leads = {}
        for (ix, iy), (ox, oy), side in edges:
            if tile(r, ix, iy) in SOLID:
                continue
            other = room_at(rooms, r["x"] + ox, r["y"] + oy, r)
            if other is None:
                key = (side, "void" if side == "bottom" else "wall")
            else:
                inside = tile(other, r["x"] + ox - other["x"], r["y"] + oy - other["y"])
                key = (side, f"-> {other['name']}" + (" (blocked)" if inside in SOLID else ""))
            leads.setdefault(key, 0)
            leads[key] += 1
        for (side, what), n in sorted(leads.items()):
            line = f"{r['name']}: {n} open tile(s) on the {side} edge {what}"
            if what == "wall" and side == "top":
                line += " (open sky: invisible ceiling)"
            (problems if what == "wall" and side != "top" and n > 2 else notes).append(line)

        for o in r["objects"]:
            tx, ty = int(o["x"] // TILE), int(o["y"] // TILE)  # tile under the feet
            here = tile(r, tx, ty - 1) if 0 < ty <= r["h"] else 0
            below = tile(r, tx, ty) if ty < r["h"] else 0
            label = f"{r['name']}: {o['type']} at ({tx},{ty - 1})"
            if here in SOLID:
                problems.append(f"{label} is inside a wall")
            elif o["type"] in GROUNDED and below not in STANDABLE:
                problems.append(f"{label} is floating (nothing to stand on)")

    print(f"{world}: {len(rooms)} rooms")
    for n in notes:
        print("  ·", n)
    for p in problems:
        print("  ✗", p)
    if not problems:
        print("  ✓ no problems found")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "chapter0"))
