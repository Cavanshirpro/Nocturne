# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Javanshir Gurbanzade
# This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
"""Offline solid geometry for hostile sprites; no runtime 3D dependency.

Fixed orthographic projection, camera-space light, depth-sorted solid faces.
Transparent face compositing uses only its small bounding tile. No RNG.
"""
import math
from functools import lru_cache
from PIL import Image, ImageDraw


@lru_cache(maxsize=128)
def rgb(color):
    if isinstance(color,str):
        return tuple(int(color[i:i+2],16) for i in (1,3,5))+(int(color[7:9],16) if len(color)==9 else 255,)
    return tuple(color)+(255,) if len(color)==3 else tuple(color)


class Mesh:
    def __init__(self,angle,transform=None):
        self.co=math.cos(math.radians(angle));self.si=math.sin(math.radians(angle))
        self.transform=transform or (lambda p:p);self.faces=[];self.vertices={};self.projections={}

    def world(self,p):
        cached=self.vertices.get(p)
        if cached is None:
            x,y,z=self.transform(p);cached=(x*self.co-y*self.si,x*self.si+y*self.co,z);self.vertices[p]=cached
        return cached

    @staticmethod
    def project(p):
        x,y,z=p
        return (48+x)*3,(116+y*.46-z*.87)*3

    def face(self,points,color,emissive=False):
        vs=[self.world(v) for v in points];u=[vs[1][i]-vs[0][i] for i in range(3)];v=[vs[2][i]-vs[0][i] for i in range(3)]
        normal=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);length=math.sqrt(sum(n*n for n in normal)) or 1
        lum=1 if emissive else .46+.49*max(0,(-normal[0]*.45+normal[1]*.35+normal[2]*.82)/length)+.07*max(0,normal[0]/length)
        col=rgb(color);shaded=tuple(min(255,max(0,round(n*lum))) for n in col[:3])+(col[3],)
        self.faces.append((sum(p[1]*.85+p[2]*.46 for p in vs)/len(vs),[self.projections[p] if p in self.projections else self.projections.setdefault(p,self.project(p)) for p in vs],shaded))

    def rings(self,levels,color,segments=12):
        rows=[[(x+rx*math.cos(i*math.tau/segments),y+ry*math.sin(i*math.tau/segments),z) for i in range(segments)] for x,y,z,rx,ry in levels]
        for j in range(len(rows)-1):
            for i in range(segments):
                k=(i+1)%segments;self.face([rows[j][i],rows[j][k],rows[j+1][k],rows[j+1][i]],color)
        self.face(list(reversed(rows[0])),color);self.face(rows[-1],color)

    def ellipsoid(self,x,y,z,rx,ry,rz,color,segments=10,rings=6):
        levels=[]
        for i in range(rings+1):
            a=-math.pi/2+i*math.pi/rings;r=max(.025,math.cos(a));levels.append((x,y,z+rz*math.sin(a),rx*r,ry*r))
        self.rings(levels,color,segments)

    def tube(self,start,end,radius,color,end_radius=None,sides=8):
        delta=[end[i]-start[i] for i in range(3)];length=math.sqrt(sum(v*v for v in delta)) or 1;axis=[v/length for v in delta]
        ref=(0,1,0) if abs(axis[1])<.9 else (1,0,0);u=[axis[1]*ref[2]-axis[2]*ref[1],axis[2]*ref[0]-axis[0]*ref[2],axis[0]*ref[1]-axis[1]*ref[0]]
        n=math.sqrt(sum(v*v for v in u)) or 1;u=[v/n for v in u];v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]]
        rows=[]
        for p,r in ((start,radius),(end,radius*.8 if end_radius is None else end_radius)):
            rows.append([tuple(p[k]+r*(u[k]*math.cos(i*math.tau/sides)+v[k]*math.sin(i*math.tau/sides)) for k in range(3)) for i in range(sides)])
        for i in range(sides):
            j=(i+1)%sides;self.face([rows[0][i],rows[0][j],rows[1][j],rows[1][i]],color)
        self.face(list(reversed(rows[0])),color);self.face(rows[1],color)

    def line(self,points,color,radius=.7):
        for a,b in zip(points,points[1:]):self.tube(a,b,radius,color,sides=5)

    def plate(self,points,color,thickness=1.8,edge=None):
        # Front and back retain real separation in profile views.
        back=[(x,y-thickness,z) for x,y,z in points]
        self.face(list(reversed(back)),color)
        for i in range(len(points)):
            j=(i+1)%len(points);self.face([back[i],back[j],points[j],points[i]],edge or color)
        self.face(points,color)

    def gem(self,x,y,z,size,color):
        points=[(x-size*.7,y,z),(x,y+size*.6,z),(x+size*.7,y,z),(x,y-size*.6,z)]
        for i in range(4):
            self.face([points[i],points[(i+1)%4],(x,y,z+size)],color,True)
            self.face([points[(i+1)%4],points[i],(x,y,z-size)],color)

    def render(self,opacity=1):
        im=Image.new('RGBA',(288,384));draw=ImageDraw.Draw(im)
        for _,points,color in sorted(self.faces,key=lambda f:f[0]):
            if color[3]==255:draw.polygon(points,fill=color)
            else:
                left=max(0,math.floor(min(x for x,y in points)));top=max(0,math.floor(min(y for x,y in points)))
                right=min(288,math.ceil(max(x for x,y in points))+1);bottom=min(384,math.ceil(max(y for x,y in points))+1)
                if right<=left or bottom<=top:continue
                tile=Image.new('RGBA',(right-left,bottom-top));ImageDraw.Draw(tile).polygon([(x-left,y-top) for x,y in points],fill=color);im.alpha_composite(tile,(left,top))
        if opacity<1:im.putalpha(im.getchannel('A').point(lambda a:round(a*opacity)))
        return im.resize((96,128),Image.Resampling.LANCZOS)
