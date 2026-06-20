// World 6 — R5 "The Long Gut" — a longer carry: swallow the block, walk the full
// ledge carrying it, then bridge the 2-cell gap at the far end. The longest
// straight carry in the world (the gut "remembers" what it ate across the room).
//
//   y=1: 1 0 B . . . . . X     tail@0 head@1 ; block@2 ; 2-cell gap@5,6 ; exit@8
//   y=0: # # # # # . . # #      floor under 0,1,2,3,4 and 7,8 ; GAP under x=5,6
//        0 1 2 3 4 5 6 7 8
import { parseRoom } from "../../core/ascii";

export const r5 = parseRoom({
  name: "W6R5 — The Long Gut",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10B.....X",
    "#####..##",
  ],
  legend: {
    B: { type: "object" },
  },
});
