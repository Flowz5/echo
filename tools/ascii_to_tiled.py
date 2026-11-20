#!/usr/bin/env python3
"""Echo — turn quick ASCII room drafts into real Tiled files.

Writes, in assets/levels/:
  terrain.tsj        the editor tileset (image: terrain.png, made by gen_sprites.py)
  <room>.tmj         one Tiled map per room (open and edit them in Tiled)
  <chapter>.world    a Tiled world placing the rooms next to each other

After this first export, Tiled is the source of truth: edit the .tmj/.world files
in Tiled directly. This script is only for drafting new rooms quickly.

    python3 tools/ascii_to_tiled.py

ASCII legend:
  #  ground          -  one-way platform    ^  spikes
  b  pressure plate  D  door                .  empty
  S  spawn point (player feet; respawn spot when entering the room)
  C  checkpoint crystal
  H  Bell Shrine
Objects that need properties (shards, collectibles, NPCs) go in the room's "objects" list:
  {"type": "shard", "at": (col, row), "props": {"unlocks": "dash"}}
  {"type": "npc", "at": (col, row), "props": {"name": "TAMSIN"}}
  types: shard (unlocks: dash/rewind/doubleJump/wallJump/echo), note, page, moment, npc (name)
Room "props" are written as Tiled map properties (echoes, and on the first room: abilities, echoSlots).
"""
import json
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "levels")
TILE = 16
GID = {"#": 1, "-": 2, "^": 3, "b": 4, "D": 5}  # firstgid 1 + tile id
TILE_NAMES = ["ground", "platform", "spikes", "plate", "door"]

# ------------------------------------------------------------------ rooms
# Each room: name, world position in tiles (x, y), max echoes, rows.
ROOMS = [
    {
        "name": "start",
        "at": (0, 0),
        "echoes": 3,
        # the chapter starts with these (the playground lets you unlock dash and rewind)
        "props": {"abilities": "doubleJump, wallJump", "echoSlots": 0},
        "objects": [
            {"type": "npc", "at": (5, 10), "props": {"name": "TAMSIN"}},
            {"type": "shard", "at": (11, 3), "props": {"unlocks": "dash"}},
            {"type": "page", "at": (6, 5)},
        ],
        "rows": [
            "####################",
            "#..................#",
            "#..................#",
            "#..................#",
            "#.........###......#",
            "#..................#",
            "#....---...........#",
            "#...................",
            "#...................",
            "#...................",
            "#.S......C..........",
            "####################",
        ],
    },
    {
        "name": "playground",
        "at": (20, 0),
        "echoes": 3,
        "objects": [
            {"type": "shard", "at": (3, 10), "props": {"unlocks": "rewind"}},
            {"type": "shard", "at": (11, 8), "props": {"unlocks": "echo"}},
            {"type": "moment", "at": (26, 7)},
            {"type": "note", "at": (36, 1)},
            {"type": "page", "at": (51, 1)},
        ],
        "rows": [
            "..........................................................",
            "..........................................................",
            "..................................######.........#...#....",
            ".................................................#...#....",
            ".........................---.....................#...#....",
            ".............######...............---............#...#....",
            ".............#........---.............######.....#...#....",
            ".............#...................................#...#....",
            ".............#...........---.........#...........#...#....",
            ".............D....####...............#...............#....",
            ".S........b..D....####..........######...............#....",
            "######...#####^^^^####^^^^^^^^^^######...#############^^^#",
            "######...#############################...#################",
            "######...#############################...#################",
        ],
    },
    {
        "name": "summit",
        "at": (60, -12),
        "echoes": 3,
        "objects": [
            {"type": "npc", "at": (10, 3), "props": {"name": "QUILL"}},
            {"type": "page", "at": (17, 6)},
        ],
        "rows": [
            "####################",
            "#..................#",
            "#..................#",
            "#.......C..........#",
            "#.....######.......#",
            "#..................#",
            "#..................#",
            "#.............---..#",
            "#..................#",
            "#........#.........#",
            "#.......S#........H#",
            "##########...#....##",
        ],
    },
]
WORLD = "playground"


