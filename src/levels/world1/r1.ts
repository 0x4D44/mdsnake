// World 1 — R1 "First Strike" (move + exit; the existing slice room).
//
// This is W1 R1 in the §2.6 ledger: it is the same room as the Inc-0 slice
// (`src/levels/level1.ts`), re-exported here so the World-1 registry has a single
// uniform import surface for R1..R7. We re-export rather than copy so there is one
// source of truth for Room 1.

export { level1 as r1 } from "../level1";
