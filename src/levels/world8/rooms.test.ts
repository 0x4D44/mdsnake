// T-ROOM-SOLVE (HLD §4.1) — World 8 "Recombination", the FINALE. Every authored
// room is SOLVABLE: a recorded `(verb, dir)[]` input log (move/strike/anchor/
// deposit) replayed reaches `status === 'won'`. The finale recombines ONLY shipped
// abilities (no new model); each room's combined mechanics are LOAD-BEARING — a
// per-room guard removes a verb from the BFS and asserts the room is then
// unsolvable, proving the recombination is the point.
//
// Honest par: each room's `par` (in worlds.ts) is the BFS-shortest solution over
// the full verb set, and equals the recorded solution length.

import { describe, expect, it } from "vitest";
import { anchor, deposit, DIRS, move, strike } from "../../core/game";
import { replay } from "../replay";
import type { Solution, Verb } from "../replay";
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

type Step = { verb: Verb; dir?: "up" | "down" | "left" | "right" };
function apply(s: GameState, i: Step): GameState {
  if (i.verb === "anchor") return anchor(s);
  if (i.verb === "switch") return s; // no co-op bodies in W8; switch is a no-op
  if (i.verb === "deposit") return deposit(s, DIRS[i.dir!]);
  return (i.verb === "move" ? move : strike)(s, DIRS[i.dir!]);
}

const stateKey = (s: GameState) =>
  s.status +
  "|" +
  s.snake.map((p) => `${p.x},${p.y}${p.anchored ? "A" : ""}${p.carry ? "*" : ""}`).join(";") +
  "|" +
  [...s.cells.entries()].filter(([, e]) => e.pickup === true).map(([k]) => k).sort().join(",");

/** Exhaustive BFS over a chosen verb set. Returns the shortest winning solution. */
function bfsSolve(start: GameState, verbSet: Verb[], maxDepth = 22): Step[] | null {
  if (start.status === "won") return [];
  if (start.status === "dead") return null;
  const verbs: Step[] = [];
  for (const verb of verbSet) {
    if (verb === "anchor") verbs.push({ verb });
    else for (const dir of ["up", "down", "left", "right"] as const) verbs.push({ verb, dir });
  }
  const seen = new Set<string>([stateKey(start)]);
  let frontier: { s: GameState; path: Step[] }[] = [{ s: start, path: [] }];
  for (let d = 0; d < maxDepth; d++) {
    const next: { s: GameState; path: Step[] }[] = [];
    for (const node of frontier) {
      for (const v of verbs) {
        const ns = apply(node.s, v);
        if (ns === node.s) continue;
        const path = [...node.path, v];
        if (ns.status === "won") return path;
        if (ns.status === "dead") continue;
        const kk = stateKey(ns);
        if (seen.has(kk)) continue;
        seen.add(kk);
        next.push({ s: ns, path });
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}

const ALL_VERBS: Verb[] = ["move", "strike", "anchor", "deposit"];

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
      const sol = bfsSolve(buildRoom(room), ALL_VERBS);
      expect(sol).not.toBeNull();
      expect(sol!.length).toBe(room.par);
    });

    for (const verb of LOAD_BEARING[id]) {
      it(`${id} is UNSOLVABLE without '${verb}' (recombination is load-bearing)`, () => {
        const reduced = ALL_VERBS.filter((v) => v !== verb);
        expect(bfsSolve(buildRoom(room), reduced)).toBeNull();
      });
    }
  }
});
