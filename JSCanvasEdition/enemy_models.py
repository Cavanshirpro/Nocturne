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
RITUALS=('salvo','meteors','slash','aegis','soulring','riftstep','lances','starfall','crossfire','shockwave','voidseal')


def render_enemy(kind, angle=0, phase=None, action='idle', progress=0):
    scale = 3
    im = Image.new('RGBA', (96*scale, 128*scale))
    d = ImageDraw.Draw(im)
    a = math.radians(angle)
    front = math.cos(a)
    cycle = phase if phase is not None else progress*math.tau
    pulse = math.sin(cycle)
    gait = math.sin(phase) if phase is not None else 0
    if action == 'fear':
        gait = math.sin(progress*math.tau)*1.25
    strike = (progress/.42)*.25 if progress<.42 else .25+math.sin((progress-.42)/.58*math.pi)*.75
    intent=action
    action={'salvo':'sweep','meteors':'channel','slash':'sweep','aegis':'guard','soulring':'channel','riftstep':'blink','lances':'sweep','starfall':'channel','crossfire':'channel','shockwave':'guard','voidseal':'channel'}.get(action,action)
    ritual = action in ('channel','sweep','guard','blink')
    attack = strike if action == 'attack' or ritual else 0
    hurt = math.sin(progress*math.pi*1.5) if action == 'hurt' else 0
    death = progress if action == 'death' else 0
    breath = math.sin(progress*math.tau+.4)*.7 if action == 'idle' else 0
    bob = abs(gait)*1.7+breath+(math.sin(cycle*.8)*2.4 if kind in ('wraith','overlord') and action!='death' else 0)
    if action=='channel': bob+=math.sin(progress*math.pi)*(2.5 if kind=='warden' else 4.5)
    if action=='blink': bob+=math.sin(progress*math.pi)*5
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
    if intent in RITUALS:
        glow={'salvo':'#ffc6a3','meteors':'#ffcb89','slash':'#ffd6ce','aegis':'#c6ddff','soulring':'#e8bbf8','riftstep':'#c6abff','lances':'#f8c6ef','starfall':'#ffdb97','crossfire':'#aaf0f2','shockwave':'#f0d8a2','voidseal':'#e4b0ff'}[intent]

    def project(x, y, z):
        if z > 15:
            x += math.sin(cycle+z/32)*min(z/90,1)*(1.2 if kind in ('warden','overlord') else .65)
            y += attack*min(z/70, 1)*7-hurt*5
            if action == 'fear':
                y -= min(z/80, 1)*8
            if action=='sweep': y+=math.sin(progress*math.pi)*min(z/70,1)*10
            if action=='blink': x+=math.sin(progress*math.tau)*min(z/90,1)*3
        if death:
            x += z*death*.03
            z *= 1-death*.80
            y += death*4
        if ritual:
            spread=.76 if action=='sweep' else .84
            x*=spread
            y*=spread
            z*=.88
        xx = x*math.cos(a)-y*math.sin(a)
        yy = x*math.sin(a)+y*math.cos(a)
        return ((48+xx)*scale, (116-(3 if kind=='slime' else 0)-death*9+yy*.46-z*.89-bob*(1-death))*scale)

    def poly(points, color):
        d.polygon([project(*v) for v in points], fill=color)

    def bevel(points, fill, edge, depth=2):
        # A raised material face and a visible dark side wall. Rotates with body.
        back=[(x,y-depth,z) for x,y,z in points]
        for i in range(len(points)):
            j=(i+1)%len(points);poly([back[i],back[j],points[j],points[i]],dark)
        poly(points,fill)
        line([points[0],points[1],points[2]],edge,.9)

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
            pts = [(hem*math.cos(t)+gait*1.7, 13*math.sin(t), 7+gait*math.cos(t)*2+math.sin(cycle+t)*1.6),
                   (hem*math.cos(u)+gait*1.7, 13*math.sin(u), 7+gait*math.cos(u)*2+math.sin(cycle+u)*1.6),
                   (12*math.cos(u), 8*math.sin(u), height), (12*math.cos(t), 8*math.sin(t), height)]
            faces.append((math.sin((t+u)/2+a), pts, color))
        for _, pts, color in sorted(faces):
            poly(pts, color)
        # Layered scalloped brocade and engraved clasp, distinct from flat robes.
        for side in (-1,1):
            for j in range(4):
                z=height-9-j*10;x=side*(9+j*2)
                poly([(x,7,z+4),(x+side*8,8,z),(x+side*7,9,z-7),(x-side*2,10,z-4)],dark)
                line([(x,9,z+3),(x+side*6,10,z-1),(x+side*5,10,z-6)],light,.8)
            line([(side*11,5,height-1),(side*15,7,height-9),(0,11,height-15)],glow,.7)
        oval(0,12,height-16,2.8,3.8,glow)
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
            oval(math.cos(t)*20, math.sin(t)*13, 5+math.sin(cycle+t)*2, 8, 5+math.sin(cycle+t)*.8, dark)
        oval(-5, 1, 27, 9, 11, '#4c7265')
        # A suspended skull and reed-like dorsal growths give the slime a core.
        oval(0,9,25,9,9,'#3d655d');oval(-1,11,27,7,6,'#afc7a4')
        for side in (-1,1):
            oval(side*3,13,28,1.8,2.4,'#263e39')
            line([(side*17,-3,26),(side*20,-4,42+pulse*2),(side*16,-3,48+pulse)],'#779f81',1.3)
        for x in (-3,0,3):line([(x,14,24),(x,14,20)],'#325047',1)
        if front > -.2:
            for side in (-1, 1):
                oval(side*7, 16, 29+attack*7, 3.1, 4, glow)
                oval(side*7, 17, 29+attack*7, 1, 2, '#e8f4d9')
            line([(-5, 18, 18), (0, 19, 15), (6, 18, 19)], dark, 1.3)
        for x, y, z, r in [(-11, 6, 40, 4), (8, 4, 43, 2), (12, 11, 19, 2), (-17, 1, 24, 2)]:
            oval(x+pulse*.8, y, z+math.sin(cycle+x)*1.5, r, r*.65, '#b4c9af')
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
        for j in range(8):
            y=-16+j*4;roll=math.sin(cycle+j)*1.3
            poly([(-9,y,38),(0,y-2,52+roll),(9,y,38),(0,y+2,40)],'#3c3546')
            line([(-6,y,41),(0,y-1,49+roll),(6,y,41)],'#b99aa1',.8)
        for side in (-1,1):
            line([(side*7,17,47),(side*12,14,43),(side*13,8,41)],'#bda087',2)
            oval(side*10,14,45,1.6,2,glow)
        for side in (-1, 1):
            for y in (-10, -2, 6):
                line([(side*10, y, 43), (side*14, y-2, 35), (side*13, y+2, 30)], dark, 1)
        for y in (-15, -8, 0, 8):
            poly([(-5, y, 40), (0, y-3, 54), (6, y, 39)], dark)
        line([(0, -17, 35), (5+math.sin(cycle)*5, -29, 43), (10+math.sin(cycle+.8)*5, -34, 55)], light, 4)
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
        wing = math.sin(cycle*1.3)*7+gait*3+attack*12
        for side in (-1, 1):
            pts=[(side*9, -4, 68), (side*35, -7, 91+wing), (side*41, -4, 55+wing*.4), (side*30, -2, 60), (side*22, -1, 44), (side*13, 0, 56)]
            poly([(x,y-2,z+1) for x,y,z in pts],light)
            poly(pts, dark)
            # Folded membrane surfaces meet at a distinct elbow.
            bevel([(side*9,-4,68),(side*23,-8,79+wing*.5),(side*35,-7,91+wing),(side*29,-4,66)],'#79536e' if kind=='overlord' else '#586374',light,1.5)
            oval(side*23,-6,79+wing*.5,2,2,glow)
            for j,(x,z) in enumerate(((35,91+wing),(30,60),(22,44))):
                poly([(side*10,-4,67),(side*x,-5,z),(side*(x-4),-3,z-8)],'#6b506b' if kind=='overlord' else '#626875')
                line([(side*(x-4),-3,z-8),(side*x,-5,z)],glow,.65)
            for x, z in ((35, 91+wing), (30, 60), (22, 44)):
                line([(side*10, -3, 66), (side*x, -4, z)], light, 1)

    skeletal = kind in ('skeleton', 'reaper')
    if skeletal:
        for side in (-1,1):
            wind=math.sin(cycle+side)*3
            poly([(side*8,-6,68),(side*18,-8,62),(side*22+wind,-11,17),(side*11,-9,28)],'#343b49')
            line([(side*10,-7,65),(side*17+wind,-11,23)],'#9c9393',.7)
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
            poly([(-10,6,63),(0,9,68),(10,6,63),(7,9,52),(0,11,48),(-7,9,52)],'#626a70')
            line([(-8,8,62),(0,11,57),(8,8,62)],'#d3c5a6',1)
            oval(0,12,57,2,3,glow)
        else:
            oval(0, 0, 55, 14, 22, dark)
            poly([(-12, 5, 66), (0, 9, 57), (12, 5, 66), (8, 5, 43), (-8, 5, 43)], light)
            line([(0, 10, 63), (0, 10, 42)], dark, 2)
            for side in (-1, 1):
                for z in (47, 54, 61):
                    line([(side*3, 10, z), (side*10, 7, z+2)], dark, 1)
            line([(-8, 6, 64), (-3, 9, 61), (-5, 9, 57)], '#c2adb8', .7)

    for side in (-1, 1):
        hand_z=43+gait*side*3+attack*(27 if side==1 else 16)+(6 if action=='fear' else 0)
        hand_y=7+gait*side*5+attack*12
        hand_x=side*21
        if action=='channel': hand_z=69+math.sin(progress*math.pi)*18;hand_y=10;hand_x=side*(23+math.sin(progress*math.pi)*6)
        if action=='guard': hand_z=65+math.sin(progress*math.pi)*7;hand_y=16;hand_x=side*(9+math.cos(progress*math.pi)*3)
        if action=='sweep': hand_z=60+side*math.sin(progress*math.tau)*18;hand_y=8+math.sin(progress*math.pi)*19;hand_x=side*28
        if action=='blink': hand_z=49+side*math.sin(progress*math.pi)*22;hand_y=-5+progress*14
        # Each Sovereign power has a separate skeletal pose, not a recolored clip.
        wave=math.sin(progress*math.pi)
        if intent=='salvo':hand_z=62+(8*wave if side==1 else -12*wave);hand_y=14+wave*14;hand_x=side*(22+wave*5)
        if intent=='meteors':hand_z=80+wave*17;hand_x=side*(23-wave*5);hand_y=5+wave*4
        if intent=='slash':hand_z=59+side*math.sin(progress*math.tau)*21;hand_x=side*(27+wave*3);hand_y=5+wave*22
        if intent=='aegis':hand_z=68+side*4;hand_x=-side*(7+wave*3);hand_y=16+wave*5
        if intent=='soulring':hand_z=66+wave*8;hand_x=side*(30+wave*4);hand_y=3
        if intent=='riftstep':hand_z=45+side*wave*23;hand_x=side*24;hand_y=-10+progress*13
        if intent=='lances':hand_z=69+side*8;hand_x=side*(16+wave*9);hand_y=18+wave*9
        if intent=='starfall':hand_z=91+wave*10 if side==1 else 40+wave*8;hand_x=side*22;hand_y=6
        if intent=='crossfire':hand_z=66+side*wave*21;hand_x=side*(27+wave*4);hand_y=-3+side*5
        if intent=='shockwave':hand_z=49-wave*22;hand_x=side*(23+wave*4);hand_y=10+wave*8
        if intent=='voidseal':hand_z=83 if side==1 else 61+wave*13;hand_x=8 if side==1 else -26;hand_y=13+wave*9
        limb([(side*12, 0, 65), (side*(20+attack*4), 2, 51+attack*10), (hand_x, hand_y, hand_z)], 3 if skeletal else 5)
        oval(hand_x, hand_y, hand_z, 3, 3.5, light)
        for finger in (-1, 0, 1):
            line([(hand_x+finger, hand_y, hand_z), (hand_x+side*2+finger*2, hand_y+3, hand_z-5)], light, 1)
        if ritual:
            oval(hand_x,hand_y+1,hand_z,5.5,6,'#eac4ed')
            oval(hand_x,hand_y+2,hand_z+1,2.4,3,'#fff1e5')
        if kind in ('warden', 'overlord'):
            bevel([(side*9, 0, 70), (side*23, 0, 69), (side*24, 3, 56), (side*13, 4, 58)],light,glow,3)
            line([(side*12, 2, 67), (side*21, 2, 65)], glow, 1)
            for j in range(3):
                poly([(side*12,4,62-j*5),(side*23,3,62-j*5),(side*22,6,56-j*5),(side*14,7,54-j*5)],'#665865')
                line([(side*14,6,61-j*5),(side*21,6,60-j*5)],'#c7b3ac',.7)

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
        # Faceted masks and hanging seals make the three cloaked families distinct.
        if kind=='cultist' and front>-.1:
            poly([(-7,9,84),(0,12,88),(7,9,84),(5,11,73),(0,13,69),(-5,11,73)],'#bba0b1')
            for side in (-1,1):
                oval(side*3.5,14,81,2,1.8,'#241b34')
                line([(side*2,14,81),(side*5,13,82)],glow,1)
        if kind=='wraith':
            for side in (-1,1):
                for j in range(3):line([(side*(10+j*3),-5,57),(side*(22+j*3)+math.sin(cycle+j)*3,-9,31),(side*(13+j*2),-6,8+j*3)],'#9fcbd0',.9)
            if front>-.1:oval(0,12,80,4,7,'#b8d5d7');oval(0,13,81,2,3,'#2b5262')
    else:
        skull(81, kind in ('gargoyle', 'warden', 'overlord'))

    if kind in ('cultist', 'warden', 'overlord'):
        sx, sy = 24+attack*7, 6+attack*5+gait*2
        if action=='guard':sx,sy=15,17
        if action=='sweep':sx,sy=math.cos(progress*math.pi)*25,15
        if action=='channel':sx,sy=28,2
        if intent=='starfall':sx,sy=17,1
        if intent=='voidseal':sx,sy=14,14
        if intent=='crossfire':sx,sy=-24,4
        if intent=='shockwave':sx,sy=28,19
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
            bevel([(x-2, 1, 95), (x, 1, 114-abs(x)*.7), (x+2, 3, 95)],'#c5a294','#e7c2b0',1.5)
        oval(0, 10, 59, 5, 7, glow)
        for side in (-1, 1):
            line([(side*15, 5, 67), (side*9, 9, 56), (math.sin(cycle+side)*3, 10, 53)], '#b69a80', 1)
            # Segmented mantle and floating shoulder shards move independently.
            for j in range(3):
                z=58-j*12+math.sin(cycle+side+j)*2
                poly([(side*(15+j*2),-6,z+9),(side*(23+j*2),-5,z+3),(side*(18+j*2),-3,z-6)], '#70556f')
                line([(side*(16+j*2),-4,z+6),(side*(21+j*2),-4,z+2)], '#cf9cad', .8)
        # Ribbed breastplate, filigree, temple chains and a segmented jaw crown.
        for side in (-1,1):
            for j in range(4):line([(side*4,12,65-j*6),(side*13,9,68-j*6),(side*16,7,63-j*6)],'#c4a1a9',1)
            line([(side*8,5,94),(side*16,5,82),(side*12,8,72)],'#d6b690',.8)
            oval(side*15,6,83,1.7,2.8,glow)
    if kind=='warden':
        for side in (-1,1):
            bevel([(side*9,4,72),(side*25,1,70),(side*27,2,60),(side*18,6,62)],'#89908d','#d1c8a7',3)
            bevel([(side*13,3,54),(side*22,3,53),(side*20,7,40),(side*13,8,42)],'#59696d','#b9b4a1',2)
            line([(side*12,5,70),(side*22,4,68)],'#e6cf9e',1)
        if front>-.1:
            poly([(-7,8,87),(0,12,91),(7,8,87),(5,11,77),(0,13,73),(-5,11,77)],'#a9a99b')
            for side in (-1,1):
                oval(side*3,13,83,2.2,1.8,'#222e37')
                oval(side*3,14,83,1.1,1,glow)
            line([(0,14,80),(0,14,76)],'#3d515a',1)
    if kind=='gargoyle':
        for side in (-1,1):
            for z in (43,55,67):line([(side*4,10,z),(side*10,8,z+3),(side*14,6,z-3)],glow,.65)
    if action=='fear':
        for side in (-1, 1):
            line([(side*12, 3, 99), (side*16, 3, 105), (side*18, 3, 102)], '#ecb9dc', 1)
    return im.resize((96, 128), Image.Resampling.LANCZOS)
