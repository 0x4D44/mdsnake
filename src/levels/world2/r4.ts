// World 2 — R4 "Restraint" — the WORLD-2 TWIST: length as a TRAP (§2.6 ledger,
// §2.7 constraint egg).
//
// The whole room is solved in two committed moves: strike across the gap to a
// landing ledge, then step onto the exit. A fruit sits BEHIND the snake — a
// temptation. Eating it means reversing course (wasted moves) and leaving with a
// longer body for no benefit. The lesson of World 2's twist: do NOT over-grow.
// The CONSTRAINT EGG rewards solving without eating (maxLength), exactly the
// §2.7 model — the room stays solvable either way; restraint is the bonus.
//
//   y=1: o 1 0 . . X     fruit @0 (behind) ; head '0'@2 ; gap x=3 ; ledge @4 ; exit @5
//   y=0: # # # . # #     floor x=0,1,2 and x=4,5 ; gap at x=3
//         0 1 2 3 4 5
//
// strikeRange 2: a strike right launches the head x=3 (over the gap) -> x=4 (lands
// on the ledge); a single move right then reaches the exit. The strike lands SHORT
// of the exit so the win is on the final step, not mid-flight (honest par).
import { parseRoom } from "../../core/ascii";

export const r4 = parseRoom({
  name: "W2R4 — Restraint",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "o10..X",
    "###.##",
  ],
});
