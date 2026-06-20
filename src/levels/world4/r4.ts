// World 4 — R4 "Two Doors" — introduces TWO independent plate/gate pairs (§2.6,
// T-ASCII two-pair). Each gate is keyed to its OWN plate id (g1 vs g2), so the
// snake must press the right plate to open the right gate — the ids never cross.
//
//   y=1: 0 P A Q B X
//        |  \  \  \  \  \__ exit @ (5,1)
//        |   \  \  \  \____ gate g2 @ (4,1)
//        |    \  \  \______ plate g2 @ (3,1)
//        |     \  \________ gate g1 @ (2,1)
//        |      \__________ plate g1 @ (1,1)
//        head '0' @ (0,1)
//   y=0: # # # # # #
//        0 1 2 3 4 5
//
// Recorded solve (3 moves): move(right) onto plate P (g1) opens gate A; strike
// onward keeps a body segment on each plate / in each gate mouth long enough to
// thread both gates to the exit. Both gates are load-bearing (pinned solid -> the
// room is unsolvable).
import { parseRoom } from "../../core/ascii";

export const r4 = parseRoom({
  name: "W4R4 — Two Doors",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "0PAQBX",
    "######",
  ],
  legend: {
    P: { type: "plate", trigger: "g1" },
    A: { type: "gate", door: "g1" },
    Q: { type: "plate", trigger: "g2" },
    B: { type: "gate", door: "g2" },
  },
});
