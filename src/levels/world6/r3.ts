// World 6 — R3 "Decoy Bridge" — the WORLD-6 TWIST: a shed-skin decoy used as
// STRUCTURE (§2.2.9). Mechanically a bridge like R1/R2, but FRAMED as shedding: the
// block you swallow is regurgitated as a "decoy" segment that becomes permanent
// footing. A wider run-up emphasises carrying the shed material to where it is
// needed. The decoy is the only way across (the 2-cell gap is unspannable).
//
//   y=1: 1 0 B . . . . X     tail@0 head@1 ; block@2 ; 2-cell gap@4,5 ; exit@7
//   y=0: # # # # . . # #      floor under 0,1,2,3 and 6,7 ; GAP under x=4,5
//        0 1 2 3 4 5 6 7
import { parseRoom } from "../../core/ascii";

export const r3 = parseRoom({
  name: "W6R3 — Decoy Bridge",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10B....X",
    "####..##",
  ],
  legend: {
    B: { type: "object" },
  },
});
