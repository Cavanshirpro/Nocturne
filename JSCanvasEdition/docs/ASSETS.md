# PNG assets and generation — v0.8.0

The runtime uses **64 real PNG files**, a **4,770-byte** static manifest and **624,538 bytes** of separate metadata scripts. All 64 PNGs were extracted byte-for-byte from v0.7.7; their decoded RGBA hashes are preserved in `tests/fixtures/assets-v0.7.7.json`. The old 25,708,371-byte embedded file has been removed. It is neither loaded nor generated.

```text
assets/
├── manifest.js                     # Stable logical ID → relative PNG path
├── metadata/
│   ├── atlas.js                    # Witch, enemy and eleven-ritual clips
│   ├── packing.js                  # Lossless trim rectangles and logical offsets
│   ├── cloth.js                    # Isolated cloth masks
│   └── animations.js               # Animation dimensions/counts
└── images/
    ├── characters/{witch,demon,enemies}/
    ├── environments/{grounds,props}/
    └── effects/
```

The PNGs total **18,810,779 bytes**. Normal startup loads the same **55 active images** as before; nine legacy walk strips remain available for reference but stay unloaded. Active `width × height × 4` sums to **105,222,144 bytes (100.35 MiB)** in both versions. This is raw texture area, not total browser RAM, GPU allocation or a claim of memory profiling. The refactor removes base64 source strings and the giant JS parse; it does not shrink or redraw the sprite atlases.

## Loading

`src/core/asset-loader.js` validates required identifiers and local paths before decoding. Its per-URL promise cache avoids duplicate decoding, failed entries can be retried, and measured progress reports completed/total startup images. Startup only constructs the game and opens storage after all required images succeed. A missing/undecodable file produces an error naming the path; it does not open or mutate save data.

The manifest and metadata are classic JavaScript files to avoid mandatory `fetch()` or ES-module restrictions under local file origins. HTTP and direct `file://` launch were separately tested in Chromium; other browsers can apply different file-origin policies. For a stable local origin, from this edition run:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`. All game resources remain local and offline-capable. No CDN, runtime package, framework, WebGL or cloud service is required.

## Regeneration

Python and Pillow are development-only dependencies. From `JSCanvasEdition`:

```bash
python -m pip install Pillow
python tools/generate_assets.py
python -m unittest discover -s tests -p test_assets.py
```

`generate_assets.py` retains the original Witch, Demon and hostile geometry. `asset_pipeline.py` owns file paths and emission. It writes binary PNGs directly, the manifest, four metadata files and the existing six top-level preview GIFs. It never builds a base64 bundle. The deterministic-generation test copies tools to a temporary directory and compares two complete outputs under the same toolchain, leaving shipped artwork untouched. Different Pillow/platform versions can change rasterization or encoded bytes; intentional regeneration should identify its toolchain and receive visual review. Cross-version migration parity is checked independently against the original shipped RGBA hashes.

To add an image, use a stable logical key, add its generation to the asset dictionary and choose the functional group in `asset_pipeline.image_path`. Add required startup keys to the loader when a new renderer depends on them. New atlas clips must preserve or deliberately migrate dimensions, directions, logical offsets and real emitters; update metadata/asset checks and captured comparisons together.

## Validation tools

```bash
node tests/run.mjs
node tools/progression_probe.mjs
```

Optional native gallery tools require `@napi-rs/canvas`; browser checks require Playwright and a local Chromium executable. Those packages are never shipped as runtime dependencies.

```bash
# Set NOCTURNE_CHROMIUM to your local Chromium executable if needed.
node tools/verify_foundations.cjs
node tools/browser_bench.cjs /absolute/path/to/previous/JSCanvasEdition
node tools/compare_gameplay.mjs /absolute/path/to/previous/JSCanvasEdition
node tools/render_hostiles.cjs /absolute/path/to/previous/JSCanvasEdition
```

Current tools consume the PNG manifest. Comparison tools retain an explicitly scoped fallback for reading a historical unpacked version's embedded images; this is not an alias or dependency in the current runtime.
