"""Echo — the Room helper shared by the chapter build scripts (tools/build_chapter*.py)."""
import json
import os

_SPRITES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sprites.json")


def _decor_height(sprite):
    try:
        rects = json.load(open(_SPRITES))["decor"]["rects"]
    except (OSError, KeyError, ValueError):
        return None
    r = rects.get(sprite) or rects.get(f"{sprite}_0")
    return r["h"] if r else None


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

    def npc(self, x, y, name, script=None):
        """script: which dialogue to use (default: by name), e.g. "quill_ch1"."""
        if script:
            self.obj("npc", x, y, name=name, script=script)
        else:
            self.obj("npc", x, y, name=name)

    def exit(self, x, y, chapter, room, spawn=0):
        """A chapter exit: the full-height strip of column x leads to `room` in `chapter`
        (arriving on that room's spawn number `spawn`)."""
        self.obj("exit", x, y, chapter=chapter, room=room, spawn=spawn)

    # ---- chapter 1 mechanics
    def crumble(self, x0, x1, y):
        """A crumble-stone slab (breaks as one when stood on).
        NO_CRUMBLE=1 in the environment leaves them out: build that way to check with the solver
        that a room can't be climbed without its slabs (then rebuild normally)."""
        if os.environ.get("NO_CRUMBLE"):
            return
        self.fill(x0, y, x1, y, "=")

    def flower(self, x, y):
        """A dash flower centred in tile (x, y). NO_FLOWER=1 leaves them out (gate checks)."""
        if os.environ.get("NO_FLOWER"):
            return
        self.objects.append({"type": "flower", "at": (x, y), "center": True})

    def vent(self, x, y_top, y_bottom, w=1):
        """A wind vent: the air column covers rows y_top..y_bottom, w tiles wide from column x, rising
        from a fissure in the rock under it. NO_VENT=1 leaves them out (gate checks)."""
        if os.environ.get("NO_VENT"):
            return
        self.objects.append({"type": "vent", "at": (x, y_top), "size": (w, y_bottom - y_top + 1)})

    def drift(self, x0, y0, x1, y1):
        """A Drift fracture zone (low gravity) over tiles x0..x1, y0..y1."""
        self.objects.append({"type": "drift", "at": (x0, y0), "size": (x1 - x0 + 1, y1 - y0 + 1)})

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

    def hang(self, sprite, x, ceiling_row, layer="back", exact=False):
        """A decoration hanging under the solid tile at `ceiling_row`. exact=True: its top touches the
        tile's underside (pixel placement); otherwise tile-based (chapter 0's rooms keep that)."""
        lengths = {"hanging_lantern": 1, "vine": 1, "vine_long": 2, "cobweb": 1, "stalactite": 1}
        h = _decor_height(sprite) if exact else None
        if h is None:  # unknown sprite: the old tile-based placement (check_world will complain)
            self.obj("deco", x, ceiling_row + lengths.get(sprite, 1), sprite=sprite, layer=layer)
            return
        # exact: the sprite's top touches the ceiling tile's underside
        self.objects.append({"type": "deco", "at": (x, ceiling_row), "y_px": (ceiling_row + 1) * 16 + h,
                             "props": {"sprite": sprite, "layer": layer}})

    def export(self):
        return {"name": self.name, "at": self.at, "echoes": self.echoes, "props": self.props,
                "objects": self.objects, "rows": ["".join(r) for r in self.grid]}
