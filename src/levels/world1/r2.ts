// World 1 — R2 "Stretch" — teaches GROW-TO-BRIDGE a gap (§2.6 ledger).
//
// A 2-cell gap a length-2 snake cannot cross (both segments would hang over the
// void and fall). Eat the fruit on the near side first: the longer body keeps a
// segment over the near floor as the head reaches across, so it never falls.
//
//   y=1:  1 0 o . . o X     (head '0' @1; fruit @2 near, fruit @5 = hidden egg)
//   y=0:  # # #     # #      (gap at x=3,4 is void)
//         0 1 2 3 4 5 6
//
// strikeRange 1 so a strike cannot cheat the gap — growth is the intended tool.
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "R2 — Stretch",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10o..oX",
    "###..##",
  ],
});
