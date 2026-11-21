#!/usr/bin/env python3
"""Echo — sanity checks for a Tiled world.

    python3 tools/check_world.py            # every chapter*.world
    python3 tools/check_world.py chapter0   # just these worlds

Reports: overlapping rooms, rooms smaller than the screen, edge openings that lead
nowhere (into a wall, or into the void at the bottom), and objects placed inside
walls or floating where they should stand on the ground. Across worlds: room names
used twice (saves key on room names) and chapter exits that lead nowhere or drop
Iris straight back onto the return exit.
"""
import glob
import json
import os
import sys

LEVELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "levels")
TILE = 16
SOLID = {1, 5, 6}       # ground, door (closed), crumble stone (intact)
STANDABLE = {1, 2, 5, 6}  # + one-way platform
SPIKES, CRUMBLE = 3, 6
GROUNDED = {"spawn", "checkpoint", "shrine", "npc", "lingering"}
HANGING = {"hanging_lantern", "vine", "vine_long", "cobweb", "stalactite", "rose_vine", "lantern_dead", "banner"}
SPRITES = json.load(open(os.path.join(LEVELS, "..", "sprites.json")))
DECOR = SPRITES["decor"]["rects"]


def prop(o, name, default=None):
    for p in o.get("properties", []):
        if p["name"] == name:
            return p["value"]
    return default


def solid_at(room, tx, ty):
    if 0 <= tx < room["w"] and 0 <= ty < room["h"]:
        return tile(room, tx, ty) in SOLID
    return False


def supports(room, tx, ty):
    return 0 <= tx < room["w"] and 0 <= ty < room["h"] and tile(room, tx, ty) in STANDABLE


def object_rect(o):
    """Screen-space rect of things a decoration must not hide."""
    x, y = o["x"], o["y"]
    if o["type"] == "shrine":
        return (x - 8, y - 32, 16, 32)
    if o["type"] in ("npc", "lingering"):
        return (x - 6, y - 24, 12, 24)
    return (x - 6, y - 16, 12, 16)


