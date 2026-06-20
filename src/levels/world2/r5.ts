// World 2 — R5 "Graduation" — the World-2 capstone: GROW + STRIKE combined
// (§2.6 ledger).
//
// The snake starts curled on a low shelf with a fruit on the only forward cell, so
// you grow first; the longer body then carries the structure to land a strike
// across the gap onto the exit. It recombines length-as-reach (R1/R2) with the
// strike-over-a-fall risk from World 1.
//
//   y=2: 1 0 . . . .       head '0'@1 ; '1'@0
//   y=1: 2 3 o . . X       '2'@0 ; '3'@1 (tail-end) ; fruit @2 ; gap x=4 ; exit @5
//   y=0: # # # # . #       floor x=0..3 and x=5 ; gap at x=4
//         0 1 2 3 4 5
//
// strikeRange 3: walk the head right onto the fruit (grow), then strike right —
// the head launches x=3 -> x=4 (over the gap) -> x=5 (the exit), winning on the
// strike. Two committed moves; the growth gives the body that bridges the landing.
import { parseRoom } from "../../core/ascii";

export const r5 = parseRoom({
  name: "W2R5 — Graduation",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "10....",
    "23o..X",
    "####.#",
  ],
});
