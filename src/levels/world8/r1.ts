// World 8 "Recombination" — R1 "Crossing" — the finale opens by recombining CARRY
// + STRIKE over a chasm (HLD §1.3 Inc-4 finale: capstone rooms using ONLY shipped
// abilities, no new model). A 3-cell chasm cannot be cleared by a range-2 strike
// from the lip alone (it would land in the gap and fall); swallow the block, strike
// to the far lip, deposit the block DOWN to shorten the remaining chasm, then strike
// across to the exit. Both the block (carry) and the strike are load-bearing — the
// finale's rooms.test pins "unsolvable without strike".
//
//   y=1: 1 0 B . . . . . X     tail@0 head@1 ; block@2 ; 3-cell chasm@4,5,6 ; exit@8
//   y=0: # # # # . . . # #     floor under 0..3 and 7,8 ; CHASM under x=4,5,6
//        0 1 2 3 4 5 6 7 8
//
// Recorded solve (6): move to swallow the block, strike to the lip, deposit down,
// move, strike, strike across to the exit.
import { parseRoom } from "../../core/ascii";

export const r1 = parseRoom({
  name: "W8R1 — Crossing",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "10B......X",
    "####...##",
  ],
  legend: {
    B: { type: "object" },
  },
});
