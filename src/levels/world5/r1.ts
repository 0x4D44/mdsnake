// World 5 — R1 "First Light" — teaches HEAT-SENSE in its gentlest form (§2.2.7,
// World 5 "Dark"). The room is rendered DARK: only heat lamps ('*'), the snake,
// and a small radius round the head are lit. The RULES are completely normal — a
// plain walk right to the exit. The only new thing is that you must trust the lit
// landmark (the lamp by the exit) and the geometry under your head.
//
//   y=1: 1 0 . . * X     tail@0 head@1 ; lamp@4 (lit) ; exit@5
//   y=0: # # # # # #
//
// The snake passes THROUGH the lamp cell harmlessly (heat is renderer-only and
// byte-inert to the core — CORE-REGRESSION-HEAT), which also teaches the player a
// lamp is a beacon, not an obstacle.
import { parseRoom } from "../../core/ascii";

export const r1 = parseRoom({
  name: "W5R1 — First Light",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "10..*X",
    "######",
  ],
});