def check_decor(r, problems):
    targets = [o for o in r["objects"] if o["type"] in ("checkpoint", "shrine", "npc", "shard", "note", "page", "moment")]
    for o in r["objects"]:
        if o["type"] != "deco":
            continue
        name = prop(o, "sprite", "")
        layer = prop(o, "layer", "mid")
        size = DECOR.get(name) or DECOR.get(f"{name}_0")
        label = f"{r['name']}: deco '{name}' at ({int(o['x'] // TILE)},{int(o['y'] // TILE) - 1})"
        if not size:
            problems.append(f"{label}: unknown sprite")
            continue
        w, h = size["w"], size["h"]
        x0, x1 = o["x"] - w / 2 + 2, o["x"] + w / 2 - 2      # a little forgiveness on the edges
        top, base = o["y"] - h, o["y"]
        cols = range(int(x0 // TILE), int((x1 - 0.01) // TILE) + 1)
        if name in HANGING:
            if not solid_at(r, int(o["x"] // TILE), int((top - 1) // TILE)) and not supports(r, int(o["x"] // TILE), int((top - 1) // TILE)):
                problems.append(f"{label}: hangs from nothing")
            continue
        under = int(base // TILE)
        supported = [supports(r, c, under) for c in cols]
        if layer == "back":
            if sum(supported) < max(1, len(supported) * 0.6):
                problems.append(f"{label}: floats (not enough ground under it)")
        else:
            if not all(supported):
                problems.append(f"{label}: overhangs or floats")
            body_rows = range(int(top // TILE), int((base - 1) // TILE) + 1)
            if any(solid_at(r, c, row) for c in cols for row in body_rows):
                problems.append(f"{label}: goes into a wall")
            for t in targets:
                tx, ty, tw, th = object_rect(t)
                if x0 < tx + tw and tx < x1 and top < ty + th and ty < base:
                    problems.append(f"{label}: hides a {t['type']}")


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
        exit_columns = {int(o["x"] // TILE) for o in exits(r)}
        for (ix, iy), (ox, oy), side in edges:
            if tile(r, ix, iy) in SOLID:
                continue
            if side in ("left", "right") and ix in exit_columns:
                continue  # a chapter exit stands on this edge: Iris leaves through it
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
            if o["type"] in ("vent", "drift"):
                x0, y0 = int(o["x"] // TILE), int(o["y"] // TILE)
                if o["type"] == "vent" and any(solid_at(r, x, y0) for x in range(x0, x0 + max(1, int(o["width"] // TILE)))):
                    problems.append(f"{r['name']}: vent at column {x0}: the top of its air column is inside a wall")
                continue
            if o["type"] == "deco" and prop(o, "sprite", "") in HANGING:
                continue  # checked by check_decor (hangs from something)
            if o["type"] == "flower":
                if solid_at(r, int(o["x"] // TILE), int(o["y"] // TILE)):
                    problems.append(f"{r['name']}: flower at ({int(o['x'] // TILE)},{int(o['y'] // TILE)}) is inside a wall")
                continue
            tx, ty = int(o["x"] // TILE), int(o["y"] // TILE)  # tile under the feet
            # chapter 0 predates this rule: report it there as a note, not a problem
            spawn_issues = notes if world == "chapter0" else problems
            if o["type"] == "spawn" and ty < r["h"]:
                if tile(r, tx, ty) == CRUMBLE:
                    spawn_issues.append(f"{r['name']}: spawn at ({tx},{ty - 1}) stands on crumble stone")
                near = [x for x in range(tx - 2, tx + 3) if 0 <= x < r["w"] and 0 < ty and tile(r, x, ty - 1) == SPIKES]
                if near:
                    spawn_issues.append(f"{r['name']}: spawn at ({tx},{ty - 1}) is within 2 tiles of thorns")
            here = tile(r, tx, ty - 1) if 0 < ty <= r["h"] else 0
            below = tile(r, tx, ty) if ty < r["h"] else 0
            label = f"{r['name']}: {o['type']} at ({tx},{ty - 1})"
            if here in SOLID:
                problems.append(f"{label} is inside a wall")
            elif o["type"] in GROUNDED and below not in STANDABLE:
                problems.append(f"{label} is floating (nothing to stand on)")

    for r in rooms:
        check_decor(r, problems)

    report(f"{world}: {len(rooms)} rooms", notes, problems)
    return 1 if problems else 0


def report(title, notes, problems):
    print(title)
    for n in notes:
        print("  ·", n)
    for p in problems:
        print("  ✗", p)
    if not problems:
        print("  ✓ no problems found")


def exits(room):
    return [o for o in room["objects"] if o["type"] == "exit"]


def spawns(room):
    return [o for o in room["objects"] if o["type"] == "spawn"]


def check_links(worlds):
    """Checks between worlds: unique room names, chapter exits."""
    problems = []
    seen = {}
    for world, rooms in worlds.items():
        for r in rooms:
            if r["name"] in seen:
                problems.append(f"{r['name']} is in both {seen[r['name']]} and {world}")
            seen.setdefault(r["name"], world)
    for world, rooms in worlds.items():
        for r in rooms:
            for e in exits(r):
                label = f"{r['name']}: exit at column {int(e['x'] // TILE)}"
                target_world, target_room, spawn = prop(e, "chapter"), prop(e, "room"), prop(e, "spawn", 0)
                if target_world not in worlds:
                    problems.append(f"{label} leads to unknown chapter {target_world!r}")
                    continue
                target = next((t for t in worlds[target_world] if t["name"] == target_room), None)
                if target is None:
                    problems.append(f"{label} leads to unknown room {target_room!r} in {target_world}")
                    continue
                points = spawns(target)
                if not 0 <= spawn < len(points):
                    problems.append(f"{label} leads to spawn {spawn} of {target_room}, which has {len(points)}")
                    continue
                column = int(points[spawn]["x"] // TILE)
                if any(int(x["x"] // TILE) == column for x in exits(target)):
                    problems.append(f"{target_room}: arriving spawn stands on an exit (column {column})")
    return problems


if __name__ == "__main__":
    names = sys.argv[1:] or sorted(os.path.basename(p)[:-6] for p in glob.glob(os.path.join(LEVELS, "chapter*.world")))
    status = 0
    for name in names:
        status |= main(name)
    if len(names) > 1:
        links = check_links({name: load(name) for name in names})
        report("links between chapters", [], links)
        status |= 1 if links else 0
    sys.exit(status)
