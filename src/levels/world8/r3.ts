// World 8 "Recombination" — R3 "The Spire" — the capstone of the capstones:
// ANCHOR-climb a tall grip wall, then STRIKE off the top across a void onto a lip
// and step to the exit (HLD finale, shipped abilities only — this recombines the
// World-3 climb with the World-1 strike at a harder scale). Both anchor and strike
// are load-bearing (the finale's rooms.test pins "unsolvable without anchor" AND
// "unsolvable without strike").
//
//   y=5: = . . . . X      exit @ (5,5)
//   y=4: = . . . # #      lip the strike lands beside
//   y=3: = . . . . #
//   y=2: = . . . . #
//   y=1: = 1 0 . . #      head '0'@(2,1) ; '1'@(1,1) beside grip(0,1)
//   y=0: = # # . # #      floor stub x=1,2 ; void x=3 ; pillar x=4,5
//        0 1 2 3 4 5
//
// Recorded solve (10): left to bring the head beside the wall, climb by re-anchoring
// each new head (up, anchor x4), strike right across the void onto the lip, step onto
// the exit. Anchor-required (the wall is too tall to strike up) AND strike-required
// (the void cannot be walked).
import { parseRoom } from "../../core/ascii";

export const r3 = parseRoom({
  name: "W8R3 — The Spire",
  strikeRange: 3,
  floorY: 0,
  rows: [
    "=....X",
    "=...##",
    "=....#",
    "=....#",
    "=10..#",
    "=##.##",
  ],
  legend: {
    "=": { type: "anchor" },
  },
});
