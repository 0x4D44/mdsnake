// Recorded room solutions — the single source for cross-room scoring oracles
// (T-PAR, §4.5) and the World-6 room oracle (T-ROOM-SOLVE, §4.1).
//
// Each entry is an authored optimal INPUT LOG: a `(verb, dir)[]` sequence that,
// replayed through the sim core's verbs, reaches `status === 'won'` in exactly the
// room's `par` moves. This is the serialized shape the shell's record-par tool
// emits (F3) — the snapshot stack is never serialized.
//
// PAR-STABILITY-POLICY (§4.5): a recorded solution going RED under an engine change
// is BY DEFAULT a regression to investigate, NOT a re-record signal. Re-record only
// for an intended rule change that carries its own oracle.
//
// (Worlds 1-5 keep their own copies in their `rooms.test.ts` for the load-bearing
// per-world unsolvable-without-mechanic guards; this map is the authoritative cross-
// room T-PAR source and the World-6 solve source.)

import { a, d, k, m, sw } from "./replay";
import type { Solution } from "./replay";

export const SOLUTIONS: Record<string, Solution> = {
  // --- World 1 (Hatchling) ---
  w1r1: [m("right"), m("right"), k("right"), m("right"), m("right"), m("right"), m("right")],
  w1r2: [m("right"), m("right"), m("right"), m("right"), m("right")],
  w1r3: [m("down")],
  w1r4: [k("right"), m("right")],
  w1r5: [k("right"), m("right")],
  w1r6: [m("right"), m("right"), k("right"), m("right")],
  w1r7: [m("down"), m("right"), m("right"), k("right"), m("right")],

  // --- World 2 (Growth) --- (verbatim from world2/rooms.test.ts)
  w2r1: [m("right"), m("right"), m("right"), m("right"), m("right")],
  w2r2: [m("right"), m("right"), m("right"), m("right"), m("right")],
  w2r3: [m("right"), m("right")],
  w2r4: [k("right"), m("right")],
  w2r5: [m("right"), k("right")],

  // --- World 3 (The Climb) --- (verbatim from world3/rooms.test.ts)
  w3r1: [m("up"), a(), m("up"), a(), m("up"), m("left")],
  w3r2: [m("up"), a(), m("up"), a(), m("up"), a(), m("up"), m("left")],
  w3r3: [m("left"), m("up"), a(), m("up"), a(), m("up"), m("right")],
  w3r4: [m("left"), m("up"), a(), m("up"), a(), m("up"), k("right")],
  w3r5: [m("left"), m("up"), a(), m("up"), a(), m("up"), k("right"), m("right")],

  // --- World 4 (Pressure) --- (verbatim from world4/rooms.test.ts)
  w4r1: [m("right"), m("right"), m("right")],
  w4r2: [m("right"), m("right"), m("right")],
  w4r3: [k("right"), m("up"), k("up")],
  w4r4: [m("right"), k("right"), k("right")],
  w4r5: [k("right"), m("up"), m("left"), m("up"), k("up"), m("right"), k("up")],

  // --- World 5 (Dark) --- (verbatim from world5/rooms.test.ts)
  w5r1: [m("right"), m("right"), m("right"), m("right")],
  w5r2: [k("right"), m("right")],
  w5r3: [m("right"), m("right"), m("right")],
  w5r4: [m("right"), m("right")],
  w5r5: [k("right"), k("right"), m("right")],
  w5r6: [m("right"), k("right"), m("right")],

  // --- World 6 (The Gullet) — swallow & carry + deposit; decoy as structure ---
  // (Recorded from the BFS-shortest solve; each crosses a gap unspannable without
  // the deposited block — rooms.test pins "unsolvable without the block".)
  // R1 First Swallow: swallow the block, carry to the lip, deposit DOWN into the
  // 2-cell gap to bridge it, walk across to the exit.
  w6r1: [m("right"), m("right"), d("down"), m("right"), m("right"), m("right")],
  // R2 Reach the Block: walk to the set-back block, swallow, carry to the lip,
  // deposit-bridge, cross.
  w6r2: [m("right"), m("right"), m("right"), d("down"), m("right"), m("right"), m("right")],
  // R3 Decoy Bridge (twist = shed-skin decoy as structure): swallow, carry across
  // the run-up, shed the block into the gap as footing, cross.
  w6r3: [m("right"), m("right"), m("right"), d("down"), m("right"), m("right"), m("right")],
  // R4 Carry Across: swallow, STRIKE to the lip of the 3-cell chasm, deposit to
  // shorten it, then strike the now-2-cell remainder and step to the exit.
  w6r4: [m("right"), k("right"), d("down"), m("right"), k("right"), m("right")],
  // R5 The Long Gut: swallow, carry the full ledge, deposit-bridge the far gap, cross.
  w6r5: [m("right"), m("right"), m("right"), m("right"), d("down"), m("right"), m("right"), m("right")],
  // R6 Gullet Capstone: swallow, deposit-bridge the gap, cross to the exit (the
  // hidden egg on the shelf is an optional detour, not on this beeline).
  w6r6: [m("right"), m("right"), m("right"), d("down"), m("right"), m("right"), m("right"), m("right")],

  // --- World 7 (Two Bodies) — co-op; `sw()` is the Tab body-switch (§2.2.10) ---
  // Recorded from the multi-body BFS over move+strike+switch (BFS-shortest == par).
  // R1 Two Heads: A strikes onto its exit; Tab to B; B steps onto its exit (all
  // heads on exits -> won).
  w7r1: [k("right"), sw(), m("right")],
  // R2 Hold the Door: B to the gate lip; Tab A; A onto the plate (B's gate opens);
  // Tab B; B threads the gate to its exit; Tab A; A walks on to its exit.
  w7r2: [m("right"), sw(), m("right"), m("right"), sw(), m("right"), m("right"), m("right"), sw(), m("right"), m("right")],
  // R3 Take Turns: A opens B's gate; B (through) opens A's gate; both finish.
  w7r3: [m("right"), sw(), m("right"), m("right"), sw(), m("right"), m("right"), m("right"), sw(), m("right"), m("right"), m("right"), sw(), m("right")],
  // R4 The Long Hall: the three-stage A->B->A relay chain, then both to their exits.
  w7r4: [m("right"), sw(), m("right"), m("right"), sw(), m("right"), m("right"), m("right"), sw(), m("right"), m("right"), m("right"), m("right"), sw(), m("right"), m("right"), m("right"), sw(), m("right")],

  // --- World 8 (Recombination) — single-body finale; only shipped abilities ---
  // R1 Crossing: swallow + strike to the lip, deposit DOWN, strike across the chasm.
  w8r1: [m("right"), k("right"), d("down"), m("right"), k("right"), k("right")],
  // R2 The Wide Crossing: carry + deposit + strike to thread the wider chasm.
  w8r2: [k("right"), d("right"), m("left"), m("up"), k("right"), m("right"), k("right"), k("right")],
  // R3 The Spire: anchor-climb the grip wall, strike across the void, step to exit.
  w8r3: [m("left"), m("up"), a(), m("up"), a(), m("up"), a(), m("up"), k("right"), m("right")],
};
