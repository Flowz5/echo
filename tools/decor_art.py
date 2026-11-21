"""Echo — decoration sprites (trees, houses, rocks, grass…), drawn procedurally.

Used by gen_sprites.py, which packs them into assets/sprites/decor.png and
writes their rectangles into sprites.json ("decor"). Everything uses the Echo
palette keys (see gen_sprites.PALETTE).
"""
import math

from gen_sprites import Img, from_grid, hsh


# ------------------------------------------------------------------ helpers
def outline(img, key="K"):
    """Adds a 1px outline around every opaque pixel (outside the shape)."""
    filled = [[img.px[y][x] is not None for x in range(img.w)] for y in range(img.h)]
    for y in range(img.h):
        for x in range(img.w):
            if filled[y][x]:
                continue
            if any(0 <= x + dx < img.w and 0 <= y + dy < img.h and filled[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                img.set(x, y, key)
    return img


def disc(img, cx, cy, r, key_fn):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                k = key_fn(x, y)
                if k:
                    img.set(x, y, k)


def line(img, x0, y0, x1, y1, key):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(1, n)
        img.set(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), key)


def foliage_key(cx, cy, seed):
    """Moss shading: light from the top-left, a few bright speckles."""
    def k(x, y):
        light = (cx - x) * 0.6 + (cy - y)
        r = hsh(x, y, seed)
        if light > 6 and r < 0.35:
            return "n"
        if light > 1:
            return "M"
        return "m" if r > 0.08 else "M"
    return k


# ------------------------------------------------------------------ trees
def pine(w=24, h=48, seed=1):
    img = Img(w, h)
    cx = w / 2 - 0.5
    for y in range(h - 10, h):
        for x in (int(cx), int(cx) + 1):
            img.set(x, y, "v" if x == int(cx) else "3")
    tiers = 5
    for i in range(tiers):
        top = 1 + i * 7
        height = 13
        for dy in range(height):
            half = 1 + (dy * (3 + i * 1.6)) / height
            y = top + dy
            for x in range(int(cx - half), int(cx + half) + 2):
                if 0 <= x < w and y < h - 8:
                    left = x < cx
                    r = hsh(x, y, seed)
                    img.set(x, y, "n" if (left and dy < 3 and r < 0.5) else ("M" if left else "m"))
    return outline(img)


def round_tree(w=40, h=44, seed=2, apples=False):
    img = Img(w, h)
    # trunk and two roots
    for y in range(26, h):
        for x in range(18, 22):
            img.set(x, y, "3" if x == 21 else "v")
    line(img, 17, h - 1, 15, h - 1, "v")
    line(img, 22, h - 1, 24, h - 1, "v")
    line(img, 19, 30, 13, 24, "v")
    line(img, 21, 29, 27, 23, "v")
    blobs = [(20, 13, 11), (10, 18, 8), (30, 18, 8), (20, 21, 9), (14, 9, 6), (27, 10, 6)]
    for cx, cy, r in blobs:
        disc(img, cx, cy, r, foliage_key(16, 6, seed))
    if apples:
        for i in range(9):
            ax = 6 + int(hsh(i, 1, seed) * 28)
            ay = 8 + int(hsh(i, 2, seed) * 16)
            if img.get(ax, ay):
                img.set(ax, ay, "P")
                img.set(ax + 1, ay, "p")
    return outline(img)


def dead_tree(w=26, h=40):
    img = Img(w, h)
    for y in range(8, h):
        x = 12 + int(math.sin(y * 0.25) * 1.5)
        img.set(x, y, "3")
        img.set(x + 1, y, "4" if y % 5 else "3")
    for (x0, y0, x1, y1) in [(12, 20, 4, 10), (13, 16, 22, 6), (12, 28, 3, 24), (13, 26, 21, 20), (8, 15, 6, 8), (18, 11, 23, 9)]:
        line(img, x0, y0, x1, y1, "3")
    return outline(img)


def bush(w=24, h=12, seed=3):
    img = Img(w, h)
    for cx, cy, r in [(6, 8, 5), (12, 6, 6), (18, 8, 5)]:
        disc(img, cx, cy, r, foliage_key(8, 2, seed))
    for x in range(w):
        for y in range(h - 1, h):
            if img.get(x, y - 1):
                img.set(x, y, "m")
    return outline(img)


# ------------------------------------------------------------------ village
def house(w=56, h=48, seed=4):
    img = Img(w, h)
    wall_top = int(h * 0.42)
    # stone walls
    for y in range(wall_top, h):
        for x in range(4, w - 4):
            mortar = (y - wall_top) % 5 == 4 or (x + (6 if ((y - wall_top) // 5) % 2 else 0)) % 12 == 0
            img.set(x, y, "2" if mortar else ("4" if hsh(x, y, seed) < 0.06 else "3"))
    # roof
    for y in range(2, wall_top + 2):
        t = (y - 2) / (wall_top)
        half = 4 + t * (w / 2 - 1)
        for x in range(int(w / 2 - half), int(w / 2 + half) + 1):
            if 0 <= x < w:
                shingle = (y % 4 == 0) or ((x + (y // 4) * 3) % 7 == 0)
                img.set(x, y, "v" if shingle else ("V" if x < w / 2 else "p"))
    # chimney
    for y in range(4, wall_top - 2):
        for x in range(w - 16, w - 11):
            img.set(x, y, "3" if x < w - 12 else "2")
    # door
    dw = 8
    dx = w // 2 - dw // 2
    for y in range(h - 15, h):
        for x in range(dx, dx + dw):
            img.set(x, y, "G" if x in (dx, dx + dw - 1) or y == h - 15 else "1")
    img.set(dx + dw - 3, h - 8, "g")
    # warm windows
    for wx in (10, w - 18):
        for y in range(wall_top + 7, wall_top + 15):
            for x in range(wx, wx + 8):
                frame = x in (wx, wx + 7) or y in (wall_top + 7, wall_top + 14) or x == wx + 3 or y == wall_top + 10
                img.set(x, y, "G" if frame else ("W" if (x + y) % 5 == 0 else "q"))
    return outline(img)


def fence(w=32, h=12):
    img = Img(w, h)
    for px in (1, 15, 29):
        for y in range(0, h):
            img.set(px, y, "g")
            img.set(px + 1, y, "G")
    for ry in (3, 8):
        for x in range(w):
            if img.get(x, ry) is None:
                img.set(x, ry, "g" if (x // 3) % 3 else "G")
    return outline(img)


def lantern_post(w=10, h=30):
    img = Img(w, h)
    for y in range(7, h):
        img.set(4, y, "G")
        img.set(5, y, "g")
    for x in range(2, 8):
        img.set(x, h - 1, "G")
    for y in range(1, 8):
        for x in range(2, 8):
            frame = x in (2, 7) or y in (1, 7)
            img.set(x, y, "G" if frame else ("W" if y in (3, 4) and x in (4, 5) else "q"))
    img.set(4, 0, "G")
    img.set(5, 0, "G")
    return outline(img)


def hanging_lantern(w=8, h=16):
    img = Img(w, h)
    for y in range(0, 8):
        img.set(3 + (y % 2), y, "G")
    for y in range(8, 15):
        for x in range(1, 7):
            frame = x in (1, 6) or y in (8, 14)
            img.set(x, y, "G" if frame else ("W" if y in (10, 11) and x in (3, 4) else "q"))
    return outline(img)


def sign(w=16, h=16):
    img = Img(w, h)
    for y in range(6, h):
        img.set(7, y, "g")
        img.set(8, y, "G")
    for y in range(1, 7):
        for x in range(1, 15):
            img.set(x, y, "G" if y in (1, 6) or x in (1, 14) else "g")
    for x in range(3, 12, 2):
        img.set(x, 3, "G")
    for x in range(4, 10, 2):
        img.set(x, 4, "G")
    return outline(img)


def sign_arrow(w=16, h=16):
    """A wayside sign whose board points right, with a pale chevron: "the way goes on"."""
    img = Img(w, h)
    for y in range(6, h):
        img.set(5, y, "g")
        img.set(6, y, "G")
    for y in range(1, 7):
        tip = 11 + min(y - 1, 6 - y)  # the board's right end is pointed
        for x in range(1, tip + 1):
            img.set(x, y, "G" if y in (1, 6) or x == 1 or x == tip else "g")
    for i, y in enumerate((2, 3, 4, 5)):  # chevron >
        img.set(6 + min(i, 3 - i), y, "W")
        img.set(7 + min(i, 3 - i), y, "W")
    return outline(img)


def cart(w=32, h=20):
    img = Img(w, h)
    for y in range(4, 12):
        for x in range(2, 26):
            img.set(x, y, "G" if y in (4, 11) or x % 6 == 2 else "g")
    line(img, 25, 9, 31, 14, "g")
    disc(img, 8, 14, 5, lambda x, y: "G" if (x - 8) ** 2 + (y - 14) ** 2 > 12 else ("g" if (x + y) % 3 else "G"))
    # the second wheel lies broken on the ground
    for x in range(18, 26):
        img.set(x, h - 1, "G")
        img.set(x, h - 2, "g")
    return outline(img)


def mill_wheel(w=48, h=48):
    img = Img(w, h)
    c = (w - 1) / 2
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - c, y - c)
            if 19 <= d <= 22:
                img.set(x, y, "g" if d < 21 else "G")
            elif d <= 4:
                img.set(x, y, "g" if d < 3 else "G")
    for i in range(8):
        a = i * math.pi / 4 + 0.2
        line(img, c + math.cos(a) * 4, c + math.sin(a) * 4, c + math.cos(a) * 20, c + math.sin(a) * 20, "G")
        # paddles
        px, py = c + math.cos(a) * 22, c + math.sin(a) * 22
        line(img, px - math.sin(a) * 3, py + math.cos(a) * 3, px + math.sin(a) * 3, py - math.cos(a) * 3, "g")
    return outline(img)


def crate(w=14, h=14):
    img = Img(w, h)
    for y in range(h):
        for x in range(w):
            edge = x in (0, w - 1) or y in (0, h - 1)
            diag = x == y or x == w - 1 - y
            img.set(x, y, "G" if edge or diag else "g")
    return outline(img)


def barrel(w=10, h=14):
    img = Img(w, h)
    for y in range(h):
        bulge = 1 if 3 <= y <= h - 4 else 0
        for x in range(1 - bulge, w - 1 + bulge):
            img.set(x, y, "3" if y in (2, h - 3) else ("G" if x <= 2 else "g"))
    return outline(img)


def well_post(w=10, h=18):
    img = Img(w, h)
    for y in range(h):
        for x in range(1, w - 1):
            img.set(x, y, "2" if y % 6 == 5 or (x == 4 and (y // 6) % 2) else ("4" if x == 2 else "3"))
    return outline(img)


def ruin_pillar(w=14, h=32, seed=5):
    img = Img(w, h)
    for y in range(h):
        broken = y < 6 and hsh(int(y), 3, seed) * 6 > (6 - y)
        for x in range(2, w - 2):
            top_cut = y < (3 + int(hsh(x, 9, seed) * 5))
            if top_cut:
                continue
            img.set(x, y, "2" if y % 8 == 7 else ("4" if x == 3 else "3"))
    return outline(img)


# ------------------------------------------------------------------ small things on the ground
GRASS = [
    ["........", "...n....", ".n.n..n.", ".nMn.nM.", "MnMM.MMn", "MMMMMMMM"],
    ["........", "......n.", "..n...n.", ".nM..nMn", ".MMn.MM.", "MMMMMMMM"],
    ["....n...", "..n.n...", "..nMn.n.", ".nMMMnM.", ".MMMMMM.", "MMMMMMMM"],
]


def grass(variant, frame):
    rows = GRASS[variant]
    if frame:
        # sway: the tips lean one pixel to the right
        rows = ["." + r[:-1] if i < 3 else r for i, r in enumerate(rows)]
    return from_grid(rows)


def flower(petal, center="W"):
    rows = [
        ".a.a.",
        "aaaaa",
        ".aca.",
        "..M..",
        ".MM..",
        "..M..",
        "..M..",
    ]
    return from_grid([r.replace("a", petal).replace("c", center) for r in rows])


def mushroom():
    return from_grid([
        ".KKKKK.",
        "KPWPPqK",
        "KPPPWPK",
        ".KKWKK.",
        "..KWK..",
        "..KgK..",
    ])


def rock(w, h, seed):
    img = Img(w, h)
    cx, cy = (w - 1) / 2, h - 1
    for y in range(h):
        for x in range(w):
            if ((x - cx) / (w / 2)) ** 2 + ((y - cy) / h) ** 2 <= 1:
                top = ((x - cx) / (w / 2)) ** 2 + ((y - cy + 1.5) / h) ** 2 > 0.85
                img.set(x, y, "4" if top and x < cx + 2 else ("g" if hsh(x, y, seed) < 0.05 else "3"))
    return outline(img)


def vine(h=18, seed=6):
    img = Img(6, h)
    for y in range(h):
        x = 2 + int(math.sin(y * 0.7 + seed) * 1.2)
        img.set(x, y, "m")
        if y % 3 == 0:
            img.set(x - 1, y, "M")
            img.set(x + 1, y + 1, "M")
    return img


def cobweb():
    img = Img(12, 12)
    for i in range(12):
        img.set(i, 0, "g" if i % 2 == 0 else None)
        img.set(0, i, "g" if i % 2 == 0 else None)
    line(img, 0, 0, 11, 11, "g")
    line(img, 0, 0, 11, 5, "g")
    line(img, 0, 0, 5, 11, "g")
    for r in (4, 8):
        for a in range(0, 91, 10):
            img.set(round(math.cos(math.radians(a)) * r), round(math.sin(math.radians(a)) * r), "g")
    return img


def stalactite(seed=7):
    return from_grid([
        "KKKKKK",
        "K343 K".replace(" ", "3"),
        ".K33K.",
        ".K34K.",
        ".K33K.",
        "..K3K.",
        "..K3K.",
        "..KK..",
        "..K...",
    ])


def crystals():
    img = Img(12, 12)
    for (bx, h) in ((2, 6), (5, 10), (8, 7)):
        for y in range(12 - h, 12):
            img.set(bx, y, "W")
            img.set(bx + 1, y, "g")
    return outline(img)


# ------------------------------------------------------------------ catalog
def build_decor():
    """name -> Img. Names ending in _0/_1 are 2-frame animations (grass sway)."""
    d = {}
    d["pine"] = pine()
    d["pine_small"] = pine(18, 34, seed=9)
    d["tree"] = round_tree()
    d["apple_tree"] = round_tree(seed=8, apples=True)
    d["dead_tree"] = dead_tree()
    d["bush"] = bush()
    d["bush_small"] = bush(16, 10, seed=11)
    d["house"] = house()
    d["house_small"] = house(40, 38, seed=12)
    d["fence"] = fence()
    d["lantern_post"] = lantern_post()
    d["hanging_lantern"] = hanging_lantern()
    d["sign"] = sign()
    d["sign_arrow"] = sign_arrow()
    d["cart"] = cart()
    d["mill_wheel"] = mill_wheel()
    d["crate"] = crate()
    d["barrel"] = barrel()
    d["well_post"] = well_post()
    d["ruin_pillar"] = ruin_pillar()
    for v in range(3):
        for f in range(2):
            d[f"grass{v}_{f}"] = grass(v, f)
    d["flower_rose"] = flower("P")
    d["flower_bone"] = flower("W", "y")
    d["flower_lilac"] = flower("V")
    d["mushroom"] = mushroom()
    d["rock_s"] = rock(8, 5, 1)
    d["rock_m"] = rock(14, 8, 2)
    d["rock_l"] = rock(22, 12, 3)
    d["vine"] = vine()
    d["vine_long"] = vine(28, seed=2)
    d["cobweb"] = cobweb()
    d["stalactite"] = stalactite()
    d["crystals"] = crystals()
    from ruins_art import build_ruins_decor  # noqa: E402 (chapter 1 sprites live in their own file)
    d.update(build_ruins_decor())
    return d


def pack(sprites, width=256):
    """Shelf packing. Returns (atlas Img, {name: {x, y, w, h}})."""
    items = sorted(sprites.items(), key=lambda kv: -kv[1].h)
    x = y = shelf = 0
    rects = {}
    for name, img in items:
        if x + img.w > width:
            x = 0
            y += shelf + 1
            shelf = 0
        rects[name] = {"x": x, "y": y, "w": img.w, "h": img.h}
        x += img.w + 1
        shelf = max(shelf, img.h)
    atlas = Img(width, y + shelf)
    for name, img in sprites.items():
        r = rects[name]
        atlas.blit(img, r["x"], r["y"])
    return atlas, rects
