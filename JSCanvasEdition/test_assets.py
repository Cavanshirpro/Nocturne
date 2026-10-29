"""Pillow-level checks for actual frame pixels. Run: python test_assets.py."""
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import shutil
import tempfile
import unittest
from functools import lru_cache

from PIL import Image

ROOT=Path(__file__).resolve().parent
DIRS=("N","NE","E","SE","S","SW","W","NW")
TYPES=("slime","skeleton","gargoyle","hound","cultist","wraith","reaper","warden","overlord")


@lru_cache(maxsize=1)
def data():
    text=(ROOT/"assets.js").read_text(encoding="utf-8")
    return json.loads(text.split("Object.freeze(",1)[1].split(");",1)[0])


@lru_cache(maxsize=1)
def packing():
    text=(ROOT/'assets.js').read_text(encoding='utf-8')
    return json.loads(text.split('window.NOCTURNE_PACKING = Object.freeze(',1)[1].split(');',1)[0])


@lru_cache(maxsize=64)
def png(key):
    im=Image.open(io.BytesIO(base64.b64decode(data()[key].split(",",1)[1]))).convert("RGBA")
    packed=packing()
    if key not in packed:return im
    meta=packed[key];logical=Image.new('RGBA',(meta['logicalWidth'],meta['logicalHeight']));columns=logical.width//96
    for i,(x,y,w,h,ox,oy) in enumerate(meta['rects']):logical.paste(im.crop((x,y,x+w,y+h)),((i%columns)*96+ox,(i//columns)*128+oy))
    return logical


class AssetTests(unittest.TestCase):
    def test_all_embedded_images_are_valid(self):
        self.assertEqual(len(data()),64)
        for key in data():
            im=png(key)
            self.assertGreater(im.width,0)
            self.assertLessEqual(max(im.size),4096)
            self.assertGreater(im.getchannel("A").getextrema()[1],0)

    def test_eight_idle_facings(self):
        images=[png("witch_"+d) for d in DIRS]
        self.assertEqual(len({im.tobytes() for im in images}),8)
        self.assertTrue(all(im.size==(96,128) for im in images))

    def test_volumetric_skull_stays_opaque_at_its_projected_center(self):
        # A second supersampling transform used to place the entire skull
        # outside its atlas cell, leaving holes between the hair and face.
        for variant in ('witch', 'demon'):
            for direction in DIRS:
                core=png(variant+'_atlas_'+direction).crop((43,46,54,57))
                alpha=core.getchannel('A')
                solid=sum(alpha.getpixel((x,y))>220 for x in range(11) for y in range(11))
                self.assertGreater(solid,100,(variant,direction))

    def test_side_body_retains_solid_depth(self):
        # Measure filled body span, not the hat, staff tip or a decorative outline.
        for variant in ('witch','demon'):
            widths={}
            for direction in ('S','E','W'):
                alpha=png(variant+'_atlas_'+direction).crop((0,0,96,128)).getchannel('A')
                rows=[]
                for y in range(78,98):
                    xs=[x for x in range(20,75) if alpha.getpixel((x,y))>220]
                    rows.append(max(xs)-min(xs)+1 if xs else 0)
                widths[direction]=sum(rows)/len(rows)
            for direction in ('E','W'):
                self.assertGreater(widths[direction],27,(variant,direction))
                self.assertGreater(widths[direction]/widths['S'],.55,(variant,direction))

    def test_eight_distinct_walk_frames_per_facing(self):
        for direction in DIRS:
            sheet=png("witch_atlas_"+direction)
            self.assertEqual(sheet.size,(2304,128))
            poses=[sheet.crop(((i+4)*96,0,(i+5)*96,128)) for i in range(8)]
            self.assertEqual(len({im.tobytes() for im in poses}),8,direction)

    def test_boots_move_independently(self):
        for direction in DIRS:
            sheet=png("witch_atlas_"+direction)
            feet=[sheet.crop(((i+4)*96,105,(i+5)*96,128)).tobytes() for i in range(8)]
            self.assertGreaterEqual(len(set(feet)),4,direction)

    def test_witch_hat_and_boots_stay_inside_the_frame(self):
        for direction in DIRS:
            sheet=png("witch_atlas_"+direction)
            for i in range(24):
                alpha=sheet.crop((i*96,0,(i+1)*96,128)).getchannel("A").point(lambda value:255 if value>64 else 0)
                box=alpha.getbbox()
                self.assertGreater(box[0],0,(direction,i))
                self.assertGreater(box[1],0,(direction,i))
                self.assertLess(box[2],96,(direction,i))
                self.assertLess(box[3],128,(direction,i))

    def test_enemy_animation_strips(self):
        for kind in TYPES:
            sheet=png("enemy_walk_"+kind)
            self.assertEqual(sheet.size,(384,128))
            frames=[sheet.crop((i*96,0,(i+1)*96,128)).tobytes() for i in range(4)]
            self.assertGreaterEqual(len(set(frames)),3,kind)

    def test_spellcasting_changes_hands_not_just_the_whole_bitmap(self):
        for direction in DIRS:
            sheet=png("witch_atlas_"+direction)
            frames=[sheet.crop(((12+i)*96,0,(13+i)*96,128)) for i in range(6)]
            self.assertGreaterEqual(len({frame.tobytes() for frame in frames}),4,direction)
            hands=[frame.crop((12,35,88,100)).tobytes() for frame in frames]
            self.assertGreaterEqual(len(set(hands)),4,direction)

    def test_new_landmarks_have_transparent_backgrounds(self):
        for kind in ("tree","arch","tomb"):
            im=png("prop_"+kind)
            self.assertEqual(im.size,(160,200))
            self.assertEqual(im.getpixel((0,0))[3],0)
            self.assertGreater(im.getchannel("A").getbbox()[3],170)

    def test_enemy_state_atlases_have_distinct_local_poses(self):
        for kind in TYPES:
            im=png('enemy_atlas_'+kind)
            self.assertEqual(im.size,(3168,1024))
            for state,start,count in [('idle',0,4),('walk',4,8),('attack',12,6),('hurt',18,3),('death',21,6),('fear',27,6)]:
                frames=[im.crop(((start+i)*96,0,(start+i+1)*96,128)).tobytes() for i in range(count)]
                self.assertGreaterEqual(len(set(frames)),2 if state=='idle' else 3,(kind,state))

    def test_enemy_death_silhouettes_collapse(self):
        for kind in TYPES:
            im=png('enemy_atlas_'+kind)
            first=im.crop((21*96,0,22*96,128)).getchannel('A').getbbox()
            last=im.crop((26*96,0,27*96,128)).getchannel('A').getbbox()
            self.assertLess(last[3]-last[1],(first[3]-first[1])*.6,kind)

    def test_enemy_animation_preview_loops(self):
        with Image.open(ROOT/'enemy-animation-preview.gif') as gif:
            self.assertEqual(gif.n_frames,12)
            self.assertEqual(gif.info['loop'],0)
            self.assertEqual(gif.size,(816,1332))

    def test_preview_loops(self):
        with Image.open(ROOT/"walking-preview.gif") as gif:
            self.assertEqual(gif.n_frames,8)
            self.assertEqual(gif.size,(480,324))
            self.assertEqual(gif.info["loop"],0)
            self.assertEqual(gif.info["duration"],90)

    def test_each_enemy_has_eight_real_directional_models(self):
        for kind in TYPES:
            im=png('enemy_atlas_'+kind)
            views=[im.crop((4*96,row*128,5*96,(row+1)*128)).tobytes() for row in range(8)]
            self.assertEqual(len(set(views)),8,kind)

    def test_all_enemy_frames_stay_within_their_cells(self):
        for kind in TYPES:
            im=png('enemy_atlas_'+kind)
            for row in range(8):
                for frame in range(33):
                    alpha=im.crop((frame*96,row*128,(frame+1)*96,(row+1)*128)).getchannel('A').point(lambda v:255 if v>90 else 0)
                    box=alpha.getbbox()
                    self.assertIsNotNone(box,(kind,row,frame))
                    self.assertGreater(box[0],0,(kind,row,frame,box))
                    self.assertGreater(box[1],0,(kind,row,frame,box))
                    self.assertLess(box[2],96,(kind,row,frame,box))
                    self.assertLess(box[3],128,(kind,row,frame,box))

    def test_direction_preview_has_all_families(self):
        with Image.open(ROOT/'enemy-directions-preview.gif') as gif:
            self.assertEqual(gif.n_frames,8)
            self.assertEqual(gif.size,(864,1305))
            self.assertEqual(gif.info['loop'],0)

    def test_generation_is_deterministic(self):
        # Determinism is measured within one toolchain. Pillow/platform changes
        # can change encoded bytes and rasterization; never overwrite checked-in
        # artwork while running verification.
        names=['assets.js','walking-preview.gif','animation-preview.gif','enemy-animation-preview.gif','enemy-directions-preview.gif','boss-ritual-preview.gif']
        with tempfile.TemporaryDirectory(prefix='nocturne-assets-') as directory:
            output=Path(directory)
            for name in ['generate_assets.py','witch_models.py','enemy_models.py','enemy_geometry.py']:
                shutil.copyfile(ROOT/name,output/name)
            def generate():
                subprocess.run([sys.executable,str(output/'generate_assets.py')],check=True,stdout=subprocess.DEVNULL)
                return [hashlib.sha256((output/name).read_bytes()).digest() for name in names]
            self.assertEqual(generate(),generate())

    def test_boss_rituals_have_eleven_distinct_articulated_clips(self):
        for kind in ('warden','overlord'):
            im=png('enemy_ritual_'+kind)
            self.assertEqual(im.size,(3168,2048))
            for state in range(11):
                frames=[im.crop((((state*6+i)%33)*96,((state*6+i)//33)*128,((state*6+i)%33+1)*96,((state*6+i)//33+1)*128)) for i in range(6)]
                self.assertGreaterEqual(len({f.tobytes() for f in frames}),5,(kind,state))
            self.assertEqual(len({im.crop((((s*6+2)%33)*96,((s*6+2)//33)*128,((s*6+2)%33+1)*96,((s*6+2)//33+1)*128)).tobytes() for s in range(11)}),11)

    def test_boss_ritual_frames_stay_inside_every_directional_cell(self):
        for kind in ('warden','overlord'):
            im=png('enemy_ritual_'+kind)
            for row in range(8):
                for frame in range(66):
                    alpha=im.crop(((frame%33)*96,(row*2+frame//33)*128,(frame%33+1)*96,(row*2+frame//33+1)*128)).getchannel('A').point(lambda v:255 if v>90 else 0)
                    box=alpha.getbbox()
                    self.assertTrue(box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<128,(kind,row,frame,box))

    def test_boss_ritual_preview_loops(self):
        with Image.open(ROOT/'boss-ritual-preview.gif') as gif:
            self.assertEqual(gif.n_frames,12)
            self.assertEqual(gif.size,(800,380))
            self.assertEqual(gif.info['loop'],0)

    def test_demon_uses_eight_dedicated_atlases_distinct_from_the_witch(self):
        for direction in DIRS:
            im=png('demon_atlas_'+direction)
            self.assertEqual(im.size,(2304,128))
            self.assertNotEqual(im.tobytes(),png('witch_atlas_'+direction).tobytes())
            for start,count in [(0,4),(4,8),(12,6),(18,3),(21,3)]:
                poses=[im.crop(((start+i)*96,0,(start+i+1)*96,128)).tobytes() for i in range(count)]
                self.assertGreaterEqual(len(set(poses)),min(count,3),(direction,start))

    def test_demon_frames_have_unclipped_horns_boots_and_staff(self):
        for direction in DIRS:
            im=png('demon_atlas_'+direction)
            for frame in range(24):
                box=im.crop((frame*96,0,(frame+1)*96,128)).getchannel('A').point(lambda v:255 if v>90 else 0).getbbox()
                self.assertTrue(box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<128,(direction,frame,box))


class EvolutionAssetTests(unittest.TestCase):
    def test_packed_cells_reconstruct_original_rendered_pixels_losslessly(self):
        from enemy_models import render_enemy
        for kind in TYPES:
            expected=render_enemy(kind,angle=315,action='idle',progress=.17/4)
            actual=png('enemy_atlas_'+kind).crop((0,7*128,96,8*128))
            self.assertEqual(hashlib.sha256(actual.getchannel('A').tobytes()).digest(),hashlib.sha256(expected.getchannel('A').tobytes()).digest(),kind)
            black=Image.new('RGBA',(96,128),(0,0,0,255))
            self.assertEqual(hashlib.sha256(Image.alpha_composite(black,actual).tobytes()).digest(),hashlib.sha256(Image.alpha_composite(black,expected).tobytes()).digest(),kind)
        for kind in ('warden','overlord'):
            expected=render_enemy(kind,angle=315,action='salvo',progress=0)
            actual=png('enemy_ritual_'+kind).crop((0,14*128,96,15*128))
            black=Image.new('RGBA',(96,128),(0,0,0,255))
            self.assertEqual(hashlib.sha256(Image.alpha_composite(black,actual).tobytes()).digest(),hashlib.sha256(Image.alpha_composite(black,expected).tobytes()).digest(),kind)
            self.assertEqual(hashlib.sha256(actual.getchannel('A').tobytes()).digest(),hashlib.sha256(expected.getchannel('A').tobytes()).digest(),kind)

    def test_visible_cloth_masks_leave_head_and_staff_rigid_in_all_directions(self):
        from witch_models import render_witch
        for demon in (False,True):
            for angle in range(0,360,45):
                image,groups=render_witch(angle,phase=1.7,demon=demon,return_masks=True)
                self.assertEqual(len(groups),3)
                for runs in groups:
                    for i in range(0,len(runs),3):
                        x,y,w=runs[i:i+3]
                        self.assertFalse(y==50 and x<=48<x+w,(angle,demon))
                        self.assertGreaterEqual(y,35,(angle,demon))

    def test_biomes_and_new_architecture_have_distinct_pixels_and_contact_points(self):
        self.assertEqual(len({png(k).tobytes() for k in ('ground','ground_ember','ground_moon')}),3)
        for key in ('prop_obelisk','prop_wall','prop_brazier','prop_charred'):
            im=png(key);self.assertEqual(im.size,(160,200));self.assertEqual(im.getpixel((0,0))[3],0)
            self.assertGreater(im.getchannel('A').getbbox()[3],170,key)


class HostileAssetTests(unittest.TestCase):
    def test_all_enemy_profiles_retain_solid_anatomical_depth(self):
        regions={'slime':(80,111),'skeleton':(58,90),'gargoyle':(55,90),'hound':(70,104),'cultist':(65,100),'wraith':(65,100),'reaper':(65,100),'warden':(55,90),'overlord':(58,94)}
        for kind,(top,bottom) in regions.items():
            widths={}
            for direction,row in [('S',0),('W',2),('E',6)]:
                a=png('enemy_atlas_'+kind).crop((0,row*128,96,(row+1)*128)).getchannel('A');spans=[]
                for y in range(top,bottom):
                    xs=[x for x in range(20,77) if a.getpixel((x,y))>160]
                    if xs:spans.append(max(xs)-min(xs)+1)
                widths[direction]=sum(spans)/max(1,len(spans))
            for direction in ('W','E'):
                self.assertGreater(widths[direction],7 if kind=='skeleton' else 11,(kind,widths))
                self.assertGreater(widths[direction]/max(1,widths['S']),.28,(kind,widths))

    def test_all_eleven_boss_powers_change_geometry_not_only_colour(self):
        for kind in ('warden','overlord'):
            im=png('enemy_ritual_'+kind);shapes=[]
            for state in range(11):
                frame=state*6+2;x=frame%33*96;y=(14+frame//33)*128
                a=im.crop((x,y,x+96,y+128)).getchannel('A').point(lambda v:255 if v>160 else 0)
                shapes.append(hashlib.sha256(a.tobytes()).digest())
            self.assertGreaterEqual(len(set(shapes)),10,kind)

    def test_hound_has_distinct_four_leg_contact_poses(self):
        im=png('enemy_atlas_hound');feet=[im.crop(((4+i)*96,101,(5+i)*96,128)).tobytes() for i in range(8)]
        self.assertGreaterEqual(len(set(feet)),6)

    def test_warden_and_overlord_have_different_silhouette_proportions(self):
        widths={}
        for kind in ('warden','overlord'):
            a=png('enemy_atlas_'+kind).crop((0,25,96,77)).getchannel('A').point(lambda v:255 if v>150 else 0)
            b=a.getbbox();widths[kind]=b[2]-b[0]
        self.assertGreater(widths['overlord'],widths['warden']*1.18,widths)

    def test_gel_and_spectral_materials_have_visible_translucent_interiors(self):
        for kind in ('slime','wraith'):
            a=png('enemy_atlas_'+kind).crop((0,0,96,128)).getchannel('A');count=0
            for y in range(10,120):
                for x in range(10,86):
                    if 45<a.getpixel((x,y))<225 and all(a.getpixel((x+dx,y+dy))>0 for dx,dy in ((-1,0),(1,0),(0,-1),(0,1))):count+=1
            self.assertGreater(count,70,(kind,count))

    def test_transparent_faces_preserve_internal_opaque_colour(self):
        from enemy_geometry import Mesh
        m=Mesh(0);m.face([(-6,5,38),(6,5,38),(6,5,53),(-6,5,53)],(255,0,0,255),True)
        m.face([(-6,10,38),(6,10,38),(6,10,53),(-6,10,53)],(0,0,255,128),True)
        color=m.render().getpixel((48,79));self.assertGreater(color[0],60);self.assertGreater(color[2],60);self.assertGreater(color[3],230)

    def test_new_mesh_rendering_is_deterministic_without_global_randomness(self):
        from enemy_models import render_enemy
        import random
        state=random.getstate()
        for kind in TYPES:
            a=render_enemy(kind,angle=315,phase=1.2,action='walk').tobytes();b=render_enemy(kind,angle=315,phase=1.2,action='walk').tobytes()
            self.assertEqual(hashlib.sha256(a).digest(),hashlib.sha256(b).digest(),kind)
        self.assertEqual(random.getstate(),state)


if __name__=="__main__":
    unittest.main(verbosity=2)
