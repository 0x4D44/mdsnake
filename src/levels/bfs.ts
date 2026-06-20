// Shared room-solver BFS for the per-world T-ROOM-SOLVE / T-PAR oracles.
//
// Every world's `rooms.test.ts` needs the SAME thing: an exhaustive breadth-first
// search over the sim core's verbs that returns the shortest winning input log (or
// null). Five worlds (3/4/6/7/8) previously each carried a near-identical local
// copy; this is the one canonical solver they all import — a real, stable
// duplication, so it belongs in one place.
//
// Two knobs cover every world's needs:
//   - `verbs`: which verbs the search may use. Directional verbs
//     (move/strike/deposit) expand into the four DIRS; the directionless toggles
//     (`anchor`, `switch`) are tried once. Restricting this set is exactly the
//     "is mechanic X load-bearing" probe (drop a verb, assert unsolvable).
//   - `maxDepth`: BFS depth bound (par is small; keep this just above the longest par).
//
// STATE KEY (correctness): the key is a SUPERSET of every distinguishing feature any
// world uses — head/body geometry, per-segment `anchored` + `carry` presence, the
// other co-op `bodies`, pressed `triggers`, and the set of remaining `pickup` cells.
// A superset key is always safe for BFS: it never merges two genuinely different
// states (which would risk missing a win), at worst it explores a few redundant
// nodes. Keeping ONE comprehensive key removes the bug-prone per-world hand-tuning.

import { anchor, deposit, DIRS, move, strike, switchBody } from "../core/game";
import type { GameState } from "../core/types";
import type { Input, Solution, Verb } from "./replay";

const DIR_NAMES = ["up", "down", "left", "right"] as const;

/** Apply one input to a state via the real core verbs (mirrors `replay`). */
function apply(s: GameState, i: Input): GameState {
  switch (i.verb) {
    case "anchor":
      return anchor(s);
    case "switch":
      return switchBody(s);
    case "deposit":
      return deposit(s, DIRS[i.dir!]);
    case "move":
      return move(s, DIRS[i.dir!]);
    case "strike":
      return strike(s, DIRS[i.dir!]);
  }
}

/** Expand a verb set into the concrete inputs the BFS branches on: directional
 *  verbs fan out over the four directions; `anchor`/`switch` are single toggles. */
function expand(verbs: Verb[]): Input[] {
  const out: Input[] = [];
  for (const verb of verbs) {
    if (verb === "anchor" || verb === "switch") out.push({ verb });
    else for (const dir of DIR_NAMES) out.push({ verb, dir });
  }
  return out;
}

/** A canonical, superset state key (see file header). */
export function stateKey(s: GameState): string {
  const seg = (p: { x: number; y: number; anchored?: boolean; carry?: unknown }) =>
    `${p.x},${p.y}${p.anchored ? "A" : ""}${p.carry ? "*" : ""}`;
  const active = s.snake.map(seg).join(";");
  const others = (s.bodies ?? []).map((b) => b.map(seg).join(";")).join("/");
  const pickups = [...s.cells.entries()]
    .filter(([, e]) => e.pickup === true)
    .map(([k]) => k)
    .sort()
    .join(",");
  const triggers = [...(s.triggers ?? [])].sort().join(",");
  return `${s.status}|${active}|${others}|${pickups}|${triggers}`;
}

/** Exhaustive BFS over the chosen verb set. Returns the SHORTEST winning input log
 *  (empty if already won), or null if no win is reachable within `maxDepth`. */
export function bfsSolve(start: GameState, verbs: Verb[], maxDepth = 24): Solution | null {
  if (start.status === "won") return [];
  if (start.status === "dead") return null;
  const inputs = expand(verbs);
  const seen = new Set<string>([stateKey(start)]);
  let frontier: { s: GameState; path: Solution }[] = [{ s: start, path: [] }];
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: { s: GameState; path: Solution }[] = [];
    for (const node of frontier) {
      for (const input of inputs) {
        const ns = apply(node.s, input);
        if (ns === node.s) continue; // no-op (rejected/blocked) — don't branch
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
