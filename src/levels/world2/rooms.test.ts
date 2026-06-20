// T-ROOM-SOLVE (HLD §4.1) — World 2 "Growth". Every authored room is SOLVABLE: a
// recorded `(verb, dir)[]` input log replayed through move/strike reaches
// `status === 'won'`. "Solvable" is the machine floor; fun/difficulty is judged by
// the D24 human playtest, not an oracle.
//
// Each room's `par` (in worlds.ts) is its recorded solution length AND its true
// shortest path: T-PAR here asserts `bfsSolve(...).length === par` (F4 real
// minimality, not the tautological par == recorded-length). Recorded solutions are
// imported from the canonical SOLUTIONS map (../solutions).
//
// F5 load-bearing guard: World 2 teaches LENGTH-AS-REACH. The oracle (not the room
// comments) decides which rooms actually NEED growth: with every fruit removed, only
// R2 (the 2-cell-gap Bridge) becomes UNSOLVABLE — growth is load-bearing there.
// R1 and R5 still solve at starting length (their 1-cell gaps / strike clear without
// growing), and R3 (Curl) / R4 (Restraint twist, solved WITHOUT eating) need no
// growth — so those four get no false growth guard. See GROW_REQUIRED below.

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { replay } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS as ALL_SOLUTIONS } from "../solutions";
import { WORLDS } from "../worlds";
import type { LevelDef } from "../../core/types";

const ROOMS = WORLDS.find((w) => w.id === "w2")!.rooms;
const IDS = ROOMS.map((r) => r.id);
const SOLUTIONS = Object.fromEntries(IDS.map((id) => [id, ALL_SOLUTIONS[id]]));

// Rooms where removing all fruit makes the room UNSOLVABLE (BFS-verified) — growth
// is genuinely required. Only R2's 2-cell gap qualifies; R1/R5 still solve at
// starting length, and R3/R4 never need growth.
const GROW_REQUIRED = ["w2r2"];

function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

/** A level with every fruit removed — the snake can never grow, so it stays pinned
 *  at its starting length. If a grow-to-span room is unsolvable like this, growth is
 *  load-bearing. */
function withoutFruit(level: LevelDef): LevelDef {
  return { ...level, cells: level.cells.filter((c) => c.type !== "fruit") };
}

describe("T-ROOM-SOLVE — World 2 (Growth) rooms are solvable", () => {
  it("every World-2 room has a recorded solution", () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(ROOMS.map((r) => r.id).sort());
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

    // Honest-par guard: the room must win on the LAST recorded move, not earlier.
    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      const { level } = lookup(id);
      if (sol.length <= 1) return; // a 1-move solve has no "before".
      const beforeLast = replay(buildState(level), sol.slice(0, -1));
      expect(beforeLast.status).not.toBe("won");
    });
  }

  // F5 load-bearing guard: the grow-required room is UNSOLVABLE with no fruit (the
  // body cannot reach across its 2-cell gap at starting length) — growth is required.
  for (const id of GROW_REQUIRED) {
    it(`${id} is UNSOLVABLE with all fruit removed (growth is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(bfsSolve(buildState(withoutFruit(level)), ["move", "strike"])).toBeNull();
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
