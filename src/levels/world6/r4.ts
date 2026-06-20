// World 6 — R4 "Carry Across" — combine STRIKE with CARRY across a WIDE (3-cell)
// chasm. A range-2 strike alone cannot clear three empty cells (it would land in the
// chasm and fall), so you must swallow the block, strike to the lip, deposit it to
// shorten the chasm to a strikeable two, then strike across to the exit. Both the
// block AND the strike are load-bearing.
//
//   y=1: 1 0 B . . . . . X     tail@0 head@1 ; block@2 ; 3-cell chasm@4,5,6 ; exit@8
//   y=0: # # # # . . . # #      floor under 0,1,2,3 and 7,8 ; CHASM under x=4,5,6
//        0 1 2 3 4 5 6 7 8
import { parseRoom } from "../../core/ascii";

export const r4 = parseRoom({
  name: "W6R4 — Carry Across",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "10B.....X",
    "####...##",
  ],
  legend: {
    B: { type: "object" },
  },
});
