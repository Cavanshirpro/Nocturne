#!/usr/bin/env python3
"""Generate deterministic, supersampled painted sprites and self-contained assets.js.

Only build dependency: Pillow >= 10. Run: python generate_assets.py
No downloaded art, fonts, or runtime image requests are used.
"""
import base64
import io
import json
import math
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
S = 3


def encode(im):
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def witch(angle):
    """Rotate an entire model, including shoulders, robe, face and staff.

    Local +Y is the character's front. Orthographic projection compresses depth
    and raises Z. Sorting the robe panels gives a shaded, volumetric silhouette.
    """
    im = Image.new("RGBA", (96*S, 128*S))
    d = ImageDraw.Draw(im)
    a = math.radians(angle)

    def p(x, y, z):
        xx = x*math.cos(a) - y*math.sin(a)
        yy = x*math.sin(a) + y*math.cos(a)
        return ((48+xx)*S, (113+yy*.48-z)*S)

    def poly(points, fill):
        d.polygon([p(*v) for v in points], fill=fill)

    def ellipse(x, y, z, rx, rz, fill):
        cx, cy = p(x, y, z)
        d.ellipse((cx-rx*S, cy-rz*S, cx+rx*S, cy+rz*S), fill=fill)

    # Boots, flared robe: each vertical facet rotates with the torso.
    ellipse(-8, 4, 2, 7, 4, "#15121c")
    ellipse(8, 4, 2, 7, 4, "#15121c")
    panels = []
    for i in range(12):
        t, u = i*math.tau/12, (i+1)*math.tau/12
        pts = [(23*math.cos(t), 14*math.sin(t), 7),
               (23*math.cos(u), 14*math.sin(u), 7),
               (11*math.cos(u), 8*math.sin(u), 59),
               (11*math.cos(t), 8*math.sin(t), 59)]
        dep = math.sin((t+u)/2+a)
        shade = int(31 + 12*math.cos(t+a-.8))
        panels.append((dep, pts, (shade, shade-2, shade+12, 255)))
    for _, pts, color in sorted(panels):
        poly(pts, color)
    # A longitudinal opening and fitted belt make facing visible at diagonals.
    front = math.cos(a)
    if front > .08:
        poly([(-5, 10, 10), (6, 10, 10), (5, 8, 54), (-5, 8, 54)], "#555060")
    else:
        # A back seam replaces the front opening on rear-facing views.
        d.line([p(0, -10, 12), p(0, -7, 52)], fill="#45404d", width=S)
    ellipse(0, 0, 56, 14, 8, "#292634")
    if front > .08:
        poly([(-12, 8, 47), (12, 8, 47), (12, 8, 51), (-12, 8, 51)], "#807052")
        ellipse(0, 9, 49, 3, 2, "#c1a772")
    # Shoulder line, two sleeves and the staff rotate as one coherent body.
    poly([(-12, 0, 61), (-20, 1, 39), (-14, 6, 36), (-6, 3, 59)], "#383440")
    poly([(12, 0, 61), (21, 3, 43), (16, 8, 40), (6, 3, 59)], "#403b4b")
    ellipse(18, 6, 42, 3, 3, "#bba18e")
    d.line([p(23, 6, 6), p(23, 6, 84)], fill="#75654d", width=2*S)
    ellipse(23, 6, 84, 5, 7, "#beb6dd")
    ellipse(23, 6, 85, 2, 3, "#fff5e4")
    # Hair behind the head; never draw a face on the back-facing sprite.
    ellipse(0, 0, 72, 11, 16, "#241e24")
    if front > -.12:
        face_x, face_y = p(0, 7, 75)
        width = max(3, 8*abs(front)) * S
        d.ellipse((face_x-width, face_y-10*S, face_x+width, face_y+7*S), fill="#b8a08b")
        if front > .65:
            d.line((face_x-4*S, face_y-1*S, face_x-2*S, face_y-1*S), fill="#332a30", width=S)
            d.line((face_x+2*S, face_y-1*S, face_x+4*S, face_y-1*S), fill="#332a30", width=S)
        else:
            ellipse(-4 if math.sin(a)>0 else 4, 8, 75, 1, 1, "#352934")
    # Broad tilted brim, cone with bent tip, and restrained metal ornament.
    ellipse(0, 0, 88, 30, 8, "#1a1923")
    ellipse(0, 0, 90, 28, 7, "#393442")
    poly([(-17, 0, 91), (17, 0, 91), (5, 0, 120), (-4, 1, 125), (-3, 0, 113)], "#282532")
    poly([(0, -1, 93), (17, 0, 91), (5, 0, 120), (3, 0, 112)], "#494153")
    poly([(-16, 2, 92), (16, 2, 92), (13, 2, 97), (-13, 2, 97)], "#7b684e")
    ellipse(4, 3, 95, 3, 2, "#cfb778")
    return im.resize((96, 128), Image.Resampling.LANCZOS)


