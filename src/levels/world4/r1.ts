// World 4 — R1 "First Press" — teaches PLATE-OPENS-GATE (§2.2.6, World 4
// "Pressure").
//
// A gate ('A', door g1) blocks the only path to the exit. A pressure plate ('P',
// trigger g1) sits just before it. Stepping onto the plate opens the gate; the
// gate then stays open because the head occupies it as it passes through
// (occupancy holds it open, no crush — T-MECH-2). One straight walk solves it,
// teaching the mechanic in its gentlest form.
//
//   y=1: 0 P A X      head@0 ; plate g1@1 ; gate g1@2 ; exit@3
//   y=0: # # # #
//        0 1 2 3
//
// Without the gate opening, x=2 is solid and the exit is unreachable — the
// mechanic is load-bearing.
import { parseRoom } from "../../core/ascii";

export const r1 = parseRoom({
  name: "W4R1 — First Press",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "0PAX",
    "####",
  ],
  legend: {
    P: { type: "plate", trigger: "g1" },
    A: { type: "gate", door: "g1" },
  },
});
