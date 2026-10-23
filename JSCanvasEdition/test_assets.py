"""Pillow-level checks for actual frame pixels. Run: python test_assets.py."""
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest

from PIL import Image

ROOT=Path(__file__).resolve().parent
DIRS=("N","NE","E","SE","S","SW","W","NW")
TYPES=("slime","skeleton","gargoyle","hound","cultist","warden")


def data():
    text=(ROOT/"assets.js").read_text(encoding="utf-8")
    return json.loads(text.split("Object.freeze(",1)[1].split(");",1)[0])


def png(key):
    return Image.open(io.BytesIO(base64.b64decode(data()[key].split(",",1)[1]))).convert("RGBA")


class AssetTests(unittest.TestCase):
    def test_all_embedded_images_are_valid(self):
        self.assertEqual(len(data()),30)
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
            sheet=png("witch_walk_"+direction)
            self.assertEqual(sheet.size,(768,128))
            poses=[sheet.crop((i*96,0,(i+1)*96,128)) for i in range(8)]
            self.assertEqual(len({im.tobytes() for im in poses}),8,direction)

    def test_boots_move_independently(self):
        for direction in DIRS:
            sheet=png("witch_walk_"+direction)
            feet=[sheet.crop((i*96,105,(i+1)*96,128)).tobytes() for i in range(8)]
            self.assertGreaterEqual(len(set(feet)),4,direction)

    def test_witch_hat_and_boots_stay_inside_the_frame(self):
        for direction in DIRS:
            sheet=png("witch_walk_"+direction)
            for i in range(8):
                alpha=sheet.crop((i*96,0,(i+1)*96,128)).getchannel("A").point(lambda value:255 if value>64 else 0)
                box=alpha.getbbox()
                self.assertGreater(box[0],0,(direction,i))
                self.assertGreater(box[1],0,(direction,i))
                self.assertLess(box[2],96,(direction,i))
                self.assertLess(box[3],128,(direction,i))

    def test_enemy_animation_strips(self):
        for kind in TYPES:
            sheet=png("enemy_walk_"+kind)
            self.assertEqual(sheet.size,(320,88))
            frames=[sheet.crop((i*80,0,(i+1)*80,88)).tobytes() for i in range(4)]
            self.assertGreaterEqual(len(set(frames)),3,kind)

    def test_preview_loops(self):
        with Image.open(ROOT/"walking-preview.gif") as gif:
            self.assertEqual(gif.n_frames,8)
            self.assertEqual(gif.size,(480,324))
            self.assertEqual(gif.info["loop"],0)
            self.assertEqual(gif.info["duration"],90)

    def test_generation_is_deterministic(self):
        paths=[ROOT/"assets.js",ROOT/"walking-preview.gif"]
        before=[hashlib.sha256(p.read_bytes()).digest() for p in paths]
        subprocess.run([sys.executable,str(ROOT/"generate_assets.py")],check=True,stdout=subprocess.DEVNULL)
        self.assertEqual(before,[hashlib.sha256(p.read_bytes()).digest() for p in paths])


if __name__=="__main__":
    unittest.main(verbosity=2)
