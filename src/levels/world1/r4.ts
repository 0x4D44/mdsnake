// World 1 — R4 "The Leap" — teaches STRIKE-INTO-A-FALL, the legible risk
// (§2.6 ledger; cf. T-STRIKE-3).
//
// A 3-cell gap. A plain walk falls into it and dies; only a committed STRIKE
// sails across. Mistime it (strike too far, or step instead) and the head lands
// over the void and falls — that risk is the teach.
//
//   y=1:  1 0 . . . X       head '0' @1 ; exit @5
//   y=0:  # #     . #        gap at x=2,3,4 ... wait — see grid below
//
// Grid (strikeRange 3 lands the head exactly on the far ledge at x=4):
//   y=1:  1 0 . . o X        ('o' fruit @4 = hidden egg, on the landing ledge)
//   y=0:  # #     # #         floor x=0,1 and x=4,5 ; gap x=2,3
//         0 1 2 3 4 5
import { parseRoom } from "../../core/ascii";

export const r4 = parseRoom({
  name: "R4 — The Leap",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "10..oX",
    "##..##",
  ],
});
