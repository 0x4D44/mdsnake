import type { LevelDef } from "../core/types";

// Room 1 — teaches the whole v1 vocabulary in one breath:
//   move right, eat the fruit (grow), strike across the void, walk to the exit.
//
//   . . . . F . . . . . X      y=1   (F fruit @4,  X exit @11)
//   # # # # # . . # # # #      y=0   (gap at x=5,6 is void)
//   0 1 2 3 4 5 6 7 8 9 10 11
//
// Snake starts at x=1..2 on the left floor. strikeRange 3 just clears the gap.
const floor = (x0: number, x1: number) =>
  Array.from({ length: x1 - x0 + 1 }, (_, i) => ({ x: x0 + i, y: 0, type: "wall" as const }));

export const level1: LevelDef = {
  name: "Room 1 — First Strike",
  strikeRange: 3,
  floorY: 0,
  snake: [
    { x: 2, y: 1 },
    { x: 1, y: 1 },
  ],
  cells: [
    ...floor(0, 4),
    ...floor(7, 11),
    { x: 4, y: 1, type: "fruit" },
    { x: 11, y: 1, type: "exit" },
  ],
};
