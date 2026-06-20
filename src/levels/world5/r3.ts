// World 5 — R3 "Warm Fruit" — a lit lamp marks a useful thing in the dark
// (§2.2.7). A heat lamp ('*') glows beside a fruit; in the dark the lamp is what
// lets you find the fruit at all. Rules are normal: eat to grow, walk to the exit.
//
//   y=1: 1 0 * o X     head@1 ; lamp@2 (lit) ; fruit@3 ; exit@4
//   y=0: # # # # #
//
// The lamp cell is inert — the head walks through it on the way to the fruit. This
// teaches "a lamp points at something worth reaching", the core heat-sense idea.
import { parseRoom } from "../../core/ascii";

export const r3 = parseRoom({
  name: "W5R3 — Warm Fruit",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10*oX",
    "#####",
  ],
});
