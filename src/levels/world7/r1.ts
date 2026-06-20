// World 7 — R1 "Two Heads" — teaches the co-op control surface: TWO bodies, ONE
// at a time, and Tab to switch between them (HLD §2.2.10). The win condition is
// the multi-body rule: ALL heads on exits (checkEnd authority).
//
// Two bodies share a flat floor; each has its own exit. The active body (A) cannot
// move the other (B) — only Tab makes B the active body — so the room is UNSOLVABLE
// without Tab (rooms.test pins this: Tab is load-bearing here, not decorative).
//
//   y=1:  A . X . . B X       A@(1,1) ; A's exit@(3,1) ; B@(5,1) ; B's exit@(6,1)
//   y=0:  # # # # # # #       floor
//         0 1 2 3 4 5 6
//
// Recorded solve (3 moves): A strikes right onto its exit (3,1); Tab to B; B moves
// right onto its exit (6,1). Now ALL heads are on exits -> won.
import type { CoopRoom } from "./coop-room";

export const r1: CoopRoom = {
  name: "W7R1 — Two Heads",
  strikeRange: 2,
  floorY: 0,
  bodies: [
    [{ x: 1, y: 1 }], // A — the active body the player starts on
    [{ x: 5, y: 1 }], // B — switch to it with Tab
  ],
  cells: [
    { x: 0, y: 0, type: "wall" }, { x: 1, y: 0, type: "wall" }, { x: 2, y: 0, type: "wall" },
    { x: 3, y: 0, type: "wall" }, { x: 4, y: 0, type: "wall" }, { x: 5, y: 0, type: "wall" },
    { x: 6, y: 0, type: "wall" },
    { x: 3, y: 1, type: "exit" }, // A's exit
    { x: 6, y: 1, type: "exit" }, // B's exit
  ],
};
