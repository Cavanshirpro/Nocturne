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


def witch(angle, phase=None, action="idle", progress=0):
    """Rotate an entire model, including shoulders, robe, face and staff.

    Local +Y is the character's front. Orthographic projection compresses depth
    and raises Z. Sorting the robe panels gives a shaded, volumetric silhouette.
    """
    im = Image.new("RGBA", (96*S, 128*S))
    d = ImageDraw.Draw(im)
    a = math.radians(angle)
    gait = math.sin(phase) if phase is not None else 0
    sway = math.cos(phase)*1.3 if phase is not None else 0
    lift = abs(math.sin(phase)) * 1.4 if phase is not None else 0
    cast = math.sin(progress*math.pi) if action == "cast" else 0
    reach = cast*(.3+.9*progress)
    recoil = math.sin(progress*math.pi) if action == "hurt" else 0
    lean = 5+progress*2 if action == "dash" else 0
    if action == "dash":
        gait=math.sin(progress*math.pi)*.7;lift=.5+math.sin(progress*math.pi)*.9
    if action == "idle":
        lift = math.sin(progress*math.tau)*.65

    def p(x, y, z):
        # Upper-body lean is independent of the planted feet. The hem, hands,
        # boots and staff get their own gait offsets below, not a shifted bitmap.
        if z > 12:
            y -= 1.4+sway*.5 if phase is not None else 0
            z += lift * min(1, z / 50)
        if z>20:
            y += (cast*2+reach*2-recoil*4-lean)*min(z/60,1)
        xx = x*math.cos(a) - y*math.sin(a)
        yy = x*math.sin(a) + y*math.cos(a)
        # Leave headroom for the pointed tip and the lifted walking poses.
        return ((48+xx)*S, (116+(2 if action=="dash" else 0)+yy*.48-z*.89)*S)

    def poly(points, fill):
        d.polygon([p(*v) for v in points], fill=fill)

    def ellipse(x, y, z, rx, rz, fill):
        cx, cy = p(x, y, z)
        d.ellipse((cx-rx*S, cy-rz*S, cx+rx*S, cy+rz*S), fill=fill)

    # Boots, flared robe: each vertical facet rotates with the torso.
    boots = [(-8, 4+gait*10, 2+max(0,-gait)*3),
             (8, 4-gait*10, 2+max(0,gait)*3)]
    for x,y,z in sorted(boots, key=lambda v: v[0]*math.sin(a)+v[1]*math.cos(a)):
        poly([(x-4,y-2,13),(x+4,y-2,13),(x+5,y+5,z),(x-5,y+5,z)], "#211c26")
        ellipse(x, y, z, 6, 3.8, "#15121c")
    panels = []
    for i in range(12):
        t, u = i*math.tau/12, (i+1)*math.tau/12
        pts = [(23*math.cos(t)+gait*1.7, 14*math.sin(t), 8+gait*math.cos(t)*3),
               (23*math.cos(u)+gait*1.7, 14*math.sin(u), 8+gait*math.cos(u)*3),
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
        poly([(-5+gait*1.7,10,11-gait*2),(6+gait*1.7,10,11+gait*2),(5,8,54),(-5,8,54)], "#555060")
    else:
        # A back seam replaces the front opening on rear-facing views.
        d.line([p(0, -10, 12), p(0, -7, 52)], fill="#45404d", width=S)
    ellipse(0, 0, 56, 14, 8, "#292634")
    if front > .08:
        poly([(-12, 8, 47), (12, 8, 47), (12, 8, 51), (-12, 8, 51)], "#807052")
        ellipse(0, 9, 49, 3, 2, "#c1a772")
    # Embroidered trim follows the rotated robe geometry.
    for side in (-1,1):
        d.line([p(side*7,9,48),p(side*11+gait*1.7,12,27),p(side*16+gait*1.7,13,12)],fill="#8e7857",width=S)
        for z in (18,28,38):
            ellipse(side*(15-z*.16),12,z,1.15,1.7,"#b19b6b")
    # The free hand rises and opens during a real cast, while the staff tilts.
    hand_x,hand_y,hand_z=-18-cast*8,5+cast*11+reach*7-gait*5,38+cast*30
    poly([(-12,0,61),(hand_x-5,hand_y-4,hand_z+5),(hand_x+4,hand_y+3,hand_z-3),(-6,3,59)], "#433d51")
    ellipse(hand_x,hand_y,hand_z,3.2,3.2,"#d0b497")
    if cast>.2:
        for i in (-1,0,1):
            d.line([p(hand_x+i*1.6,hand_y,hand_z),p(hand_x+i*2.6,hand_y+cast*3,hand_z+5)],fill="#d8bda1",width=S)
        ellipse(hand_x,hand_y,hand_z+9,2+cast*3,2+cast*3,(210,228,255,180))
        ellipse(hand_x,hand_y,hand_z+9,1.5,1.5,"#ffffff")
    poly([(12,0,61),(21,3+gait*4,43+cast*7),(16,8+gait*4,40+cast*7),(6,3,59)], "#4d445b")
    ellipse(18,6+gait*4,42+cast*7,3,3,"#cbb093")
    staff_x,staff_y,staff_z=23+gait+cast*7+reach*3,6+gait*3+cast*4+reach*3,84+cast*5
    d.line([p(23-gait-cast*4,6+gait*5,6),p(staff_x,staff_y,staff_z)],fill="#a48a61",width=2*S)
    ellipse(staff_x,staff_y,staff_z,5,7,"#897caa")
    ellipse(staff_x-1,staff_y,staff_z+1,3,5,"#c6c7eb")
    ellipse(staff_x-1,staff_y,staff_z+3,1.4,2.5,"#fff5e4")
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
    # Thin moonlit edges preserve the silhouette against the forest.
    d.line([p(-17,0,91),p(-4,1,125),p(5,0,120)],fill="#8a7d98",width=S)
    ellipse(4,3,95,1,1,"#f8e5b6")
    return im.resize((96, 128), Image.Resampling.LANCZOS)


def enemy(kind, phase=None):
    im = Image.new("RGBA", (80*S, 88*S))
    d = ImageDraw.Draw(im)
    gait=math.sin(phase) if phase is not None else 0

    def point(x,y):
        if kind=="slime":
            x=40+(x-40)*(1+gait*.055)
            y=79+(y-79)*(1-gait*.085)-max(0,gait)*2
        return (x*S,y*S)

    def e(box, fill):
        d.ellipse((*point(box[0],box[1]),*point(box[2],box[3])), fill=fill)

    def line(points, fill, width):
        d.line([point(x,y) for x,y in points],fill=fill,width=width*S,joint="curve")

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
            line([(x,51),(x+sign*4+gait*sign*3,65),(x+sign*8+gait*sign*6,79-abs(gait)*2)], "#b5b09c", 5)
        line([(40,29),(40,58)], "#ded5b5", 5)
        for y in (35,41,47):
            line([(27,y-2),(32,y+3),(48,y+3),(53,y-2)], "#bcb8a1", 3)
        line([(27,31),(19,42),(23,55)], "#c7c0a6", 4)
        line([(53,31),(61,43),(57,55)], "#c7c0a6", 4)
        e((26, 7, 55, 32), "#c9c1a5")
        e((30, 15, 37, 23), "#2d3030")
        e((44, 15, 51, 23), "#2d3030")
        line([(35,28),(46,28)], "#5f5d52", 2)
    elif kind == "hound":
        e((13, 38, 66, 65), "#5d5154")
        e((21, 33, 56, 55), "#817071")
        for i,x in enumerate((19,33,49,60)):
            stride=gait*(1 if i%2 else -1)*6
            line([(x,55),(x-3+stride,72),(x+4+stride,75-abs(stride)*.3)],"#4b414b",5)
        e((45, 27, 75, 50), "#a18b84")
        d.polygon([(49*S,32*S),(46*S,15*S),(58*S,28*S)], fill="#7d6c6d")
        d.polygon([(63*S,30*S),(69*S,17*S),(70*S,36*S)], fill="#7d6c6d")
        e((62, 35, 68, 40), "#edd0a2")
        line([(16,46),(7,34),(3,24)], "#786168", 5)
    elif kind == "cultist":
        d.polygon([(37*S,15*S),(56*S,28*S),((67+gait*2)*S,77*S),((14+gait*2)*S,77*S),(25*S,28*S)], fill="#473a4f")
        d.polygon([(39*S,23*S),((53+gait*2)*S,76*S),((29+gait*2)*S,76*S)], fill="#675069")
        e((27, 8, 55, 38), "#2a2736")
        e((31, 13, 50, 33), "#141d23")
        for x in (35,44):
            e((x,21,x+3,24), "#d4a3b2")
        line([(64,76),(64,18)], "#948278", 3)
        e((58,8,70,23), "#bca0ca")
        e((61,11,67,19), "#f7e2ed")
    elif kind == "warden":
        d.polygon([(27*S,28*S),(54*S,28*S),((68+gait*2)*S,80*S),((11+gait*2)*S,80*S)], fill="#353943")
        d.polygon([(36*S,29*S),(48*S,29*S),((57+gait*2)*S,80*S),((23+gait*2)*S,80*S)], fill="#5c5964")
        for x in (22,58):
            e((x-9,27,x+9,45), "#736a68")
        e((29,12,52,35), "#b9aa8f")
        for x in (34,44):
            e((x,20,x+5,25), "#171e24")
        line([(30,19),(17,10),(13,1)], "#b6a38c", 3)
        line([(50,19),(62,9),(67,1)], "#b6a38c", 3)
        line([(18,11),(21,2)], "#b6a38c", 2)
        line([(61,10),(59,2)], "#b6a38c", 2)
        line([(61,76),(68,24)], "#98866a", 3)
        e((62,15,75,28), "#d3b985")
        e((66,18,72,24), "#fff0ce")
    else:
        d.polygon([(5*S,(13+gait*8)*S),(29*S,33*S),(24*S,60*S),(3*S,(45+gait*4)*S),(14*S,39*S)], fill="#494453")
        d.polygon([(75*S,(13+gait*8)*S),(51*S,33*S),(56*S,60*S),(77*S,(45+gait*4)*S),(66*S,39*S)], fill="#625b6b")
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


def prop(kind):
    """Small painted landmarks; contact points share the bottom of the canvas."""
    im=Image.new("RGBA",(160*S,200*S));d=ImageDraw.Draw(im)
    def poly(pts,color):d.polygon([(x*S,y*S) for x,y in pts],fill=color)
    def line(pts,color,width=2):d.line([(x*S,y*S) for x,y in pts],fill=color,width=width*S,joint="curve")
    def el(box,color):d.ellipse(tuple(v*S for v in box),fill=color)
    el((20,173,144,195),(4,10,13,85))
    if kind=="tree":
        poly([(65,182),(73,83),(62,53),(78,74),(90,27),(89,88),(109,63),(94,104),(101,181)],"#282e33")
        line([(72,177),(83,95),(92,58)],"#586064",3)
        for x,y,r in [(44,90,29),(91,50,33),(118,91,30),(58,42,25),(40,123,26),(111,123,29),(76,102,35)]:
            el((x-r,y-r*.72,x+r,y+r*.72),"#1c3434")
            el((x-r*.82,y-r*.7,x+r*.64,y+r*.3),"#304849")
            line([(x-r*.35,y-r*.5),(x+r*.2,y-r*.58)],"#61716a",1)
        line([(67,184),(58,190),(78,184),(104,189)],"#3b4440",3)
    elif kind=="arch":
        poly([(32,184),(35,59),(65,26),(98,26),(127,59),(130,184),(106,184),(104,75),(93,57),(71,57),(56,75),(55,184)],"#41474a")
        poly([(35,59),(65,26),(98,26),(127,59),(116,65),(94,37),(69,37),(45,66)],"#777c75")
        line([(37,181),(40,66),(67,32),(95,32)],"#a1a08b",2)
        for y in (79,105,133,159):
            line([(34,y),(56,y+2)],"#242e31",2);line([(106,y+3),(128,y)],"#232e30",2)
        poly([(30,185),(32,175),(60,175),(63,185)],"#626b60")
        poly([(102,185),(104,175),(132,175),(136,185)],"#626b60")
        for y in (65,95,121):el((109,y,117,y+16),"#536850")
        el((73,37,88,51),"#c5b57d");el((78,39,88,48),"#41474a")
    else:
        poly([(50,183),(49,99),(62,77),(99,77),(112,99),(111,183)],"#4b5353")
        poly([(50,99),(62,77),(99,77),(108,97)],"#7a8176")
        line([(53,178),(53,101),(65,83),(96,83)],"#a3a792",2)
        line([(80,103),(80,143)],"#242e30",3);line([(67,116),(94,116)],"#242e30",3)
        poly([(39,185),(43,171),(119,171),(126,185)],"#576356")
        for x in (45,108):el((x,164,x+13,176),"#738062")
    return im.resize((160,200),Image.Resampling.LANCZOS)


def main():
    dirs={"S":0,"SW":45,"W":90,"NW":135,"N":180,"NE":225,"E":270,"SE":315}
    assets={"witch_"+name:encode(witch(angle)) for name,angle in dirs.items()}
    assets.update({name:encode(enemy(name)) for name in ("slime","skeleton","gargoyle","hound","cultist","warden")})
    assets.update(orb=encode(orb()),ground=encode(ground()))
    walk_frames={name:[witch(angle,i*math.tau/8) for i in range(8)] for name,angle in dirs.items()}
    clips={"idle":{"frames":4,"duration":1.8,"loop":True,"priority":0},
           "walk":{"frames":8,"duration":.45,"loop":True,"priority":0},
           "cast":{"frames":6,"duration":.28,"loop":False,"priority":2},
           "hurt":{"frames":3,"duration":.22,"loop":False,"priority":4},
           "dash":{"frames":3,"duration":.2,"loop":False,"priority":3}}
    cursor=0
    for clip in clips.values():clip["start"]=cursor;cursor+=clip["frames"]
    def sheet(frames):
        w,h=frames[0].size;result=Image.new("RGBA",(w*len(frames),h))
        for i,frame in enumerate(frames):result.paste(frame,(i*w,0))
        return result
    for name,angle in dirs.items():
        frames=[]
        for state,clip in clips.items():
            for i in range(clip["frames"]):
                t=i/(clip["frames"]-1) if not clip["loop"] else i/clip["frames"]
                frames.append(walk_frames[name][i] if state=="walk" else witch(angle,action=state,progress=t))
        assets["witch_atlas_"+name]=encode(sheet(frames))
    for name in ("slime","skeleton","gargoyle","hound","cultist","warden"):
        assets["enemy_walk_"+name]=encode(sheet([enemy(name,i*math.tau/4) for i in range(4)]))
    for name in ("tree","arch","tomb"):assets["prop_"+name]=encode(prop(name))
    output="// Generated by generate_assets.py; embedded PNGs, zero runtime requests.\n"
    output+="window.NOCTURNE_ASSETS = Object.freeze("+json.dumps(assets,indent=2)+");\n"
    output+='window.NOCTURNE_ANIMATIONS = Object.freeze({witch:{frames:8,width:96,height:128},enemy:{frames:4,width:80,height:88}});\n'
    output+='window.NOCTURNE_ATLAS = Object.freeze('+json.dumps({"version":1,"width":96,"height":128,"totalFrames":cursor,"clips":clips})+');\n'
    (ROOT/"assets.js").write_text(output,encoding="utf-8")
    previews=[]
    for i in range(8):
        preview=Image.new("RGB",(480,324),"#202829");draw=ImageDraw.Draw(preview)
        for j,(name,frames) in enumerate(walk_frames.items()):
            x,y=(j%4)*120+12,(j//4)*160+6;preview.paste(frames[i],(x,y),frames[i]);draw.text((x+40,y+134),name,fill="#dccbaa")
        previews.append(preview)
    previews[0].save(ROOT/"walking-preview.gif",save_all=True,append_images=previews[1:],duration=90,loop=0,optimize=False)
    cast_preview=[]
    for i in range(12):
        preview=Image.new("RGB",(640,210),"#172426");draw=ImageDraw.Draw(preview)
        for j,(state,clip) in enumerate(clips.items()):
            t=(i%6)/5 if not clip['loop'] else i/12
            frame=witch(315,i*math.tau/8) if state=='walk' else witch(315,action=state,progress=t)
            preview.paste(frame,(j*128+16,22),frame);draw.text((j*128+40,170),state.upper(),fill="#dccbaa")
        cast_preview.append(preview)
    cast_preview[0].save(ROOT/"animation-preview.gif",save_all=True,append_images=cast_preview[1:],duration=70,loop=0,optimize=False)
    print(f"Generated {len(assets)} PNGs; {cursor} witch frames x 8 directions; {len(output):,} bytes")


if __name__ == "__main__":main()
