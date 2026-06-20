// World 3 — R3 "Traverse" — climb a grip wall, then STEP OFF onto a ledge (§2.6).
//
// The grip wall is on the LEFT this time. Climb it, then walk the head right onto
// a top ledge that holds the exit. Teaches that a climb ends by transferring from
// the anchored wall hold to a normal world-supported ledge — the dismount.
//
//   y=4: = . X .      grip wall col x=0 ; exit @ (2,4)
//   y=3: = . . .
//   y=2: = . . .
//   y=1: = 1 0 .      head '0'@(2,1) ; '1'@(1,1) beside grip(0,1)
//   y=0: = # # .      floor stub at x=1,2
//
// Solution: left (bring the head beside the wall), up, anchor, up, anchor, up,
// right (step off onto the ledge under/at the exit). Anchor-required.
import { parseRoom } from "../../core/ascii";

export const r3 = parseRoom({
  name: "W3R3 — Traverse",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "=.X.",
    "=...",
    "=...",
    "=10.",
    "=##.",
  ],
  legend: { "=": { type: "anchor" } }, // grip wall via the legend (§2.6)
});
