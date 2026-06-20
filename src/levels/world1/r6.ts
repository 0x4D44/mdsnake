// World 1 — R6 "Charge" — teaches GROW + STRIKE combined (§2.6 ledger).
//
// The fruit sits on the only walking path, so you grow before you can strike; the
// longer body then carries enough structure to span the gap on landing. Walk up,
// eat, strike across the 2-cell gap, step onto the exit.
//
//   y=1:  1 0 . o . . . X     head '0'@1 ; fruit @3 (forced, on the path) ; exit @7
//   y=0:  # # # #     # #       floor x=0..3 and x=6,7 ; gap x=4,5
//         0 1 2 3 4 5 6 7
//
// strikeRange 3: after growing, strike right launches the head x=4 -> x=5 -> x=6
// (land on the far ledge), then a move right reaches the exit.
import { parseRoom } from "../../core/ascii";

export const r6 = parseRoom({
  name: "R6 — Charge",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "10.o...X",
    "####..##",
  ],
});
