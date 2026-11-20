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
            "#........#....S....#",
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


def room_map(room):
    rows = room["rows"]
    h, w = len(rows), len(rows[0])
    data, objects, next_id = [], [], 1
    for ty, row in enumerate(rows):
        assert len(row) == w, f"{room['name']}: row {ty} is {len(row)} wide, expected {w}"
        for tx, ch in enumerate(row):
            data.append(GID.get(ch, 0))
            if ch in "SC":
                objects.append({
                    "id": next_id,
                    "name": "",
                    "type": "spawn" if ch == "S" else "checkpoint",
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
        "properties": [{"name": "echoes", "type": "int", "value": room["echoes"]}],
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


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "terrain.tsj"), "w") as f:
        json.dump(tileset(), f, indent=1)
    world = {"type": "world", "onlyShowAdjacentMaps": False, "maps": []}
    for room in ROOMS:
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
    with open(os.path.join(OUT, f"{WORLD}.world"), "w") as f:
        json.dump(world, f, indent=1)
    print(f"wrote {len(ROOMS)} rooms + {WORLD}.world to {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
