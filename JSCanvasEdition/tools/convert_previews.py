# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Javanshir Gurbanzade
# This file is part of Nocturne. See LICENSE and NOTICE.
"""Convert rendered static preview PNGs to exact lossless WebP after GIF assembly."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from asset_pipeline import encode_image


def convert(root):
    root = Path(root).resolve()
    folder = root / 'previews'
    rows = []
    for source in sorted(folder.glob('*.png')):
        assert source.resolve().is_relative_to(folder)
        target = source.with_suffix('.webp')
        with Image.open(source) as image:
            rgba = image.convert('RGBA')
            before = hashlib.sha256(rgba.tobytes()).hexdigest()
            target.write_bytes(encode_image(rgba))
        with Image.open(target) as image:
            if hashlib.sha256(image.convert('RGBA').tobytes()).hexdigest() != before:
                raise ValueError('Preview pixel mismatch: ' + str(source))
        rows.append({'path': str(target.relative_to(root)).replace('\\', '/'), 'pngBytes': source.stat().st_size,
                     'webpBytes': target.stat().st_size, 'rgbaSHA256': before})
        source.unlink()
    return rows


if __name__ == '__main__':
    rows = convert(Path(__file__).resolve().parents[1])
    print(json.dumps(rows, indent=2))
