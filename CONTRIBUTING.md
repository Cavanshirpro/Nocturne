# Contributing to Nocturne

Nocturne is in active development. Start with the [project README](README.md), the [browser edition guide](JSCanvasEdition/README.md) and the [versioning policy](VERSIONING.md).

## Run locally

Open `JSCanvasEdition/index.html` in a modern browser, or run `python -m http.server 8000 --directory JSCanvasEdition` from the repository root and visit `http://localhost:8000/`. Normal play has no installation or build step.

## Before opening a pull request

- Describe the player-visible problem and resulting behavior. Include the edition, reproduction steps and screenshots or short GIFs for visual changes.
- Keep gameplay randomness separate from cosmetic effects. Check low quality, reduced motion and touch layouts when changing rendering or UI.
- Keep local save keys and schema migrations independent of release numbering. Export a backup before checking save migrations.
- Update the relevant documentation and release notes. Only change `VERSION` when preparing a release.

Run from the repository root:

```bash
python scripts/sync_version.py --check
python scripts/check_license.py
node JSCanvasEdition/tests.mjs
python -m pip install Pillow
```

Run the asset checks from the edition folder:

```bash
cd JSCanvasEdition
python -m unittest test_assets.py
```

Node.js 18+ and Python with Pillow are required for these development checks. Open `browser-tests.html` through the local server and click **RUN BROWSER CHECKS** for browser verification; that page uses a separate verification save store. `node balance-probe.mjs` is available for balance changes. Optional scripts in `JSCanvasEdition/scripts/` need their stated browser or Canvas dependencies.

The asset suite checks the committed images and regenerates artwork twice in a temporary directory to verify determinism within the installed toolchain. It leaves the source artwork untouched. Different Pillow/platform versions may produce different encoded bytes or rasterization; intentional artwork updates should name the toolchain and include reviewed visual comparisons.

## Reports and licensing

Use [GitHub Issues](https://github.com/Cavanshirpro/Nocturne/issues) for reproducible bugs and feature requests. Include the version from the game, browser, operating system and any relevant images. Do not attach private save backups.

Contributions are covered by the repository's [GNU AGPLv3-or-later license](LICENSE); the project grant is in [NOTICE](NOTICE). Preserve existing credits and identify the source and license of any contributed third-party assets. Keep the official license text unchanged; add project-specific notices separately. Retain source identifiers and update the source link when distributing or hosting modifications so that it offers the corresponding source required by the license.
