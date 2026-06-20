// World 7 — R4 "The Long Hall" — the co-op CAPSTONE: a THREE-stage relay chain
// that forces the bodies to take turns three times (HLD §2.2.10). Same stacked-
// corridor idiom as R2/R3, extended into a longer dependency chain.
//
//   y=3:  A . P . G . P a    A@(0,3); plate g1@2; gate g2@4; plate g3@6; A exit@7
//   y=2:  # # # # # # # #     A's floor / B's ceiling
//   y=1:  B . G . P . G b    B@(0,1); gate g1@2; plate g2@4; gate g3@6; B exit@7
//   y=0:  # # # # # # # #     B's floor
//         0 1 2 3 4 5 6 7
//
// The chain: A's plate g1 opens B's first gate -> B reaches plate g2 which opens
// A's gate -> A reaches plate g3 which opens B's LAST gate -> both walk to their
// exits. Three switches minimum each way; all three gate/plate pairs and Tab are
// load-bearing (rooms.test pins gates-required and Tab-required).
//
// Recorded solve (19 moves): the full A->B->A->B->A->B relay; the BFS-shortest
// path is the recorded par (honest par).
import type { CoopRoom } from "./coop-room";

const W = 8;
const floorRow = (y: number) =>
  Array.from({ length: W }, (_, x) => ({ x, y, type: "wall" as const }));

export const r4: CoopRoom = {
  name: "W7R4 — The Long Hall",
  strikeRange: 1,
  floorY: 0,
  bodies: [
    [{ x: 0, y: 1 }], // B — active (lower)
    [{ x: 0, y: 3 }], // A (upper)
  ],
  cells: [
    ...floorRow(0), // B's floor
    ...floorRow(2), // A's floor / B's ceiling
    // B's lane: gate g1, plate g2, gate g3, exit.
    { x: 2, y: 1, type: "gate", door: "g1" },
    { x: 4, y: 1, type: "plate", trigger: "g2" },
    { x: 6, y: 1, type: "gate", door: "g3" },
    { x: 7, y: 1, type: "exit" },
    // A's lane: plate g1, gate g2, plate g3, exit.
    { x: 2, y: 3, type: "plate", trigger: "g1" },
    { x: 4, y: 3, type: "gate", door: "g2" },
    { x: 6, y: 3, type: "plate", trigger: "g3" },
    { x: 7, y: 3, type: "exit" },
  ],
};
