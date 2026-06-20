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
// Each room's `par` (in worlds.ts) == its recorded solution length (honest par),
// and the win must land on the FINAL move, not before.

import { describe, expect, it } from "vitest";
import { buildState, DIRS, move, strike } from "../../core/game";
import { k, m, replay } from "../replay";
import type { Solution } from "../replay";
import { WORLDS } from "../worlds";
import type { Entity, GameState, LevelDef } from "../../core/types";

// Recorded BFS-optimal solutions, keyed by room id.
const SOLUTIONS: Record<string, Solution> = {
  // R1 First Press: walk onto the plate, through the (now-open, then occupied)
  // gate, onto the exit.
  w4r1: [m("right"), m("right"), m("right")],
  // R2 Bridge of Self: the length-3 body spans plate->gate as it advances, so a
  // rear segment holds the plate while the head crosses the open gate.
  w4r2: [m("right"), m("right"), m("right")],
  // R3 Hold and Climb: strike to the shaft foot, step onto the plate (gate opens),
  // strike up through the open gate to the exit (win mid-flight).
  w4r3: [k("right"), m("up"), k("up")],
  // R4 Two Doors: press g1, then thread both id-keyed gates to the exit.
  w4r4: [m("right"), k("right"), k("right")],
  // R5 Pressure Chamber: grow, hold g1 with a body segment, thread both gates.
  w4r5: [k("right"), m("up"), m("left"), m("up"), k("up"), m("right"), k("up")],
};

const ROOMS = WORLDS.find((w) => w.id === "w4")!.rooms;
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

/** Exhaustive BFS over move+strike. Returns true if any win is reachable. */
function solvable(start: GameState, maxDepth = 26): boolean {
  if (start.status === "won") return true;
  if (start.status === "dead") return false;
  const key = (s: GameState) =>
    s.status + "|" + s.snake.map((p) => `${p.x},${p.y}`).join(";") + "|" + [...(s.triggers ?? [])].sort().join(",");
  const seen = new Set<string>([key(start)]);
  let frontier: GameState[] = [start];
  const verbs: ((s: GameState) => GameState)[] = [
    (s) => move(s, DIRS.up), (s) => move(s, DIRS.down), (s) => move(s, DIRS.left), (s) => move(s, DIRS.right),
    (s) => strike(s, DIRS.up), (s) => strike(s, DIRS.down), (s) => strike(s, DIRS.left), (s) => strike(s, DIRS.right),
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

describe("T-ROOM-SOLVE — World 4 (Pressure) rooms are solvable", () => {
  it("every World-4 room has a recorded solution", () => {
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

    it(`${id} is UNSOLVABLE with every gate pinned solid (mechanic is load-bearing)`, () => {
      const { level } = lookup(id);
      expect(solvable(pinGatesSolid(level))).toBe(false);
    });
  }
});
