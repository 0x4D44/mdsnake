// World 8 "Recombination" — R2 "The Wide Crossing" — escalates R1: a wider 4-cell
// chasm that demands CARRY + DEPOSIT + STRIKE together (HLD finale, shipped abilities
// only). The block must be swallowed and deposited into the gap to make the far side
// strikeable; the strike then carries the head across. Both strike AND deposit are
// load-bearing here (the finale's rooms.test pins both).
//
//   y=1: 1 0 B . . . . . X     tail@0 head@1 ; block@2 ; 4-cell chasm@3,4,5,6 ; exit@8
//   y=0: # # # . . . . # #     floor under 0,1,2 and 7,8 ; CHASM under x=3,4,5,6
//        0 1 2 3 4 5 6 7 8
//
// Recorded solve (8): swallow + strike to bank a deposited stepping block, then
// thread the shortened chasm with a final strike onto the exit (BFS-shortest par).
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "W8R2 — The Wide Crossing",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "10B......X",
    "###....###",
  ],
  legend: {
    B: { type: "object" },
  },
});
