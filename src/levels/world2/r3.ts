// World 2 — R3 "Curl" — teaches BODY-AS-STRUCTURE / falling into a tucked exit
// (§2.6 ledger).
//
// The exit is one cell below the right end of the top ledge, with nothing under it
// but the floor. Walk the head right off the ledge end; with the body still resting
// on the ledge the head dangles over the exit cell, then the next step right curls
// it down — gravity drops the head onto the exit (win-during-fall). It teaches that
// the snake's own body is the platform you walk off of.
//
//   y=1: 1 0 . .       head '0'@1 ; '1'@0 ; walk right along the ledge
//   y=0: 2 3 . X       '2'@0 ; '3'@1 (tail-end) ; exit @3 ; floor is the body+walls
//        # # # #       (drawn below as the y=-? — see grid)
//
// Authored grid (floorY 0, rows top->bottom y=2,1,0):
//   y=2: 1 0 . .
//   y=1: 2 3 . X
//   y=0: # # # #
// The snake starts curled (head top-left); the exit sits on the lower row to the
// right. Walking the head right then right curls it down to the exit.
import { parseRoom } from "../../core/ascii";

export const r3 = parseRoom({
  name: "W2R3 — Curl",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10..",
    "23.X",
    "####",
  ],
});
