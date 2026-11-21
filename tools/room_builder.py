"""Echo — the Room helper shared by the chapter build scripts (tools/build_chapter*.py)."""


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

    def exit(self, x, y, chapter, room, spawn=0):
        """A chapter exit: the full-height strip of column x leads to `room` in `chapter`
        (arriving on that room's spawn number `spawn`)."""
        self.obj("exit", x, y, chapter=chapter, room=room, spawn=spawn)

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
