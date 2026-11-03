# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Javanshir Gurbanzade
# This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
"""v0.7.6 solid hostile anatomy. Baked mesh artwork, not live 3D.

The logical atlas, eight facings, six ordinary clips and eleven ritual names
are preserved. Pose progress is supplied by the existing authoritative timers.
"""
import math
from enemy_geometry import Mesh

KINDS=('slime','skeleton','gargoyle','hound','cultist','wraith','reaper','warden','overlord')
DIRECTIONS={'S':0,'SW':45,'W':90,'NW':135,'N':180,'NE':225,'E':270,'SE':315}
CLIPS={'idle':{'start':0,'frames':4,'duration':1.4},'walk':{'start':4,'frames':8,'duration':.65},'attack':{'start':12,'frames':6,'duration':.44},'hurt':{'start':18,'frames':3,'duration':.12},'death':{'start':21,'frames':6,'duration':.6},'fear':{'start':27,'frames':6,'duration':.45}}
RITUALS=('salvo','meteors','slash','aegis','soulring','riftstep','lances','starfall','crossfire','shockwave','voidseal')
PALETTES={
 'slime':('#254c46','#74a38c','#d1dfac'), 'skeleton':('#4a4846','#d3c6a8','#b7d6ca'),
 'gargoyle':('#303947','#808795','#d99f9c'), 'hound':('#302a3a','#786775','#f1b38b'),
 'cultist':('#302338','#8d7393','#dab4e0'), 'wraith':('#203644','#88b9c3','#cfefed'),
 'reaper':('#202633','#727786','#decbb0'), 'warden':('#303e48','#9aa7a7','#d8bd86'),
 'overlord':('#34233c','#9d6c8d','#ecb0d2')}
POWER_COLORS={'salvo':'#f5b07d','meteors':'#f0be80','slash':'#edafbc','aegis':'#b4d6ee','soulring':'#cca9e9','riftstep':'#a994de','lances':'#e2b4da','starfall':'#eed092','crossfire':'#92d1d2','shockwave':'#dfb482','voidseal':'#d09bd1'}


