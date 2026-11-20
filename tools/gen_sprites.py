#!/usr/bin/env python3
"""Echo — placeholder sprite generator.

Draws every base sprite of the game from ASCII grids + the Echo palette and
writes PNGs (no dependencies, pure Python). Run from the repo root:

    python3 tools/gen_sprites.py

Outputs go to assets/. Hand-drawn sprites can replace any file later, as long
as they keep the same size/layout described in assets/sprites.json.
"""
import json
import math
import os
import struct
import zlib

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

# --------------------------------------------------------------------------- palette
# key: (hex, name, usage)
PALETTE = {
    "K": ("0d0b1e", "Void", "outlines, darkest shadow"),
    "1": ("161433", "Night 1", "deep sky, panel fill"),
    "2": ("1f1d4a", "Night 2", "terrain base, far silhouettes"),
    "3": ("2b2a63", "Night 3", "cloak, mountains, highlights on terrain"),
    "4": ("3c3b80", "Night 4", "cloak highlight, horizon"),
    "v": ("4e3a7a", "Dusk violet", "horizon glow"),
    "V": ("6b4c9a", "Lilac", "accents"),
    "p": ("9c5a9c", "Mauve", "scarf shadow, accents"),
    "P": ("d8749b", "Rose", "scarf"),
    "q": ("f2a3a3", "Blush", "scarf highlight"),
    "W": ("f4f1e8", "Bone", "mask, text, stars, moon"),
    "g": ("8a8aa8", "Ash", "mask shadow, metal, inactive"),
    "G": ("5a5a7a", "Slate", "metal shadow, inactive"),
    "c": ("1b6f8a", "Echo deep", "echo outline, eye pupil"),
    "C": ("2bb5c9", "Echo", "echoes, rewind, the Eye"),
    "e": ("6ff2f2", "Echo light", "echo fill, glow"),
    "E": ("d4ffff", "Echo flash", "eye glint, flashes"),
    "a": ("8a4b1f", "Amber deep", "interactable shadow"),
    "A": ("d9822b", "Amber", "interactables: buttons, doors"),
    "y": ("ffc24d", "Gold", "interactable highlight"),
    "Y": ("fff0a8", "Pale gold", "interactable glint"),
    "r": ("8f2340", "Danger deep", "hazards shadow"),
    "R": ("d9415e", "Danger", "hazards"),
    "m": ("1f4a4a", "Moss deep", "moss shadow"),
    "M": ("2f7a6a", "Moss", "moss / grass"),
    "n": ("5fb08a", "Moss light", "grass tips"),
}
RGB = {k: tuple(int(v[0][i:i + 2], 16) for i in (0, 2, 4)) for k, v in PALETTE.items()}


# --------------------------------------------------------------------------- image
class Img:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]  # None or (r,g,b,a)

    def set(self, x, y, key, alpha=255):
        if 0 <= x < self.w and 0 <= y < self.h and key not in (None, "."):
            self.px[y][x] = RGB[key] + (alpha,)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def blit(self, src, ox, oy, alpha=1.0):
        for y in range(src.h):
            for x in range(src.w):
                p = src.px[y][x]
                if p is None or not (0 <= x + ox < self.w and 0 <= y + oy < self.h):
                    continue
                a = p[3] / 255 * alpha
                d = self.px[y + oy][x + ox]
                if d is None:
                    self.px[y + oy][x + ox] = p[:3] + (round(255 * a),)
                elif a >= 1:
                    self.px[y + oy][x + ox] = p[:3] + (255,)
                else:
                    self.px[y + oy][x + ox] = tuple(round(p[i] * a + d[i] * (1 - a)) for i in range(3)) + (255,)

    def scaled(self, s):
        out = Img(self.w * s, self.h * s)
        for y in range(out.h):
            for x in range(out.w):
                out.px[y][x] = self.px[y // s][x // s]
        return out

    def flipped(self):
        out = Img(self.w, self.h)
        for y in range(self.h):
            out.px[y] = list(reversed(self.px[y]))
        return out

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        raw = b"".join(
            b"\x00" + b"".join(bytes(p) if p else b"\x00\x00\x00\x00" for p in row) for row in self.px
        )

        def chunk(tag, data):
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

        with open(path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n")
            f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0)))
            f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
            f.write(chunk(b"IEND", b""))


def from_grid(rows, remap=None):
    h, w = len(rows), len(rows[0])
    img = Img(w, h)
    for y, row in enumerate(rows):
        assert len(row) == w, f"row {y} has width {len(row)}, expected {w}: {row!r}"
        for x, k in enumerate(row):
            if remap:
                k = remap(x, y, k)
            img.set(x, y, k)
    return img


def recolor(rows, mapping):
    return ["".join(mapping.get(c, c) for c in r) for r in rows]


