// T-ROOM-SOLVE (HLD §4.1): every authored World-1 room (R1-R7) is SOLVABLE — a
// recorded `(verb, dir)[]` input-log replayed through move/strike reaches
// `status === 'won'`. "Solvable" is the machine floor; fun/difficulty is judged by
// the D24 human playtest, not an oracle.
//
// Each room's `par` (in worlds.ts) is set to its recorded solution length, so this
// file is also the source of the par numbers (cross-checked here).

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { k, m, replay } from "../replay";
import type { Solution } from "../replay";
import { ALL_ROOMS } from "../worlds";
import type { LevelDef } from "../../core/types";

// Recorded solutions, keyed by room id. Each is the authored optimal input log.
const SOLUTIONS: Record<string, Solution> = {
  // R1: walk right, eat fruit, strike the gap (lands x=7), walk to the exit (x=11).
  w1r1: [m("right"), m("right"), k("right"), m("right"), m("right"), m("right"), m("right")],
  // R2: eat the near fruit to grow, then walk across the 2-cell gap (a longer
  // body always keeps a segment over the near/far floor), eat the egg, exit.
  w1r2: [m("right"), m("right"), m("right"), m("right"), m("right")],
  // R3: one tail-vacate move down onto the exit under the tail-end.
  w1r3: [m("down")],
  // R4: strike across the 3-cell gap onto the far ledge, step onto the exit.
  w1r4: [k("right"), m("right")],
  // R5: strike grabs the mid-flight fruit and lands; step onto the exit.
  w1r5: [k("right"), m("right")],
  // R6: walk to eat the forced fruit, strike across the gap, step onto the exit.
  w1r6: [m("right"), m("right"), k("right"), m("right")],
  // R7: capstone — tail-vacate out of the C, grow, strike over the gap, step out.
  w1r7: [m("down"), m("right"), m("right"), k("right"), m("right")],
};

function lookup(id: string): { level: LevelDef; par: number } {
  const room = ALL_ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

describe("T-ROOM-SOLVE — World 1 rooms are solvable", () => {
  for (const id of Object.keys(SOLUTIONS)) {
    it(`${id} reaches 'won' on its recorded solution`, () => {
      const { level } = lookup(id);
      const final = replay(buildState(level), SOLUTIONS[id]);
      expect(final.status).toBe("won");
    });

    it(`${id} par equals its recorded solution length`, () => {
      const { par } = lookup(id);
      expect(par).toBe(SOLUTIONS[id].length);
    });

    // Honest-par guard: the room must win on the LAST recorded move, not earlier.
    // A win before the final move means trailing no-ops are padding the par (the
    // bug R7 originally had — strike landed on the exit, inflating par).
    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      const { level } = lookup(id);
      if (sol.length <= 1) return; // a 1-move solve has no "before".
      const beforeLast = replay(buildState(level), sol.slice(0, -1));
      expect(beforeLast.status).not.toBe("won");
    });
  }
});
