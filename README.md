# Nocturne — Witch of Ash

**Nocturne** is a dark-fantasy, top-down arena survival action game centered on magical combat, escalating enemy waves, and character progression. Fight through hostile encounters, collect resources, develop your abilities, and survive increasingly demanding battles.

This repository is organized into **editions**: separate implementations of the same game concept using different technologies. Each edition may have its own release cycle, platform support, controls, and features.

## The Game

Survival in Nocturne is about more than dealing damage. Players must reposition, manage the space around them, and choose how to develop their magical abilities as enemy waves advance.

Core gameplay elements include:

- **Arena survival:** Fight enemy waves in real-time, top-down combat.
- **Magic-focused builds:** Combine offensive spells, area control, and character upgrades.
- **Distinct combat styles:** Experiment with magical archetypes and their different approaches to battle.
- **Progression and loot:** Earn experience, gather rewards, and strengthen your character.
- **Dangerous encounters:** Face elite enemies, bosses, and other high-threat opponents.
- **Replayability:** Explore different upgrade choices and survival strategies across runs.

> **Feature availability varies by edition and version.** For an accurate list of implemented mechanics, consult the README inside each edition.

## Editions

| Edition | Technology | Status | Details |
| --- | --- | --- | --- |
| [JSCanvasEdition](./JSCanvasEdition/) | HTML5 Canvas, JavaScript, CSS | Playable; actively evolving | Browser-based edition with local play and save support. |
| `PyGameEdition` | Python, Pygame | Planned | A future Python-based implementation. |
| More editions | To be determined | Possible | Additional implementations may be added over time. |

The editions are **independent implementations**, not necessarily identical ports. A feature introduced in one edition should not be assumed to exist in another.

## Getting Started

1. Open the directory of the edition you want to play or develop.
2. Read its `README.md` for requirements, setup instructions, and controls.
3. Run that edition using its documented method.

For the browser version, start with **[JSCanvasEdition](./JSCanvasEdition/README.md)**.

## Repository Layout

```text
Nocturne/
├── README.md
├── JSCanvasEdition/
│   ├── README.md
│   └── ...               # Browser edition files
├── PyGameEdition/        # Planned; add when available
└── ...                   # Potential future editions
```

This tree illustrates the intended organization; planned directories may not exist yet.

## Project Principles

- **One identity, multiple implementations.** Every edition belongs to the Nocturne universe while retaining its own technical architecture.
- **Edition-specific documentation.** Installation, inputs, save formats, and limitations should be documented alongside the relevant implementation.
- **Transparent feature status.** Planned features are distinguished from functionality already available in a release.
- **Independent development.** An edition can improve without requiring immediate feature parity with the others.

## Issues and Contributions

Bug reports, gameplay feedback, and improvement proposals can be submitted through the repository's GitHub Issues page when enabled. When reporting a problem, identify the **edition**, **version or commit**, **platform/browser**, and **steps to reproduce**.

Before submitting code, check the applicable licensing terms and any contribution instructions published for the repository.

## Licensing

**No software license is declared in this README.** The applicable terms should be established in a `LICENSE` file before public release. Individual editions and third-party assets or dependencies may have additional licensing requirements. Publishing source code on GitHub does not, by itself, grant permission to reuse, modify, or redistribute it.

## Author

Created by **Cavanshir Qurbanzade (YoungLion)**.

```text
Nocturne — Witch of Ash: a multi-edition, magic-driven arena survival game.
Copyright (C) 2026 Cavanshir Qurbanzade
```
