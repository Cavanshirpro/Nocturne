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
from enemy_models import KINDS, DIRECTIONS, CLIPS, RITUALS, render_enemy
from witch_models import render_witch

ROOT = Path(__file__).resolve().parent
S = 3


def encode(im):
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def witch(angle, phase=None, action="idle", progress=0):
    return render_witch(angle,phase,action,progress)


def enemy(kind, phase=None, action="idle", progress=0, angle=0):
    return render_enemy(kind, angle=angle, phase=phase, action=action, progress=progress)


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
    assets.update({name:encode(enemy(name)) for name in KINDS})
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
    for name,angle in dirs.items():
        frames=[]
        for state,clip in clips.items():
            for i in range(clip['frames']):
                t=i/(clip['frames']-1) if not clip['loop'] else i/clip['frames']
                frames.append(render_witch(angle,i*math.tau/8 if state=='walk' else None,state,t,demon=True))
        assets['demon_atlas_'+name]=encode(sheet(frames))
    for name in KINDS:
        assets["enemy_walk_"+name]=encode(sheet([enemy(name,i*math.tau/4) for i in range(4)]))
    enemy_clips=CLIPS
    for name in KINDS:
        atlas=Image.new('RGBA',(96*33,128*8))
        for row,(direction,angle) in enumerate(DIRECTIONS.items()):
            for state,clip in enemy_clips.items():
                for i in range(clip['frames']):
                    t=i/(clip['frames']-1) if state in ('attack','hurt','death') else (i+.17)/clip['frames']
                    pose=enemy(name,t*math.tau if state=='walk' else None,action=state,progress=t,angle=angle)
                    atlas.paste(pose,((clip['start']+i)*96,row*128))
        assets['enemy_atlas_'+name]=encode(atlas)
    ritual_states=RITUALS
    for name in ('warden','overlord'):
        # Two rows per facing keep every texture below 4096px on either axis.
        atlas=Image.new('RGBA',(96*33,128*16))
        for row,(direction,angle) in enumerate(DIRECTIONS.items()):
            for state_index,state in enumerate(ritual_states):
                for i in range(6):
                    frame=state_index*6+i
                    atlas.paste(render_enemy(name,angle=angle,action=state,progress=i/5),((frame%33)*96,(row*2+frame//33)*128))
        assets['enemy_ritual_'+name]=encode(atlas)
    for name in ("tree","arch","tomb"):assets["prop_"+name]=encode(prop(name))
    output="// Generated by generate_assets.py; embedded PNGs, zero runtime requests.\n"
    output+="window.NOCTURNE_ASSETS = Object.freeze("+json.dumps(assets,indent=2)+");\n"
    output+='window.NOCTURNE_ANIMATIONS = Object.freeze({witch:{frames:8,width:96,height:128},enemy:{frames:8,width:96,height:128}});\n'
    output+='window.NOCTURNE_ATLAS = Object.freeze('+json.dumps({"version":1,"width":96,"height":128,"totalFrames":cursor,"clips":clips})+');\n'
    output+='window.NOCTURNE_ENEMY_ATLAS = Object.freeze('+json.dumps({'version':2,'width':96,'height':128,'rows':8,'directions':list(DIRECTIONS),'totalFrames':33,'clips':enemy_clips})+');\n'
    output+='window.NOCTURNE_RITUAL_ATLAS = Object.freeze('+json.dumps({'width':96,'height':128,'rows':16,'columns':33,'rowStride':2,'directions':list(DIRECTIONS),'clips':{**{s:{'start':i*6,'frames':6} for i,s in enumerate(ritual_states)},**{alias:{'start':ritual_states.index(target)*6,'frames':6} for alias,target in {'channel':'meteors','sweep':'slash','guard':'aegis','blink':'riftstep'}.items()}}})+');\n'
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
    enemy_preview=[]
    for i in range(12):
        preview=Image.new('RGB',(816,9*148),'#182429');draw=ImageDraw.Draw(preview)
        for row,name in enumerate(KINDS):
            draw.text((8,row*148+9),name.upper(),fill='#d8c49f')
            for col,state in enumerate(enemy_clips):
                t=(i%6)/5 if state in ('attack','hurt','death') else (i+.17)/12
                pose=enemy(name,t*math.tau if state=='walk' else None,action=state,progress=t,angle=315)
                preview.paste(pose,(col*120+72,row*148+14),pose)
                if row==0:draw.text((col*120+75,0),state.upper(),fill='#b5bfc6')
        enemy_preview.append(preview)
    enemy_preview[0].save(ROOT/'enemy-animation-preview.gif',save_all=True,append_images=enemy_preview[1:],duration=80,loop=0,optimize=False)
    facings=[]
    for i in range(8):
        preview=Image.new('RGB',(8*108,9*145),'#182429');draw=ImageDraw.Draw(preview)
        for row,name in enumerate(KINDS):
            for col,(direction,angle) in enumerate(DIRECTIONS.items()):
                pose=enemy(name,i*math.tau/8,action='walk',angle=angle)
                preview.paste(pose,(col*108+6,row*145+12),pose)
                draw.text((col*108+32,row*145+1),direction,fill='#c9c8af')
        facings.append(preview)
    facings[0].save(ROOT/'enemy-directions-preview.gif',save_all=True,append_images=facings[1:],duration=90,loop=0,optimize=False)
    rituals=[]
    for i in range(12):
        preview=Image.new('RGB',(800,380),'#182429');draw=ImageDraw.Draw(preview)
        for row,name in enumerate(('warden','overlord')):
            for col,state in enumerate(('channel','sweep','guard','blink')):
                pose=render_enemy(name,angle=315,action=state,progress=(i%6)/5).resize((144,192),Image.Resampling.NEAREST)
                preview.paste(pose,(col*200+28,row*175-4),pose);draw.text((col*200+50,row*175+155),name+' '+state,fill='#e9cbde')
        rituals.append(preview)
    rituals[0].save(ROOT/'boss-ritual-preview.gif',save_all=True,append_images=rituals[1:],duration=110,loop=0,optimize=False)
    print(f"Generated {len(assets)} PNGs; {cursor} witch frames x 8 directions; {len(output):,} bytes")


if __name__ == "__main__":main()
