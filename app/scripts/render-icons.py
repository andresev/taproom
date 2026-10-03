"""Renders Tapped's mark to the PNG files in assets/images (run: python3 scripts/render-icons.py assets/images).

The mark is a "T" whose crossbar ends in a tap spout, with one drop, in brushed gold on black. It is drawn upright on a
100-unit grid, slanted 14 degrees, and filled with gradients that run from each shape's top left to its bottom right.
app/src/components/wordmark.tsx draws the same shapes with the colours in app/src/theme (Brand): change both together.
No image library is needed: polygons are anti-aliased by 4x vertical and exact horizontal coverage."""
import math, struct, sys, zlib

BLACK, WHITE = (0x05, 0x05, 0x05), (255, 255, 255)
GOLD = [(0, (0xFB, 0xEF, 0xB9)), (0.22, (0xE6, 0xC7, 0x80)), (0.5, (0x9C, 0x75, 0x26)), (0.74, (0xF1, 0xDA, 0x96)), (1, (0x7C, 0x5C, 0x1A))]
PALE = [(0, (255, 255, 255)), (0.6, (0xF5, 0xEB, 0xC8)), (1, (0xD9, 0xC2, 0x83))]
GLOW = (0xE6, 0xC7, 0x80)
SLANT = math.tan(math.radians(14))
CENTRE = (57, 51)   # the slanted mark's centre on the grid; it is 74 units wide and 70 tall
SPAN = 74

def arc(cx, cy, r, start, end, steps=24):
    return [(cx + r * math.cos(math.radians(start + (end - start) * i / steps)), cy + r * math.sin(math.radians(start + (end - start) * i / steps))) for i in range(steps + 1)]

def bezier(p0, p1, p2, p3, steps=16):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)) for t in (i / steps for i in range(steps + 1))]

# The mark's four shapes, upright: (outline, gradient).
MARK = [
    ([(12, 16)] + arc(66, 36, 20, -90, 0) + [(86, 50), (71, 50)] + arc(64, 38, 7, 0, -90) + [(12, 31)], GOLD),                     # crossbar and spout
    ([(34, 37), (49, 37), (49, 86), (34, 86)], GOLD),                                                                                # stem
    ([(53, 37), (60, 37), (60, 75), (53, 75)], PALE),                                                                                # line of light beside the stem
    (bezier((78.5, 56), (78.5, 56), (72.5, 63), (72.5, 67.5)) + arc(78.5, 67.5, 6, 180, 0) + bezier((84.5, 67.5), (84.5, 63), (78.5, 56), (78.5, 56)), PALE),  # drop
]

def gradient(stops, t):
    t = min(1.0, max(0.0, t))
    for (o0, c0), (o1, c1) in zip(stops, stops[1:]):
        if t <= o1:
            f = (t - o0) / (o1 - o0)
            return tuple(c0[k] + (c1[k] - c0[k]) * f for k in range(3))
    return stops[-1][1]

def coverage(points, size, sub=4):
    """Each pixel's covered share of a polygon, as {row: (first column, [shares])}."""
    edges = [(a, b) for a, b in zip(points, points[1:] + points[:1]) if a[1] != b[1]]
    top, bottom = max(0, int(min(p[1] for p in points))), min(size - 1, int(max(p[1] for p in points)))
    left, right = max(0, int(min(p[0] for p in points))), min(size - 1, int(max(p[0] for p in points)))
    rows = {}
    for py in range(top, bottom + 1):
        cov = [0.0] * (right - left + 1)
        for s in range(sub):
            y = py + (s + 0.5) / sub
            xs = sorted(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) for a, b in edges if min(a[1], b[1]) <= y < max(a[1], b[1]))
            for x0, x1 in zip(xs[::2], xs[1::2]):
                x0, x1 = max(float(left), x0), min(float(right + 1), x1)
                for i in range(int(x0), min(right, int(x1)) + 1):
                    c = min(x1, i + 1) - max(x0, i)
                    if c > 0: cov[i - left] += c / sub
        rows[py] = (left, cov)
    return rows

def render(path, size, fraction=0.0, base=None, glow=False, tile=False, flat=None):
    """fraction: the mark's share of the image's width, 0 for no mark. base: an opaque background, or None for
    transparent. glow: a soft gold light behind the mark. tile: a black tile with rounded corners. flat: one colour
    for the whole mark in place of the gradients."""
    px = [[(*base, 1.0) if base else (0.0, 0.0, 0.0, 0.0) for _ in range(size)] for _ in range(size)]
    def paint(points, colour_at):
        for y, (left, cov) in coverage(points, size).items():
            row = px[y]
            for i, c in enumerate(cov):
                if c <= 0: continue
                c = min(1.0, c)
                r, g, b, a = row[left + i]
                cr, cg, cb = colour_at(left + i + 0.5, y + 0.5)
                na = c + a * (1 - c)
                row[left + i] = ((cr * c + r * a * (1 - c)) / na, (cg * c + g * a * (1 - c)) / na, (cb * c + b * a * (1 - c)) / na, na)
    if tile:
        r = size * 0.23
        corners = arc(size - r, r, r, -90, 0) + arc(size - r, size - r, r, 0, 90) + arc(r, size - r, r, 90, 180) + arc(r, r, r, 180, 270)
        paint(corners, lambda x, y: BLACK)
    if glow:
        reach = size * 0.56
        for y in range(size):
            for x in range(size):
                d = math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / reach
                if d < 1:
                    k = 0.22 * (1 - d) ** 2
                    r, g, b, a = px[y][x]
                    px[y][x] = (r + (GLOW[0] - r) * k, g + (GLOW[1] - g) * k, b + (GLOW[2] - b) * k, a)
    if fraction:
        scale = size * fraction / SPAN
        to_pixel = lambda p: (scale * (p[0] + 16 - SLANT * p[1] - CENTRE[0]) + size / 2, scale * (p[1] - CENTRE[1]) + size / 2)
        for points, stops in MARK:
            x0, y0 = min(p[0] for p in points), min(p[1] for p in points)
            w, h = max(p[0] for p in points) - x0, max(p[1] for p in points) - y0
            def colour_at(x, y, stops=stops, x0=x0, y0=y0, w=w, h=h):
                if flat: return flat
                gy = (y - size / 2) / scale + CENTRE[1]
                gx = (x - size / 2) / scale + CENTRE[0] - 16 + SLANT * gy
                return gradient(stops, ((gx - x0) / w + (gy - y0) / h) / 2)
            paint([to_pixel(p) for p in points], colour_at)
    raw = bytearray()
    for row in px:
        raw.append(0)
        for r, g, b, a in row: raw += bytes((round(r), round(g), round(b), round(a * 255)))
    def chunk(kind, data): return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(png); print("wrote", path, size)

out = sys.argv[1]
# App icon: full-bleed black with a soft gold light behind the mark (iOS and the stores round the corners themselves).
render(f"{out}/icon.png", 1024, 0.62, base=BLACK, glow=True)
# Android adaptive icon: the mark inside the safe zone, over a plain black layer; and a one-colour version.
render(f"{out}/android-icon-foreground.png", 512, 0.44)
render(f"{out}/android-icon-background.png", 512, base=BLACK)
render(f"{out}/android-icon-monochrome.png", 432, 0.44, flat=WHITE)
# Splash: the mark alone, on the dark background set in app.json.
render(f"{out}/splash-icon.png", 228, 0.9)
render(f"{out}/favicon.png", 48, 0.66, tile=True)
