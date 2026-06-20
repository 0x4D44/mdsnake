// World 4 — R5 "Pressure Chamber" — the capstone: two plate/gate pairs, a fruit
// to grow with, and a vertical thread that combines everything taught in the
// world — grow for length, hold a plate with a rear segment, and climb/strike
// through gates keyed to distinct ids (§2.2.6, World 4 finale).
//
//   y=5: . . X      exit @ (2,5)
//   y=4: . . A      gate g1 @ (2,4)
//   y=3: Q P B      plate g2 @ (0,3) ; plate g1 @ (1,3) ; gate g2 @ (2,3)
//   y=2: 2 1 o      body ; fruit @ (2,2)
//   y=1: 0 . .      head '0' @ (0,1)
//   y=0: # # #      floor
//        0 1 2
//
// Recorded solve (7 moves, BFS-optimal): the snake grows on the fruit, presses
// g1 with a body segment, threads both gates and reaches the exit. Both gates are
// load-bearing (pinned solid -> unsolvable). This is an honest par: BFS finds no
// shorter win.
import { parseRoom } from "../../core/ascii";

export const r5 = parseRoom({
  name: "W4R5 — Pressure Chamber",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "..X",
    "..A",
    "QPB",
    "21o",
    "0..",
    "###",
  ],
  legend: {
    P: { type: "plate", trigger: "g1" },
    A: { type: "gate", door: "g1" },
    Q: { type: "plate", trigger: "g2" },
    B: { type: "gate", door: "g2" },
  },
});
