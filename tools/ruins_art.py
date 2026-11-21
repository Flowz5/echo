"""Echo — chapter 1 "Starfall Ruins" decoration sprites, drawn procedurally.

The ruins of the Tollers' old town, on stone bridges over a bottomless gorge (SCRIPT.md §5,
chapter 1): roofless stone houses, broken arches and pillars, fallen bells gone green with
verdigris, rubble, rose gardens run wild, dead lanterns, torn bell banners, bridge railings.
Palette rules: stone in the night blues, moss and verdigris in the greens, roses in the rose
keys; no amber (interactables only) and no cyan (time and echoes only).
Packed with the other decor by gen_sprites.py (see decor_art.build_decor).
"""
import math

from gen_sprites import Img, from_grid, hsh
from decor_art import disc, line, outline


def stone(x, y, seed, bw=6, bh=4):
    """Cut-stone masonry key: mortar lines, staggered courses, a few lit or worn blocks."""
    course = y // bh
    off = (bw // 2) if course % 2 else 0
    if y % bh == bh - 1 or (x + off) % bw == 0:
        return "2"
    r = hsh((x + off) // bw, course, seed)
    if r < 0.12:
        return "4"
    return "3" if r > 0.08 else "2"


def mossy(img, seed, amount=0.5):
    """Moss on the upper edges of a shape (pixels with air above)."""
    for y in range(1, img.h):
        for x in range(img.w):
            if img.px[y][x] is None or img.px[y - 1][x] is not None:
                continue
            if hsh(x, y, seed) < amount:
                img.set(x, y, "M")
                if y + 1 < img.h and img.px[y + 1][x] is not None and hsh(x, y + 1, seed) < 0.5:
                    img.set(x, y + 1, "m")
                if hsh(x, y, seed + 1) < 0.25:
                    img.set(x, y - 1, "n")


def ruined_house(w=56, h=46, seed=21):
    """A roofless Toller house: jagged broken walls, an empty arched window, a doorway."""
    img = Img(w, h)
    for x in range(3, w - 3):
        # the broken top edge: high on the left, collapsed towards the right
        top = int(6 + (x / w) * 14 + hsh(x // 3, 1, seed) * 7)
        for y in range(top, h):
            img.set(x, y, stone(x, y, seed))
    # arched window (dark, empty)
    wx, wy, ww = 10, 18, 9
    for y in range(wy, wy + 12):
        for x in range(wx, wx + ww):
            dx = x - (wx + ww / 2 - 0.5)
            if y < wy + 4 and dx * dx + (wy + 4 - y) ** 2 * 1.4 > (ww / 2) ** 2:
                continue
            img.set(x, y, "1" if x not in (wx, wx + ww - 1) else "K")
    for x in range(wx, wx + ww):
        img.set(x, wy + 12, "4")  # sill
    # doorway
    dw, dx0 = 10, w // 2 + 2
    for y in range(h - 16, h):
        for x in range(dx0, dx0 + dw):
            img.set(x, y, "K" if x in (dx0, dx0 + dw - 1) or y == h - 16 else "1")
    mossy(img, seed, 0.55)
    return outline(img)


def broken_arch(w=48, h=42, seed=22):
    """A stone arch whose right half has fallen: one full pier, the curve snapped off past its top."""
    img = Img(w, h)
    cx, cy = w / 2, h * 0.55
    r_out, r_in = w / 2 - 2, w / 2 - 10
    for y in range(h):
        for x in range(w):
            dx, dy = x - cx, cy - y
            if dy > 0:
                d2 = dx * dx + dy * dy
                if not (r_in * r_in < d2 < r_out * r_out):
                    continue
                # angle from the left springing (0) over the top (90) to the right (180)
                ang = math.degrees(math.atan2(dy, -dx))
                if ang > 100 + hsh(int(math.hypot(dx, dy)), 3, seed) * 14:
                    continue  # the fallen part, with a ragged break
                img.set(x, y, stone(x, y, seed, 5, 4))
            elif 2 <= x < 10:
                img.set(x, y, stone(x, y, seed, 5, 4))
            elif w - 10 <= x < w - 2 and y > h - 10 + int(hsh(x, 1, seed) * 3):
                img.set(x, y, stone(x, y, seed, 5, 4))  # the stump of the other pier
    mossy(img, seed, 0.6)
    return outline(img)

def tall_pillar(w=14, h=50, seed=23):
    """A fluted column, snapped off at the top."""
    img = Img(w, h)
    for y in range(h):
        for x in range(2, w - 2):
            if y < 4 + int(hsh(x, 2, seed) * 6):
                continue
            capital = y > h - 5 or (h - 10 < y < h - 7)
            flute = (x - 2) % 3 == 0
            img.set(x, y, "4" if capital and y % 2 == 0 else ("2" if flute else ("4" if x == 3 else "3")))
    mossy(img, seed, 0.5)
    return outline(img)


def fallen_column(w=42, h=12, seed=24):
    """A column lying on the ground in two pieces."""
    img = Img(w, h)
    for x in range(1, w - 1):
        if 25 <= x <= 27:
            continue
        for y in range(2, h):
            ring = x % 8 == 0
            img.set(x, y, "2" if ring or y == h - 1 else ("4" if y == 3 else "3"))
    mossy(img, seed, 0.4)
    return outline(img)


def fallen_bell(w=40, h=31, seed=25):
    """A great bell lying on its side (crown left, mouth right), green with verdigris, cracked."""
    img = Img(w, h)
    cy = h - 1 - 14.5  # axis of the bell: the flared lip rests on the ground
    for x in range(3, w - 2):
        t = (x - 3) / (w - 6)  # 0 crown .. 1 lip
        # bell profile: rounded shoulder, gently widening waist, flared lip
        half = 6.5 + 2.5 * t + (5.5 * ((t - 0.72) / 0.28) ** 2 if t > 0.72 else 0)
        if t < 0.12:
            half *= math.sqrt(t / 0.12) * 0.6 + 0.4  # round the shoulder
        for y in range(int(round(cy - half)), int(round(cy + half)) + 1):
            if not 0 <= y < h:
                continue
            light = (cy - y) / max(1.0, half)
            k = "n" if light > 0.5 and hsh(x, y, seed) < 0.55 else ("M" if light > -0.25 else "m")
            if 0.66 < t < 0.7:
                k = "n" if light > 0 else "M"  # the sound-bow band
            img.set(x, y, k)
    # the mouth seen edge-on: a dark ellipse inside the lip
    for y in range(h):
        for x in range(w - 6, w - 1):
            if ((x - (w - 3.5)) / 2.4) ** 2 + ((y - cy) / 12.5) ** 2 < 1:
                img.set(x, y, "1")
    for y in range(int(cy - 3), int(cy + 3)):  # the crown loop
        img.set(1, y, "m"), img.set(2, y, "M")
    line(img, 16, int(cy - 8), 21, int(cy + 2), "K")  # the crack
    line(img, 21, int(cy + 2), 19, int(cy + 7), "K")
    return outline(img)

def rubble(w, h, seed):
    """A heap of cut stones."""
    img = Img(w, h)
    for i in range(int(w * h / 18)):
        bx = int(hsh(i, 1, seed) * (w - 6))
        bw = 4 + int(hsh(i, 2, seed) * 4)
        peak = h * (1 - abs(bx + bw / 2 - w / 2) / (w / 2)) ** 0.8
        by = int(h - 1 - hsh(i, 3, seed) * peak)
        for y in range(max(0, by - 2), min(h, by + 2)):
            for x in range(bx, min(w, bx + bw)):
                img.set(x, y, "4" if y == by - 2 else ("2" if x == bx + bw - 1 else "3"))
    for x in range(w):  # fill the bottom of the heap
        for y in range(h - 2, h):
            if img.px[y][x] is None and 1 < x < w - 2:
                img.set(x, y, "2")
    mossy(img, seed, 0.25)
    return outline(img)


def rose_bush(w=24, h=14, seed=26):
    """A wild rose bush: dark moss with roses."""
    img = Img(w, h)
    for y in range(h):
        for x in range(w):
            dx, dy = (x - w / 2) / (w / 2), (y - h) / h
            if dx * dx + dy * dy * 1.2 < 1:
                img.set(x, y, "n" if hsh(x, y, seed) < 0.12 and y < h / 2 else ("M" if y < h * 0.6 else "m"))
    for i in range(6):
        rx = 3 + int(hsh(i, 1, seed) * (w - 6))
        ry = 2 + int(hsh(i, 2, seed) * (h - 6))
        if img.px[ry][rx] is None:
            continue
        img.set(rx, ry, "P"), img.set(rx + 1, ry, "q"), img.set(rx, ry + 1, "p"), img.set(rx + 1, ry + 1, "P")
    return outline(img)


def rose_vine(h=30, seed=27):
    """Climbing roses hanging from a ledge (hangs from its top)."""
    img = Img(9, h)
    x = 4.0
    for y in range(h):
        x += math.sin(y * 0.5 + seed) * 0.5
        img.set(int(round(x)), y, "M" if y % 3 else "m")
        if y % 5 == 2:
            side = 1 if (y // 5) % 2 else -1
            img.set(int(round(x)) + side, y, "n")
        if y % 9 == 6:
            rx = int(round(x)) + (1 if (y // 9) % 2 else -2)
            img.set(rx, y, "P"), img.set(rx + 1, y, "q"), img.set(rx, y + 1, "p"), img.set(rx + 1, y + 1, "P")
    return img


def dead_lantern(w=8, h=16):
    """A hanging lantern gone dark, its glass broken (hangs from its top)."""
    img = Img(w, h)
    for y in range(0, 8):
        img.set(3 + (y % 2), y, "G")
    for y in range(8, 15):
        for x in range(1, 7):
            frame = x in (1, 6) or y in (8, 14)
            if not frame and (x + y) % 4 == 0 and y < 11:
                continue  # broken panes
            img.set(x, y, "G" if frame else ("2" if y > 11 else "1"))
    return outline(img)


def leaning_lantern_post(w=16, h=30):
    """A lantern post bent by a fallen stone, its lamp dark."""
    img = Img(w, h)
    for y in range(8, h):
        x = 4 + int(max(0, (h - 12 - y)) * 0.25)
        img.set(x, y, "G")
        img.set(x + 1, y, "g")
    for x in range(2, 9):
        img.set(x, h - 1, "G")
    for y in range(2, 8):
        for x in range(8, 13):
            frame = x in (8, 12) or y in (2, 7)
            img.set(x, y, "G" if frame else "1")
    return outline(img)


def balustrade(w=32, h=14, seed=28):
    """A stretch of bridge railing: a stone rail on little balusters, one missing."""
    img = Img(w, h)
    for x in range(w):
        img.set(x, 0, "4"), img.set(x, 1, "3"), img.set(x, 2, "2")
        img.set(x, h - 2, "3"), img.set(x, h - 1, "2")
    for bx in range(2, w - 2, 5):
        if hsh(bx, 1, seed) < 0.2:
            continue
        for y in range(3, h - 2):
            bulge = 1 if 5 <= y <= h - 5 else 0
            for x in range(bx - bulge, bx + 2 + bulge):
                img.set(x, y, "4" if x == bx - bulge else "3")
    mossy(img, seed, 0.35)
    return outline(img)


def bell_banner(w=12, h=26, seed=29):
    """A torn cloth banner with a bell emblem (hangs from its top)."""
    img = Img(w, h)
    for x in range(w):
        img.set(x, 0, "G")
    for y in range(1, h):
        for x in range(1, w - 1):
            tear = y > h - 8 and hsh(x, 1, seed) * 8 < y - (h - 8)
            if tear:
                continue
            img.set(x, y, "p" if x in (1, w - 2) else "V")
    for y, row in enumerate(["..W..", ".WWW.", ".WWW.", "WWWWW", "..W.."]):
        for x, k in enumerate(row):
            if k == "W":
                img.set(x + w // 2 - 2, y + 6, "q")
    return outline(img)


def toller_statue(w=22, h=44, seed=30):
    """A hooded bell-keeper statue on a plinth, one hand raising a small bell, the other arm broken off."""
    img = Img(w, h)
    cx = w // 2 - 1
    plinth = h - 7
    for y in range(h):
        if y >= plinth:
            for x in range(1, w - 1):
                img.set(x, y, "4" if y == plinth else stone(x, y, seed, 7, 3))
            continue
        if y < 3:
            half = 1 + y  # hood tip
        elif y < 9:
            half = 3.5  # hood around the face
        elif y < 12:
            half = 5  # shoulders
        else:
            half = 5 + (y - 12) * 0.1  # robe
        for x in range(int(cx - half), int(cx + half) + 1):
            fold = y > 13 and (x - cx) % 3 == 0
            img.set(x, y, "4" if x <= cx - half + 1 else ("2" if fold or x >= cx + half - 1 else "3"))
    for y in range(4, 8):  # the face, in the hood's shadow
        for x in range(cx - 1, cx + 2):
            img.set(x, y, "1")
    for i in range(6):  # raised arm
        img.set(cx + 5 + i // 3, 11 - i, "3")
    for y, row in enumerate(["..m..", ".mMm.", ".MnM.", "mMMMm"]):  # the small bell, verdigris
        for x, k in enumerate(row):
            if k != ".":
                img.set(cx + 4 + x, y + 1, k)
    img.set(cx - 5, 12, "2"), img.set(cx - 6, 13, "2")  # the broken stump of the other arm
    mossy(img, seed, 0.3)
    return outline(img)

def starbloom():
    """The pale star-shaped flower of the ruins (Moss's Starbloom Tea)."""
    return from_grid([
        "..Y..",
        "YWWWY",
        ".WyW.",
        "Y.M.Y",
        "..M..",
        ".MM..",
        "..M..",
    ])


MOSS = [
    ["........", "........", "...n....", "..nMn.n.", ".nMMMnMn", "mMMMMMMm"],
    ["........", "........", "......n.", ".n...nMn", "nMn.nMMM", "MMmmMMMm"],
    ["........", "....n...", "...nMn..", "..nMMMn.", ".nMMmMMn", "mMmmmmMm"],
]


def moss(variant):
    return from_grid(MOSS[variant])


def build_ruins_decor():
    d = {}
    d["ruin_house"] = ruined_house()
    d["ruin_house_small"] = ruined_house(40, 34, seed=31)
    d["ruin_arch"] = broken_arch()
    d["pillar_tall"] = tall_pillar()
    d["column_fallen"] = fallen_column()
    d["bell_fallen"] = fallen_bell()
    d["rubble_s"] = rubble(12, 6, 1)
    d["rubble_m"] = rubble(20, 9, 2)
    d["rubble_l"] = rubble(32, 14, 3)
    d["rose_bush"] = rose_bush()
    d["rose_vine"] = rose_vine()
    d["lantern_dead"] = dead_lantern()
    d["lantern_post_bent"] = leaning_lantern_post()
    d["balustrade"] = balustrade()
    d["banner"] = bell_banner()
    d["statue"] = toller_statue()
    d["starbloom"] = starbloom()
    for i in range(3):
        d[f"moss{i}"] = moss(i)
    return d
