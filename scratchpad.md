# scratchpad — Coil

Out-of-scope observations parked during the ultracode build. A separate, human-invoked
review triages these. (Rooms are all machine-SOLVABLE; these are level-DESIGN /
playtest-tightening items — D24 territory, which cannot run autonomously.)

## Level design — "loose" rooms (BFS-proven bypassable, 2026-06-20)

The shared BFS oracle (`src/levels/bfs.ts`) revealed several rooms whose authored
comment claims a mechanic is required, but which are solvable WITHOUT it. They still
solve and ship; they just don't *force* the taught mechanic. A level-design/playtest
pass should tighten the geometry (or accept them as gentle intros).

- [ ] `src/levels/world1/r1.ts`, `r5.ts`, `r6.ts`, `r7.ts` — walkable move-only;
      strike is a faster option, not required. (`strikeRange 3` lets raw strikes skip
      the taught walk-and-eat path; this is also why par is author-asserted, not
      BFS-minimal, for r1/r6/r7 — see BYPASS_PAR in `world1/rooms.test.ts`.)
- [ ] `src/levels/world2/r1.ts`, `r5.ts` — comment claims "length-as-reach required",
      but the gap clears at starting length / by strike; only `r2` genuinely needs
      growth. Tighten r1/r5 gaps or re-label.
- [ ] `src/levels/world5/r5.ts` — walkable move-only (stepping stones reachable on
      foot); records a strike but doesn't need one. Only `r2`/`r6` are strike-gated.

## Renderer follow-up

- [ ] World-7 co-op visuals now draw all bodies (`src/render/draw.ts`), but the
      camera still frames via the single-snake projection for co-op rooms
      (`world7/coop-room.ts` `coopLevel`). A nicer fit would frame the union of all
      bodies. Low priority; rooms are playable.
