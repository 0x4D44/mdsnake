// World 4 — R2 "Bridge of Self" — the gate is too FAR from the plate for the head
// to both press it and pass through in one cell. The body itself must span the
// gap: a rear segment holds the plate down while the head reaches the gate
// (body-as-structure + pressure, §2.2.1/§2.2.6).
//
// A ceiling caps the plate/gate/exit corridor so you cannot climb over the gate —
// the only way through is to OPEN it, and the only way to open it (while the head
// is at the mouth) is to have a rear segment resting on the plate.
//
//   y=2: . . . # # #      ceiling over plate/gate/exit
//   y=1: 2 1 0 P A X      head '0'@(2,1) ; body @1,@0 ; plate g1@3 ; gate g1@4 ; exit@5
//   y=0: # # # # # #      floor
//        0 1 2 3 4 5
//
// Recorded solve (3 moves): three steps right. As the length-3 body advances it
// bridges plate->gate — when the head is in the gate mouth a rear segment sits on
// the plate, holding the gate open; then the head reaches the exit. The gate is
// load-bearing (pinned solid + the ceiling -> the room is unsolvable).
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "W4R2 — Bridge of Self",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "...###",
    "210PAX",
    "######",
  ],
  legend: {
    P: { type: "plate", trigger: "g1" },
    A: { type: "gate", door: "g1" },
  },
});
