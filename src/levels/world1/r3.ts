// World 1 — R3 "Coil" — teaches BODY-AS-WALL / park-your-tail (§2.6 ledger).
//
// The defining move of body-as-structure is the C-shape TAIL-VACATE: the head
// enters a cell that is inside the body's own footprint THIS turn, because the
// tail is leaving it. Here the exit sits directly under the tail-end segment, so
// the only way onto it is to curl and step the head DOWN into the cell the tail
// vacates.
//
//   y=2:  . 1 0        head '0' @2,2 ; '1' @1,2
//   y=1:  . 2 *        '2' @1,1 ; '*' @2,1 is BOTH the tail-end segment AND exit
//   y=0:  . # #
//         0 1 2
//
// Authored as a LevelDef LITERAL (not ASCII) because cell (2,1) must be BOTH a
// snake segment and the exit entity — a single ASCII glyph cannot express two
// overlapping things. The sim's snake and cells are independent maps, so the
// overlap is well-defined. (ASCII is preferred where it fits; this is the one W1
// room where a coordinate literal is clearer than abusing the legend.)
import type { LevelDef } from "../../core/types";

export const r3: LevelDef = {
  name: "R3 — Coil",
  strikeRange: 1,
  floorY: 0,
  snake: [
    { x: 2, y: 2 }, // head
    { x: 1, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 }, // tail-end — sits on the exit cell
  ],
  cells: [
    { x: 1, y: 0, type: "wall" },
    { x: 2, y: 0, type: "wall" },
    { x: 2, y: 1, type: "exit" },
  ],
};
