// World 6 — R6 "Gullet Capstone" — recombination of the whole Gullet toolbox:
// swallow, carry, deposit-to-bridge the 2-cell gap, cross, and exit. A HIDDEN egg
// (a fruit lure on a shelf above the path) rewards a detour — a beeline to the exit
// skips it (T-EGG-HIDDEN is positional; scoring reads the trace).
//
//   y=2: . . . . . o . . .     egg-lure shelf @(5,2)  (off the direct line)
//   y=1: 1 0 B . . . . . X     tail@0 head@1 ; block@2 ; 2-cell gap@4,5 ; exit@8
//   y=0: # # # # . . # # #      floor under 0,1,2,3 and 6,7,8 ; GAP under x=4,5
//        0 1 2 3 4 5 6 7 8
import { parseRoom } from "../../core/ascii";

export const r6 = parseRoom({
  name: "W6R6 — Gullet Capstone",
  strikeRange: 1,
  floorY: 0,
  rows: [
    ".....o...",
    "10B.....X",
    "####..###",
  ],
  legend: {
    B: { type: "object" },
  },
});
