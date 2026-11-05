# Lossless WebP assets — v0.8.1

The 64 runtime sprites, packed atlases, grounds and props use local **lossless WebP**. Their decoded RGBA pixels, including transparent RGB, match the original shipped PNG baseline exactly. The conversion uses Pillow's `lossless=True, quality=100, method=6, exact=True`; `exact` preserves fully transparent RGB as described in the [official Pillow format documentation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp).

| Metric | v0.8.0 PNG | v0.8.1 WebP |
| --- | ---: | ---: |
| Runtime images on disk | 64 | 64 |
| Encoded image bytes | 18,810,779 | 11,973,448 |
| Image-byte reduction | — | 36.35% |
| Active decoded images | 55 | 55 |
| Active raw RGBA area | 105,222,144 bytes | 105,222,144 bytes |

Smaller encoded files do not imply smaller decoded texture memory or guaranteed faster decoding. The lossless encoder is more expensive during development; it is never run by the game. Nine unused legacy walk strips remain unloaded. Static README/gallery stills also use verified lossless WebP; animation GIFs retain their established frames.

```text
assets/
├── manifest.js                       # Stable logical ID → local .webp path
├── metadata/{atlas,packing,cloth,animations}.js
└── images/
    ├── characters/{witch,demon,enemies}/
    ├── environments/{grounds,props}/
    └── effects/
```

The classic-script manifest keeps HTTP and local `file://` launch independent of JSON fetch or modules. The loader validates the complete required key set and WebP paths before decoding, caches successful per-URL promises, reports real progress and names missing files. It constructs the game and opens storage only after all required images load. No CDN, runtime package or external fallback is needed. Actual Chromium tests cover HTTP desktop/touch emulation, direct file startup, missing-file handling and real Canvas crops.

Atlas dimensions, animation clips, cloth masks, packing rectangles, offsets and emitters are unchanged. Metadata remains four small static scripts. Native comparison/gallery tools resolve the same manifest and local format. Historical comparison readers may still decode old PNG/base64 editions.

Run from `JSCanvasEdition`:

```bash
python -m pip install Pillow
python tools/generate_assets.py
python -m unittest discover -s tests -p test_assets.py
node tests/run.mjs
```

Generation writes binary WebP directly. The existing transparent-color normalization applies to newly generated artwork; shipped migration separately preserves every original RGBA value. Tests verify all 64 baseline RGBA hashes and two complete generations in a temporary directory. Reproducibility is within one Pillow/libwebp toolchain; intentional art regeneration still needs visual review across toolchain changes.

Native gallery renderers assemble their animation frames, then automatically convert final static preview PNGs through `convert_previews.py`, verifying RGBA before removing the PNG. Intermediate frames remain temporary development artifacts. Run `python tools/convert_previews.py` after producing any manual PNG stills in `previews/`.

Optional browser tools need Playwright and a local Chromium executable; native galleries need `@napi-rs/canvas`. Set `NOCTURNE_CHROMIUM` when needed. These are development dependencies only:

```bash
node tools/verify_foundations.cjs
node tools/compare_gameplay.mjs /absolute/path/to/v0.8.0/JSCanvasEdition
node tools/asset_codec_bench.cjs /absolute/path/to/v0.8.0/JSCanvasEdition
```

Measured conversion sizes/hashes are in `validation-logs/webp-v081.json` and `preview-webp-v081.json`. The original PNG-reference fixture is intentionally historical. See [the current report](IMPLEMENTATION_REPORT.md) for executed tests and measured limitations.
