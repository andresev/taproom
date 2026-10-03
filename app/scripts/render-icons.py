"""Renders Taproom's mark to the PNG files in assets/images (run: python3 scripts/render-icons.py assets/images): rounded rectangles, anti-aliased by 4x vertical and exact horizontal coverage."""
import math, struct, sys, zlib

BRASS, INK, WHITE, DARK = (0xE6, 0xC7, 0x80), (0x21, 0x1F, 0x16), (255, 255, 255), (0x11, 0x12, 0x10)
# The mark on a 64-unit grid: handle, collar, spout body, nozzle, drip tray. (x, y, w, h, radius)
MARK = [(27, 9, 10, 21, 5), (23, 31, 18, 5, 2), (15, 38, 34, 9, 0), (27, 47, 10, 6, 0), (22, 55, 20, 3, 1.5)]

def span(shape, y):
    """The x-range a rounded rectangle covers at height y, or None."""
    x, top, w, h, r = shape
    if y < top or y > top + h: return None
    inset = 0.0
    if r > 0:
        dy = (top + r) - y if y < top + r else (y - (top + h - r) if y > top + h - r else 0)
        if dy > 0: inset = r - math.sqrt(max(0.0, r * r - dy * dy))
    return x + inset, x + w - inset

def coverage(shapes, size, sub=4):
    rows = []
    for py in range(size):
        cov = [0.0] * size
        for s in range(sub):
            y = py + (s + 0.5) / sub
            line = [0.0] * size
            for shape in shapes:
                sp = span(shape, y)
                if not sp: continue
                x0, x1 = max(0.0, sp[0]), min(float(size), sp[1])
                if x1 <= x0: continue
                i0, i1 = int(x0), min(size - 1, int(x1))
                for i in range(i0, i1 + 1):
                    c = min(x1, i + 1) - max(x0, i)
                    if c > 0: line[i] = min(1.0, line[i] + c)
            for i in range(size): cov[i] += line[i] / sub
        rows.append(cov)
    return rows

def place(shapes, scale, dx, dy):
    return [(x * scale + dx, y * scale + dy, w * scale, h * scale, r * scale) for x, y, w, h, r in shapes]

def render(path, size, tile=None, tile_color=None, mark=None, mark_color=None, base=None):
    """base: an opaque background colour, or None for transparent. tile and mark are shape lists."""
    tc = coverage(tile, size) if tile else None
    mc = coverage(mark, size) if mark else None
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r, g, b, a = (*base, 1.0) if base else (0, 0, 0, 0.0)
            for cov, color in ((tc, tile_color), (mc, mark_color)):
                if not cov: continue
                c = cov[y][x]
                if c <= 0: continue
                na = c + a * (1 - c)
                r, g, b = [(color[k] * c + (r, g, b)[k] * a * (1 - c)) / na for k in range(3)]
                a = na
            raw += bytes((round(r), round(g), round(b), round(a * 255)))
    def chunk(kind, data): return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(png); print("wrote", path, size)

out = sys.argv[1]
def centred(size, fraction):
    scale = size * fraction / 64; off = (size - 64 * scale) / 2
    return place(MARK, scale, off, off)
# App icon: full-bleed brass, the mark at 95% (iOS and the stores round the corners themselves).
render(f"{out}/icon.png", 1024, mark=centred(1024, 0.95), mark_color=INK, base=BRASS)
# Android adaptive icon: the mark inside the safe zone, over a plain brass layer; and a one-colour version.
render(f"{out}/android-icon-foreground.png", 512, mark=centred(512, 0.72), mark_color=INK)
render(f"{out}/android-icon-background.png", 512, base=BRASS)
render(f"{out}/android-icon-monochrome.png", 432, mark=centred(432, 0.72), mark_color=WHITE)
# Splash: the brass tile with rounded corners, on the dark background set in app.json.
tile = lambda size: [(0, 0, size, size, size * 15 / 64)]
render(f"{out}/splash-icon.png", 228, tile=tile(228), tile_color=BRASS, mark=place(MARK, 228 / 64, 0, 0), mark_color=INK)
render(f"{out}/favicon.png", 48, tile=tile(48), tile_color=BRASS, mark=place(MARK, 48 / 64, 0, 0), mark_color=INK)
