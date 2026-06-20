// T-ROOM-SOLVE (HLD §4.1) — World 2 "Growth". Every authored room is SOLVABLE: a
// recorded `(verb, dir)[]` input log replayed through move/strike reaches
// `status === 'won'`. "Solvable" is the machine floor; fun/difficulty is judged by
// the D24 human playtest, not an oracle.
//
// Each room's `par` (in worlds.ts) is set to its recorded solution length, and the
// honest-par guard asserts the room is NOT yet won before the final move (so par is
// not inflated by trailing no-ops). The recorded solutions were found by an
// exhaustive BFS over the verb set and are the optimal move counts.

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { k, m, replay } from "../replay";
import type { Solution } from "../replay";
import { WORLDS } from "../worlds";
import type { LevelDef } from "../../core/types";

// Recorded optimal solutions, keyed by room id.
const SOLUTIONS: Record<string, Solution> = {
  // R1 Reach: eat the fruit to grow, then walk across the 1-cell gap (the longer
  // body keeps a segment over the near/far floor), step onto the exit.
  w2r1: [m("right"), m("right"), m("right"), m("right"), m("right")],
  // R2 Bridge: eat BOTH fruit (length 4), then walk across the 2-cell gap.
  w2r2: [m("right"), m("right"), m("right"), m("right"), m("right")],
  // R3 Curl: walk the head right off the ledge end; the curl drops it onto the
  // tucked exit (win-during-fall).
  w2r3: [m("right"), m("right")],
  // R4 Restraint (twist): ignore the fruit behind you — strike across the gap onto
  // the ledge, then step onto the exit. Stays length 2 (satisfies the constraint).
  w2r4: [k("right"), m("right")],
  // R5 Graduation: walk onto the forced fruit (grow), then strike across the gap
  // onto the exit (win on the strike).
  w2r5: [m("right"), k("right")],
};

const ROOMS = WORLDS.find((w) => w.id === "w2")!.rooms;
function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

describe("T-ROOM-SOLVE — World 2 (Growth) rooms are solvable", () => {
  it("every World-2 room has a recorded solution", () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(ROOMS.map((r) => r.id).sort());
  });

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
    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      const { level } = lookup(id);
      if (sol.length <= 1) return; // a 1-move solve has no "before".
      const beforeLast = replay(buildState(level), sol.slice(0, -1));
      expect(beforeLast.status).not.toBe("won");
    });
  }

  // The R4 twist: the recorded solution honours the "don't over-grow" constraint
  // (it never eats), so the snake finishes at its starting length 2.
  it("w2r4 recorded solution does not over-grow (constraint egg)", () => {
    const { level } = lookup("w2r4");
    const start = buildState(level);
    const final = replay(start, SOLUTIONS["w2r4"]);
    expect(final.snake.length).toBe(start.snake.length);
    expect(final.snake.length).toBe(2);
  });
});
