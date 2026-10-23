"""Pillow-level checks for actual frame pixels. Run: python test_assets.py."""
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
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


@lru_cache(maxsize=64)
def png(key):
    return Image.open(io.BytesIO(base64.b64decode(data()[key].split(",",1)[1]))).convert("RGBA")


class AssetTests(unittest.TestCase):
    def test_all_embedded_images_are_valid(self):
        self.assertEqual(len(data()),48)
        for key in data():
            im=png(key)
            self.assertGreater(im.width,0)
            self.assertGreater(im.getchannel("A").getextrema()[1],0)

    def test_eight_idle_facings(self):
        images=[png("witch_"+d) for d in DIRS]
        self.assertEqual(len({im.tobytes() for im in images}),8)
        self.assertTrue(all(im.size==(96,128) for im in images))

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
        paths=[ROOT/"assets.js",ROOT/"walking-preview.gif",ROOT/"animation-preview.gif",ROOT/"enemy-animation-preview.gif",ROOT/"enemy-directions-preview.gif"]
        before=[hashlib.sha256(p.read_bytes()).digest() for p in paths]
        subprocess.run([sys.executable,str(ROOT/"generate_assets.py")],check=True,stdout=subprocess.DEVNULL)
        self.assertEqual(before,[hashlib.sha256(p.read_bytes()).digest() for p in paths])


if __name__=="__main__":
    unittest.main(verbosity=2)
