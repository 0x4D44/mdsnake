// T-ROOM-SOLVE (HLD §4.1) — World 6 "The Gullet". Every authored room is SOLVABLE:
// a recorded `(verb, dir)[]` input log (incl. `deposit`) replayed through the verbs
// reaches `status === 'won'` in exactly the room's par. World 6 introduces swallow &
// carry + deposit (and the shed-skin decoy as structure); the carry mechanic is
// LOAD-BEARING — an extra guard removes the block and asserts the room is unsolvable
// without it.

import { describe, expect, it } from "vitest";
import { buildState, deposit, DIRS, move, strike } from "../../core/game";
import { replay } from "../replay";
import type { Solution } from "../replay";
import { SOLUTIONS } from "../solutions";
import { WORLDS } from "../worlds";
import type { GameState, LevelDef } from "../../core/types";

const ROOMS = WORLDS.find((w) => w.id === "w6")!.rooms;
function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

/** A built state with every swallowable `object` block removed, isolating "can the
 *  room be solved WITHOUT the carry mechanic". If unsolvable, the block is
 *  load-bearing. */
function withoutBlocks(level: LevelDef): GameState {
  const s = buildState(level);
  const cells = new Map(s.cells);
  for (const [k, e] of s.cells) if (e.pickup === true) cells.delete(k);
  return { ...s, cells };
}

/** Exhaustive BFS over move+strike+deposit. Returns the shortest winning solution,
 *  or null. The state key includes head/body, carry presence, and deposited blocks
 *  so carry/deposit states are distinguished. */
function bfsSolve(start: GameState, maxDepth = 12): Solution | null {
  if (start.status === "won") return [];
  if (start.status === "dead") return null;
  const stateKey = (s: GameState) =>
    s.status +
    "|" +
    s.snake.map((p) => `${p.x},${p.y}${p.carry ? "*" : ""}`).join(";") +
    "|" +
    [...s.cells.entries()].filter(([, e]) => e.pickup).map(([k]) => k).sort().join(",");
  const verbs: { input: Solution[number]; fn: (s: GameState) => GameState }[] = [];
  for (const dn of ["up", "down", "left", "right"] as const) {
    verbs.push({ input: { verb: "move", dir: dn }, fn: (s) => move(s, DIRS[dn]) });
    verbs.push({ input: { verb: "strike", dir: dn }, fn: (s) => strike(s, DIRS[dn]) });
    verbs.push({ input: { verb: "deposit", dir: dn }, fn: (s) => deposit(s, DIRS[dn]) });
  }
  const seen = new Set<string>([stateKey(start)]);
  let frontier: { s: GameState; path: Solution }[] = [{ s: start, path: [] }];
  for (let d = 0; d < maxDepth; d++) {
    const next: { s: GameState; path: Solution }[] = [];
    for (const node of frontier) {
      for (const { input, fn } of verbs) {
        const ns = fn(node.s);
        if (ns === node.s) continue;
        const path = [...node.path, input];
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

describe("T-ROOM-SOLVE — World 6 (The Gullet) rooms are solvable", () => {
  it("every World-6 room has a recorded solution", () => {
    const have = ROOMS.map((r) => r.id).sort();
    const recorded = have.filter((id) => SOLUTIONS[id] !== undefined);
    expect(recorded).toEqual(have);
  });

  for (const room of ROOMS) {
    const id = room.id;
    it(`${id} is solvable by BFS, and the BFS-shortest matches the recorded par`, () => {
      const sol = bfsSolve(buildState(lookup(id).level));
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
      expect(bfsSolve(withoutBlocks(lookup(id).level))).toBeNull();
    });
  }
});