def tileset():
    return {
        "type": "tileset",
        "version": "1.10",
        "tiledversion": "1.10.2",
        "name": "terrain",
        "image": "terrain.png",
        "imagewidth": TILE * len(TILE_NAMES),
        "imageheight": TILE,
        "tilewidth": TILE,
        "tileheight": TILE,
        "tilecount": len(TILE_NAMES),
        "columns": len(TILE_NAMES),
        "margin": 0,
        "spacing": 0,
        "tiles": [{"id": i, "type": n} for i, n in enumerate(TILE_NAMES)],
    }


def tiled_prop(name, value):
    kind = "bool" if isinstance(value, bool) else "int" if isinstance(value, int) else "float" if isinstance(value, float) else "string"
    return {"name": name, "type": kind, "value": value}


def room_map(room):
    rows = room["rows"]
    h, w = len(rows), len(rows[0])
    data, objects, next_id = [], [], 1
    for ty, row in enumerate(rows):
        assert len(row) == w, f"{room['name']}: row {ty} is {len(row)} wide, expected {w}"
        for tx, ch in enumerate(row):
            data.append(GID.get(ch, 0))
            if ch in "SCH":
                objects.append({
                    "id": next_id,
                    "name": "",
                    "type": {"S": "spawn", "C": "checkpoint", "H": "shrine"}[ch],
                    "point": True,
                    # points mark the feet / the crystal's base: bottom-centre of the tile
                    "x": tx * TILE + TILE / 2,
                    "y": ty * TILE + TILE,
                    "width": 0,
                    "height": 0,
                    "rotation": 0,
                    "visible": True,
                })
                next_id += 1
    for o in room.get("objects", []):
        tx, ty = o["at"]
        obj = {
            "id": next_id,
            "name": o.get("props", {}).get("name", ""),
            "type": o["type"],
            "point": True,
            "x": tx * TILE + TILE / 2,
            "y": ty * TILE + TILE,
            "width": 0,
            "height": 0,
            "rotation": 0,
            "visible": True,
        }
        if o.get("props"):
            obj["properties"] = [tiled_prop(k, v) for k, v in o["props"].items()]
        objects.append(obj)
        next_id += 1
    map_props = [tiled_prop("echoes", room["echoes"])] + [tiled_prop(k, v) for k, v in room.get("props", {}).items()]
    return {
        "type": "map",
        "version": "1.10",
        "tiledversion": "1.10.2",
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "infinite": False,
        "width": w,
        "height": h,
        "tilewidth": TILE,
        "tileheight": TILE,
        "nextlayerid": 3,
        "nextobjectid": next_id,
        "compressionlevel": -1,
        "properties": map_props,
        "tilesets": [{"firstgid": 1, "source": "terrain.tsj"}],
        "layers": [
            {
                "id": 1,
                "name": "terrain",
                "type": "tilelayer",
                "x": 0,
                "y": 0,
                "width": w,
                "height": h,
                "opacity": 1,
                "visible": True,
                "data": data,
            },
            {
                "id": 2,
                "name": "objects",
                "type": "objectgroup",
                "draworder": "topdown",
                "x": 0,
                "y": 0,
                "opacity": 1,
                "visible": True,
                "objects": objects,
            },
        ],
    }


def write_world(world_name, rooms):
    """Writes the tileset, one .tmj per room and <world_name>.world."""
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "terrain.tsj"), "w") as f:
        json.dump(tileset(), f, indent=1)
    world = {"type": "world", "onlyShowAdjacentMaps": False, "maps": []}
    for room in rooms:
        m = room_map(room)
        with open(os.path.join(OUT, f"{room['name']}.tmj"), "w") as f:
            json.dump(m, f, indent=1)
        world["maps"].append({
            "fileName": f"{room['name']}.tmj",
            "x": room["at"][0] * TILE,
            "y": room["at"][1] * TILE,
            "width": m["width"] * TILE,
            "height": m["height"] * TILE,
        })
    with open(os.path.join(OUT, f"{world_name}.world"), "w") as f:
        json.dump(world, f, indent=1)
    print(f"wrote {len(rooms)} rooms + {world_name}.world to {os.path.normpath(OUT)}")


def main():
    write_world(WORLD, ROOMS)


if __name__ == "__main__":
    main()
