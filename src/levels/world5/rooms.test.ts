// T-ROOM-SOLVE (HLD §4.1) — World 5 "Dark". Every authored room is SOLVABLE: a
// recorded `(verb, dir)[]` input log replayed through the verbs reaches
// `status === 'won'`. "Solvable" is the machine floor (fun/difficulty is the D24
// playtest); the M-DARK visual check is MANUAL (§4.3).
//
// World 5 is DARK (renderer-only). The world's DEFINING mechanic — darkness / heat
// lamps — is DELIBERATELY NOT load-bearing on the core: the rooms solve by ordinary
// move/strike and the heat lamps are INERT. That non-load-bearing-ness is itself the
// oracle (CORE-REGRESSION-HEAT, kept below): each room solves byte-identically with
// its heat cells stripped, proving heat changes NOTHING in the core. So the F5
// "intended mechanic required" guard targets each room's actual gap-crossing
// mechanic — STRIKE — but ONLY where BFS proves it required. With move alone, R2
// (Across the Dark) and R6 (Lantern Run) are UNSOLVABLE: strike is load-bearing
// there. R5 (Stepping Stones) ALSO solves move-only (the stones are reachable by
// walking), so its strike is faster but NOT required. R1/R3/R4 are plain walks. The
// non-strike-gated rooms get no false guard — see STRIKE_REQUIRED below.
//
// F4 minimality: each room's `par` is the BFS-shortest solution over move+strike
// (not merely the recorded-solution length); the win must land on the FINAL move.
// Recorded solutions and the BFS solver come from the shared modules.

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { replay } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS as ALL_SOLUTIONS } from "../solutions";
import { WORLDS } from "../worlds";
import type { LevelDef } from "../../core/types";

const ROOMS = WORLDS.find((w) => w.id === "w5")!.rooms;
const IDS = ROOMS.map((r) => r.id);
const SOLUTIONS = Object.fromEntries(IDS.map((id) => [id, ALL_SOLUTIONS[id]]));

// Rooms where move-ONLY BFS finds no win — strike is the only way across, so it is
// load-bearing. (BFS-verified, not inferred from the recorded solution: R5 records a
// strike yet is also walkable, so it is excluded.)
const STRIKE_REQUIRED = ["w5r2", "w5r6"];

function lookup(id: string): { level: LevelDef; par: number; dark?: boolean } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

/** Strip every heat cell from a level (heat is renderer-only, byte-inert to the
 *  core). The resulting level must solve IDENTICALLY — that is what proves heat
 *  changes nothing in the rules (the per-room CORE-REGRESSION-HEAT form). */
function stripHeat(level: LevelDef): LevelDef {
  return { ...level, cells: level.cells.filter((c) => c.type !== "heatlamp") };
}

describe("T-ROOM-SOLVE — World 5 (Dark) rooms are solvable", () => {
  it("every World-5 room has a recorded solution", () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(ROOMS.map((r) => r.id).sort());
  });

  it("every World-5 room is flagged dark (the world's defining presentation)", () => {
    for (const r of ROOMS) expect(r.dark, r.id).toBe(true);
  });

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

    // F4 minimality: par IS the BFS-shortest path over move+strike.
    it(`${id} par is the BFS-shortest solution length (true minimality)`, () => {
      const { level, par } = lookup(id);
      const sol = bfsSolve(buildState(level), ["move", "strike"]);
      expect(sol).not.toBeNull();
      expect(sol!.length).toBe(par);
    });

    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      const { level } = lookup(id);
      if (sol.length <= 1) return;
      const beforeLast = replay(buildState(level), sol.slice(0, -1));
      expect(beforeLast.status).not.toBe("won");
    });

    it(`${id} every authored room actually contains a heat lamp (Dark uses them)`, () => {
      const { level } = lookup(id);
      expect(level.cells.some((c) => c.type === "heatlamp"), id).toBe(true);
    });

    it(`${id} solves IDENTICALLY with heat cells stripped (heat is inert — CORE-REGRESSION-HEAT)`, () => {
      const { level } = lookup(id);
      const withHeat = replay(buildState(level), SOLUTIONS[id]);
      const without = replay(buildState(stripHeat(level)), SOLUTIONS[id]);
      // Same outcome and same snake geometry: heat cells touched nothing.
      expect(without.status).toBe(withHeat.status);
      expect(without.snake).toEqual(withHeat.snake);
    });
  }

  // F5 load-bearing guard: the strike-gated rooms are UNSOLVABLE with move alone —
  // strike is the only way across their voids.
  for (const id of STRIKE_REQUIRED) {
    it(`${id} is UNSOLVABLE with move only (strike is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(bfsSolve(buildState(level), ["move"])).toBeNull();
    });
  }
});
