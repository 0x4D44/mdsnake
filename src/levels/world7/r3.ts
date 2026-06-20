// World 7 — R3 "Take Turns" — the relay made MUTUAL: each body opens the other's
// gate, so the two must alternate (HLD §2.2.10). Stacked corridors again, but now
// there is a dependency CHAIN: A opens B's gate, B (once through) opens A's gate.
//
//   y=3:  A . P . G a        A@(0,3) ; plate g1@(2,3) ; gate g2@(4,3) ; A exit@(5,3)
//   y=2:  # # # # # #         A's floor / B's ceiling
//   y=1:  B . G . P b        B@(0,1) ; gate g1@(2,1) ; plate g2@(4,1) ; B exit@(5,1)
//   y=0:  # # # # # #         B's floor
//         0 1 2 3 4 5
//
// A's plate (g1) opens B's gate; B's plate (g2) opens A's gate. Neither body can
// finish alone: A reaches its own gate g2 only after B has stepped on B's plate,
// which B can only reach after A opened B's gate. Both gates load-bearing; Tab
// load-bearing (rooms.test pins both).
//
// Recorded solve (14): B to the gate lip; Tab A; A onto plate g1 (B's gate opens);
// Tab B; B threads its gate to plate g2 (A's gate opens); Tab A; A threads its gate
// to its exit; Tab B; B steps to its exit. ALL heads on exits -> won.
import type { CoopRoom } from "./coop-room";

export const r3: CoopRoom = {
  name: "W7R3 — Take Turns",
  strikeRange: 1,
  floorY: 0,
  bodies: [
    [{ x: 0, y: 1 }], // B — active (lower)
    [{ x: 0, y: 3 }], // A (upper)
  ],
  cells: [
    { x: 0, y: 0, type: "wall" }, { x: 1, y: 0, type: "wall" }, { x: 2, y: 0, type: "wall" },
    { x: 3, y: 0, type: "wall" }, { x: 4, y: 0, type: "wall" }, { x: 5, y: 0, type: "wall" },
    { x: 0, y: 2, type: "wall" }, { x: 1, y: 2, type: "wall" }, { x: 2, y: 2, type: "wall" },
    { x: 3, y: 2, type: "wall" }, { x: 4, y: 2, type: "wall" }, { x: 5, y: 2, type: "wall" },
    // B's lane: gate g1 (A opens it), then plate g2 (B opens A's gate), then exit.
    { x: 2, y: 1, type: "gate", door: "g1" },
    { x: 4, y: 1, type: "plate", trigger: "g2" },
    { x: 5, y: 1, type: "exit" },
    // A's lane: plate g1 (A opens B's gate), then gate g2 (B opens it), then exit.
    { x: 2, y: 3, type: "plate", trigger: "g1" },
    { x: 4, y: 3, type: "gate", door: "g2" },
    { x: 5, y: 3, type: "exit" },
  ],
};