def hsh(x, y, seed=0):
    n = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def sheet(frames, cols=None):
    cols = cols or len(frames)
    fw, fh = frames[0].w, frames[0].h
    rows = math.ceil(len(frames) / cols)
    out = Img(fw * cols, fh * rows)
    for i, f in enumerate(frames):
        out.blit(f, (i % cols) * fw, (i // cols) * fh)
    return out


# --------------------------------------------------------------------------- player (16x16, faces right)
HEAD = [
    "................",
    ".....KKKKKK.....",
    "....KWWWWWWK....",
    "...KWWWWWWWWK...",
    "...KWWWWWWWWK...",
    "...KWWWWWCeWK...",
    "...KWWWWWcCWK...",
    "...KgWWWWWWgK...",
    "..KKKggggggKK...",
]
# Only the collar is drawn: the scarf's tail is simulated in-game (src/game/scarf.ts)
SCARF_A = [
    "...KqPPPPPPPK...",
    "....KPPPPPPK....",
    "....K344443K....",
    "....K343343K....",
]
SCARF_B = [
    "...KqPPPPPPPK...",
    "....KPPPPPpK....",
    "....K344443K....",
    "....K343343K....",
]
LEGS = {
    "stand": ["....K333333K....", "....KK3KK3KK....", ".....KK..KK....."],
    "run1": ["....K333333K....", "...K3KK..K3K....", "...KK....KK....."],
    "run2": ["....K333333K....", ".....KK3KK......", ".....KKKK......."],
    "run3": ["....K333333K....", "....K3K..KK3K...", "...KK......KK..."],
    "tuck": ["....K333333K....", "....KK3333KK....", ".....KKKKKK....."],
    "dangle": ["....K333333K....", "....K3K..K3K....", "....KK....KK...."],
}
FALL_TOP = HEAD + SCARF_A
DASH = [
    "................",
    "................",
    "......KKKKKK....",
    ".....KWWWWWWK...",
    "....KWWWWWWWWK..",
    "....KWWWWWWEeK..",
    "....KWWWWWWeEK..",
    "....KgWWWWWWgK..",
    ".....KggggggKK..",
    "....KqPPPPPPPK..",
    ".....KPPPPPPK...",
    ".....K344443K...",
    ".....K343343K...",
    "....K333333K....",
    "...KK3KKKK3KK...",
    "...KK......KK...",
]

# sliding down a wall on the right: hand on the wall, legs tucked
WALL = HEAD + [
    "...KqPPPPPPPK...",
    "....KPPPPPPKWK..",
    "....K344443K....",
    "....K343343K....",
    "....K333333K....",
    ".....KK3KK3K....",
    "......KK.KK.....",
]

idle0 = HEAD + SCARF_A + LEGS["stand"]
idle1 = ["................"] + HEAD + SCARF_A[:2] + [SCARF_A[3]] + LEGS["stand"]
PLAYER_FRAMES = {
    "idle": [idle0, idle1],
    "run": [
        HEAD + SCARF_A + LEGS["run1"],
        ["................"] + HEAD + SCARF_B[:3] + LEGS["run2"],
        HEAD + SCARF_A + LEGS["run3"],
        ["................"] + HEAD + SCARF_B[:3] + LEGS["run2"],
    ],
    "jump": [HEAD + SCARF_A + LEGS["tuck"]],
    "fall": [FALL_TOP + LEGS["dangle"]],
    "dash": [DASH],
    "wall": [WALL],
}
ORDER = [(name, i) for name in PLAYER_FRAMES for i in range(len(PLAYER_FRAMES[name]))]
for name, frames in PLAYER_FRAMES.items():
    for i, f in enumerate(frames):
        assert len(f) == 16, f"{name}[{i}] has {len(f)} rows"

EYE_KEYS = set("cCeE")


def eye_mask(rows):
    """Eye pixels = cyan pixels inside the mask (rows 4-7)."""
    return {(x, y) for y, r in enumerate(rows) for x, k in enumerate(r) if k in EYE_KEYS}


def echo_rows(rows):
    eye = eye_mask(rows)
    out = []
    for y, r in enumerate(rows):
        s = ""
        for x, k in enumerate(r):
            if k == ".":
                s += "."
            elif (x, y) in eye:
                s += "E"
            elif k == "K":
                s += "c"
            else:
                s += "e" if (x + y) % 2 == 0 else "C"
        out.append(s)
    return out


SPENT = {"P": "G", "q": "g", "p": "G"}  # scarf dims when dash/double jump are used
POWER = {"c": "C", "C": "E", "e": "E"}  # eye flares while rewinding


def build_player():
    rows_normal = [from_grid(PLAYER_FRAMES[n][i]) for n, i in ORDER]
    rows_spent = [from_grid(recolor(PLAYER_FRAMES[n][i], SPENT)) for n, i in ORDER]
    rows_power = [from_grid(recolor(PLAYER_FRAMES[n][i], POWER)) for n, i in ORDER]
    player = sheet(rows_normal + rows_spent + rows_power, cols=len(ORDER))
    echo = sheet([from_grid(echo_rows(PLAYER_FRAMES[n][i])) for n, i in ORDER])
    anims, idx = {}, 0
    for name, frames in PLAYER_FRAMES.items():
        anims[name] = list(range(idx, idx + len(frames)))
        idx += len(frames)
    return player, echo, anims


# --------------------------------------------------------------------------- tiles (autotile, 16 variants)
# bit 1 = top exposed, 2 = right exposed, 4 = bottom exposed, 8 = left exposed
def make_tile(mask):
    T, R, B, L = mask & 1, mask & 2, mask & 4, mask & 8
    img = Img(16, 16)
    for y in range(16):
        for x in range(16):
            row = y // 8
            k = "2"
            if y % 8 == 7 or x % 16 == (4 if row == 0 else 12):
                k = "1"
            elif hsh(x, y, mask + 3) < 0.08:
                k = "3"
            elif y % 8 == 0 and hsh(x, y, 9) < 0.5:
                k = "3"
            img.set(x, y, k)
    for y in range(16):
        for x in range(16):
            if L and x == 0 or R and x == 15 or B and y == 15:
                img.set(x, y, "K")
            elif L and x == 1:
                img.set(x, y, "3")
            elif B and y == 14:
                img.set(x, y, "1")
    if T:
        for x in range(16):
            img.set(x, 0, "K")
            img.set(x, 1, "n")
            img.set(x, 2, "M" if hsh(x, 2, 1) > 0.25 else "n")
            img.set(x, 3, "M")
            img.set(x, 4, "m")
            if hsh(x, 5, 7) < 0.35:
                img.set(x, 5, "m")
                if hsh(x, 6, 7) < 0.4:
                    img.set(x, 6, "m")
        if L:
            img.set(0, 1, "K"), img.set(0, 2, "K"), img.set(0, 3, "K")
        if R:
            for yy in (1, 2, 3):
                img.set(15, yy, "K")
    # rounded corners
    for cond, corner, inner in (
        (T and L, [(0, 0), (1, 0), (0, 1)], (1, 1)),
        (T and R, [(15, 0), (14, 0), (15, 1)], (14, 1)),
        (B and L, [(0, 15), (1, 15), (0, 14)], (1, 14)),
        (B and R, [(15, 15), (14, 15), (15, 14)], (14, 14)),
    ):
        if cond:
            for cx, cy in corner:
                img.px[cy][cx] = None
            img.set(*inner, "K")
    return img


# --------------------------------------------------------------------------- props
SPIKE_HALF = [
    "...KK...",
    "...WK...",
    "..KWgK..",
    "..KWgK..",
    ".KWWggK.",
    ".KWWggK.",
    "KWWWgggK",
    "KKKKKKKK",
]
SPIKES = ["." * 16] * 8 + [r + r for r in SPIKE_HALF]
BUTTON_UP = ["." * 16] * 10 + [
    ".....KKKKKK.....",
    "....KYyyyyyK....",
    "....KyyyyyAK....",
    "..KKKAAAAAAKKK..",
    "..KGGGGGGGGGGK..",
    "..KKKKKKKKKKKK..",
]
BUTTON_DOWN = ["." * 16] * 12 + [
    "....KKKKKKKK....",
    "..KKKYyyyyAKKK..",
    "..KGGGGGGGGGGK..",
    "..KKKKKKKKKKKK..",
]
CHECKPOINT_ON = ["." * 16] * 2 + [
    ".......KK.......",
    "......KEeK......",
    ".....KEeCcK.....",
    ".....KeCCcK.....",
    "....KEeCCccK....",
    "....KeCCCccK....",
    "....KeCCCccK....",
    ".....KCCccK.....",
    ".....KCCccK.....",
    "......KCcK......",
    ".....KKKKKK.....",
    "....KGggggGK....",
    "...KGggggggGK...",
    "...KKKKKKKKKK...",
]
CHECKPOINT_OFF = recolor(CHECKPOINT_ON, {"E": "g", "e": "g", "C": "G", "c": "3"})
PLATFORM = [
    "KKKKKKKKKKKKKKKK",
    "4444444444444444",
    "3343333433333433",
    "3333333333333333",
    "KKKKKKKKKKKKKKKK",
    "..K..........K..",
    "..K..........K..",
    "..G..........G..",
] + ["." * 16] * 8


def make_door(open_):
    img = Img(16, 32)
    for y in range(32):
        for x in range(16):
            edge = x == 0 or x == 15 or y == 0
            frame = x <= 2 or x >= 13 or y <= 2
            if edge:
                img.set(x, y, "K")
            elif frame:
                img.set(x, y, "y" if (x == 1 or y == 1) else ("a" if x == 13 or x == 2 and y > 2 else "A"))
            elif not open_:
                img.set(x, y, "A" if x in (4, 7, 10) else ("a" if x in (5, 8, 11) else "1"))
                if y % 8 == 4 and x in (4, 5, 7, 8, 10, 11):
                    img.set(x, y, "y")
            elif y <= 5:
                img.set(x, y, "a" if x in (5, 8, 11) else ("A" if x in (4, 7, 10) else "K"))
    return img


# --------------------------------------------------------------------------- collectibles (16x16)
SHARD = [
    "................",
    "......KK........",
    ".....KYyK.......",
    ".....KyAK.......",
    "....KYyAaK......",
    "....KyCAaK......",
    "...KYyCeAaK.....",
    "...KyCeEAaK.....",
    "...KyCCeAaK.....",
    "....KyCAaK......",
    "....KyAaK.......",
    ".....KAaK.......",
    ".....KaK........",
    "......K.........",
    "................",
    "................",
]
NOTE = [
    "................",
    "........KKKK....",
    "........KyYK....",
    "........KyyKK...",
    "........KyKyK...",
    "........KyK.K...",
    "........KyK.....",
    "........KyK.....",
    "....KKKKKyK.....",
    "...KYyyyAyK.....",
    "...KyyyyAaK.....",
    "...KyyyAaaK.....",
    "....KAaaaK......",
    ".....KKKK.......",
    "................",
    "................",
]
PAGE = [
    "................",
    "................",
    "...KKKKKKKK.....",
    "...KWWWWWWgK....",
    "...KWGGGGWWgK...",
    "...KWWWWWWWWK...",
    "...KWGGGGGWWK...",
    "...KWWWWWWWWK...",
    "...KWGGGGWWWK...",
    "...KWWWWWWWWK...",
    "...KWGGGWWWWK...",
    "...KWWWWWWWgK...",
    "...KKKKKKKKKK...",
    "................",
    "................",
    "................",
]
KITE = [
    "................",
    ".......KK.......",
    "......KeEK......",
    ".....KeEECK.....",
    "....KeeECCcK....",
    "...KeeeECCccK...",
    "....KeeCCccK....",
    ".....KeCCcK.....",
    "......KCcK......",
    ".......KK.......",
    "........K.......",
    ".......C........",
    "........C.......",
    ".......C........",
    "........c.......",
    "................",
]

# --------------------------------------------------------------------------- NPC placeholder (16x24, 2 frames)
NPC_BASE = [
    "................",
    "................",
    "......KKKK......",
    ".....KGggGK.....",
    "....KGggggGK....",
    "...KGGggggGGK...",
    "..KKKKKKKKKKKK..",
    "....KWWWWWWK....",
    "....KWKWWKWK....",
    "....KWWWWWWK....",
    "...KK333333KK...",
    "..K3343333433K..",
    "..K3433333343K..",
    "..K3333333333K..",
    "..K3333333333K..",
    "..K4333333334K..",
    "..K3333333333K..",
    "..K3333333333K..",
    "..K3333333333K..",
    "..K3333333333K..",
    "..K4333333334K..",
    "..KKKKKKKKKKKK..",
    "...KK......KK...",
    "................",
]
NPC_BLINK = NPC_BASE[:8] + ["....KWWWWWWK...."] + NPC_BASE[9:]


def make_shrine():
    """A small bronze bell hanging in a mossy stone arch (16x32)."""
    img = Img(16, 32)
    for y in range(32):
        for x in range(16):
            pillar = x in (0, 1, 2, 3, 12, 13, 14, 15) and y >= 6
            arch = y < 8 and abs(x - 7.5) < 7.5 and math.hypot((x - 7.5) / 7.5, (y - 8) / 7) <= 1 and math.hypot((x - 7.5) / 5, (y - 8) / 5) > 1
            base = y >= 27 and 0 <= x <= 15
            if base:
                img.set(x, y, "K" if y in (27, 31) or x in (0, 15) else ("3" if (x + y) % 5 else "4"))
            elif pillar or arch:
                img.set(x, y, "3" if hsh(x, y, 11) > 0.2 else "4")
    # outline the stone
    solid = [[img.px[y][x] is not None for x in range(16)] for y in range(32)]
    for y in range(32):
        for x in range(16):
            if solid[y][x]:
                edge = any(not (0 <= x + dx < 16 and 0 <= y + dy < 32 and solid[y + dy][x + dx]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if edge:
                    img.set(x, y, "K")
    # moss on the arch top
    for x in range(3, 13):
        for y in range(32):
            if solid[y][x]:
                img.set(x, max(0, y - 1), "M" if hsh(x, y, 4) > 0.3 else "n")
                break
    # rope + bell
    for y in range(5, 10):
        img.set(7, y, "a")
    bell = [
        "...KKK...",
        "..KyyAK..",
        ".KyYyAaK.",
        ".KyyyAaK.",
        ".KyyAAaK.",
        "KyyyAAaaK",
        "KKKKKKKKK",
        "....K....",
    ]
    for dy, r in enumerate(bell):
        for dx, k in enumerate(r):
            img.set(3 + dx, 10 + dy, k)
    return img


# --------------------------------------------------------------------------- font (5x7, uppercase)
GLYPHS = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "J": ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
    "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    " ": ["....."] * 7,
    ".": ["....."] * 6 + ["..#.."],
    ",": ["....."] * 5 + ["..#..", ".#..."],
    "!": ["..#.."] * 5 + [".....", "..#.."],
    "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
    ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
    "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
    "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
    "'": ["..#..", "..#.."] + ["....."] * 5,
    "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
    "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
    ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
    "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
    "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
    ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
}
FONT_ORDER = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?:-/'%<>+()"


def build_font():
    img = Img(6 * len(FONT_ORDER), 8)
    for i, ch in enumerate(FONT_ORDER):
        for y, r in enumerate(GLYPHS[ch]):
            for x, k in enumerate(r):
                if k == "#":
                    img.set(i * 6 + x, y, "W")
    return img


def draw_text(img, s, x, y, key="W", shadow="K"):
    for i, ch in enumerate(s.upper()):
        g = GLYPHS.get(ch, GLYPHS["?"])
        for gy, r in enumerate(g):
            for gx, k in enumerate(r):
                if k == "#":
                    if shadow:
                        img.set(x + i * 6 + gx, y + gy + 1, shadow)
                    img.set(x + i * 6 + gx, y + gy, key)


def text_width(s):
    return len(s) * 6 - 1


# --------------------------------------------------------------------------- title logo
def build_title():
    S, word = 4, "ECHO"
    gw = 5 * S
    W = len(word) * gw + (len(word) - 1) * S
    H = 7 * S
    mask = [[False] * W for _ in range(H)]
    for i, ch in enumerate(word):
        for gy, r in enumerate(GLYPHS[ch]):
            for gx, k in enumerate(r):
                if k == "#":
                    for yy in range(S):
                        for xx in range(S):
                            mask[gy * S + yy][i * (gw + S) + gx * S + xx] = True
    pad = 12
    img = Img(W + pad * 2, H + pad)

    def stamp(ox, oy, keyf):
        for y in range(H):
            for x in range(W):
                if mask[y][x]:
                    img.set(x + ox, y + oy, keyf(x, y))

    def outline(ox, oy, key):
        for y in range(-1, H + 1):
            for x in range(-1, W + 1):
                inside = 0 <= y < H and 0 <= x < W and mask[y][x]
                if inside:
                    continue
                near = any(
                    0 <= y + dy < H and 0 <= x + dx < W and mask[y + dy][x + dx]
                    for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                )
                if near:
                    img.set(x + ox, y + oy, key)

    ox, oy = pad, 4
    # echoes trailing to the left (the logo literally leaves echoes)
    stamp(ox - 12, oy + 2, lambda x, y: "3")
    stamp(ox - 6, oy + 1, lambda x, y: "c")
    outline(ox, oy, "K")
    for y in range(H + 1):  # drop shadow
        for x in range(W + 1):
            if 0 <= y - 2 < H and 0 <= x - 1 < W and mask[y - 2][x - 1] and not (y < H and x < W and mask[y][x]):
                img.set(x + ox, y + oy, "K")

    def fill(x, y):
        t = y / H
        if t < 0.15:
            return "W"
        if t < 0.5:
            return "E"
        if t < 0.85:
            return "e"
        return "C"

    stamp(ox, oy, fill)
    # the Eye inside the O
    o_x = ox + 3 * (gw + S) + S + 3
    o_y = oy + S + 7
    for dy, r in enumerate([".KKKK.", "KEeCCK", "KeCCcK", "KCCccK", "KCcccK", ".KKKK."]):
        for dx, k in enumerate(r):
            img.set(o_x + dx, o_y + dy, k)
    return img


# --------------------------------------------------------------------------- UI
def rounded_box(w, h, border, fill, outline="K"):
    img = Img(w, h)
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            if corner:
                continue
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                img.set(x, y, outline)
            elif x == 1 or y == 1 or x == w - 2 or y == h - 2:
                img.set(x, y, border)
            else:
                img.set(x, y, fill)
    for cx, cy in ((1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)):
        img.set(cx, cy, outline)
    return img


CURSOR = ["KK......", "KEK.....", "KEeK....", "KEeCK...", "KEeK....", "KEK.....", "KK......"]


def build_ui():
    items = {
        "panel": rounded_box(24, 24, "3", "1"),
        "panel_selected": rounded_box(24, 24, "C", "2"),
        "cursor": from_grid(CURSOR),
        "slider_empty": rounded_box(48, 5, "1", "1"),
        "slider_full": from_grid(["." + "K" * 46 + "."] + ["K" + "e" * 46 + "K"] + ["K" + "C" * 46 + "K"] * 2 + ["." + "K" * 46 + "."]),
        "slider_knob": from_grid([".KKK.", "KYYyK", "KYyyK", "KyyyK", "KyyyK", "KyyyK", "KyyAK", "KAAAK", ".KKK."]),
        "toggle_off": from_grid([
            "..KKKKKKKKKKKK..", ".K111111111111K.", "KKKK1111111111K.", "KgWK11111111111K",
            "KggK11111111111K", "KKKK1111111111K.", ".K111111111111K.", "..KKKKKKKKKKKK..",
        ]),
        "toggle_on": from_grid([
            "..KKKKKKKKKKKK..", ".KccccccccccccK.", ".KcccccccccKKKK.", "KcccccccccccKEEK",
            "KcccccccccccKEeK", ".KcccccccccKKKK.", ".KccccccccccccK.", "..KKKKKKKKKKKK..",
        ]),
    }
    # pad the toggles to the same width as their rows
    x, rects, h = 0, {}, max(i.h for i in items.values())
    atlas = Img(sum(i.w + 1 for i in items.values()), h)
    for name, i in items.items():
        atlas.blit(i, x, 0)
        rects[name] = {"x": x, "y": 0, "w": i.w, "h": i.h}
        x += i.w + 1
    return atlas, rects


# --------------------------------------------------------------------------- backgrounds (320x180)
BW, BH = 320, 180


def build_sky():
    img = Img(BW, BH)
    stops = [(0, "1"), (95, "2"), (150, "3"), (172, "4"), (181, "v")]
    for y in range(BH):
        for i in range(len(stops) - 1):
            y0, k0 = stops[i]
            y1, k1 = stops[i + 1]
            if y0 <= y < y1:
                t = (y - y0) / (y1 - y0)
                break
        for x in range(BW):
            img.set(x, y, k1 if t * 16 > BAYER[y % 4][x % 4] + 8 * (1 - t) else k0)
    # stars
    for y in range(BH - 40):
        for x in range(BW):
            r = hsh(x, y, 42)
            density = 0.012 * (1 - y / BH)
            if r < density:
                k = "E" if r < density * 0.08 else ("W" if r < density * 0.45 else "g")
                img.set(x, y, k)
                if r < density * 0.05:  # sparkle stars
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        img.set(x + dx, y + dy, "G" if k != "E" else "C")
    # moon with soft halo
    mx, my, mr = 252, 42, 11
    for y in range(my - mr - 6, my + mr + 7):
        for x in range(mx - mr - 6, mx + mr + 7):
            d = math.hypot(x - mx, y - my)
            if d <= mr:
                k = "W"
                if math.hypot(x - mx - 4, y - my + 3) < 3 or math.hypot(x - mx + 3, y - my - 4) < 2:
                    k = "g"
                elif d > mr - 1.5 and x > mx:
                    k = "g"
                img.set(x, y, k)
            elif d <= mr + 5 and BAYER[y % 4][x % 4] < (mr + 5 - d) * 2:
                img.set(x, y, "4" if d < mr + 3 else "3")
    return img


def periodic(x, terms):
    return sum(a * math.sin(2 * math.pi * x * f / BW + p) for a, f, p in terms)


def build_mountains():
    H = 110
    img = Img(BW, H)
    terms = [(16, 2, 1.0), (9, 5, 2.0), (4, 11, 0.5), (2, 23, 1.3)]
    for x in range(BW):
        top = int(H - 62 - periodic(x, terms))
        slope = periodic(x + 1, terms) - periodic(x - 1, terms)
        for y in range(max(top, 0), H):
            depth = y - top
            if depth == 0:
                k = "4"
            elif slope < 0 and depth < 4:  # moon (right) lit faces
                k = "4"
            elif depth < 3 and top < H - 72:
                k = "g" if depth == 1 else "4"  # snow on the peaks
            else:
                k = "3"
            img.set(x, y, k)
    return img


def build_hills():
    H = 80
    img = Img(BW, H)
    terms = [(7, 3, 0.3), (4, 7, 1.7), (2, 13, 2.2)]
    tops = [int(H - 34 - periodic(x, terms)) for x in range(BW)]
    for x in range(BW):
        for y in range(tops[x], H):
            img.set(x, y, "2" if y == tops[x] else "1")
    # pine trees (wrap around so the layer tiles)
    for tx in range(0, BW, 9):
        if hsh(tx, 0, 5) < 0.45:
            continue
        th = 10 + int(hsh(tx, 1, 5) * 18)
        base = tops[tx % BW] + 2
        for i in range(th):
            half = int((i % 6) * 0.6 + i * 0.22) + 1
            y = base - th + i
            for dx in range(-half, half + 1):
                xx = (tx + dx) % BW
                img.set(xx, y, "2" if dx == -half or i % 6 == 0 else "1")
        img.set(tx % BW, base - th - 1, "2")
    return img


# --------------------------------------------------------------------------- palette exports
def export_palette():
    d = os.path.join(ROOT, "palette")
    os.makedirs(d, exist_ok=True)
    keys = list(PALETTE)
    with open(os.path.join(d, "echo.hex"), "w") as f:
        f.write("\n".join(PALETTE[k][0] for k in keys) + "\n")
    with open(os.path.join(d, "echo.gpl"), "w") as f:
        f.write("GIMP Palette\nName: Echo\nColumns: 8\n#\n")
        for k in keys:
            r, g, b = RGB[k]
            f.write(f"{r:3d} {g:3d} {b:3d}\t{PALETTE[k][1]}\n")
    img = Img(len(keys) * 8, 8)
    for i, k in enumerate(keys):
        for y in range(8):
            for x in range(8):
                img.set(i * 8 + x, y, k)
    img.save(os.path.join(d, "palette.png"))
    return img


# --------------------------------------------------------------------------- previews
def build_previews(player, echo, tiles, props, door, ui_atlas, title, sky, mountains, hills, font):
    # title screen mockup (what the main menu will look like)
    scr = Img(BW, BH)
    scr.blit(sky, 0, 0)
    scr.blit(mountains, 0, BH - mountains.h)
    scr.blit(hills, 0, BH - hills.h)
    tile = lambda m: tiles_img[m]
    for x in range(0, BW, 16):
        m = 1 | (8 if x == 0 else 0) | (2 if x == BW - 16 else 0)
        scr.blit(tile(m), x, BH - 24)
        scr.blit(tile(0 | (8 if x == 0 else 0) | (2 if x == BW - 16 else 0) | 4), x, BH - 8)
    scr.blit(title, (BW - title.w) // 2 + 4, 20)
    items = ["PLAY", "SETTINGS", "CREDITS"]
    y0 = 82
    for i, it in enumerate(items):
        tw = text_width(it)
        x = (BW - tw) // 2
        if i == 0:
            panel = rounded_box(tw + 20, 13, "C", "2")
            scr.blit(panel, x - 10, y0 + i * 16 - 3)
            scr.blit(from_grid(CURSOR), x - 8, y0 + i * 16)
        draw_text(scr, it, x, y0 + i * 16, "W" if i == 0 else "g")
    draw_text(scr, "V0.1", 4, BH - 8 - 24 - 10, "G", shadow=None)
    hint = "SPACE TO SELECT"
    draw_text(scr, hint, BW - text_width(hint) - 4, BH - 8 - 24 - 10, "G", shadow=None)
    f0 = from_grid(PLAYER_FRAMES["idle"][0])
    scr.blit(f0, 92, BH - 24 - 16)
    scr.blit(from_grid(echo_rows(PLAYER_FRAMES["fall"][0])), 70, BH - 24 - 16 - 22, alpha=0.65)
    scr.blit(from_grid(echo_rows(PLAYER_FRAMES["dash"][0])), 44, BH - 24 - 16 - 30, alpha=0.4)
    scr.blit(from_grid(CHECKPOINT_ON), 216, BH - 24 - 16)
    scr.blit(from_grid(BUTTON_UP), 250, BH - 24 - 16)
    scr.scaled(4).save(os.path.join(ROOT, "preview", "menu-mockup.png"))

    # contact sheet of every sprite
    sheet_img = Img(BW, 200)
    for y in range(sheet_img.h):
        for x in range(BW):
            sheet_img.set(x, y, "1" if (x // 8 + y // 8) % 2 else "2")
    draw_text(sheet_img, "PLAYER  NORMAL / SPENT / POWER", 4, 3)
    sheet_img.blit(player, 4, 13)
    draw_text(sheet_img, "ECHO", 4, 66)
    sheet_img.blit(echo, 4, 76)
    draw_text(sheet_img, "TILES", 4, 96)
    sheet_img.blit(tiles, 4, 106)
    draw_text(sheet_img, "PROPS", 4, 126)
    sheet_img.blit(props, 4, 136)
    sheet_img.blit(door, 104, 126)
    draw_text(sheet_img, "UI", 150, 126)
    sheet_img.blit(ui_atlas, 150, 136)
    draw_text(sheet_img, "PALETTE", 4, 166)
    sheet_img.blit(palette_img, 4, 176)
    sheet_img.blit(font, 4, 188)
    sheet_img.scaled(4).save(os.path.join(ROOT, "preview", "sprite-sheet.png"))


# --------------------------------------------------------------------------- main
if __name__ == "__main__":
    S = lambda *p: os.path.join(ROOT, *p)
    palette_img = export_palette()

    player, echo, anims = build_player()
    player.save(S("sprites", "player.png"))
    favicon = Img(16, 16)
    favicon.blit(player, 0, 0)  # first idle frame
    favicon.scaled(4).save(os.path.join(ROOT, "..", "public", "favicon.png"))
    echo.save(S("sprites", "echo.png"))

    tiles_img = [make_tile(m) for m in range(16)]
    tiles = sheet(tiles_img)
    tiles.save(S("sprites", "tiles.png"))

    prop_list = [("spikes", SPIKES), ("button_up", BUTTON_UP), ("button_down", BUTTON_DOWN),
                 ("checkpoint_off", CHECKPOINT_OFF), ("checkpoint_on", CHECKPOINT_ON), ("platform", PLATFORM)]
    props = sheet([from_grid(g) for _, g in prop_list])
    props.save(S("sprites", "props.png"))
    door = sheet([make_door(False), make_door(True)])
    door.save(S("sprites", "door.png"))
    collectibles = sheet([from_grid(g) for g in (SHARD, NOTE, PAGE, KITE)])
    collectibles.save(S("sprites", "collectibles.png"))
    make_shrine().save(S("sprites", "shrine.png"))
    sheet([from_grid(NPC_BASE), from_grid(NPC_BLINK)]).save(S("sprites", "npc.png"))

    # editor tileset for Tiled: one tile per terrain type (the game autotiles the ground itself)
    # order = Tiled tile ids 0..4: ground, one-way platform, spikes, pressure plate, door
    editor = Img(16 * 5, 16)
    editor.blit(tiles_img[15], 0, 0)
    editor.blit(from_grid(PLATFORM), 16, 0)
    editor.blit(from_grid(SPIKES), 32, 0)
    editor.blit(from_grid(BUTTON_UP), 48, 0)
    door_icon = make_door(False)
    for y in range(16):
        for x in range(16):
            editor.px[y][64 + x] = door_icon.px[y + 8][x]
    editor.save(S("levels", "terrain.png"))

    from decor_art import build_decor, pack  # noqa: E402 (decor sprites live in their own file)
    decor_atlas, decor_rects = pack(build_decor())
    decor_atlas.save(S("sprites", "decor.png"))

    ui_atlas, ui_rects = build_ui()
    ui_atlas.save(S("ui", "ui.png"))
    font = build_font()
    font.save(S("ui", "font.png"))
    title = build_title()
    title.save(S("ui", "title.png"))

    sky, mountains, hills = build_sky(), build_mountains(), build_hills()
    sky.save(S("backgrounds", "sky.png"))
    mountains.save(S("backgrounds", "mountains.png"))
    hills.save(S("backgrounds", "hills.png"))

    manifest = {
        "_note": "Generated by tools/gen_sprites.py. Keep sizes/layouts when replacing with hand-drawn art.",
        "resolution": {"width": BW, "height": BH, "tile": 16},
        "palette": {k: "#" + v[0] for k, v in PALETTE.items()},
        "player": {
            "file": "sprites/player.png", "frame": [16, 16],
            "rows": {"normal": 0, "spent": 1, "power": 2},
            "animations": anims,
            "fps": {"idle": 2, "run": 10, "jump": 1, "fall": 1, "dash": 1, "wall": 1},
        },
        "echo": {"file": "sprites/echo.png", "frame": [16, 16], "animations": anims, "drawAlpha": 0.65},
        "tiles": {
            "file": "sprites/tiles.png", "frame": [16, 16],
            "autotile": "index = top*1 + right*2 + bottom*4 + left*8 (bit set = that side is exposed to air)",
        },
        "props": {"file": "sprites/props.png", "frame": [16, 16], "order": [n for n, _ in prop_list]},
        "door": {"file": "sprites/door.png", "frame": [16, 32], "order": ["closed", "open"]},
        "collectibles": {"file": "sprites/collectibles.png", "frame": [16, 16], "order": ["shard", "note", "page", "moment"]},
        "shrine": {"file": "sprites/shrine.png", "frame": [16, 32]},
        "decor": {"file": "sprites/decor.png", "rects": decor_rects, "_note": "names ending in _0/_1 are 2-frame animations"},
        "npc": {"file": "sprites/npc.png", "frame": [16, 24], "order": ["idle", "blink"], "_note": "placeholder for every NPC until each gets its own sprite"},
        "ui": {"file": "ui/ui.png", "rects": ui_rects},
        "font": {"file": "ui/font.png", "glyph": [5, 7], "advance": 6, "order": FONT_ORDER, "uppercaseOnly": True},
        "title": {"file": "ui/title.png", "size": [title.w, title.h]},
        "backgrounds": {
            "sky": {"file": "backgrounds/sky.png", "parallax": 0.0},
            "mountains": {"file": "backgrounds/mountains.png", "parallax": 0.15, "anchor": "bottom"},
            "hills": {"file": "backgrounds/hills.png", "parallax": 0.35, "anchor": "bottom"},
        },
    }
    with open(S("sprites.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    build_previews(player, echo, tiles, props, door, ui_atlas, title, sky, mountains, hills, font)
    print("sprites written to", os.path.normpath(ROOT))
