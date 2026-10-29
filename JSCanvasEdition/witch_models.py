"""v0.7.2 sculpted rig: depth-sorted, lit solid meshes baked to offline sprites.

No live 3D engine is required. Geometry has actual width AND depth; eight
facings share a skeletal pose and a fixed camera-space studio light.
"""
import math
from PIL import Image, ImageDraw


def render_witch(angle=0, phase=None, action='idle', progress=0, demon=False, return_masks=False):
    S=3
    im=Image.new('RGBA',(96*S,128*S));draw=ImageDraw.Draw(im)
    mask=Image.new('L',im.size);md=ImageDraw.Draw(mask);material=0
    a=math.radians(angle);co,si=math.cos(a),math.sin(a)
    cycle=phase if phase is not None else progress*math.tau
    stride=math.sin(cycle)*1.22 if phase is not None else 0
    # Asymmetric anticipation, sharp release, and a visibly settling recovery.
    cast=(progress/.4*.7 if progress<.4 else 1-(progress-.4)/.6) if action=='cast' else 0
    hurt=(1-progress)**2*.9+progress*.08 if action=='hurt' else 0
    dash=(.4+progress*1.2 if progress<.5 else 1-(progress-.5)*1.6) if action=='dash' else 0
    breath=math.sin(cycle)*.65 if action=='idle' else 0
    bob=abs(math.sin(cycle*2))*.65+breath
    faces=[]
    cloth=(85,76,117) if not demon else (126,48,83)
    dark=(30,36,56) if not demon else (51,25,48)
    light=(134,130,170) if not demon else (175,88,121)
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
        lum=1 if emissive else .48+.46*max(0,(-n[0]*.45+n[1]*.35+n[2]*.82)/length)+.08*max(0,n[0]/length)
        # Soft warm key + cool rim are fixed in camera space, across facings.
        col=tuple(min(255,max(0,round(c*lum))) for c in color)+(255,)
        depth=sum(v[1]*.85+v[2]*.46 for v in vs)/len(vs)
        tag=material if material!=2 or sum(v[2] for v in verts)/len(verts)<46 else 0
        faces.append((depth,[project(v) for v in vs],col,tag))
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
        foot=(side*7,step*9+side*2,5+max(0,-step)*3)
        # Planted foot stays low; the opposite heel clears the ground.
        knee=(side*7,step*4,24)
        limb((side*6,0,40),knee,4.1,dark);limb(knee,foot,3.7,dark)
        x,y,z=foot
        ellipsoid(x,y+3,z,5,8,3.5,dark)
        rings([(x,y,z,4.8,5.2),(x,y,z+12,4.1,4.5)],dark)
        rings([(x,y,z+10,4.3,4.7),(x,y,z+12.2,4.3,4.7)],gold)
    # A thick sculpted coat: rounded front/back, inset waist and flared hem.
    sway=stride*1.1
    material=2
    rings([(sway,0,12,22,19),(sway*.6,0,29,18,16),(0,0,46,11,11),(0,0,58,13,11),(0,0,65,14,11)],cloth)
    # Raised side panels have a filled center, replacing thin ornamental ticks.
    for side in (-1,1):
        material=2
        face([(side*6,10,44),(side*11,14,30),(side*18+sway,14,13),(side*10+sway,18,14)],light)
        face([(side*6.3,10.3,44),(side*7.4,10.8,43),(side*13,17,15),(side*11.8,17.5,14)],gold)
        # Broad back mantle with curved, offset depth and a single gold hem.
        material=1
        wind=math.sin(cycle+side*.8)*1.5+dash*6
        # Curved mantle has a solid folded edge and a raised inner-facing surface.
        root=(side*5,-11,64);shoulder=(side*17,-11,60);fold=(side*21+wind*.6,-16,35);tip=(side*26+wind,-17,16);inner=(side*10+wind,-20,11)
        face([root,shoulder,fold,inner],dark)
        face([shoulder,tip,inner,fold],cloth)
        face([tip,(tip[0],tip[1]-2,tip[2]+1),(inner[0],inner[1]-2,inner[2]+1),inner],gold)
        face([root,fold,(inner[0],inner[1]+1.3,inner[2]+1)],light)
        face([(side*10+wind,-20.3,11),(side*26+wind,-17.3,16),(side*25+wind,-17.3,19),(side*10+wind,-20.3,14)],gold)
    material=0
    # Chest, articulated shoulder caps, belt and a substantial center buckle.
    ellipsoid(0,3,56,10,10,11,dark)
    rings([(0,0,41,11.2,11.3),(0,0,44,11.2,11.3)],gold)
    gem(0,12,43,3.4,glow)
    for side in (-1,1):
        shoulder=(side*13,0,62)
        elbow=(side*(17+cast*2),3-side*stride*3,51+cast*(9 if side<0 else 3))
        hand=(side*(20+cast*(5 if side<0 else 1)),7-side*stride*4,43+cast*(29 if side<0 else 12))
        limb(shoulder,elbow,5.4,cloth);limb(elbow,hand,4.2,cloth)
        ellipsoid(*shoulder,7.5,10,5.2,gold)
        ellipsoid(shoulder[0],shoulder[1]+2,shoulder[2]+1,5.8,8.5,3.2,dark)
        ellipsoid(*hand,3.3,3.4,4,skin)
        cuff=tuple(hand[k]*.88+elbow[k]*.12 for k in range(3))
        ellipsoid(*cuff,4.6,4.5,2.3,gold)
        if side<0 and cast>.12:
            gem(hand[0],hand[1]+1,hand[2]+9,3+cast*2,glow)
    # Two short weighted tassels, isolated in the cloth mask.
    material=3
    for side in (-1,1):
        limb((side*10,11,41),(side*11+math.sin(cycle+side)*1.2,13,26),.9,gold)
        gem(side*11+math.sin(cycle+side)*1.2,13,25,1.5,glow)
    material=0
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
    for _,verts,color,tag in sorted(faces,key=lambda f:f[0]):
        draw.polygon(verts,fill=color);md.polygon(verts,fill=tag)
    result=im.resize((96,128),Image.Resampling.LANCZOS)
    if not return_masks:return result
    # Visible material IDs, not approximate horizontal body bands. Run-length
    # rectangles are decoded into bounded, lazy Canvas tiles at runtime.
    small=mask.resize((96,128),Image.Resampling.NEAREST);runs=[[],[],[]]
    for y in range(128):
        x=0
        while x<96:
            tag=small.getpixel((x,y));start=x;x+=1
            while x<96 and small.getpixel((x,y))==tag:x+=1
            if tag:runs[tag-1].extend((start,y,x-start))
    return result,runs
