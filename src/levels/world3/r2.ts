// World 3 — R2 "Ascent" — extends the climb: a TALLER grip wall (§2.6 ledger).
//
// Same mechanic as R1, one cell higher, to drill the climb rhythm (up, re-anchor,
// up, re-anchor, ...). The exit is five cells up the wall; reaching it needs three
// anchored climb steps. Reinforces that the anchored-on-grip segment is what keeps
// the snake from falling while the head advances up the wall.
//
//   y=5: X . =      exit @ (0,5)
//   y=4: . . =
//   y=3: . . =
//   y=2: . . =
//   y=1: 1 0 =      head '0'@(1,1) beside grip(2,1)
//   y=0: # # =      floor stub
//
// Solution: up, anchor, up, anchor, up, anchor, up, left. Anchor-required.
import { parseRoom } from "../../core/ascii";

export const r2 = parseRoom({
  name: "W3R2 — Ascent",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "X.=",
    "..=",
    "..=",
    "..=",
    "10=",
    "##=",
  ],
  legend: { "=": { type: "anchor" } }, // grip wall via the legend (§2.6)
});
