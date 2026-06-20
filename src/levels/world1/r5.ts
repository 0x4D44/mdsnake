// World 1 — R5 "Snatch" — teaches STRIKE-TO-GRAB-A-FRUIT-THEN-LAND
// (§2.6 ledger; eat-mid-strike, §2.2.2 / T-STRIKE-4).
//
// One strike both crosses the gap AND eats the fruit hanging in its flight path,
// then lands safely on the far ledge. The fruit IS the hidden egg.
//
//   y=1:  1 0 . o . X       head '0' @1 ; fruit @3 (in flight) ; exit @5
//   y=0:  # #   # #          floor x=0,1 and x=3,4,5 ; gap x=2
//         0 1 2 3 4 5
//
// strikeRange 3: strike right launches the head x=2 (air) -> x=3 (eat fruit) ->
// x=4 (land on ledge), then a single move right reaches the exit.
import { parseRoom } from "../../core/ascii";

export const r5 = parseRoom({
  name: "R5 — Snatch",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "10.o.X",
    "##.###",
  ],
});
