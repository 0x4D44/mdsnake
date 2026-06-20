// T-ROOM-SOLVE (HLD §4.1) — World 4 "Pressure". Every authored room is SOLVABLE:
// a recorded `(verb, dir)[]` input log replayed through the verbs reaches
// `status === 'won'`. "Solvable" is the machine floor (fun/difficulty is the D24
// playtest).
//
// World 4 introduces the plate->gate mechanism; these rooms are GATED on it —
// every gate is LOAD-BEARING: an extra test pins every gate permanently solid and
// asserts the room becomes UNSOLVABLE, proving the mechanic is required, not
// decorative.
//
// F4 minimality: each room's `par` (in worlds.ts) is the BFS-shortest solution over
// move+strike (not merely the recorded-solution length), and the win must land on
// the FINAL move. Recorded solutions and the BFS solver come from the shared modules
// (../solutions, ../bfs).

import { describe, expect, it } from "vitest";
import { buildState } from "../../core/game";
import { replay } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS as ALL_SOLUTIONS } from "../solutions";
import { WORLDS } from "../worlds";
import type { Entity, GameState, LevelDef } from "../../core/types";

const ROOMS = WORLDS.find((w) => w.id === "w4")!.rooms;
const IDS = ROOMS.map((r) => r.id);
const SOLUTIONS = Object.fromEntries(IDS.map((id) => [id, ALL_SOLUTIONS[id]]));

function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

/** A built state with every gate turned into a PERMANENT BARRIER: solid but NOT a
 *  support and with NO `door` id, so applyMechanisms ignores it and it can never
 *  open (neither plate nor occupancy). Crucially it is NOT a wall — the snake
 *  cannot stand on TOP of it (gates never support, M1), so this isolates exactly
 *  "the path the gate blocks". If a room is unsolvable under this, opening the
 *  gate via the mechanism is the ONLY way through -> the mechanic is load-bearing. */
function pinGatesSolid(level: LevelDef): GameState {
  const s = buildState(level);
  const cells = new Map(s.cells);
  for (const [kk, e] of s.cells) {
    if (e.door !== undefined) {
      const barrier: Entity = { kind: "gate", solid: true }; // no door, no supports
      cells.set(kk, barrier);
    }
  }
  // Re-settle is unnecessary (gates never support, so the grounded set is
  // unchanged); a fresh state object lets the BFS start from a clean snapshot.
  return { ...s, cells };
}

describe("T-ROOM-SOLVE — World 4 (Pressure) rooms are solvable", () => {
  it("every World-4 room has a recorded solution", () => {
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

    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      const { level } = lookup(id);
      if (sol.length <= 1) return;
      const beforeLast = replay(buildState(level), sol.slice(0, -1));
      expect(beforeLast.status).not.toBe("won");
    });

    it(`${id} is UNSOLVABLE with every gate pinned solid (mechanic is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(bfsSolve(pinGatesSolid(level), ["move", "strike"])).toBeNull();
    });
  }
});
