// T-ROOM-SOLVE (HLD §4.1) — World 8 "Recombination", the FINALE. Every authored
// room is SOLVABLE: a recorded `(verb, dir)[]` input log (move/strike/anchor/
// deposit) replayed reaches `status === 'won'`. The finale recombines ONLY shipped
// abilities (no new model); each room's combined mechanics are LOAD-BEARING — a
// per-room guard removes a verb from the BFS and asserts the room is then
// unsolvable, proving the recombination is the point.
//
// Honest par: each room's `par` (in worlds.ts) is the BFS-shortest solution over
// the full verb set, and equals the recorded solution length. The BFS solver is the
// shared ../bfs helper (restricting the verb set is the per-room load-bearing probe).

import { describe, expect, it } from "vitest";
import { replay } from "../replay";
import type { Solution, Verb } from "../replay";
import { bfsSolve } from "../bfs";
import { SOLUTIONS } from "../solutions";
import { buildRoom, WORLDS } from "../worlds";
import type { RoomMeta } from "../worlds";
import type { GameState } from "../../core/types";

const ROOMS: RoomMeta[] = WORLDS.find((w) => w.id === "w8")!.rooms;

/** Which verbs MUST be load-bearing in each room (the recombination it teaches).
 *  Removing any one from the BFS verb set must make the room unsolvable. */
const LOAD_BEARING: Record<string, Verb[]> = {
  w8r1: ["strike"],            // carry + strike over the chasm
  w8r2: ["strike", "deposit"], // carry + deposit + strike over the wider chasm
  w8r3: ["anchor", "strike"],  // anchor-climb + strike off the spire
};

const ALL_VERBS: Verb[] = ["move", "strike", "anchor", "deposit"];
// W8 pars run to ~10 moves over the four-verb set; 22 leaves headroom.
const solve = (s: GameState, verbs: Verb[]) => bfsSolve(s, verbs, 22);

describe("T-ROOM-SOLVE — World 8 (Recombination) finale rooms are solvable", () => {
  it("every World-8 room has a recorded solution", () => {
    const have = ROOMS.map((r) => r.id).sort();
    const recorded = have.filter((id) => SOLUTIONS[id] !== undefined);
    expect(recorded).toEqual(have);
  });

  for (const room of ROOMS) {
    const id = room.id;

    it(`${id} reaches 'won' on its recorded solution`, () => {
      const final = replay(buildRoom(room), SOLUTIONS[id] as Solution);
      expect(final.status).toBe("won");
    });

    it(`${id} par equals its recorded solution length`, () => {
      expect(room.par).toBe(SOLUTIONS[id].length);
    });

    it(`${id} is not yet won before its final move`, () => {
      const sol = SOLUTIONS[id];
      if (sol.length <= 1) return;
      const beforeLast = replay(buildRoom(room), sol.slice(0, -1) as Solution);
      expect(beforeLast.status).not.toBe("won");
    });

    it(`${id} is solvable by BFS, and the BFS-shortest matches the recorded par`, () => {
      const sol = solve(buildRoom(room), ALL_VERBS);
      expect(sol).not.toBeNull();
      expect(sol!.length).toBe(room.par);
    });

    for (const verb of LOAD_BEARING[id]) {
      it(`${id} is UNSOLVABLE without '${verb}' (recombination is load-bearing)`, () => {
        const reduced = ALL_VERBS.filter((v) => v !== verb);
        expect(solve(buildRoom(room), reduced)).toBeNull();
      });
    }
  }
});
