// World 1 — R7 "Hatchling's Graduation" — the small CAPSTONE (§2.6 ledger).
//
// Recombines the world's three ideas in one compact room, in order:
//   1. BODY-AS-WALL / tail-vacate — the snake starts curled in a C; the only way
//      out is to step the head DOWN into the cell the tail vacates this turn.
//   2. GROW — a fruit sits on the only walking path, so you must eat it.
//   3. STRIKE-OVER-A-FALL — a 2-cell gap that only a committed strike clears,
//      landing on the far ledge a step short of the exit.
//
//   y=2:  1 0 . . . . . .     head '0'@1,2 ; '1'@0,2
//   y=1:  2 3 o . . . . X     '2'@0,1 ; '3'@1,1 (tail-end) ; fruit @2 ; exit @7
//   y=0:  # # # #     # #     floor x=0..3 and x=6,7 ; gap x=4,5
//         0 1 2 3 4 5 6 7
//
// Solution: down (tail-vacate out of the C), right (eat -> grow), right, strike
// right (clear the gap, land on the far ledge), right (onto the exit).
import { parseRoom } from "../../core/ascii";

export const r7 = parseRoom({
  name: "R7 — Hatchling's Graduation",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "10......",
    "23o....X",
    "####..##",
  ],
});
