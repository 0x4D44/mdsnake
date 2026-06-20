// T-ROOM-SOLVE (HLD §4.1) — World 3 "The Climb". Every authored room is SOLVABLE:
// a recorded `(verb, dir)[]` input log (now including the directionless `anchor`
// toggle) replayed reaches `status === 'won'`. "Solvable" is the machine floor.
//
// World 3 introduces the anchor verb; these rooms are GATED on it — every recorded
// solution uses `anchor`, and an extra test asserts each room is UNSOLVABLE with
// move/strike alone (an exhaustive BFS over move+strike finds no win), proving the
// anchor mechanic is load-bearing here, not decorative.
//
// Each room's `par` (in worlds.ts) == its recorded solution length, and the
// honest-par guard asserts the win lands on the final move.

import { describe, expect, it } from "vitest";
import { anchor, buildState, DIRS, move, strike } from "../../core/game";
import { a, k, m, replay } from "../replay";
import type { Solution } from "../replay";
import { WORLDS } from "../worlds";
import type { GameState, LevelDef } from "../../core/types";

// Recorded optimal solutions, keyed by room id. `a()` is the anchor toggle.
const SOLUTIONS: Record<string, Solution> = {
  // R1 First Grip: one free step up (still grounded), then climb by re-anchoring
  // the head beside the wall after each up-move, then step onto the exit.
  w3r1: [m("up"), a(), m("up"), a(), m("up"), m("left")],
  // R2 Ascent: the same climb rhythm, one cell taller (three anchored steps).
  w3r2: [m("up"), a(), m("up"), a(), m("up"), a(), m("up"), m("left")],
  // R3 Traverse: bring the head beside the wall, climb, then step off onto the ledge.
  w3r3: [m("left"), m("up"), a(), m("up"), a(), m("up"), m("right")],
  // R4 Release (twist): climb the wall, then strike the head off it across the void
  // to the exit (release-timing).
  w3r4: [m("left"), m("up"), a(), m("up"), a(), m("up"), k("right")],
  // R5 Graduation: climb, strike across the gap onto the lip, step onto the exit.
  w3r5: [m("left"), m("up"), a(), m("up"), a(), m("up"), k("right"), m("right")],
};

const ROOMS = WORLDS.find((w) => w.id === "w3")!.rooms;
function lookup(id: string): { level: LevelDef; par: number } {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

/** Exhaustive BFS over move+strike ONLY (no anchor). Returns true if any win is
 *  reachable — used to prove the anchor mechanic is required. */
function solvableWithoutAnchor(start: GameState, maxDepth = 20): boolean {
  void anchor; // anchor deliberately excluded from the verb set below
  const key = (s: GameState) => s.status + "|" + s.snake.map((p) => `${p.x},${p.y},${p.anchored ? 1 : 0}`).join(";");
  const seen = new Set<string>([key(start)]);
  let frontier: GameState[] = [start];
  const verbs: ((s: GameState) => GameState)[] = [
    (s) => move(s, DIRS.up), (s) => move(s, DIRS.down),
    (s) => move(s, DIRS.left), (s) => move(s, DIRS.right),
    (s) => strike(s, DIRS.up), (s) => strike(s, DIRS.down),
    (s) => strike(s, DIRS.left), (s) => strike(s, DIRS.right),
  ];
  for (let d = 0; d < maxDepth; d++) {
    const next: GameState[] = [];
    for (const node of frontier) for (const fn of verbs) {
      const ns = fn(node);
      if (ns === node) continue;
      if (ns.status === "won") return true;
      if (ns.status === "dead") continue;
      const kk = key(ns);
      if (seen.has(kk)) continue;
      seen.add(kk); next.push(ns);
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return false;
}

describe("T-ROOM-SOLVE — World 3 (The Climb) rooms are solvable", () => {
  it("every World-3 room has a recorded solution", () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(ROOMS.map((r) => r.id).sort());
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

    it(`${id} uses the anchor verb`, () => {
      expect(SOLUTIONS[id].some((s) => s.verb === "anchor")).toBe(true);
    });

    it(`${id} is UNSOLVABLE without the anchor verb (mechanic is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(solvableWithoutAnchor(buildState(level))).toBe(false);
    });
  }
});
