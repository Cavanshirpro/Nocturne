"""v5.2.2 sculpted rig: depth-sorted, lit solid meshes baked to offline sprites.

No live 3D engine is required. Geometry has actual width AND depth; eight
facings share a skeletal pose and a fixed camera-space studio light.
"""
import math
from PIL import Image, ImageDraw


def render_witch(angle=0, phase=None, action='idle', progress=0, demon=False):
    S=3
    im=Image.new('RGBA',(96*S,128*S));draw=ImageDraw.Draw(im)
    a=math.radians(angle);co,si=math.cos(a),math.sin(a)
    cycle=phase if phase is not None else progress*math.tau
    stride=math.sin(cycle) if phase is not None else 0
    cast=math.sin(progress*math.pi) if action=='cast' else 0
    hurt=math.sin(progress*math.pi)*.8+progress*.12 if action=='hurt' else 0
    dash=.25+.7*math.sin(progress*math.pi)+progress*.05 if action=='dash' else 0
    breath=math.sin(cycle)*.65 if action=='idle' else 0
    bob=abs(stride)*1.1+breath
    faces=[]
    cloth=(66,65,100) if not demon else (106,44,78)
    dark=(30,36,56) if not demon else (51,25,48)
    light=(107,112,151) if not demon else (158,80,116)
    gold=(188,156,107) if not demon else (195,125,150)
    skin=(224,184,157) if not demon else (219,165,199)
    hair=(48,39,64) if not demon else (158,123,163)
    glow=(153,225,230) if not demon else (255,153,202)
    def world(v):
        x,y,z=v
        if z>15:
            y+=(cast*4-hurt*6-dash*9)*min(z/70,1)
            z+=bob*min(z/60,1)
        return (x*co-y*si,x*si+y*co,z)
    def project(v):
        x,y,z=v
        return ((48+x)*S,(116+y*.46-z*.85)*S)
    def face(verts,color,emissive=False):
        vs=[world(v) for v in verts]
        u=[vs[1][i]-vs[0][i] for i in range(3)]
        v=[vs[2][i]-vs[0][i] for i in range(3)]
        n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
        length=math.sqrt(sum(x*x for x in n)) or 1
        # Two-sided cloth; faceted meshes keep a coherent camera-space light.
        lum=1 if emissive else .56+.44*max(0,(-n[0]*.45+n[1]*.35+n[2]*.82)/length)
        col=tuple(min(255,max(0,round(c*lum))) for c in color)+(255,)
        depth=sum(v[1]*.85+v[2]*.46 for v in vs)/len(vs)
        faces.append((depth,[project(v) for v in vs],col))
    def rings(levels,color,segments=16):
        # Each level: center x/y/z, x/y radius. Flat ends are solid caps.
        rr=[]
        for x,y,z,rx,ry in levels:
            rr.append([(x+rx*math.cos(i*math.tau/segments),y+ry*math.sin(i*math.tau/segments),z) for i in range(segments)])
        for j in range(len(rr)-1):
            for i in range(segments):
                k=(i+1)%segments
                face([rr[j][i],rr[j][k],rr[j+1][k],rr[j+1][i]],color)
        face(list(reversed(rr[0])),color);face(rr[-1],color)
    def ellipsoid(x,y,z,rx,ry,rz,color):
        levels=[]
        for j in range(9):
            t=-math.pi/2+j*math.pi/8
            r=max(.025,math.cos(t))
            levels.append((x,y,z+rz*math.sin(t),rx*r,ry*r))
        rings(levels,color,16)
    def limb(start,end,r,color):
        # Oriented circular cross sections, not a screen-facing thick line.
        dv=[end[i]-start[i] for i in range(3)];length=math.sqrt(sum(v*v for v in dv)) or 1
        axis=[v/length for v in dv];ref=(0,1,0) if abs(axis[1])<.9 else (1,0,0)
        u=[axis[1]*ref[2]-axis[2]*ref[1],axis[2]*ref[0]-axis[0]*ref[2],axis[0]*ref[1]-axis[1]*ref[0]]
        norm=math.sqrt(sum(v*v for v in u));u=[v/norm for v in u]
        v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]]
        rr=[]
        for point,size in ((start,r),(end,r*.8)):
            rr.append([tuple(point[k]+size*(u[k]*math.cos(i*math.tau/10)+v[k]*math.sin(i*math.tau/10)) for k in range(3)) for i in range(10)])
        for i in range(10):
            k=(i+1)%10;face([rr[0][i],rr[0][k],rr[1][k],rr[1][i]],color)
        face(rr[1],color)
    def gem(x,y,z,size,color):
        points=[(x-size*.75,y,z),(x,y+size*.55,z),(x+size*.75,y,z),(x,y-size*.55,z)]
        for i in range(4):
            face([points[i],points[(i+1)%4],(x,y,z+size)],color,True)
            face([points[(i+1)%4],points[i],(x,y,z-size)],tuple(int(c*.6) for c in color))
    # Split leather boots, rounded toes, separate legs and raised gold cuffs.
    for side in (-1,1):
        step=stride*side
        foot=(side*7,step*9+side*2,5+max(0,-step)*4)
        knee=(side*7,step*4,24)
        limb((side*6,0,40),knee,4.1,dark);limb(knee,foot,3.7,dark)
        x,y,z=foot
        ellipsoid(x,y+3,z,5,8,3.5,dark)
        rings([(x,y,z,4.8,5.2),(x,y,z+12,4.1,4.5)],dark)
        rings([(x,y,z+10,4.3,4.7),(x,y,z+12.2,4.3,4.7)],gold)
    # A thick sculpted coat: rounded front/back, inset waist and flared hem.
    sway=stride*1.1
    rings([(sway,0,12,22,18),(sway*.6,0,29,17,15),(0,0,46,10,10),(0,0,58,12,10),(0,0,65,14,10)],cloth)
    # Raised side panels have a filled center, replacing thin ornamental ticks.
    for side in (-1,1):
        face([(side*6,10,44),(side*11,14,30),(side*18+sway,14,13),(side*10+sway,18,14)],light)
        face([(side*6.3,10.3,44),(side*7.4,10.8,43),(side*13,17,15),(side*11.8,17.5,14)],gold)
        # Broad back mantle with curved, offset depth and a single gold hem.
        wind=math.sin(cycle+side*.8)*1.5+dash*6
        face([(side*5,-11,64),(side*17,-11,60),(side*26+wind,-17,16),(side*10+wind,-20,11)],dark)
        face([(side*10+wind,-20.3,11),(side*26+wind,-17.3,16),(side*25+wind,-17.3,19),(side*10+wind,-20.3,14)],gold)
    # Chest, articulated shoulder caps, belt and a substantial center buckle.
    ellipsoid(0,3,56,10,10,11,dark)
    rings([(0,0,41,11.2,11.3),(0,0,44,11.2,11.3)],gold)
    gem(0,12,43,3.4,glow)
    for side in (-1,1):
        shoulder=(side*13,0,62)
        elbow=(side*(17+cast*2),3-side*stride*3,51+cast*(9 if side<0 else 3))
        hand=(side*(20+cast*(5 if side<0 else 1)),7-side*stride*4,43+cast*(22 if side<0 else 7))
        limb(shoulder,elbow,5.4,cloth);limb(elbow,hand,4.2,cloth)
        ellipsoid(*shoulder,7.2,9,4.5,gold)
        ellipsoid(*hand,3.3,3.4,4,skin)
        cuff=tuple(hand[k]*.88+elbow[k]*.12 for k in range(3))
        ellipsoid(*cuff,4.6,4.5,2.3,gold)
        if side<0 and cast>.12:
            gem(hand[0],hand[1]+1,hand[2]+9,3+cast*2,glow)
    # The face is an ellipsoid, with a physical nose and swept hair lobes.
    limb((0,0,63),(0,0,70),4,skin)
    ellipsoid(0,0,77,10.2,10,12.2,hair)
    ellipsoid(0,6,77,7.8,6.2,9.5,skin)
    ellipsoid(0,12,76.5,1.6,2.4,2.5,skin)
    for side in (-1,1):
        wind=math.sin(cycle+side)*.8+stride*.7
        ellipsoid(side*8.5,-2,70,3.4,5,13,hair)
        limb((side*9,-3,68),(side*10+wind,-4,55),2.5,hair)
        ellipsoid(side*3.4,11.7,79,1.3,.65,1.1,dark)
        gem(side*3.4,12.1,79,.65,glow)
    ellipsoid(-2,6.4,84,8,4,3.2,hair)
    # Forged staff, thick spearhead and emissive inset gem.
    sx=23+stride+cast*3;sy=5+stride*2+cast*4
    limb((21-stride,4,5),(sx,sy,90),1.8,gold)
    for z in (26,52,77):ellipsoid(sx,sy,z,2.8,2.8,1.2,dark)
    for side in (-1,1):
        limb((sx,sy,81),(sx+side*5,sy,90),1.2,gold)
        limb((sx+side*5,sy,90),(sx+side*3,sy,97),1,gold)
    gem(sx,sy+1,90,5,glow)
    if demon:
        # Rounded armored diadem and swept volumetric horns.
        rings([(0,0,86,10.5,10.5),(0,0,91,10.2,10)],gold)
        gem(0,11,90,3.5,glow)
        for side in (-1,1):
            limb((side*8,0,90),(side*16,-2,103),3.8,dark)
            limb((side*16,-2,103),(side*14,-4,115),2.6,gold)
    else:
        # The brim is a filled 3D elliptical disc with a substantial side wall.
        rings([(0,0,92,28,22),(0,0,95,28,22)],dark,24)
        rings([(0,0,94,27.4,21.4),(0,0,95.2,27.4,21.4)],gold,24)
        rings([(0,0,95,16,13),(1,0,104,12,10),(0,0,113,8,7),(-5,1,120,4.5,4),(-10,2,123,.6,.8)],cloth,18)
        rings([(0,0,96,15.7,12.8),(0,0,100,14.2,11.7)],dark,18)
        gem(1,13,98,3.5,glow)
    for _,verts,color in sorted(faces,key=lambda f:f[0]):draw.polygon(verts,fill=color)
    return im.resize((96,128),Image.Resampling.LANCZOS)
