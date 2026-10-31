# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Javanshir Gurbanzade
# This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
"""Sync display versions from VERSION; --check detects release drift without writes."""
import argparse
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
NUMBER = r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not re.fullmatch(NUMBER, version):
        parser.error("VERSION must contain MAJOR.MINOR.PATCH without a v prefix")

    rules = {
        "JSCanvasEdition/game.js": [(r"(?<=N.VERSION = ')[^']+", version)],
        "JSCanvasEdition/systems/volumetric_regalia.js": [
            (r"(?<=A.volumeVersion=')[^']+", version),
        ],
        "JSCanvasEdition/index.html": [
            (rf"(?<=JSCanvasEdition v){NUMBER}", version),
            (rf"(?<=[?]v=){NUMBER}", version),
        ],
        "JSCanvasEdition/visual-gallery.html": [
            (rf"(?<=Nocturne v){NUMBER}", version),
            (rf"(?<=JSCanvasEdition · v){NUMBER}", version),
        ],
        "README.md": [(rf"(?<=<!-- version -->v){NUMBER}", version)],
        "JSCanvasEdition/README.md": [(rf"(?<=<!-- version -->v){NUMBER}", version)],
    }
    failures = []
    for name, replacements in rules.items():
        path = ROOT / name
        original = path.read_text(encoding="utf-8")
        updated = original
        for pattern, value in replacements:
            updated, count = re.subn(pattern, lambda _: value, updated)
            if count == 0:
                failures.append(f"{name}: missing version marker ({pattern})")
        if updated != original:
            if args.check:
                failures.append(f"{name}: expected {version}; run python scripts/sync_version.py")
            else:
                path.write_text(updated, encoding="utf-8", newline="\n")
                print(f"Updated {name}")
    releases = (ROOT / "JSCanvasEdition/RELEASES.md").read_text(encoding="utf-8")
    if not re.search(rf"^## v{re.escape(version)}(?:\s|$)", releases, re.M):
        failures.append(f"JSCanvasEdition/RELEASES.md: missing ## v{version} release notes")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print(f"Version {version} is consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
