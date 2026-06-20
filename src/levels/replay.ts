// Shared replay/solve helper for room oracles (HLD §4.1 T-ROOM-SOLVE, §4.5 T-PAR).
//
// A room's recorded solution is an INPUT LOG: a `(verb, dir)[]` move sequence
// (NOT the snapshot stack — F3). This pure helper replays such a log through the
// sim core's `move`/`strike` verbs and returns the resulting state, so a test can
// assert `status === 'won'`. The record-par shell tool serializes exactly this
// shape; here it is the test-side replay counterpart.

import { anchor, deposit, DIRS, move, strike, switchBody } from "../core/game";
import type { GameState } from "../core/types";

export type DirName = keyof typeof DIRS;
export type Verb = "move" | "strike" | "anchor" | "deposit" | "switch";
export interface Input {
  verb: Verb;
  /** Ignored for the directionless `anchor` toggle and the `switch` (Tab) action. */
  dir?: DirName;
}
export type Solution = Input[];

/** The shell's logged action — the same shape as a replay `Input`. The undo
 *  snapshot stack and the input log push/pop this in lockstep; record-par
 *  serializes it; scoring (`scoreRun`) reads it. `move`/`strike`/`deposit` carry a
 *  direction; `anchor` is directionless. */
export type LoggedAction = Input;

/** Replay a recorded input log through the verbs, returning the final state.
 *  `move`/`strike`/`deposit` consume a direction; `anchor` is the directionless
 *  toggle (HLD §2.2.4) and ignores `dir`. */
export function replay(start: GameState, solution: Solution): GameState {
  let s = start;
  for (const { verb, dir } of solution) {
    if (verb === "anchor") {
      s = anchor(s);
    } else if (verb === "switch") {
      s = switchBody(s); // Inc 4b: Tab cycles the active co-op body
    } else if (verb === "deposit") {
      s = deposit(s, DIRS[dir as DirName]);
    } else {
      s = (verb === "move" ? move : strike)(s, DIRS[dir as DirName]);
    }
  }
  return s;
}

/** Replay a log step by step, returning the TRACE: the start state plus every
 *  state after each input. The trace is what scoring reads (HLD §4.5) — exactly
 *  what the shell's undo stack accumulates. No-op inputs are kept as repeated
 *  states here; the shell never logs no-ops, so a recorded solution has none. */
export function trace(start: GameState, solution: Solution): GameState[] {
  const out: GameState[] = [start];
  let s = start;
  for (const input of solution) {
    s = replay(s, [input]);
    out.push(s);
  }
  return out;
}

/** Convenience for authored solutions: `m("right")` move, `k("up")` strike,
 *  `a()` anchor (directionless), `d("up")` deposit. */
export const m = (dir: DirName): Input => ({ verb: "move", dir });
export const k = (dir: DirName): Input => ({ verb: "strike", dir });
export const a = (): Input => ({ verb: "anchor" });
export const d = (dir: DirName): Input => ({ verb: "deposit", dir });
export const sw = (): Input => ({ verb: "switch" });
