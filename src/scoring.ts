// Scoring — eggs (solve / hidden / constraint) + par, computed OUTSIDE the pure
// core (HLD §2.7, §4.5). These are PURE functions over the run TRACE the shell
// already keeps: the ordered snapshot stack (`GameState[]`, head state last) plus
// the input log (`{verb, dir}[]`). The core never knows scoring exists — purity,
// undo, and the `next === state` no-op identity are all unaffected.
//
// HIDDEN EGG — representation choice (load-bearing, no core change). The HLD §2.1
// lists an `egg` Entity flag, but adding one would force the core to decide how an
// egg cell behaves (block? grow? clear?) — a rule change for a pure SCORING marker.
// Instead the hidden egg is a plain COORDINATE (`RoomMeta.eggAt`) the shell tracks
// from the trace: the egg is "collected" iff any snake segment ever occupied that
// cell during the run. This needs ZERO core surface (no `egg` flag, no PRESETS row),
// exactly the task's preferred path. (Authors place a visible fruit at `eggAt` as
// the on-board lure; eating it is incidental — collection is purely positional.)

import type { GameState, Segment, Vec } from "./core/types";
import type { Constraint, RoomMeta } from "./levels/worlds";
import type { LoggedAction } from "./levels/replay";

/** The three eggs a room can yield (HLD §2.7). Each is a pure boolean over the run. */
export interface Eggs {
  /** (1) Solve: the run reached `won`. */
  solve: boolean;
  /** (2) Hidden: a marked off-path cell (`RoomMeta.eggAt`) was touched en route. */
  hidden: boolean;
  /** (3) Constraint: the room's optional per-room predicate held over the run. */
  constraint: boolean;
}

/** Did the run win? (Solve egg.) The trace's LAST state is the current state. */
export function solved(trace: GameState[]): boolean {
  return trace.length > 0 && trace[trace.length - 1].status === "won";
}

/** All bodies present in a co-op state: the active snake plus any other bodies
 *  (Inc 4b / World 7). A single-snake state has `bodies` absent, so this is just
 *  `[snake]` there — the kernel's `allBodies = [snake, ...(bodies ?? [])]`. */
function allBodies(s: GameState): Segment[][] {
  return [s.snake, ...(s.bodies ?? [])];
}

/** Was the hidden-egg cell `at` occupied by ANY segment of ANY body in ANY trace
 *  state? In a co-op room a NON-active body touching the cell collects the egg too
 *  (F2). A run that routes any body through the cell collects it; one that avoids it
 *  does not (T-EGG-HIDDEN). Purely positional — independent of whether the cell was
 *  a fruit. */
export function touchedHidden(trace: GameState[], at: Vec | undefined): boolean {
  if (at === undefined) return false;
  return trace.some((s) =>
    allBodies(s).some((body) => body.some((seg) => seg.x === at.x && seg.y === at.y)),
  );
}

/** Peak length for the `maxLength` constraint: the max length of any SINGLE body
 *  across the whole run (over the active snake AND every co-op body). The constraint
 *  bounds how long any one body grew, not the combined segment count. */
function peakLength(trace: GameState[]): number {
  let peak = 0;
  for (const s of trace) for (const body of allBodies(s)) peak = Math.max(peak, body.length);
  return peak;
}

/** Did the run use a `strike` (for the "no strike" constraint)? */
function usedStrike(inputs: LoggedAction[]): boolean {
  return inputs.some((a) => a.verb === "strike");
}

/**
 * Evaluate a room's constraint egg (HLD §2.7). A constraint with NO predicate
 * fields is vacuously satisfied on a solve. All present predicates must hold:
 *   - `maxMoves`:  effective move count <= maxMoves
 *   - `maxLength`: peak snake length    <= maxLength
 *   - `noStrike`:  the run used no strike
 * The constraint egg only counts on a SOLVED run.
 */
export function constraintMet(
  trace: GameState[],
  inputs: LoggedAction[],
  constraint: Constraint | undefined,
): boolean {
  if (constraint === undefined) return false; // no constraint egg in this room
  if (!solved(trace)) return false;
  if (constraint.maxMoves !== undefined && inputs.length > constraint.maxMoves) return false;
  if (constraint.maxLength !== undefined && peakLength(trace) > constraint.maxLength) return false;
  if (constraint.noStrike === true && usedStrike(inputs)) return false;
  return true;
}

/** The full egg verdict for a run of `room`, from its trace + input log. */
export function scoreRun(room: RoomMeta, trace: GameState[], inputs: LoggedAction[]): Eggs {
  const won = solved(trace);
  return {
    solve: won,
    // A hidden/constraint egg only "counts" on a solved run (you must complete the
    // room to bank it), and only if the room actually has one.
    hidden: won && room.hiddenEgg && touchedHidden(trace, room.eggAt),
    constraint: constraintMet(trace, inputs, room.constraint),
  };
}
