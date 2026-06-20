// World 3 — R4 "Release" — the World-3 TWIST: anchored climb, then STRIKE the head
// off the wall (release-timing) (§2.6 ledger).
//
// The exit hangs out over a void to the right, high up — past the reach of any
// strike from the ground. You must first climb the grip wall (anchoring as you go)
// to get high enough, THEN strike the head sideways off the wall to sail across to
// the exit. The "release timing" is choosing when to leave the wall: strike too
// low and you cannot reach; the anchored climb sets up the launch height.
//
//   y=3: = . . X      exit @ (3,3) over the void
//   y=2: = . . #      a wall stub under the exit
//   y=1: = . . .
//   y=1: = 1 0 .      head '0'@(2,1) ; '1'@(1,1) beside grip(0,1)
//   y=0: = # # .      floor stub
//
// Authored grid (floorY 0, rows top->bottom y=4,3,2,1,0):
//   y=4: = . . X
//   y=3: = . . #
//   y=2: = . . .
//   y=1: = 1 0 .
//   y=0: = # # .
// strikeRange 2. Solution: left, up, anchor, up, anchor, up, strike right (the
// head launches across to the exit, winning mid-flight at the top of the wall).
// Without the anchor verb the climb is impossible, so the room is anchor-gated.
import { parseRoom } from "../../core/ascii";

export const r4 = parseRoom({
  name: "W3R4 — Release",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "=..X",
    "=..#",
    "=...",
    "=10.",
    "=##.",
  ],
  legend: { "=": { type: "anchor" } }, // grip wall via the legend (§2.6)
});