def enemy(kind):
    im = Image.new("RGBA", (80*S, 88*S))
    d = ImageDraw.Draw(im)

    def e(box, fill):
        d.ellipse(tuple(v*S for v in box), fill=fill)

    def line(points, fill, width):
        d.line([(x*S, y*S) for x,y in points], fill=fill, width=width*S, joint="curve")

    if kind == "slime":
        e((10, 31, 71, 79), "#223e36")
        e((13, 30, 66, 72), "#4c7661")
        e((18, 34, 56, 62), "#688874")
        e((22, 35, 35, 42), "#9bb6a1")
        for x in (31, 49):
            e((x, 51, x+5, 59), "#dce4be")
        line([(36, 66),(43, 67),(49, 64)], "#29463a", 2)
    elif kind == "skeleton":
        for x, sign in ((31,-1),(47,1)):
            line([(x, 51),(x+sign*4,65),(x+sign*8,79)], "#b5b09c", 5)
        line([(40,29),(40,58)], "#ded5b5", 5)
        for y in (35,41,47):
            line([(27,y-2),(32,y+3),(48,y+3),(53,y-2)], "#bcb8a1", 3)
        line([(27,31),(19,42),(23,55)], "#c7c0a6", 4)
        line([(53,31),(61,43),(57,55)], "#c7c0a6", 4)
        e((26, 7, 55, 32), "#c9c1a5")
        e((30, 15, 37, 23), "#2d3030")
        e((44, 15, 51, 23), "#2d3030")
        line([(35,28),(46,28)], "#5f5d52", 2)
    else:
        d.polygon([(5*S,13*S),(29*S,33*S),(24*S,60*S),(3*S,45*S),(14*S,39*S)], fill="#494453")
        d.polygon([(75*S,13*S),(51*S,33*S),(56*S,60*S),(77*S,45*S),(66*S,39*S)], fill="#625b6b")
        e((24, 26, 58, 70), "#77717d")
        e((28, 12, 54, 38), "#837a83")
        d.polygon([(27*S,23*S),(24*S,4*S),(37*S,15*S)], fill="#a49997")
        d.polygon([(46*S,15*S),(59*S,4*S),(54*S,26*S)], fill="#a49997")
        for x in (32,46):
            e((x,23,x+5,28), "#f3b5a1")
        line([(30,62),(25,78),(15,80)], "#6b6571", 7)
        line([(52,62),(57,78),(65,80)], "#817783", 7)
    return im.resize((80,88), Image.Resampling.LANCZOS)


def ground():
    rng = random.Random(7281)
    im = Image.new("RGB", (256,256))
    px = im.load()
    for y in range(256):
        for x in range(256):
            n = rng.randrange(-4,5)
            px[x,y] = (23+n,28+n,29+n)
    d = ImageDraw.Draw(im)
    # Modulo-wrapped marks make a seamless, repeatable surface.
    for _ in range(115):
        x,y = rng.randrange(256),rng.randrange(256)
        col = rng.choice(["#252c2b", "#303536", "#1d2425"])
        for dx in (-256,0,256):
            for dy in (-256,0,256):
                d.line([(x+dx,y+dy),(x+dx+4,y+dy-3),(x+dx+8,y+dy-2)],fill=col,width=1)
    return im.convert("RGBA")


def orb():
    glow = Image.new("RGBA",(48,48))
    d = ImageDraw.Draw(glow)
    d.ellipse((10,10,38,38),fill=(230,225,255,120))
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    d = ImageDraw.Draw(glow)
    d.ellipse((17,17,31,31),fill=(255,255,255,225))
    d.ellipse((20,20,28,28),fill="white")
    return glow


def main():
    dirs = {"S":0,"SW":45,"W":90,"NW":135,"N":180,"NE":225,"E":270,"SE":315}
    assets = {"witch_"+name:encode(witch(angle)) for name,angle in dirs.items()}
    assets.update({name:encode(enemy(name)) for name in ("slime","skeleton","gargoyle")})
    assets.update(orb=encode(orb()), ground=encode(ground()))
    output = "// Generated by generate_assets.py; PNG data URIs, no external requests.\n"
    output += "window.NOCTURNE_ASSETS = Object.freeze("+json.dumps(assets,indent=2)+");\n"
    (ROOT/"assets.js").write_text(output,encoding="utf-8")
    print(f"Generated {len(assets)} PNG assets in {ROOT/'assets.js'} ({len(output):,} bytes)")


if __name__ == "__main__":
    main()
