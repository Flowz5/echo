"""Echo — placeholder 32x32 dialogue portraits (frame 0 Tamsin, frame 1 Quill).

Drawn with simple shapes in the game palette, then outlined in K.
Replace assets/sprites/portraits.png with hand-drawn art of the same layout.
"""

SIZE = 32


def _canvas():
    return [["."] * SIZE for _ in range(SIZE)]


def _ellipse(c, cx, cy, rx, ry, key):
    for y in range(SIZE):
        for x in range(SIZE):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                c[y][x] = key


def _rect(c, x0, y0, x1, y1, key):
    for y in range(max(0, y0), min(SIZE, y1 + 1)):
        for x in range(max(0, x0), min(SIZE, x1 + 1)):
            c[y][x] = key


def _outline(c):
    out = [row[:] for row in c]
    for y in range(SIZE):
        for x in range(SIZE):
            if c[y][x] != ".":
                continue
            if any(0 <= x + dx < SIZE and 0 <= y + dy < SIZE and c[y + dy][x + dx] not in (".", "K")
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = "K"
    return ["".join(r) for r in out]


def tamsin():
    c = _canvas()
    _rect(c, 5, 26, 26, 31, "V")             # shawl
    _rect(c, 9, 26, 22, 27, "v")
    _ellipse(c, 15.5, 20, 6, 6, "q")         # small old face
    for y in range(15, 24):                  # grey hair at the sides
        c[y][9] = c[y][10] = "g"
        c[y][21] = c[y][22] = "g"
    # the huge bell-shaped hat
    for y in range(1, 16):
        half = 4 + (y - 1) * 0.85 if y < 13 else 15
        for x in range(SIZE):
            if abs(x - 15.5) <= half:
                c[y][x] = "a"
    for x in range(SIZE):                    # highlight and band
        if c[4][x] == "a" and 12 <= x <= 15:
            c[4][x] = "A"
        if c[12][x] == "a":
            c[12][x] = "y"
    c[2][15] = c[2][16] = "A"
    # kind, half-closed eyes, wrinkles, little smile
    for x in (12, 13, 18, 19):
        c[19][x] = "K"
    c[18][11] = c[18][20] = "p"
    c[22][14] = c[22][17] = "p"
    c[23][15] = c[23][16] = "p"
    # lantern glow down on the right
    _ellipse(c, 27, 24, 3, 3, "A")
    _ellipse(c, 27, 24, 1.5, 1.5, "Y")
    return _outline(c)


def quill():
    c = _canvas()
    _rect(c, 4, 25, 25, 31, "a")             # patched coat
    _rect(c, 8, 24, 19, 26, "A")             # collar
    _rect(c, 18, 27, 21, 30, "p")            # patch
    c[28][19] = c[29][20] = "q"
    _ellipse(c, 13, 14, 9, 10, "3")          # crow head
    _ellipse(c, 11, 17, 5, 5, "2")
    for x, y in ((11, 3), (12, 2), (13, 3), (14, 1), (15, 3)):   # ruffled tuft
        c[y][x] = "4"
    # beak, pointing right
    for i, y in enumerate(range(12, 18)):
        for x in range(21, 31 - abs(14 - y) * 2):
            c[y][x] = "G" if y >= 15 else "g"
    # spectacles: a gold rim around a pale lens, ink-dark pupil
    _ellipse(c, 16, 11, 3.6, 3.6, "y")
    _ellipse(c, 16, 11, 2.4, 2.4, "E")
    c[11][16] = c[11][17] = "K"
    c[10][15] = "W"
    c[11][20] = c[11][21] = "y"             # the bridge to the hidden lens
    # ink stains on the feathers
    c[20][7] = c[21][8] = c[16][5] = "c"
    return _outline(c)


def build_portraits():
    return [tamsin(), quill()]


# Lumi as an echo (16x24, two frames): a small girl with two buns, arm raised holding
# her kite string. Drawn directly in the echo cyans: she is a memory.
LUMI_A = [
    "................",
    "................",
    "................",
    "................",
    "...........c....",
    "..........cE....",
    "....cc.cc.cE....",
    "...cEEcEEccE....",
    "...cEEEEEEcE....",
    "....cEeEeEcE....",
    "....cEEEEEcc....",
    "....cEEEEEc.....",
    ".....ceEec......",
    "....cCCCCCc.....",
    "...cCCeCCCCc....",
    "...cCCCCCCCc....",
    "..cCCCeCCCCCc...",
    "..cCCCCCCCCCc...",
    "..cccCCCCCccc...",
    ".....cE.Ec......",
    ".....cE.Ec......",
    ".....cE.Ec......",
    "....ccc.ccc.....",
    "................",
]
LUMI_B = LUMI_A[:4] + [
    "................",
    "...........c....",
    "....cc.cc.cE....",
    "...cEEcEEccE....",
    "...cEEEEEEcE....",
    "....cEeEeEcE....",
    "....cEEEEEcc....",
    "....cEEEEEc.....",
    ".....ceEec......",
    "....cCCCCCc.....",
    "...cCCeCCCCc....",
    "...cCCCCCCCc....",
    "..cCCCeCCCCCc...",
    "..cccCCCCCccc...",
    ".....cE.Ec......",
    ".....cE.Ec......",
    "....ccc.ccc.....",
    "................",
    "................",
    "................",
]


def build_lumi():
    return [LUMI_A, LUMI_B]
