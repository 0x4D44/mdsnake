// World 7 — R2 "Hold the Door" — teaches RELAY: one body works a mechanism so the
// OTHER can pass (HLD §2.2.10 "each body holds a gate"). The two bodies live in
// stacked corridors; A's plate (upper lane) opens B's gate (lower lane).
//
//   y=3:  A . P . a        A@(0,3) ; plate P=g1@(2,3) ; A's exit 'a'@(4,3)
//   y=2:  # # # # #         A's floor / B's ceiling
//   y=1:  B . G . b        B@(0,1) ; gate G=g1@(2,1) ; B's exit 'b'@(4,1)
//   y=0:  # # # # #         B's floor
//         0 1 2 3 4
//
// The gate G starts SOLID, blocking B's corridor. A must walk onto the plate to
// open it; while A holds the plate B threads the gate to its exit; then A walks on
// to its own exit. The gate is load-bearing (rooms.test: pinned shut -> unsolvable)
// and Tab is load-bearing (no single body can do both jobs).
//
// Recorded solve (11): B steps to the gate lip; Tab to A; A walks onto the plate
// (g1 opens); Tab to B; B threads the now-open gate to its exit; Tab to A; A walks
// on to its exit. ALL heads on exits -> won.
import type { CoopRoom } from "./coop-room";

export const r2: CoopRoom = {
  name: "W7R2 — Hold the Door",
  strikeRange: 1,
  floorY: 0,
  bodies: [
    [{ x: 0, y: 1 }], // B — active (lower corridor)
    [{ x: 0, y: 3 }], // A — the door-holder (upper corridor)
  ],
  cells: [
    // B's floor (y=0) and the mid floor (y=2 = A's floor / B's ceiling).
    { x: 0, y: 0, type: "wall" }, { x: 1, y: 0, type: "wall" }, { x: 2, y: 0, type: "wall" },
    { x: 3, y: 0, type: "wall" }, { x: 4, y: 0, type: "wall" },
    { x: 0, y: 2, type: "wall" }, { x: 1, y: 2, type: "wall" }, { x: 2, y: 2, type: "wall" },
    { x: 3, y: 2, type: "wall" }, { x: 4, y: 2, type: "wall" },
    // B's lane: the gate g1 then B's exit.
    { x: 2, y: 1, type: "gate", door: "g1" },
    { x: 4, y: 1, type: "exit" },
    // A's lane: the plate g1 (opens B's gate) then A's exit.
    { x: 2, y: 3, type: "plate", trigger: "g1" },
    { x: 4, y: 3, type: "exit" },
  ],
};
