// World 2 — R1 "Reach" — teaches LENGTH-AS-REACH (§2.6 ledger; World 2 "Growth").
//
// A length-2 snake cannot cross the gap by walking: stepping onto the far side of
// the gap leaves no segment over the near floor, so the rigid body falls. Eat the
// fruit first; the longer body always keeps a segment over solid ground as the
// head reaches across — length is reach you build out of your own body.
//
//   y=1: 1 0 o . . . X     head '0'@1 ; fruit '@2 ; gap x=3 ; exit @6
//   y=0: # # # . # # #     floor x=0,1,2 and x=4,5,6 ; gap at x=3
//         0 1 2 3 4 5 6
//
// strikeRange 1 so a strike cannot cheat the gap — growth is the intended tool.
import { parseRoom } from "../../core/ascii";

export const r1 = parseRoom({
  name: "W2R1 — Reach",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10o...X",
    "###.###",
  ],
});
