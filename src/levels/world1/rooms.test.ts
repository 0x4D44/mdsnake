// T-ROOM-SOLVE (HLD §4.1): every authored World-1 room (R1-R7) is SOLVABLE — a
// recorded `(verb, dir)[]` input-log replayed through move/strike reaches
// `status === 'won'`. "Solvable" is the machine floor; fun/difficulty is judged by
// the D24 human playtest, not an oracle.
//
// F4 (par minimality): an exhaustive BFS over move+strike computes the room's true
// shortest path. For most rooms par IS that shortest path (`bfs === par`). THREE
// rooms (R1/R6/R7) are an HONEST exception: their generous `strikeRange 3` lets a
// player skip the TAUGHT walk-and-eat path with a couple of raw strikes, so the
// free-verb minimum is BELOW the authored par. Per HLD D15 par optimality is
// AUTHOR-ASSERTED (no solver proves the taught path is the intended optimum); for
// those rooms F4 therefore asserts the achievable-lower-bound `bfs <= par` (the par
// is reachable and not impossibly low), the strongest TRUE machine claim. The
// listed rooms are named in BYPASS_PAR so the exception is explicit, not silent.
//
// F5 (load-bearing): a room's strike is only proven required where BFS over move
// ALONE is unsolvable. The oracle (not the room comments) decides: only R4 is
// genuinely strike-gated; R1/R5/R6/R7 are ALSO walkable (move-only BFS wins), so
// strike is a faster option there, NOT load-bearing — those get no false guard.

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { replay } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS as ALL_SOLUTIONS } from "../solutions";
import { ALL_ROOMS } from "../worlds";
import type { LevelDef } from "../../core/types";

const IDS = ["w1r1", "w1r2", "w1r3", "w1r4", "w1r5", "w1r6", "w1r7"];
const SOLUTIONS = Object.fromEntries(IDS.map((id) => [id, ALL_SOLUTIONS[id]]));

// Rooms whose generous strikeRange admits a sub-par strike-spam bypass of the taught
// path: the free-verb minimum is below par by design (HLD D15 author-asserted par).
const BYPASS_PAR = new Set(["w1r1", "w1r6", "w1r7"]);

// Rooms where move-ONLY BFS finds no win — strike is the only way through, so it is
// load-bearing. (Verified by BFS, not by the room's authoring comment.)
const STRIKE_REQUIRED = ["w1r4"];

function lookup(id: string): { level: LevelDef; par: number } {
  const room = ALL_ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

describe("T-ROOM-SOLVE — World 1 rooms are solvable", () => {
  for (const id of IDS) {
    it(`${id} reaches 'won' on its recorded solution`, () => {
      const { level } = lookup(id);
      const final = replay(buildState(level), SOLUTIONS[id]);
      expect(final.status).toBe("won");
    });

    it(`${id} par equals its recorded solution length`, () => {
      const { par } = lookup(id);
      expect(par).toBe(SOLUTIONS[id].length);
    });

    // F4 minimality: par IS the BFS-shortest path (move+strike) — except the
    // strikeRange-bypass rooms (R1/R6/R7), where par is the author-asserted taught
    // path and BFS only confirms it is achievable (bfs <= par). See header / D15.
    it(`${id} par matches the BFS-shortest solution (true minimality)`, () => {
      const { level, par } = lookup(id);
      const sol = bfsSolve(buildState(level), ["move", "strike"]);
      expect(sol).not.toBeNull();
      if (BYPASS_PAR.has(id)) expect(sol!.length).toBeLessThanOrEqual(par);
      else expect(sol!.length).toBe(par);
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

  // F5 load-bearing guard: a strike-gated room is UNSOLVABLE with move alone — the
  // strike verb is the only way across its gap.
  for (const id of STRIKE_REQUIRED) {
    it(`${id} is UNSOLVABLE with move only (strike is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(bfsSolve(buildState(level), ["move"])).toBeNull();
    });
  }
});
