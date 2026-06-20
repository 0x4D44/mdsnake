# Coil

A discrete 2.5D snake puzzle game. The snake's own body is the tool: gravity
settles after every move, and you cross gaps and reach ledges by **striking**
(a multi-cell launch) rather than walking. Lineage is Snakebird; the twist is a
progression built on species-specific snake abilities (strike, growth,
constriction, rattle, heat-sense, swallow-and-carry, co-op).

This is the source project. Its built `dist/` is copied into the
`0x4d44.github.io` almanac as a `<slug>/` document (the same way `night-cab` is
built from `mdtrain2`).

## Architecture

- `src/core/` — **pure, deterministic sim** (rules, gravity, win/lose). No DOM,
  no Three.js. Unit-tested input→output; undo is a snapshot stack. This is the
  oracle.
- `src/render/` — Three.js presentation. Reads core state, holds no rules.
- `src/levels/` — data-only level definitions.

## Commands

```
npm install
npm test         # vitest — run the core rule tests
npm run dev      # local dev server
npm run build    # -> dist/ (base "./", ready to copy into the almanac slug)
```

## Controls

Arrows move · Shift+Arrow strikes · U undo · R restart · drag to orbit.
