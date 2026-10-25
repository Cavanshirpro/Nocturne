"""v5.2.1 volume-enhanced character rig: layered cloth, jointed limbs, face, hair and Demon armor.

All geometry is generated locally. The same 96x128 footprint and facing system
are retained; costume attachments are projected by systems/appearance.js.
"""
import math
from PIL import Image, ImageDraw


def render_witch(angle=0, phase=None, action='idle', progress=0, demon=False):
    scale=3
    im=Image.new('RGBA',(96*scale,128*scale));d=ImageDraw.Draw(im)
    a=math.radians(angle);front=math.cos(a)
    cycle=phase if phase is not None else progress*math.tau
    stride=math.sin(cycle) if phase is not None else 0
    cast=math.sin(progress*math.pi) if action=='cast' else 0
    hurt=(math.sin(progress*math.pi)*(1-.25*progress)+.12*progress) if action=='hurt' else 0
    dash=(.25+.7*math.sin(progress*math.pi)+.05*progress) if action=='dash' else 0
    breath=math.sin(cycle)*.7 if action=='idle' else 0
    body_bob=abs(stride)*1.2+breath
    ink='#141927';cloth='#302a46' if not demon else '#462139';edge='#b7a1c2' if not demon else '#eca8b4'
    metal='#b69b79' if not demon else '#bd7986';skin='#dcc1ad' if not demon else '#d5abc2'
    glow='#b8e7ee' if not demon else '#ffbbd7'

    def p(x,y,z):
        if z>15:
            y+=(cast*4-hurt*6-dash*9)*min(z/70,1)
            z+=body_bob*min(z/60,1)
        xx=x*math.cos(a)-y*math.sin(a);yy=x*math.sin(a)+y*math.cos(a)
        return ((48+xx)*scale,(116+yy*.46-z*.85)*scale)
    def poly(pts,col):d.polygon([p(*v) for v in pts],fill=col)
    def line(pts,col,width=1):d.line([p(*v) for v in pts],fill=col,width=max(1,round(width*scale)),joint='curve')
    def orb(x,y,z,rx,rz,col):
        px,py=p(x,y,z);d.ellipse((px-rx*scale,py-rz*scale,px+rx*scale,py+rz*scale),fill=col)
    def volume_head(x,y,z,rx,ry,rz,body,highlight):
        # Side silhouette derives from actual skull depth, not a flat bitmap.
        xx,yy=p(x,y,z)
        wide=math.hypot(rx*math.cos(a),ry*math.sin(a))
        d.ellipse((xx-wide*scale,yy-rz*scale,
                   xx+wide*scale,yy+rz*scale),fill=body)
        shine=max(2.5,wide*.57)
        offset=-wide*.18 if math.cos(a)>=0 else wide*.18
        d.ellipse((xx+(offset-shine)*scale,yy-rz*.73*scale,
                   xx+(offset+shine)*scale,yy+rz*.44*scale),fill=highlight)

    def sculpted_brim(rx,ry,z):
        # A pitched ellipse with separate upper surface and raised outer lip.
        # Its depth (ry) stays visible when the witch faces E or W.
        n=24
        vertices=[(rx*math.cos(i*math.tau/n),ry*math.sin(i*math.tau/n),
                   z+1.2*math.sin(i*math.tau/n)) for i in range(n)]
        poly(vertices,ink)
        inner=[(v[0]*.89,v[1]*.86,v[2]+1.7) for v in vertices]
        poly(inner,cloth)
        for i in range(n):
            j=(i+1)%n
            line([vertices[i],vertices[j]],edge if i%4==0 else metal,.5)
        poly([(v[0]*.56,v[1]*.59,v[2]+2.6) for v in vertices],
             '#463748' if demon else '#4b4155')

    def limb(pts,width,col):
        line(pts,ink,width+2);line(pts,col,width)
        for x,y,z in pts[1:-1]:orb(x,y,z,width*.6,width*.6,metal)

    # Ragged, independently breathing back mantle with a raised collar.
    for j in range(7):
        x=(j-3)*5.8;wind=math.sin(cycle+j*.65)*(1.5+abs(stride)*2)+dash*8
        poly([(x*.55,-7,64),(x*.78,-11,45),(x+wind,-13-dash*9,10+abs(j-3)*2),(x-5+wind,-13,14),(x*.55-3,-7,63)],ink)
        line([(x*.55,-8,61),(x*.85+wind*.4,-12,31),(x+wind,-13,13+abs(j-3)*2)],metal,.7)
    for side in (-1,1):
        leg=stride*side
        # Opposing heel depths keep two distinct boots readable in profile.
        heel_depth=side*3.5
        limb([(side*6,0,35),(side*7,leg*5+heel_depth*.55,20),(side*8,leg*10+heel_depth,4+max(0,-leg)*3)],4,'#504252' if not demon else '#6a334e')
        poly([(side*8-4,leg*10+heel_depth-4,15),(side*8+4,leg*10+heel_depth-4,15),(side*8+5,leg*10+heel_depth+8,3),(side*8-5,leg*10+heel_depth+8,3)],ink)
        line([(side*8-3,leg*10+heel_depth+7,5),(side*8+4,leg*10+heel_depth+7,5)],metal,1)
        for z in (8,12):line([(side*8-3,leg*10+heel_depth+1,z),(side*8+3,leg*10+heel_depth+1,z)],'#8c7080',.6)

    # Sculpted brocade robe with thirteen actual panels, a corset and split front.
    faces=[]
    for i in range(14):
        t=i*math.tau/14;u=(i+1)*math.tau/14
        sw=math.sin(cycle+t)*1.4+stride*1.6
        col=int(40+13*math.cos(t+a-.65))
        pts=[(22*math.cos(t)+sw,18*math.sin(t),10+stride*math.cos(t)*2),(22*math.cos(u)+sw,18*math.sin(u),10+stride*math.cos(u)*2),(10*math.cos(u),11*math.sin(u),57),(10*math.cos(t),11*math.sin(t),57)]
        faces.append((math.sin(t+a),pts,(col+10 if demon else col,col-9 if demon else col-5,col+16,255)))
    for _,pts,col in sorted(faces):poly(pts,col)
    for side in (-1,1):
        line([(side*8,8,53),(side*12+stride,12,30),(side*18+stride,12,12)],metal,1)
        for j,z in enumerate((17,25,33,41)):
            x=side*(17-z*.18);poly([(x,12,z+2),(x+1.4,12,z),(x,12,z-2),(x-1.4,12,z)],glow)
    if front>-.1:
        poly([(-8,8,58),(8,8,58),(7,10,39),(-7,10,39)],'#191c2c')
        for z in range(42,58,4):line([(-5,11,z),(5,11,z+3)],metal,.65)
        poly([(-12,9,40),(12,9,40),(12,9,44),(-12,9,44)],metal)
        orb(0,12,42,3,3,ink);orb(0,13,42,1.5,2,glow)
    else:line([(0,-9,56),(0,-11,18)],metal,1)
    # Two asymmetric sleeves; elbow and wrist move separately during casts.
    left=(-20-cast*7,5+cast*13-stride*4,44+cast*24)
    right=(20+cast*2,6+stride*3,45+cast*7)
    for side,hand in [(-1,left),(1,right)]:
        hx,hy,hz=hand
        # Shoulder joints project across the torso's real front/back depth.
        limb([(side*10,-3,62),(side*17,hy*.3-3,52+cast*6),(hx,hy,hz)],6,cloth)
        poly([(side*7,0,67),(side*18,0,63),(side*20,3,56),(side*11,5,57)],metal)
        line([(side*10,1,65),(side*17,2,61)],edge,.8)
        orb(hx,hy,hz,3.2,3.7,skin)
        line([(hx-4,hy,hz+4),(hx+4,hy,hz+4)],metal,2)
        if side==-1 and cast>.2:
            for finger in (-1,0,1):line([(hx+finger*1.4,hy,hz),(hx+finger*2.8,hy+3,hz+5)],skin,.8)
            orb(hx,hy,hz+9,3+cast*2,3+cast*2,glow)
    # A forked, filigree-tipped staff replaces the plain straight rod.
    sx=23+stride+cast*5;sy=5+stride*3+cast*6
    line([(21-stride,4,5),(sx,sy,89)],ink,4)
    line([(21-stride,4,5),(sx,sy,89)],metal,2)
    for z in (16,28,40,52,64):line([(22-2,6,z),(24+2,6,z+3)],edge,.8)
    for side in (-1,1):line([(sx,sy,80),(sx+side*6,sy,88),(sx+side*4,sy,97)],metal,1.5)
    orb(sx,sy,90,4,6,glow);orb(sx-1,sy+1,92,1.5,2.5,'#fff2db')
    # Face plane, ears, eyebrows, eyes and moving locks remain correct in rear views.
    volume_head(0,0,76,11.2,10.6,14.5,ink,
                '#4c394b' if not demon else '#6e405c')
    for side in (-1,1):
        hair=math.sin(cycle+side)*1.7+stride*2
        poly([(side*7,-1,84),(side*13,-3,77),(side*14+hair,-4,53),(side*9+hair,-1,56),(side*6,0,71)],'#766375' if not demon else '#d8b9d0')
        line([(side*9,-3,78),(side*11+hair,-3,59)],edge,.6)
    if front>-.15:
        width=max(3,7.5*abs(front));orb(0,7,77,width,10,skin)
        if abs(front)<.42:
            # A projecting brow, cheek and nose readable from the side.
            poly([(-2,9,84),(2,12,83),(2,14,76),(-1,11,71)],skin)
            line([(0,12,77),(2,14,76),(0,12,74)],'#9e7882',.6)
        poly([(-8,6,84),(0,9,86),(6,8,82),(-2,9,79)],'#463844' if not demon else '#d2b6d1')
        if front>.6:
            for side in (-1,1):
                line([(side*2,9,79),(side*5,8,80)],ink,.8)
                orb(side*3.8,9,77.5,1.1,1.3,glow)
            line([(-1.5,9,72),(1.5,9,72)],'#8c6570',.7)
        else:orb(-4 if math.sin(a)>0 else 4,9,78,1.1,1.4,glow)
    if demon:
        # A plated diadem, cheek guards and swept horns: a distinct head model.
        poly([(-12,1,90),(0,4,95),(12,1,90),(9,5,84),(0,7,88),(-9,5,84)],metal)
        orb(0,7,91,2.3,3.5,glow)
        for side in (-1,1):
            poly([(side*8,0,90),(side*17,-1,104),(side*15,-3,116),(side*24,-3,105),(side*18,1,88)],'#532a44')
            line([(side*10,1,91),(side*18,-2,106),(side*16,-3,113)],edge,1)
            poly([(side*10,7,80),(side*13,6,73),(side*7,8,69)],metal)
    else:
        # Sculpted asymmetric hat, raised seams, crescent brooch and dangling gems.
        sculpted_brim(29,18.5,94)
        poly([(-16,-7,95),(16,-7,95),(7,-4,114),(-1,3,126),(-5,4,123),(-1,4,109)],cloth)
        poly([(1,4,97),(16,8,95),(7,2,114),(-1,3,126),(3,5,111)],'#5a4a65')
        line([(-16,-7,95),(-5,4,123),(-1,3,126)],edge,.8)
        poly([(-15,3,96),(15,3,96),(12,3,101),(-12,3,101)],metal)
        orb(3,5,99,3.5,3.5,glow);orb(4.5,5,100,2.8,3,cloth)
        for side in (-1,1):
            line([(side*20,2,93),(side*22,3,86+math.sin(cycle)*1.5)],metal,.7)
            poly([(side*22,3,88),(side*24,3,84),(side*22,3,82),(side*20,3,84)],glow)
    return im.resize((96,128),Image.Resampling.LANCZOS)
