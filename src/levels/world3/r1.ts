// World 3 — R1 "First Grip" — teaches the ANCHOR verb + climbing a grip wall
// (§2.2.4, §2.5, D25; World 3 "The Climb").
//
// A grip wall ('=', the `anchor` preset) runs up the right side. The snake starts
// at its foot. The exit is four cells up — too high to reach by folding the body
// while the base stays grounded (a snake that just walks up shifts off the floor
// and falls back). The ONLY way up is to ANCHOR: an anchored segment that is
// gripping the wall is a grounding source (it grounds the snake from grip, derived
// each turn — no latch). So the climb is: step up (free, while still grounded),
// then re-anchor each new head as it rises beside the wall.
//
//   y=4: X . =      exit @ (0,4)
//   y=3: . . =
//   y=2: . . =
//   y=1: 1 0 =      head '0'@(1,1) beside grip(2,1) ; '1'@(0,1)
//   y=0: # # =      floor stub at x=0,1
//
// Canonical climb (anchor verb is directionless): up, anchor, up, anchor, up, left.
// Without the anchor verb this room is UNSOLVABLE — it is the gate for the mechanic.
import { parseRoom } from "../../core/ascii";

export const r1 = parseRoom({
  name: "W3R1 — First Grip",
  strikeRange: 1,
  floorY: 0,
  rows: [
    "X.=",
    "..=",
    "..=",
    "10=",
    "##=",
  ],
  // The grip wall glyph '=' is mapped via the per-room LEGEND (§2.6) to the
  // `anchor` preset (solid + supports + grip). The legend is the sanctioned home
  // for non-default glyphs; the parser's default table stays stateless-W1 only.
  legend: { "=": { type: "anchor" } },
});
