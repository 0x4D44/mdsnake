// T-ROOM-SOLVE (HLD §4.1) — World 5 "Dark". Every authored room is SOLVABLE: a
// recorded `(verb, dir)[]` input log replayed through the verbs reaches
// `status === 'won'`. "Solvable" is the machine floor (fun/difficulty is the D24
// playtest); the M-DARK visual check is MANUAL (§4.3).
//
// World 5 is DARK (renderer-only). These oracles prove the RULES are normal — the
// rooms solve by ordinary move/strike, and (the load-bearing point of the world)
// the heat lamps are INERT: an extra test asserts each room solves byte-identically
// with its heat cells stripped out, proving heat changes NOTHING in the core
// (CORE-REGRESSION-HEAT, §4.3 — the per-room form of it).
//
// Each room's `par` (in worlds.ts) == its recorded solution length (honest par),
// and the win must land on the FINAL move.

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { k, m, replay } from "../replay";
import type { Solution } from "../replay";
import { WORLDS } from "../worlds";
import type { LevelDef } from "../../core/types";

// Recorded solutions, keyed by room id.
const SOLUTIONS: Record<string, Solution> = {
  // R1 First Light: a plain walk right to the lit exit (through the lamp cells).
  w5r1: [m("right"), m("right"), m("right"), m("right")],
  // R2 Across the Dark: strike the gap to the far ledge, step onto the exit.
  w5r2: [k("right"), m("right")],
  // R3 Warm Fruit: walk through the lamp, eat the fruit, step onto the exit.
  w5r3: [m("right"), m("right"), m("right")],
  // R4 Drop in the Dark: walk off the ledge; the head falls through the exit.
  w5r4: [m("right"), m("right")],
  // R5 Stepping Stones: strike to stone 1, strike to stone 2, step onto the exit.
  w5r5: [k("right"), k("right"), m("right")],
  // R6 Lantern Run: eat to grow, strike across the void to the far ledge, exit.
  w5r6: [m("right"), k("right"), m("right")],
};

const ROOMS = WORLDS.find((w) => w.id === "w5")!.rooms;
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
});
