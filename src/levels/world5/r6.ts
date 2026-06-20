// World 5 — R6 "Lantern Run" (capstone) — combine everything Dark taught: a lit
// fruit to grow by, then a strike across a wide void aimed at a lit far ledge, then
// the lit exit (§2.2.7). Three heat lamps are the only fixed points in the black;
// the player must read them as fruit / landing / goal and chain the moves. Rules
// are normal throughout — Dark only changes what you can see.
//
//   y=1: 1 0 o . * . . X    head@1 ; fruit@2 ; lamp@4 (over the void) ; exit@7
//   y=0: # # # . . . # #     start floor 0..2 ; gap 3,4,5 ; far floor 6,7
//
// Eat the fruit (grow), strike right across the gap onto the far ledge (x=6), step
// onto the exit. The mid-void lamp marks the line of the strike; it is inert
// (renderer-only) and neither supports the body nor blocks it.
import { parseRoom } from "../../core/ascii";

export const r6 = parseRoom({
  name: "W5R6 — Lantern Run",
  strikeRange: 4,
  floorY: 0,
  rows: [
    "10o.*..X",
    "###...##",
  ],
});
