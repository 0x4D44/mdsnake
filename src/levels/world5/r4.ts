// World 5 — R4 "Drop in the Dark" — a controlled FALL onto a lit exit (§2.2.7).
// The exit sits at the foot of a drop; a heat lamp ('*') hangs just above it, so in
// the dark the glow tells you a safe landing (the exit) is below before you step
// off the ledge into the black. Rules are normal: walk off the edge, gravity does
// the rest, and the head wins the instant it falls through the exit cell (T-WIN-FALL).
//
//   y=2: 1 0 . .      tail@0 head@1 on the ledge
//   y=1: # # . *      ledge floor 0,1 ; lamp@3 (lit, over the exit)
//   y=0: . . . X      exit@3
//
// Walk right off the ledge: once no segment is over floor the snake falls, and the
// head drops through the exit -> won. The lamp is inert; it only marks the spot.
import { parseRoom } from "../../core/ascii";

export const r4 = parseRoom({
  name: "W5R4 — Drop in the Dark",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10..",
    "##.*",
    "...X",
  ],
});
