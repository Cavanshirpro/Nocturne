"""Articulated enemy models using the witch's orthographic drawing pipeline.

Every limb, weapon, robe panel, skull and wing turns in model space. Eight
facings and six animation states are rendered by generate_assets.py.
"""
import math
from PIL import Image, ImageDraw

KINDS = ('slime', 'skeleton', 'gargoyle', 'hound', 'cultist', 'wraith', 'reaper', 'warden', 'overlord')
DIRECTIONS = {'S': 0, 'SW': 45, 'W': 90, 'NW': 135, 'N': 180, 'NE': 225, 'E': 270, 'SE': 315}
CLIPS = {
    'idle': {'start': 0, 'frames': 4, 'duration': 1.4},
    'walk': {'start': 4, 'frames': 8, 'duration': .65},
    'attack': {'start': 12, 'frames': 6, 'duration': .44},
    'hurt': {'start': 18, 'frames': 3, 'duration': .12},
    'death': {'start': 21, 'frames': 6, 'duration': .6},
    'fear': {'start': 27, 'frames': 6, 'duration': .45},
}


def render_enemy(kind, angle=0, phase=None, action='idle', progress=0):
    scale = 2
    im = Image.new('RGBA', (96*scale, 128*scale))
    d = ImageDraw.Draw(im)
    a = math.radians(angle)
    front = math.cos(a)
    gait = math.sin(phase) if phase is not None else 0
    if action == 'fear':
        gait = math.sin(progress*math.tau)*1.25
    attack = math.sin(progress*math.pi) if action == 'attack' else 0
    hurt = math.sin(progress*math.pi*1.5) if action == 'hurt' else 0
    death = progress if action == 'death' else 0
    breath = math.sin(progress*math.tau+.4)*.7 if action == 'idle' else 0
    bob = abs(gait)*1.7+breath
    palette = {
        'slime': ('#244d46', '#699780', '#bdd9a8'),
        'skeleton': ('#64605b', '#d1c5a7', '#8bd7c6'),
        'gargoyle': ('#414755', '#898291', '#e0a2a3'),
        'hound': ('#3c3746', '#8b7480', '#edb79a'),
        'cultist': ('#30263f', '#786082', '#d7aadf'),
        'wraith': ('#253d49', '#7799a0', '#b3e6e2'),
        'reaper': ('#252c37', '#626b77', '#e2cbb2'),
        'warden': ('#323d43', '#8f8c7c', '#edc994'),
        'overlord': ('#342535', '#956d77', '#efafbf'),
    }
    dark, light, glow = palette[kind]

    def project(x, y, z):
        if z > 15:
            y += attack*min(z/70, 1)*7-hurt*5
            if action == 'fear':
                y -= min(z/80, 1)*8
        if death:
            x += z*death*.10
            z *= 1-death*.80
            y += death*4
        xx = x*math.cos(a)-y*math.sin(a)
        yy = x*math.sin(a)+y*math.cos(a)
        return ((48+xx)*scale, (116-death*9+yy*.46-z*.89-bob*(1-death))*scale)

    def poly(points, color):
        d.polygon([project(*v) for v in points], fill=color)

    def line(points, color, width=1):
        d.line([project(*v) for v in points], fill=color, width=max(1, round(width*scale)), joint='curve')

    def oval(x, y, z, rx, rz, color):
        px, py = project(x, y, z)
        rz *= 1-death*.75
        d.ellipse((px-rx*scale, py-rz*scale, px+rx*scale, py+rz*scale), fill=color)

    def limb(points, width, color=light):
        line(points, dark, width+2)
        line(points, color, width)
        for x, y, z in points[1:-1]:
            oval(x, y, z, width*.65, width*.6, color)

    def robe(height=62, hem=22):
        faces = []
        for i in range(12):
            t, u = i*math.tau/12, (i+1)*math.tau/12
            shade = int(37+13*math.cos(t+a-.8))
            color = (shade, shade-1, shade+12, 255)
            pts = [(hem*math.cos(t)+gait*1.7, 13*math.sin(t), 7+gait*math.cos(t)*2),
                   (hem*math.cos(u)+gait*1.7, 13*math.sin(u), 7+gait*math.cos(u)*2),
                   (12*math.cos(u), 8*math.sin(u), height), (12*math.cos(t), 8*math.sin(t), height)]
            faces.append((math.sin((t+u)/2+a), pts, color))
        for _, pts, color in sorted(faces):
            poly(pts, color)
        for side in (-1, 1):
            line([(side*17+gait, 11, 10), (side*10, 9, height-10)], light, 1)
            for z in (18, 29, 40):
                oval(side*(18-z*.15), 12, z, 1.1, 1.5, glow)
        for side in (-1, 1):
            for z in (23, 34, 45):
                x=side*(14-z*.08)
                line([(x-1.7, 12, z), (x, 12, z+2.5), (x+1.7, 12, z), (x, 12, z-2.5), (x-1.7, 12, z)], glow, .55)
            line([(side*21, 11, 8), (side*14, 10, 30), (side*8, 9, height-5)], dark, 1)
        if front < -.1:
            line([(0, -12, 10), (0, -9, height)], light, 1)

    def skull(z=79, horns=False):
        oval(0, 0, z, 11, 13, dark)
        oval(-1, 2, z+1, 9.3, 11.5, light)
        if front > -.15:
            poly([(-7, 7, z-4), (7, 7, z-4), (5, 8, z-12), (-5, 8, z-12)], light)
            for x in (-4, 4):
                oval(x, 8, z+1, 2.7, 3.1, '#141e25')
                oval(x, 9, z+1, 1.25, 1.3, glow)
            poly([(0, 9, z-1), (-2, 9, z-5), (2, 9, z-5)], '#31343a')
            for x in (-4, -1, 2, 5):
                line([(x, 9, z-7), (x, 9, z-10)], dark, .7)
        else:
            line([(-5, -7, z+4), (1, -9, z), (-2, -8, z-5)], dark, 1)
        for side in (-1, 1):
            line([(side*7, 2, z+9), (side*4, 4, z+6), (side*5, 5, z+3)], dark, .65)
            oval(side*7, 4, z-4, 1.4, 2, dark)
        if horns:
            for side in (-1, 1):
                poly([(side*8, 0, z+7), (side*21, -1, z+24), (side*15, 2, z+6)], light)
                line([(side*10, 0, z+9), (side*18, -1, z+19)], glow, 1)

    if kind == 'slime':
        # Translucent lobes, suspended skull and surface bubbles, all rotated.
        radius = 27*(1+gait*.06-attack*.15)
        oval(0, 0, 19+attack*8, radius, 23+attack*8, dark)
        oval(-3, 0, 24+attack*8, radius*.82, 21, light)
        for i in range(8):
            t=i*math.tau/8
            oval(math.cos(t)*20, math.sin(t)*13, 5+gait*math.cos(t), 8, 5, dark)
        oval(-5, 1, 27, 9, 11, '#4c7265')
        if front > -.2:
            for side in (-1, 1):
                oval(side*7, 16, 29+attack*7, 3.1, 4, glow)
                oval(side*7, 17, 29+attack*7, 1, 2, '#e8f4d9')
            line([(-5, 18, 18), (0, 19, 15), (6, 18, 19)], dark, 1.3)
        for x, y, z, r in [(-11, 6, 40, 4), (8, 4, 43, 2), (12, 11, 19, 2), (-17, 1, 24, 2)]:
            oval(x, y, z, r, r*.65, '#b4c9af')
        return im.resize((96, 128), Image.Resampling.LANCZOS)

    if kind == 'hound':
        # Four independently articulated legs, fur ridges, jaws and tail.
        limbs=[]
        for i, (x, y) in enumerate(((-11, -15), (11, -15), (-11, 13), (11, 13))):
            stride=gait*(1 if i in (0, 3) else -1)*8
            pts=[(x, y, 30), (x+2, y+stride*.5, 15), (x+3, y+stride, 3)]
            limbs.append((x*math.sin(a)+y*math.cos(a), pts))
        for _, pts in sorted(limbs):
            limb(pts, 5, dark)
            for off in (-1, 1):
                line([(pts[-1][0]+off*1.5, pts[-1][1], 3), (pts[-1][0]+off*2, pts[-1][1]+4, 2)], light, 1)
        oval(0, -2, 34, 16, 15, dark)
        oval(-2, 0, 39, 12, 13, light)
        for side in (-1, 1):
            for y in (-10, -2, 6):
                line([(side*10, y, 43), (side*14, y-2, 35), (side*13, y+2, 30)], dark, 1)
        for y in (-15, -8, 0, 8):
            poly([(-5, y, 40), (0, y-3, 54), (6, y, 39)], dark)
        line([(0, -17, 35), (5+gait*3, -29, 43), (10, -34, 55)], light, 4)
        oval(0, 19, 47+attack*2, 12, 12, dark)
        poly([(-10, 19, 50), (-12, 17, 68), (-3, 20, 56)], light)
        poly([(10, 19, 50), (12, 17, 68), (3, 20, 56)], light)
        oval(0, 26+attack*5, 39-attack*5, 8, 6+attack*4, dark)
        if front > -.2:
            for side in (-1, 1):
                oval(side*6, 28, 48, 2, 1.7, glow)
                poly([(side*5, 29, 41), (side*4, 30, 36-attack*7), (side*2, 29, 41)], '#e6d6bd')
            oval(0, 31, 43, 4, 2.3, '#242430')
        return im.resize((96, 128), Image.Resampling.LANCZOS)

    # Rear wings are drawn before the body. Each membrane has its own ribs.
    if kind in ('gargoyle', 'overlord'):
        wing = gait*5+attack*13
        for side in (-1, 1):
            pts=[(side*9, -4, 68), (side*35, -7, 91+wing), (side*41, -4, 55+wing*.4), (side*30, -2, 60), (side*22, -1, 44), (side*13, 0, 56)]
            poly(pts, dark)
            for x, z in ((35, 91+wing), (30, 60), (22, 44)):
                line([(side*10, -3, 66), (side*x, -4, z)], light, 1)

    skeletal = kind in ('skeleton', 'reaper')
    if kind in ('cultist', 'wraith', 'reaper', 'warden', 'overlord'):
        robe(67 if kind in ('warden', 'overlord') else 62, 24 if kind=='overlord' else 22)
        if kind=='wraith':
            for i in range(7):
                t=i*math.tau/7
                poly([(19*math.cos(t), 12*math.sin(t), 19), (27*math.cos(t)+gait*3, 17*math.sin(t), 5), (12*math.cos(t+.4), 9*math.sin(t+.4), 22)], light)
    else:
        for side in (-1, 1):
            stride = gait*side*9
            limb([(side*7, 0, 41), (side*9, stride*.5, 21), (side*10, stride, 3)], 4 if skeletal else 6)
            oval(side*10, stride+3, 3, 6, 3, dark)
        if skeletal:
            limb([(0, 0, 39), (0, 0, 70)], 3)
            for z in (47, 53, 59, 65):
                for side in (-1, 1):
                    line([(0, 3, z+2), (side*11, 5, z), (side*12, 5, z-3), (side*3, 7, z-4)], light, 2)
            oval(0, 0, 41, 9, 5, light)
        else:
            oval(0, 0, 55, 14, 22, dark)
            poly([(-12, 5, 66), (0, 9, 57), (12, 5, 66), (8, 5, 43), (-8, 5, 43)], light)
            line([(0, 10, 63), (0, 10, 42)], dark, 2)
            for side in (-1, 1):
                for z in (47, 54, 61):
                    line([(side*3, 10, z), (side*10, 7, z+2)], dark, 1)
            line([(-8, 6, 64), (-3, 9, 61), (-5, 9, 57)], '#c2adb8', .7)

    for side in (-1, 1):
        hand_z=43+attack*(27 if side==1 else 16)+(6 if action=='fear' else 0)
        hand_y=7+gait*side*5+attack*12
        limb([(side*12, 0, 65), (side*(20+attack*4), 2, 51+attack*10), (side*21, hand_y, hand_z)], 3 if skeletal else 5)
        oval(side*21, hand_y, hand_z, 3, 3.5, light)
        for finger in (-1, 0, 1):
            line([(side*21+finger, hand_y, hand_z), (side*23+finger*2, hand_y+3, hand_z-5)], light, 1)
        if kind in ('warden', 'overlord'):
            poly([(side*9, 0, 70), (side*23, 0, 69), (side*24, 1, 56), (side*13, 3, 58)], light)
            line([(side*12, 2, 67), (side*21, 2, 65)], glow, 1)

    if kind in ('cultist', 'wraith', 'reaper'):
        oval(0, -1, 80, 15, 20, dark)
        poly([(-14, 1, 78), (0, -1, 104), (14, 1, 78), (10, 7, 65), (-10, 7, 65)], light)
        if front > -.1:
            oval(0, 8, 81, 9, 12, '#17202a')
            if kind=='reaper':
                skull(80)
            else:
                for side in (-1, 1):
                    oval(side*4, 12, 81, 2, 1.4, glow)
        else:
            line([(0, -10, 94), (0, -12, 68)], dark, 1)
    else:
        skull(81, kind in ('gargoyle', 'warden', 'overlord'))

    if kind in ('cultist', 'warden', 'overlord'):
        sx, sy = 24+attack*7, 6+attack*5+gait*2
        line([(23-attack*5, 4, 4), (sx, sy, 102)], '#6c5b51', 3)
        line([(24-attack*5, 4, 8), (sx+1, sy, 100)], '#bba17f', 1)
        oval(sx, sy, 102, 6, 8, light)
        oval(sx, sy+1, 103, 3.5, 5, glow)
        oval(sx-1, sy+2, 105, 1.5, 2, '#fff2e1')
        for z in (22, 42, 62):
            line([(23-2, 5, z), (23+2, 5, z+1)], glow, 1)
    if kind in ('skeleton', 'reaper'):
        hx, hy=23, 7+attack*12
        line([(hx, hy, 20), (hx-attack*16, hy, 92+attack*7)], '#827467', 2)
        poly([(hx, hy, 90), (hx-17-attack*9, hy+2, 106), (hx-37-attack*8, hy+2, 93), (hx-18-attack*7, hy+2, 98), (hx, hy, 83)], '#a3a8a0')
        line([(hx-36-attack*8, hy+3, 93), (hx-18-attack*9, hy+3, 102), (hx, hy+1, 88)], '#dde1c9', 1)
    if kind=='overlord':
        # Sovereign crown, chest sigil and chains distinguish it from the Warden.
        for x in (-9, -4, 0, 4, 9):
            poly([(x-2, 1, 95), (x, 1, 114-abs(x)*.7), (x+2, 1, 95)], '#cfac93')
        oval(0, 10, 59, 5, 7, glow)
        for side in (-1, 1):
            line([(side*15, 5, 67), (side*9, 9, 56), (0, 10, 53)], '#b69a80', 1)
    if action=='fear':
        for side in (-1, 1):
            line([(side*12, 3, 99), (side*16, 3, 105), (side*18, 3, 102)], '#ecb9dc', 1)
    return im.resize((96, 128), Image.Resampling.LANCZOS)
