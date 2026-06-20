// T-ROOM-SOLVE (HLD §4.1, multi-body) — World 7 "Two Bodies". Every authored co-op
// room is SOLVABLE: a recorded `(verb, dir)[]` input log INCLUDING `switch` (Tab)
// replayed through the verbs reaches `status === 'won'` (ALL heads on exits, the
// multi-body checkEnd authority). World 7 teaches body-switching + relay; both Tab
// and the rooms' gate mechanisms are LOAD-BEARING — extra guards assert each room
// is unsolvable without Tab (only one body can ever move), proving co-op is the
// point of the world, not decoration.
//
// Honest par: each room's `par` (in worlds.ts) is the BFS-shortest solution over
// move + strike + switch, and equals the recorded solution length.

import { describe, expect, it } from "vitest";
import { DIRS, move, strike, switchBody } from "../../core/game";
import { replay } from "../replay";
import type { Solution } from "../replay";
import { SOLUTIONS } from "../solutions";
import { buildRoom, WORLDS } from "../worlds";
import type { RoomMeta } from "../worlds";
import type { GameState } from "../../core/types";

const ROOMS: RoomMeta[] = WORLDS.find((w) => w.id === "w7")!.rooms;

type Step = { verb: "move" | "strike" | "switch"; dir?: "up" | "down" | "left" | "right" };
function apply(s: GameState, i: Step): GameState {
  if (i.verb === "switch") return switchBody(s);
  return (i.verb === "move" ? move : strike)(s, DIRS[i.dir!]);
}

const stateKey = (s: GameState) =>
  s.status +
  "|" +
  s.snake.map((p) => `${p.x},${p.y}`).join(";") +
  "|" +
  (s.bodies ?? []).map((b) => b.map((p) => `${p.x},${p.y}`).join(";")).join("/");

/** Exhaustive BFS over move+strike (+switch when allowed). Returns the shortest
 *  winning solution, or null. With `useSwitch=false` only the active body can move,
 *  which is the "is Tab load-bearing" probe. */
function bfsSolve(start: GameState, useSwitch: boolean, maxDepth = 24): Step[] | null {
  if (start.status === "won") return [];
  if (start.status === "dead") return null;
  const verbs: Step[] = [];
  for (const verb of ["move", "strike"] as const)
    for (const dir of ["up", "down", "left", "right"] as const) verbs.push({ verb, dir });
  if (useSwitch) verbs.push({ verb: "switch" });
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

describe("T-ROOM-SOLVE — World 7 (Two Bodies) co-op rooms are solvable", () => {
  it("every World-7 room has a recorded solution", () => {
    const have = ROOMS.map((r) => r.id).sort();
    const recorded = have.filter((id) => SOLUTIONS[id] !== undefined);
    expect(recorded).toEqual(have);
  });

  it("every World-7 room is flagged co-op and carries a multi-body build", () => {
    for (const room of ROOMS) {
      expect(room.coop, `${room.id} coop`).toBe(true);
      expect(room.build, `${room.id} build`).toBeTypeOf("function");
      // The build produces a genuine multi-body state (bodies present, non-empty).
      const s = buildRoom(room);
      expect(s.bodies, `${room.id} bodies present`).toBeDefined();
      expect(s.bodies!.length, `${room.id} >=1 other body`).toBeGreaterThanOrEqual(1);
    }
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
      const sol = bfsSolve(buildRoom(room), true);
      expect(sol).not.toBeNull();
      expect(sol!.length).toBe(room.par);
    });

    it(`${id} uses the Tab body-switch`, () => {
      expect(SOLUTIONS[id].some((s) => s.verb === "switch")).toBe(true);
    });

    it(`${id} is UNSOLVABLE without Tab (co-op switching is load-bearing)`, () => {
      expect(bfsSolve(buildRoom(room), false)).toBeNull();
    });
  }
});
