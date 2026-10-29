# Versioning

Nocturne uses **MAJOR.MINOR.PATCH**, following [Semantic Versioning](https://semver.org/). The project is in initial development: the current major version is **0**. Git tags use a `v` prefix; [VERSION](VERSION) stores the number without it. The repository currently releases JSCanvasEdition.

## Choosing a version

| Change | Example | Policy |
| --- | --- | --- |
| Patch | `0.7.6 → 0.7.7` | Compatible fixes, visual polish, performance and documentation corrections. |
| Minor | `0.7.6 → 0.8.0` | New gameplay systems, substantial features or compatibility changes during initial development. Reset PATCH to zero and document migrations. |
| Major | `0.x.y → 1.0.0` | An intentional first stable release with documented compatibility commitments. After 1.0, incompatible changes increment MAJOR. |

The documented player-facing behavior, save import/export format and offline entry point form the compatibility surface. While MAJOR is zero, compatibility may change in a minor release; save changes must always have migration notes. Internal storage schema numbers and keys are independent of release numbers. Renumbering a release never renames `nocturne.coven.v3` or changes snapshot migrations.

## Historical numbering migration

On **30 October 2026**, the earlier development labels were normalized as follows. This preserves the sequence of feature milestones and patches; it does not imply that the old releases had reached stability.

| Previous label | Canonical version |
| --- | --- |
| `v1.0.0` | `v0.1.0` |
| `v2.0.0` | `v0.2.0` |
| `v2.1.0` | `v0.2.1` |
| `v3.0.0` | `v0.3.0` |
| `v4.0.0` | `v0.4.0` |
| `v5.0.0` | `v0.5.0` |
| `v5.1.0`–`v5.1.3` | `v0.6.0`–`v0.6.3` |
| `v5.2.0`–`v5.2.6` | `v0.7.0`–`v0.7.6` |

Historical canonical tags point to their original commits. Those source snapshots, embedded labels in old comparison images, and archived validation logs retain their original labels. Existing `v1`–`v5` tags remain as legacy aliases for old source links; use the canonical `v0` tags and GitHub Releases for downloads. Commit history is preserved. The current `v0.7.6` package includes the corrected runtime labels, documentation and release tooling.

## Publishing a release

1. Update `VERSION`, add a `## vX.Y.Z` entry at the top of [JSCanvasEdition/RELEASES.md](JSCanvasEdition/RELEASES.md), and update any feature descriptions or screenshots affected by the change.
2. Run `python scripts/sync_version.py`, then `python scripts/sync_version.py --check`.
3. Run the checks in [CONTRIBUTING.md](CONTRIBUTING.md) and inspect the game and README images.
4. Commit and push the source changes. Create and push the matching tag, for example `git tag v0.7.7` and `git push origin v0.7.7`.
5. The release workflow verifies the tag against `VERSION`, runs the checks, and publishes `Nocturne-JSCanvasEdition-vX.Y.Z.zip` plus `SHA256SUMS.txt` with the matching release notes. The ZIP includes the complete browser edition, repository guides, license and version tooling. Inspect the resulting release and download before announcing it.

A `0.x.y` version is an initial-development release. GitHub's separate prerelease flag is reserved for future explicitly marked test builds; the normal `v0.x.y` releases remain downloadable through the latest-release link. Published canonical tags and packages must not be moved or replaced; ship a new version for subsequent changes.
