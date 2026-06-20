// World 5 — R5 "Stepping Stones" — crossing a void by memorising LIT stones
// (§2.2.7). Two narrow stones bridge a double gap; a heat lamp ('*') hangs over
// each one. In the dark the lamps are the only way to see WHERE the footing is, so
// the puzzle is "aim each strike at a lit stone". Rules are normal: short strikes
// that land on the stones, then a step onto the exit.
//
//   y=2: . . . * . *      lamps over the two stones (x=3, x=5)
//   y=1: 1 0 . . . . X    head@1 ; exit@6 ; air across the middle
//   y=0: # # . # . # #     start floor 0,1 ; stone@3 ; stone@5 ; gaps@2,4 ; floor@6
//
// strikeRange 2: strike right lands on the first stone (x=3), strike right again
// onto the second (x=5), then a plain step onto the exit. Miss a stone and the
// snake falls into the void — the lamps are what keep you honest in the dark.
import { parseRoom } from "../../core/ascii";

export const r5 = parseRoom({
  name: "W5R5 — Stepping Stones",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "...*.*",
    "10....X",
    "##.#.##",
  ],
});