def render_enemy(kind,angle=0,phase=None,action='idle',progress=0):
    if kind not in KINDS:raise ValueError(kind)
    t=max(0,min(1,progress));cycle=phase if phase is not None else t*math.tau
    moving=phase is not None or action in ('walk','fear');gait=math.sin(cycle) if moving else 0
    if action=='fear':gait=math.sin(cycle)*1.15
    ritual=action in RITUALS or action in ('channel','sweep','guard','blink')
    intent={'channel':'meteors','sweep':'slash','guard':'aegis','blink':'riftstep'}.get(action,action)
    prepare=min(1,t/.45);release=max(0,(t-.45)/.55)
    power=(prepare*.75 if t<.45 else (1-release)**.7) if ritual or action=='attack' else 0
    impact=(1-t)**2 if action=='hurt' else 0
    death=t if action=='death' else 0
    dark,light,glow=PALETTES[kind];glow=POWER_COLORS.get(intent,glow)
    idle=math.sin(cycle)*(.35 if kind=='warden' else .8) if action=='idle' else 0
    hover=math.sin(cycle*.8)*(1.6 if kind=='wraith' else 1.05 if kind=='overlord' else 0)
    bob=(abs(math.sin(cycle*2))*(.35 if kind=='warden' else .7) if moving else idle)+hover
    lean={'slime':0,'skeleton':-5,'gargoyle':-2,'hound':-4,'cultist':-3,'wraith':0,'reaper':-4,'warden':-1.5,'overlord':0}[kind]*impact
    if action=='fear':lean-=4
    def transform(p):
        x,y,z=p
        if z>12:y+=lean*min(1,z/70);z+=bob*min(1,z/55)
        if death:
            z=z*(1-death*({'wraith':.89,'slime':.9,'overlord':.82}.get(kind,.84)))+death*3.3
            x+=math.sin(z*.08+angle*.01)*death*1.8;y-=death*2
        return x,y,z
    m=Mesh(angle,transform);ell=m.ellipsoid;tube=m.tube;gem=m.gem
    # Skull is solid from every direction. Eye cavities sit on its front surface.
    def skull(x=0,y=0,z=81,size=1,mask=False):
        ell(x,y,z,9.3*size,8*size,11.5*size,light)
        m.plate([(x-6*size,y+6*size,z-3*size),(x+6*size,y+6*size,z-3*size),(x+4*size,y+8*size,z-11*size),(x-4*size,y+8*size,z-11*size)],light,2*size)
        for side in (-1,1):
            ell(x+side*3.5*size,y+7.6*size,z+1.5*size,2.6*size,1.8*size,3.1*size,dark,8,4)
            gem(x+side*3.5*size,y+9*size,z+1.4*size,.85*size,glow)
        m.plate([(x,y+9*size,z),(x-1.5*size,y+9*size,z-4*size),(x+1.5*size,y+9*size,z-4*size)],dark,1)
        for dx in (-3,0,3):m.line([(x+dx*size,y+9*size,z-6*size),(x+dx*size,y+9*size,z-9*size)],dark,.45)

    def cloth(hem=21,height=64,spectral=False):
        # Closed elliptical sections with independently delayed lower folds.
        levels=[]
        for z,rx,ry in [(10,hem,16),(24,hem*.83,14),(43,10,10),(height,13,10)]:
            wind=math.sin(cycle-z*.055)*((height-z)/height)*2.2
            if spectral:wind+=math.sin(cycle*1.1+z*.07)*2
            levels.append((wind,-1,z,rx,ry))
        m.rings(levels,dark if not spectral else '#355569b0',14)
        for side in (-1,1):
            wind=math.sin(cycle+side)*2.2
            m.plate([(side*7,-9,height),(side*17,-11,height-4),(side*(hem+2)+wind,-18,15),(side*9+wind,-19,9)],light if spectral else '#3d354d',1.8)
            m.line([(side*8,-9,height-1),(side*16+wind,-18,18)],glow,.45)
            m.plate([(side*5,11,43),(side*11,14,25),(side*16+gait,16,11),(side*7+gait,18,12)],light,1.2)
        m.rings([(0,0,41,11,11),(0,0,44,11,11)],light,12);gem(0,12,43,2.8,glow)

    def wings(stone=False):
        for side in (-1,1):
            flap=math.sin(cycle*(.75 if stone else 1.1)+side*.16)*(2.3 if stone else 3.3)+power*(2 if stone else 4)
            root=(side*10,-8,64);joint=(side*23,-14,80+flap);tip=(side*37,-17,94+flap)
            rim=(side*39,-11,51+flap*.3);low=(side*22,-9,43);mid=(side*28,-13,65)
            for points,col in [([root,joint,tip,mid],light if stone else '#7a456a'),([root,mid,rim,low],dark if stone else '#4d2a4a'),([root,low,(side*13,-8,50)],light if stone else '#915474')]:m.plate(points,col,2.6 if stone else 1.6)
            for a,b,r in [(root,joint,2.2),(joint,tip,1.7),(root,rim,1.1),(root,low,.9)]:tube(a,b,r,light)
            ell(*joint,2.7,2.8,2.8,light,8,4)
            if stone:m.line([(side*12,-6,62),(side*20,-8,69),(side*25,-11,65)],glow,.5)
            else:gem(*joint,1.8,glow)

    if kind=='slime':
        stretch=1+gait*.1+power*.22-impact*.25
        ell(0,-7,17,20/stretch,11,15*stretch,dark,14,7)
        # Opaque suspended core, then a composited gelatin skin. The core lags.
        cx=math.sin(cycle-.7)*2;cy=8+math.cos(cycle)*1.5;cz=23+math.sin(cycle-1)*2-impact*4
        skull(cx,cy,cz,.62)
        ell(0,0,22,26/stretch,19.5,21*stretch,'#72a18c64',18,9)
        for i in range(6):
            a=i*math.tau/6;ell(math.cos(a)*20,math.sin(a)*13,5+math.sin(cycle+a)*1.2,7,6,4,'#476f63',8,4)
        ell(-7,6,33+gait*2,7,4,3,'#bddbc28c',8,4)
        for side in (-1,1):
            ell(side*6,18,26+gait,2.2,1.7,2.7,'#b8d9ba',8,4)
            gem(side*6,19,26+gait,.8,glow)
        for side in (-1,1):
            tube((side*14,-4,31),(side*17,-5,43+math.sin(cycle+side)*2),1.2,light)
            gem(side*17,-5,44+math.sin(cycle+side)*2,2,glow)
        return m.render(1-death*.5)

    if kind=='hound':
        prep=power if t<.45 else 0;dash=(1-release) if action=='attack' and t>=.45 else 0
        # Four legs trot in diagonal pairs; lifted feet oppose grounded pairs.
        for i,(x,y) in enumerate([(-10,12),(10,12),(-10,-13),(10,-13)]):
            a=cycle+(math.pi if i in (1,2) else 0);step=math.sin(a)*7 if moving else 0;lift=max(0,math.cos(a))*4 if moving else 0
            root=(x,y,30-prep*3);knee=(x+math.sin(cycle)*.8,y+step*.45,16-prep*2);foot=(x,y+step,4+lift)
            tube(root,knee,3.8,dark);ell(*knee,3.4,3.5,3.4,light,8,4);tube(knee,foot,2.7,light)
            ell(foot[0],foot[1]+2,foot[2],4.4,5.5,2.2,dark,8,4)
            for dx in (-2,0,2):tube((foot[0]+dx,foot[1]+4,foot[2]),(foot[0]+dx,foot[1]+7,foot[2]-.6),.55,glow)
        ell(0,-3,34-prep*3,13,21,13,dark,12,6);ell(0,9,38-prep*4,13,12,14,light,12,6)
        for j in range(5):
            y=-15+j*6;flex=math.sin(cycle+j*.3)*1.4
            m.plate([(-7,y,41),(0,y-2,52+flex),(7,y,41),(0,y+3,44)],dark,2,light)
        tail=[(0,-20,35),(math.sin(cycle)*4,-28,40),(math.sin(cycle-.7)*7,-35,45)]
        m.line(tail,light,2.3)
        hy=21-prep*3+dash*4;hz=46-prep*5+dash*2
        ell(0,hy,hz,10,10,12,dark,12,6);ell(0,hy+8,hz-5-power*3,7,9,4.5,light,10,5)
        for side in (-1,1):
            tube((side*7,hy-2,hz+6),(side*11,hy-4,hz+20),3,dark,.2)
            ell(side*5,hy+8,hz+2,2,2,2,glow,8,4)
            tube((side*4,hy+13,hz-5),(side*3,hy+13,hz-11-power*2),1.1,'#dccbaa',.1)
        ell(0,hy+15,hz-1,4,3,2.6,dark,8,4)
        return m.render(1-death*.4)

    skeletal=kind in ('skeleton','reaper');boss=kind in ('warden','overlord')
    if kind in ('gargoyle','overlord'):wings(kind=='gargoyle')
    if kind in ('cultist','wraith','reaper','overlord'):cloth(22 if kind in ('reaper','overlord') else 20,69 if kind=='overlord' else 64,kind=='wraith')
    # Legs remain separate from clothing; the Warden has visible armored greaves.
    if kind!='wraith':
        for side in (-1,1):
            step=gait*side*(5 if boss else 8);lift=max(0,-gait*side)*(2.5 if boss else 3.8)
            knee=(side*8,step*.35,23);foot=(side*8,step,4+lift)
            tube((side*7,0,42),knee,2.6 if skeletal else 4.7,light);tube(knee,foot,2.2 if skeletal else 3.8,light)
            ell(*knee,3 if skeletal else 4.4,3.5,3.8,dark,8,4)
            ell(foot[0],foot[1]+3,foot[2],4.5 if skeletal else 6,7,2.5,dark,10,4)
            if kind=='warden':
                m.plate([(side*4,5,33),(side*12,5,32),(side*12,7,12),(side*5,8,12)],light,3)
                gem(side*8,8,24,1.7,glow)
    if kind=='skeleton':
        tube((0,0,41),(0,0,68),2.5,dark);ell(0,0,42,9,7,5,light,12,5)
        for z in (48,54,60,66):
            for side in (-1,1):m.line([(0,0,z+2),(side*8,3,z),(side*11,7,z-3),(side*3,10,z-4)],light,1.4)
        tube((0,9,48),(0,9,67),1.7,light)
    elif kind=='gargoyle':
        ell(0,0,55,15,12,21,dark,12,7);m.plate([(-13,8,67),(0,14,61),(13,8,67),(9,11,43),(-9,11,43)],light,3)
        m.line([(-7,13,60),(0,15,55),(-3,14,50),(4,14,46)],glow,.65)
    elif kind=='warden':
        ell(0,0,56,15,13,20,dark,12,7)
        for side in (-1,1):
            m.plate([(side*1,14,69),(side*13,9,66),(side*13,12,49),(side*2,15,46)],light,3.4)
            for z in (49,56,63):m.line([(side*4,15,z),(side*10,12,z+2)],'#596b74',.75)
        m.rings([(0,0,40,13,12),(0,0,44,13,12)],'#9b896d',12);gem(0,16,60,3.3,glow)
    else:
        ell(0,1,58,12 if not boss else 14,10,15,dark,12,6)
        if kind=='overlord':
            for side in (-1,1):
                for j in range(3):m.plate([(side*2,12,69-j*7),(side*13,8,71-j*7),(side*15,10,65-j*7),(side*3,14,63-j*7)],light,2)
            gem(0,15,61,4,glow)
        elif kind=='reaper':
            for side in (-1,1):m.line([(0,10,67),(side*10,9,63),(side*6,12,58)],light,1.4)
        else:gem(0,12,60,2.6,glow)

    # Distinct hand trajectories for all eleven unchanged ritual actions.
    hands=[]
    for side in (-1,1):
        hx=side*(19 if kind=='warden' else 20);hy=5-side*gait*4;hz=46+side*gait*3
        wave=power
        if action=='attack':hy+=wave*12;hz+=wave*(12 if side<0 else 23)
        if intent=='salvo':hx=side*(20+3*wave);hy=12+wave*13;hz=62+(7 if side>0 else -8)*wave
        elif intent=='meteors':hx=side*(22-4*wave);hy=4;hz=76+wave*18
        elif intent=='slash':hx=side*(23+4*wave);hy=7+wave*20;hz=58+side*math.sin(t*math.tau)*16
        elif intent=='aegis':hx=-side*(7+3*wave);hy=18;hz=64+side*5+wave*4
        elif intent=='soulring':hx=side*(27+4*wave);hy=4;hz=65+wave*9
        elif intent=='riftstep':hx=side*23;hy=-9+release*14;hz=48+side*wave*19
        elif intent=='lances':hx=side*(15+wave*8);hy=20+wave*5;hz=68+side*8
        elif intent=='starfall':hx=side*21;hy=6;hz=85+wave*13 if side>0 else 40+wave*7
        elif intent=='crossfire':hx=side*(26+wave*2);hy=side*7;hz=64+side*wave*17
        elif intent=='shockwave':hx=side*(22+wave*3);hy=13;hz=48-wave*23
        elif intent=='voidseal':hx=7 if side>0 else -25;hy=17;hz=82 if side>0 else 60+wave*12
        if kind=='warden' and ritual:hx*=.9;hz=48+(hz-48)*.83
        shoulder=(side*(14 if boss else 12),0,65);elbow=(side*(18+power*3),2,52+power*8);hand=(hx,hy,hz);hands.append(hand)
        if kind!='wraith':
            tube(shoulder,elbow,3 if skeletal else 5,light if skeletal else dark);tube(elbow,hand,2.4 if skeletal else 4,light)
            ell(*elbow,3.2 if skeletal else 4.5,4,4,light,8,4)
        ell(*hand,3.2,3.6,3.6,light,8,5)
        for j in (-1,0,1):tube((hx+j,hy+2,hz-1),(hx+side*2+j*1.5,hy+4,hz-5),.65,light)
        if boss:
            m.plate([(side*10,2,70),(side*23,0,71),(side*24,4,61),(side*13,7,59)],light,4)
            ell(side*15,-1,67,6,7,5,dark,10,5)
        if ritual:gem(hx,hy+3,hz+3,2.8+power*1.8,glow)

    # Solid heads: closed armored helm, hooded masks, or sculpted stone skull.
    if kind in ('cultist','wraith','reaper'):
        ell(0,-2,82,13,11,17,dark,12,7)
        m.rings([(0,-2,83,13,11),(0,-4,99,5,6),(0,-6,106,.8,1)],dark,12)
        if kind=='reaper':skull(0,5,82,.87)
        else:
            ell(0,8,81,6.5 if kind=='cultist' else 5,3,10,light,10,6)
            if kind=='cultist':
                m.plate([(-6,10,86),(0,12,89),(6,10,86),(3,12,73),(0,14,70),(-3,12,73)],'#c7b2c8',1.5)
                for side in (-1,1):m.line([(side*2,14,83),(side*4.6,13,83)],dark,.85)
            else:
                ell(0,11,81,2,1,5,dark,8,4);gem(0,12,81,1.2,glow)
                for i in range(6):
                    a=i*math.tau/6;x=math.cos(a)*15;y=math.sin(a)*10-2;lag=math.sin(cycle-i*.7)*3
                    m.plate([(x,y,60),(x+lag*1.3,y-3,35),(x+lag*2,y-5,12+i%2*4),(x-2,y,32)],'#8abcc89c',1)
    elif kind=='warden':
        ell(0,0,85,10,10,13,dark,12,7)
        m.plate([(-9,8,93),(9,8,93),(8,12,77),(0,14,73),(-8,12,77)],light,4)
        m.line([(-7,13,86),(7,13,86)],dark,1.8);m.line([(-5,14,86),(5,14,86)],glow,.65)
        m.plate([(-2,0,96),(0,-3,109),(3,0,96)],'#b7a17d',3)
    else:
        skull(0,0,82,1.05 if kind=='overlord' else 1)
        if kind=='gargoyle':
            for side in (-1,1):tube((side*7,0,91),(side*16,-3,106),3.2,light,.2)
        if kind=='overlord':
            m.rings([(0,0,90,10,9),(0,0,94,10,9)],light,12)
            for side in (-1,1):tube((side*8,-1,90),(side*13,-5,107),2.9,dark,.3)
            gem(0,10,94,3,glow)
            m.plate([(-17,-6,68),(-21,-10,78),(0,-12,72),(21,-10,78),(17,-6,68)],light,2)

    if kind in ('skeleton','reaper'):
        hx,hy,hz=hands[1];sweep=(power*1.2 if kind=='reaper' else power*.5);dx=math.cos(sweep);dy=math.sin(sweep)
        def weapon(x,z):return hx+x*dx,hy+x*dy,z
        base=weapon(0,12);top=weapon(0,97 if kind=='reaper' else 91)
        tube(base,top,1.7,dark);tube(weapon(.8,18),weapon(.8,92),.7,light)
        z=top[2];blade=([weapon(1,z+3),weapon(-12,z+12),weapon(-30,z+7),weapon(-39,z-8),weapon(-27,z-1),weapon(-11,z+2),weapon(0,z-3)] if kind=='reaper' else [weapon(1,z+3),weapon(-10,z+9),weapon(-25,z+3),weapon(-32,z-9),weapon(-17,z-2),weapon(-6,z-3)])
        m.plate(blade,'#c7c9bc',2.4,light);gem(*weapon(-2,z),1.6,glow)
    elif kind=='cultist':
        hx,hy,hz=hands[1];tube((hx,hy,8),(hx,hy,101),1.8,'#9c8270');gem(hx,hy,101,5,glow)
        for side in (-1,1):tube((hx,hy,93),(hx+side*5,hy,103),.8,light)
    elif kind=='warden':
        # A short heavy focus hammer, distinct from the Overlord's regal scepter.
        hx,hy,hz=hands[1];tube((hx,hy,hz-23),(hx,hy,hz+20),2,dark)
        m.rings([(hx,hy,hz+13,6,5),(hx,hy,hz+23,6,5)],light,8);gem(hx,hy+5,hz+18,2.8,glow)
        sx,sy,sz=hands[0];m.plate([(sx-6,sy+4,sz+10),(sx+6,sy+4,sz+10),(sx+7,sy+6,sz-7),(sx,sy+8,sz-14),(sx-7,sy+6,sz-7)],dark,3,light)
    elif kind=='overlord':
        hx,hy,hz=hands[1];tube((hx,hy,12),(hx,hy,99),1.7,light);gem(hx,hy,100,5,glow)
        for side in (-1,1):tube((hx,hy,94),(hx+side*5,hy-1,106),1,dark,.2)
    if ritual and intent=='soulring':
        for i in range(5):
            a=i*math.tau/5+t*.5;gem(math.cos(a)*27,-7,76+math.sin(a)*13,1.8,glow)
    if ritual and intent=='voidseal':
        m.plate([(-8,16,83),(0,18,88),(8,16,83),(0,18,78)],dark,1.4);gem(0,19,83,2.5,glow)
    return m.render((.84 if kind=='wraith' else 1)*(1-death*(.5 if kind=='wraith' else .3)))
