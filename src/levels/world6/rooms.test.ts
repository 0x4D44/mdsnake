// T-ROOM-SOLVE (HLD §4.1) — World 6 "The Gullet". Every authored room is SOLVABLE:
// a recorded `(verb, dir)[]` input log (incl. `deposit`) replayed through the verbs
// reaches `status === 'won'` in exactly the room's par. World 6 introduces swallow &
// carry + deposit (and the shed-skin decoy as structure); the carry mechanic is
// LOAD-BEARING — an extra guard removes the block and asserts the room is unsolvable
// without it. The BFS solver is the shared ../bfs helper (move+strike+deposit set).

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { replay } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS } from "../solutions";
import { WORLDS } from "../worlds";
import type { GameState, LevelDef } from "../../core/types";

const ROOMS = WORLDS.find((w) => w.id === "w6")!.rooms;
function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

// World 6's carry depth: pars run to ~8 moves; 12 leaves headroom.
const W6 = ["move", "strike", "deposit"] as const;
const solve = (s: GameState) => bfsSolve(s, [...W6], 12);

/** A built state with every swallowable `object` block removed, isolating "can the
 *  room be solved WITHOUT the carry mechanic". If unsolvable, the block is
 *  load-bearing. */
function withoutBlocks(level: LevelDef): GameState {
  const s = buildState(level);
  const cells = new Map(s.cells);
  for (const [k, e] of s.cells) if (e.pickup === true) cells.delete(k);
  return { ...s, cells };
}

describe("T-ROOM-SOLVE — World 6 (The Gullet) rooms are solvable", () => {
  it("every World-6 room has a recorded solution", () => {
    const have = ROOMS.map((r) => r.id).sort();
    const recorded = have.filter((id) => SOLUTIONS[id] !== undefined);
    expect(recorded).toEqual(have);
  });

  for (const room of ROOMS) {
    const id = room.id;
    it(`${id} is solvable by BFS, and the BFS-shortest matches the recorded par`, () => {
      const sol = solve(buildState(lookup(id).level));
      expect(sol).not.toBeNull();
      // The recorded par IS the shortest solution (honest, BFS-verified par).
      expect(sol!.length).toBe(lookup(id).par);
    });

    it(`${id} reaches 'won' on its recorded solution`, () => {
      const final = replay(buildState(lookup(id).level), SOLUTIONS[id]);
      expect(final.status).toBe("won");
    });

    it(`${id} par equals its recorded solution length`, () => {
      expect(lookup(id).par).toBe(SOLUTIONS[id].length);
    });

    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      if (sol.length <= 1) return;
      const beforeLast = replay(buildState(lookup(id).level), sol.slice(0, -1));
      expect(beforeLast.status).not.toBe("won");
    });

    it(`${id} is UNSOLVABLE without the swallowable block (carry is load-bearing)`, () => {
      expect(solve(withoutBlocks(lookup(id).level))).toBeNull();
    });
  }
});
