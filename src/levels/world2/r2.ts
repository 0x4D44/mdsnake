// World 2 — R2 "Bridge" — deepens LENGTH-AS-REACH across a WIDER gap (§2.6).
//
// The gap here is 2 cells wide — a length-3 snake still can't span it. You must
// eat BOTH fruit (length 4) so the body bridges the gap with a segment left on
// each side as the head walks across. The two forced fruit on the approach make
// the double-growth unavoidable; the lesson is that reach scales with length.
//
//   y=1: 1 0 o o . . X     head '0'@1 ; fruit @2,@3 ; gap x=4,5 ; exit @6
//   y=0: # # # # . . #     floor x=0..3 and x=6 ; gap at x=4,5
//         0 1 2 3 4 5 6
//
// strikeRange 1: the gap is uncrossable by a single move at any length below 4,
// and a strike cannot cheat it — growth is the tool.
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "W2R2 — Bridge",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10oo..X",
    "####..#",
  ],
});
