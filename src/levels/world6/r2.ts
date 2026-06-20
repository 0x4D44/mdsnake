// World 6 — R2 "Reach the Block" — the block is set back from the start, so you must
// walk to it before swallowing, then carry it forward to bridge the 2-cell gap.
// Reinforces that the gut travels with the head (§2.2.8).
//
//   y=1: 1 0 . B . . . X     tail@0 head@1 ; block@3 ; 2-cell gap@4,5 ; exit@7
//   y=0: # # # # . . # #      floor under 0,1,2,3 and 6,7 ; GAP under x=4,5
//        0 1 2 3 4 5 6 7
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "W6R2 — Reach the Block",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10.B...X",
    "####..##",
  ],
  legend: {
    B: { type: "object" },
  },
});
