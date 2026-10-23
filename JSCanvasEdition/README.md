# Nocturne — Witch of Ash: JSCanvasEdition

**JSCanvasEdition** is the HTML5 Canvas and JavaScript implementation of **[Nocturne — Witch of Ash](../README.md)**, a dark-fantasy, top-down arena survival game. Battle waves of enemies, wield magic, collect rewards, and develop your character while trying to stay alive.

This edition is designed for **local, browser-based play**, without requiring a game engine installation or a dedicated game server.

## Gameplay

Nocturne combines fast-paced movement with magical combat and progression:

- **Wave-based survival:** Defend yourself against groups of enemies with different threats and behaviors.
- **Magic and upgrades:** Use and improve spells, including area-of-effect and multi-target attacks.
- **Combat archetypes:** Explore styles such as **Ashkeeper** (direct damage), **Moonweaver** (orbiting magic), and **Stormcaller** (chain lightning).
- **Experience and rewards:** Collect experience and gold as you progress.
- **Shops and build choices:** Spend resources and select upgrades that shape your playstyle.
- **Elite and boss fights:** Take on more dangerous encounters, including Warden-type bosses.
- **Local saves:** Continue runs using browser-based save data and save slots.
- **Animated combat:** Character animation, enemy visuals, and spell effects bring the arena to life.

The game is still being developed. Enemy balancing, enemy animation, transformation mechanics, and additional spells may change between builds; features described in development discussions are not necessarily available in every published release.

## Requirements

- A modern desktop web browser with **HTML5 Canvas** and **JavaScript** support.
- The complete files for this edition, including `index.html` and any referenced assets.

An internet connection is not required for builds whose assets are all included locally.

## How to Play

1. Download or clone the repository:

   ```bash
   git clone https://github.com/OWNER/Nocturne.git
   ```

2. Open the `JSCanvasEdition` folder.
3. Open **`index.html`** in a modern browser.

Some browser security settings restrict resources loaded through `file://`. If the game does not load correctly when opened directly, serve the folder over localhost instead:

```bash
cd Nocturne/JSCanvasEdition
python -m http.server 8000
```

Then visit **http://localhost:8000/**. Python is needed only for this optional local-server method, not to run the JavaScript game itself.

> Replace `OWNER` with the GitHub account or organization that hosts the repository.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move the character |
| Automatic targeting | Attack nearby enemies when auto-fire is active |
| Right mouse button | Use the special ability in builds that support it |
| Mouse wheel | Adjust camera zoom |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |
| In-game interface | Manage upgrades, shops, and saved games |

Controls and abilities may differ across releases. The in-game interface takes precedence when a control has changed.

## Progress and Saves

The browser edition has supported features such as:

- Multiple local save slots (including **Save 1**).
- Automatic saving during gameplay.
- JSON-based save export or backup in builds that expose that option.
- Persistence of progress in browser storage.

**Keep backups of important saves.** Clearing browser site data, switching browsers/profiles, or using private browsing may make locally stored progress unavailable. Save-file compatibility can also change between game versions.

## Development Notes

JSCanvasEdition uses the browser's 2D Canvas rendering capabilities for its arena presentation. This edition is developed independently of any future Python or native editions, so gameplay details and release timing may differ.

Current development areas include enemy variety, animation detail, combat balance, bosses and overlords, spells, and transformation systems. Consult the actual release or changelog for confirmation of what is included in a specific build.

## Reporting Issues

When opening a bug report, provide the following information:

- **Edition:** `JSCanvasEdition`
- **Version / commit:** The release tag or commit hash
- **Browser and operating system:** For example, Firefox on Windows
- **Steps to reproduce:** What you did and what you expected
- **Optional evidence:** Screenshots, error messages, or browser console output

Do not post private save data or other personal information in public issues.

## Licensing

No license is specified in this README. Check the repository's eventual `LICENSE` file and any edition-specific third-party notices before using or redistributing code or assets. Source availability should not be confused with an open-source license grant.

## Credits

- **Creator and developer:** Cavanshir Qurbanzade (YoungLion)
- **Prompter (JSCanvasEdition):** [@oustxr](https://github.com/oustxr)

```text
Nocturne JSCanvasEdition: a browser-based magical arena survival game.
Copyright (C) 2026 Cavanshir Qurbanzade
```
