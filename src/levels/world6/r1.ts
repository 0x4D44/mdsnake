// World 6 — R1 "First Swallow" — teaches SWALLOW + CARRY + DEPOSIT in its gentlest
// form (§2.2.8, World 6 "The Gullet").
//
// The snake walks a raised ledge (y=1) over a WIDE (2-cell) gap it cannot span with
// its own body — a length-2 snake can bridge a 1-cell gap (rear on solid, head
// reaching over) but NOT a 2-cell one. Swallow the block ahead, carry it to the lip,
// deposit it DOWN into the gap to make a stepping stone, then walk across. The block
// is load-bearing — rooms.test asserts the room is UNSOLVABLE without it.
//
//   y=1: 1 0 B . . . X     tail@0 head@1 ; block@2 ; 2-cell gap@3,4 ; exit@6
//   y=0: # # # . . # #      floor under 0,1,2 and 5,6 ; GAP under x=3,4
//        0 1 2 3 4 5 6
import { parseRoom } from "../../core/ascii";

export const r1 = parseRoom({
  name: "W6R1 — First Swallow",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10B...X",
    "###..##",
  ],
  legend: {
    B: { type: "object" },
  },
});
