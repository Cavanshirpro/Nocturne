# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Javanshir Gurbanzade
# This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
"""Check the official AGPLv3 text and the project's separate license notices."""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parents[1]
# https://www.gnu.org/licenses/agpl-3.0.txt, retrieved 31 October 2026.
OFFICIAL_SHA256 = "0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0"
IDENTIFIER = "SPDX-License-Identifier: AGPL-3.0-or-later"


def main():
    errors = []
    for folder in [ROOT, ROOT / "JSCanvasEdition"]:
        license_path = folder / "LICENSE"
        data = license_path.read_bytes().replace(b"\r\n", b"\n")
        if hashlib.sha256(data).hexdigest() != OFFICIAL_SHA256:
            errors.append(f"{license_path.relative_to(ROOT)} differs from the official AGPLv3 text")
        notice = (folder / "NOTICE").read_text(encoding="utf-8")
        for required in [IDENTIFIER, "Copyright (C) 2026 Javanshir Gurbanzade", "WITHOUT ANY WARRANTY"]:
            if required not in notice:
                errors.append(f"{folder.relative_to(ROOT)}/NOTICE is missing {required}")
    for folder in [ROOT / "JSCanvasEdition", ROOT / "scripts"]:
        for path in folder.rglob("*"):
            if path.suffix not in {".js", ".mjs", ".cjs", ".py", ".css", ".html"}:
                continue
            if "__pycache__" in path.parts:
                continue
            if IDENTIFIER not in path.read_text(encoding="utf-8")[:600]:
                errors.append(f"{path.relative_to(ROOT)} has no license identifier")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("Both LICENSE files match GNU AGPLv3; project notices and source identifiers are present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
