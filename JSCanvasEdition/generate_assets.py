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
    # Lossless palette conversion where possible. Transparent RGB is normalized
    # before PNG compression; invisible colour carries no rendering information.
    if im.mode=='RGBA':
        alpha=im.getchannel('A');clean=Image.new('RGBA',im.size)
        clean.paste(im,mask=alpha.point(lambda a:255 if a else 0));im=clean
        colors=im.getcolors(256)
        if colors:im=im.convert('P',palette=Image.Palette.ADAPTIVE,colors=256)
    im.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def witch(angle, phase=None, action="idle", progress=0):
    return render_witch(angle,phase,action,progress)


def enemy(kind, phase=None, action="idle", progress=0, angle=0):
    return render_enemy(kind, angle=angle, phase=phase, action=action, progress=progress)


def ground(biome=0):
    rng = random.Random(7281+biome*911)
    im = Image.new("RGB", (256,256))
    px = im.load()
    for y in range(256):
        for x in range(256):
            n = rng.randrange(-4,5)
            base=[(24,29,30),(31,25,25),(24,27,36)][biome]
            px[x,y] = tuple(v+n for v in base)
    d = ImageDraw.Draw(im)
    # Modulo-wrapped marks make a seamless, repeatable surface.
    for _ in range(42):
        x,y = rng.randrange(256),rng.randrange(256)
        col = rng.choice(["#252c2b", "#282f30", "#1d2425"])
        for dx in (-256,0,256):
            for dy in (-256,0,256):
                d.line([(x+dx,y+dy),(x+dx+4,y+dy-3),(x+dx+8,y+dy-2)],fill=col,width=1)
    # Seamless masonry / cooled cracks / ancient moonstone. All values stay
    # subdued, leaving red warnings and actor silhouettes above the material.
    for _ in range(10):
        x,y=rng.randrange(256),rng.randrange(256)
        for dx in (-256,0,256):
            for dy in (-256,0,256):
                col=['#29352d','#382b26','#2e3141'][biome]
                d.line([(x+dx,y+dy),(x+dx+13,y+dy-7),(x+dx+24,y+dy-3)],fill=col,width=1)
                if biome==0:d.ellipse((x+dx-3,y+dy-1,x+dx+7,y+dy+2),fill='#2a3831')
                if biome==1:d.line([(x+dx+13,y+dy-7),(x+dx+15,y+dy-12)],fill='#4a3429',width=1)
                if biome==2:d.rectangle((x+dx,y+dy,x+dx+3,y+dy+2),outline='#39394d')
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
    if kind in ('obelisk','wall','brazier','charred'):
        if kind=='obelisk':
            poly([(55,182),(59,75),(75,29),(90,28),(104,76),(110,182)],'#3f4359')
            poly([(59,75),(75,29),(77,171),(55,182)],'#686a7b')
            poly([(77,34),(90,28),(103,78),(98,174),(77,171)],'#4d4e68')
            line([(76,51),(76,160)],'#aaa4bd',2)
            for y in (85,109,133):line([(82,y),(91,y+6),(82,y+12)],'#8884ae',1)
            poly([(44,186),(49,172),(112,172),(121,186)],'#5f6271')
        elif kind=='wall':
            for row in range(4):
                for col in range(3):
                    x=29+col*32+(row%2)*4;y=180-row*21
                    if row==3 and col==2:continue
                    poly([(x,y),(x,y-19),(x+29,y-21),(x+30,y-2)],'#464a53' if row%2 else '#4e5359')
                    line([(x+2,y-18),(x+26,y-20)],'#777974',1)
            line([(47,179),(57,154),(50,136)],'#292d34',2)
        elif kind=='brazier':
            poly([(52,184),(60,157),(65,106),(94,106),(98,158),(109,184)],'#423637')
            poly([(45,105),(55,127),(104,127),(116,105),(108,99),(54,99)],'#776152')
            line([(52,107),(109,107)],'#b19b7a',2)
            poly([(61,102),(65,87),(76,94),(85,76),(91,95),(102,103)],'#a86640')
            poly([(72,102),(79,91),(87,101)],'#d6aa63')
            for y in (143,162):line([(66,y),(93,y)],'#9c8365',1)
        else:
            poly([(64,185),(73,91),(54,63),(69,72),(77,30),(85,45),(83,94),(109,58),(104,87),(88,113),(96,184)],'#342d32')
            line([(72,179),(80,102),(80,49)],'#74615b',3)
            line([(82,108),(100,89)],'#8a6651',2)
            line([(67,182),(55,190),(82,185),(110,189)],'#51413b',3)
    elif kind=="tree":
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


