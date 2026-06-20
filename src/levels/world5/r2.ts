// World 5 — R2 "Across the Dark" — the gap-strike, learned by memorising the LIT
// landmark across the void (§2.2.7). A heat lamp ('*') hangs over the far side: in
// the dark it is the only thing you can see beyond the head's small radius, so it
// tells you WHERE to aim the strike. Rules are normal — a strike over a gap, then a
// step onto the exit.
//
//   y=1: 1 0 . . * . X     head@1 ; void 2..4 ; lamp@4 (lit, over the void) ; exit@6
//   y=0: # # . . . # #      gap at x=2,3,4
//
// strikeRange 4: strike right sails the head to the far ledge (x=5, floor below),
// then a plain step lands on the exit. The lamp over the void is inert (renderer-
// only) — it neither supports nor blocks; it is purely a beacon.
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "W5R2 — Across the Dark",
  strikeRange: 4,
  floorY: 0,
  rows: [
    "10..*.X",
    "##...##",
  ],
});
