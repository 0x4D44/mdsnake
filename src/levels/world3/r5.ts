// World 3 — R5 "Graduation" — the World-3 capstone: CLIMB then STRIKE across a gap
// onto a far ledge, then step to the exit (§2.6 ledger).
//
// Recombines the world's whole vocabulary: anchor-climb the grip wall to gain
// height, strike right across a void to land on the far ledge, then a final step
// onto the exit. The strike lands SHORT of the exit so the win is on the last move
// (honest par).
//
//   y=4: = . . . . X      exit @ (5,4)
//   y=3: = . . . # #      a wall lip the strike lands beside
//   y=2: = . . . . #
//   y=1: = 1 0 . . #      head '0'@(2,1) ; '1'@(1,1) beside grip(0,1)
//   y=0: = # # . # #      floor stub at x=1,2 ; void at x=3 ; pillar x=4,5
//
// Authored grid (floorY 0, rows top->bottom y=4..0):
//   y=4: = . . . . X
//   y=3: = . . . # #
//   y=2: = . . . . #
//   y=1: = 1 0 . . #
//   y=0: = # # . # #
// strikeRange 3. Solution: left, up, anchor, up, anchor, up, strike right (across
// the gap onto the lip), right (onto the exit). Anchor-required.
import { parseRoom } from "../../core/ascii";

export const r5 = parseRoom({
  name: "W3R5 — Graduation",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "=....X",
    "=...##",
    "=....#",
    "=10..#",
    "=##.##",
  ],
  legend: { "=": { type: "anchor" } }, // grip wall via the legend (§2.6)
});