def pack_atlas(atlas, key, packing):
    """Lossless transparent trimming, shelf-packed into <=2048-wide textures.

    Offsets retain the logical 96x128 cell. Even 1-alpha antialias pixels are
    preserved. No quantization, scaling, or animation changes are involved.
    """
    cells=[]
    for y in range(0,atlas.height,128):
        for x in range(0,atlas.width,96):
            cell=atlas.crop((x,y,x+96,y+128));box=cell.getchannel('A').getbbox() or (0,0,1,1)
            cells.append((cell.crop(box),box))
    order=sorted(range(len(cells)),key=lambda i:(-cells[i][0].height,i))
    x=y=row_h=0;rects=[None]*len(cells)
    for i in order:
        im,box=cells[i]
        if x+im.width+2>2048:x=0;y+=row_h+2;row_h=0
        rects[i]=[x+1,y+1,im.width,im.height,box[0],box[1]]
        x+=im.width+2;row_h=max(row_h,im.height)
    height=y+row_h+2
    result=Image.new('RGBA',(2048,height))
    for (im,_),r in zip(cells,rects):result.paste(im,(r[0],r[1]))
    packing[key]={'logicalWidth':atlas.width,'logicalHeight':atlas.height,'rects':rects}
    return result


def main():
    dirs={"S":0,"SW":45,"W":90,"NW":135,"N":180,"NE":225,"E":270,"SE":315}
    assets={"witch_"+name:encode(witch(angle)) for name,angle in dirs.items()}
    assets.update({name:encode(enemy(name)) for name in KINDS})
    assets.update(orb=encode(orb()),ground=encode(ground()),ground_ember=encode(ground(1)),ground_moon=encode(ground(2)))
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
    cloth_masks={};packing={}
    for name,angle in dirs.items():
        frames=[]
        for state,clip in clips.items():
            for i in range(clip["frames"]):
                t=i/(clip["frames"]-1) if not clip["loop"] else i/clip["frames"]
                pose,masks=render_witch(angle,i*math.tau/8 if state=='walk' else None,state,t,return_masks=True)
                frames.append(pose);cloth_masks.setdefault('witch_atlas_'+name,[]).append(masks)
        assets["witch_atlas_"+name]=encode(sheet(frames))
    for name,angle in dirs.items():
        frames=[]
        for state,clip in clips.items():
            for i in range(clip['frames']):
                t=i/(clip['frames']-1) if not clip['loop'] else i/clip['frames']
                pose,masks=render_witch(angle,i*math.tau/8 if state=='walk' else None,state,t,demon=True,return_masks=True)
                frames.append(pose);cloth_masks.setdefault('demon_atlas_'+name,[]).append(masks)
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
        assets['enemy_atlas_'+name]=encode(pack_atlas(atlas,'enemy_atlas_'+name,packing))
    ritual_states=RITUALS
    for name in ('warden','overlord'):
        # Two rows per facing keep every texture below 4096px on either axis.
        atlas=Image.new('RGBA',(96*33,128*16))
        for row,(direction,angle) in enumerate(DIRECTIONS.items()):
            for state_index,state in enumerate(ritual_states):
                for i in range(6):
                    frame=state_index*6+i
                    atlas.paste(render_enemy(name,angle=angle,action=state,progress=i/5),((frame%33)*96,(row*2+frame//33)*128))
        assets['enemy_ritual_'+name]=encode(pack_atlas(atlas,'enemy_ritual_'+name,packing))
    for name in ("tree","arch","tomb","obelisk","wall","brazier","charred"):assets["prop_"+name]=encode(prop(name))
    output="// Generated by generate_assets.py; embedded PNGs, zero runtime requests.\n"
    output+="window.NOCTURNE_ASSETS = Object.freeze("+json.dumps(assets,indent=2)+");\n"
    output+='window.NOCTURNE_PACKING = Object.freeze('+json.dumps(packing,separators=(',',':'))+');\n'
    output+='window.NOCTURNE_CLOTH = Object.freeze('+json.dumps(cloth_masks,separators=(',',':'))+');\n'
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
