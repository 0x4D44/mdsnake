// Shared replay/solve helper for room oracles (HLD §4.1 T-ROOM-SOLVE, §4.5 T-PAR).
//
// A room's recorded solution is an INPUT LOG: a `(verb, dir)[]` move sequence
// (NOT the snapshot stack — F3). This pure helper replays such a log through the
// sim core's `move`/`strike` verbs and returns the resulting state, so a test can
// assert `status === 'won'`. The record-par shell tool serializes exactly this
// shape; here it is the test-side replay counterpart.

import { anchor, DIRS, move, strike } from "../core/game";
import type { GameState } from "../core/types";

export type DirName = keyof typeof DIRS;
export type Verb = "move" | "strike" | "anchor";
export interface Input {
  verb: Verb;
  /** Ignored for the directionless `anchor` toggle. */
  dir?: DirName;
}
export type Solution = Input[];

/** Replay a recorded input log through the verbs, returning the final state.
 *  `move`/`strike` consume a direction; `anchor` is the directionless toggle
 *  (HLD §2.2.4) and ignores `dir`. */
export function replay(start: GameState, solution: Solution): GameState {
  let s = start;
  for (const { verb, dir } of solution) {
    if (verb === "anchor") {
      s = anchor(s);
    } else {
      s = (verb === "move" ? move : strike)(s, DIRS[dir as DirName]);
    }
  }
  return s;
}

/** Convenience for authored solutions: `m("right")` move, `k("up")` strike,
 *  `a()` anchor (directionless). */
export const m = (dir: DirName): Input => ({ verb: "move", dir });
export const k = (dir: DirName): Input => ({ verb: "strike", dir });
export const a = (): Input => ({ verb: "anchor" });
