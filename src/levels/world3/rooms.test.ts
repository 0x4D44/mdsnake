// T-ROOM-SOLVE (HLD §4.1) — World 3 "The Climb". Every authored room is SOLVABLE:
// a recorded `(verb, dir)[]` input log (now including the directionless `anchor`
// toggle) replayed reaches `status === 'won'`. "Solvable" is the machine floor.
//
// World 3 introduces the anchor verb; these rooms are GATED on it — every recorded
// solution uses `anchor`, and an extra test asserts each room is UNSOLVABLE with
// move/strike alone (an exhaustive BFS over move+strike finds no win), proving the
// anchor mechanic is load-bearing here, not decorative.
//
// F4 minimality: each room's `par` (in worlds.ts) is the BFS-shortest solution over
// move+strike+anchor (not merely the recorded-solution length), and the honest-par
// guard asserts the win lands on the final move. Recorded solutions and the BFS
// solver are imported from the shared modules (../solutions, ../bfs).

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { replay } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS as ALL_SOLUTIONS } from "../solutions";
import { WORLDS } from "../worlds";
import type { LevelDef } from "../../core/types";

const ROOMS = WORLDS.find((w) => w.id === "w3")!.rooms;
const IDS = ROOMS.map((r) => r.id);
const SOLUTIONS = Object.fromEntries(IDS.map((id) => [id, ALL_SOLUTIONS[id]]));

function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

describe("T-ROOM-SOLVE — World 3 (The Climb) rooms are solvable", () => {
  it("every World-3 room has a recorded solution", () => {
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

    // F4 minimality: par IS the BFS-shortest path over the full verb set.
    it(`${id} par is the BFS-shortest solution length (true minimality)`, () => {
      const { level, par } = lookup(id);
      const sol = bfsSolve(buildState(level), ["move", "strike", "anchor"]);
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

    it(`${id} uses the anchor verb`, () => {
      expect(SOLUTIONS[id].some((s) => s.verb === "anchor")).toBe(true);
    });

    it(`${id} is UNSOLVABLE without the anchor verb (mechanic is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(bfsSolve(buildState(level), ["move", "strike"])).toBeNull();
    });
  }
});
