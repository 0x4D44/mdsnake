// Scoring oracles (HLD §4.5): T-PAR, T-EGG-HIDDEN, T-EGG-CONSTRAINT.
//
// Scoring is PURE over the run trace (snapshot stack) + input log, computed OUTSIDE
// the core. These tests exercise that logic directly and over the real rooms.

import { describe, expect, it } from "vitest";
import { buildState } from "./core/game";
import { replay, trace } from "./levels/replay";
import type { LoggedAction } from "./levels/replay";
import { SOLUTIONS } from "./levels/solutions";
import { ALL_ROOMS, buildRoom, WORLDS } from "./levels/worlds";
import type { RoomMeta } from "./levels/worlds";
import {
  constraintMet,
  scoreRun,
  solved,
  touchedHidden,
} from "./scoring";
import type { GameState } from "./core/types";

// ---------------------------------------------------------------------------
// T-PAR (§4.5): for EVERY room, the recorded solution replayed reaches `won` in
// EXACTLY par moves. A red T-PAR under an engine change is a REGRESSION to
// investigate, not a re-record (PAR-STABILITY-POLICY).
// ---------------------------------------------------------------------------
describe("T-PAR — every room's recorded solve reaches won in exactly par", () => {
  it("every room has a recorded solution", () => {
    const ids = ALL_ROOMS.map((r) => r.id).sort();
    const recorded = ids.filter((id) => SOLUTIONS[id] !== undefined);
    expect(recorded).toEqual(ids);
  });

  for (const room of ALL_ROOMS) {
    it(`${room.id}: recorded solution wins in exactly par (${room.par})`, () => {
      const sol = SOLUTIONS[room.id];
      expect(sol).toBeDefined();
      // par == recorded length (achievable, author-asserted optimum).
      expect(sol.length).toBe(room.par);
      // Replaying the FULL solution reaches won. `buildRoom` builds the playable
      // state for ANY room — including a co-op (World 7) room's multi-body state,
      // which a bare `buildState(room.level)` (a single-snake projection) cannot.
      const final = replay(buildRoom(room), sol);
      expect(final.status).toBe("won");
      // ...and not before the final move (the win lands ON the par-th move).
      if (sol.length > 1) {
        const beforeLast = replay(buildRoom(room), sol.slice(0, -1));
        expect(beforeLast.status).not.toBe("won");
      }
    });
  }
});

// ---------------------------------------------------------------------------
// T-EGG-HIDDEN (§4.5): a scripted solution TOUCHING a marked egg cell flags it;
// one AVOIDING it does not.
// ---------------------------------------------------------------------------
describe("T-EGG-HIDDEN — hidden egg is positional over the trace", () => {
  // A small room with a fork: the egg sits on a shelf reachable by a detour.
  //   y=2: . . o      egg-lure @(2,2)
  //   y=1: 1 0 . X    head@1 ; exit@3
  //   y=0: # # # #
  const eggAt = { x: 2, y: 2 };
  function room(): GameState {
    return buildState({
      name: "egg", strikeRange: 1, floorY: 0,
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      cells: [
        { x: 0, y: 0, type: "wall" }, { x: 1, y: 0, type: "wall" },
        { x: 2, y: 0, type: "wall" }, { x: 3, y: 0, type: "wall" },
        { x: 3, y: 1, type: "exit" },
      ],
    });
  }

  it("touchedHidden is TRUE when a trace state occupies the egg cell", () => {
    // A trace that visits (2,2) at some point.
    const t: GameState[] = [
      room(),
      { ...room(), snake: [{ x: 2, y: 2 }, { x: 2, y: 1 }] }, // on the egg
      { ...room(), snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }] }, // moved on
    ];
    expect(touchedHidden(t, eggAt)).toBe(true);
  });

  it("touchedHidden is FALSE for a trace that never occupies the egg cell", () => {
    const t = trace(room(), [{ verb: "move", dir: "right" }, { verb: "move", dir: "right" }]);
    // The beeline never goes up to (2,2).
    expect(t.some((s) => s.snake.some((p) => p.x === 2 && p.y === 2))).toBe(false);
    expect(touchedHidden(t, eggAt)).toBe(false);
  });

  it("an undefined egg cell is never collected", () => {
    expect(touchedHidden([room()], undefined)).toBe(false);
  });

  it("scoreRun banks the hidden egg only on a SOLVED run that touched the cell", () => {
    const meta: RoomMeta = {
      id: "t", level: { name: "t", strikeRange: 1, floorY: 0, snake: [], cells: [] },
      par: 2, hiddenEgg: true, eggAt,
    };
    const won = { ...room(), status: "won" as const };
    const touchedWon: GameState[] = [room(), { ...room(), snake: [{ x: 2, y: 2 }] }, won];
    expect(scoreRun(meta, touchedWon, []).hidden).toBe(true);
    // Touched but NOT solved -> not banked.
    const touchedNotWon: GameState[] = [room(), { ...room(), snake: [{ x: 2, y: 2 }] }];
    expect(scoreRun(meta, touchedNotWon, []).hidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-EGG-COOP (F2): in a co-op room a hidden egg touched ONLY by a non-active body
// is still credited, and peak length is taken over ALL bodies (active + others).
// ---------------------------------------------------------------------------
describe("T-EGG-COOP — scoring iterates all co-op bodies", () => {
  const coopState = (
    snake: GameState["snake"],
    bodies: GameState["snake"][],
    status: GameState["status"] = "play",
  ): GameState => ({
    snake,
    bodies,
    cells: new Map(),
    strikeRange: 1,
    floorY: 0,
    status,
    name: "coop",
  });

  it("a hidden egg touched only by a NON-active body is credited", () => {
    const eggAt = { x: 5, y: 3 };
    // The active snake never visits (5,3); the OTHER body sits on it.
    const t: GameState[] = [
      coopState([{ x: 0, y: 1 }], [[{ x: 9, y: 9 }]]),
      coopState([{ x: 1, y: 1 }], [[{ x: 5, y: 3 }]]), // non-active body on the egg
    ];
    // Active body alone never touches it.
    expect(t.some((s) => s.snake.some((p) => p.x === 5 && p.y === 3))).toBe(false);
    expect(touchedHidden(t, eggAt)).toBe(true);
  });

  it("peak length is taken over ALL bodies, not just the active snake", () => {
    // Active snake stays length 2; a co-op body grows to length 4.
    const t: GameState[] = [
      coopState([{ x: 0, y: 0 }, { x: 1, y: 0 }], [[{ x: 0, y: 5 }, { x: 1, y: 5 }]]),
      coopState(
        [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        [[{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }]],
      ),
    ];
    // A constraint never counts on an unsolved run, independent of length.
    // (The co-op peak-length logic itself is pinned by the won-trace pair below.)
    expect(constraintMet(t, [], { label: "x", maxLength: 4 })).toBe(false);
    const tWon: GameState[] = [
      t[0],
      coopState(
        [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        [[{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }]],
        "won",
      ),
    ];
    expect(constraintMet(tWon, [], { label: "x", maxLength: 4 })).toBe(true);
    expect(constraintMet(tWon, [], { label: "x", maxLength: 3 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-EGG-CONSTRAINT (§4.5): the constraint predicate is true for a compliant solve,
// false for a violating one (maxMoves / maxLength / noStrike).
// ---------------------------------------------------------------------------
describe("T-EGG-CONSTRAINT — per-room constraint predicate", () => {
  const wonTrace = (lengths: number[]): GameState[] =>
    lengths.map((n, i) => ({
      snake: Array.from({ length: n }, (_, j) => ({ x: j, y: 0 })),
      cells: new Map(),
      strikeRange: 1,
      floorY: 0,
      status: i === lengths.length - 1 ? ("won" as const) : ("play" as const),
      name: "c",
    }));
  const mv = (verb: LoggedAction["verb"]): LoggedAction => ({ verb, dir: "right" });

  it("maxMoves: compliant within the limit, violated beyond it", () => {
    const trace = wonTrace([2, 2, 2]);
    expect(constraintMet(trace, [mv("move"), mv("move")], { label: "x", maxMoves: 3 })).toBe(true);
    expect(constraintMet(trace, [mv("move"), mv("move"), mv("move"), mv("move")], { label: "x", maxMoves: 3 })).toBe(false);
  });

  it("maxLength: peak length over the WHOLE run is what counts", () => {
    // Grows to length 4 mid-run then... still violates a maxLength of 3.
    const grew = wonTrace([2, 4, 3]);
    expect(constraintMet(grew, [], { label: "x", maxLength: 3 })).toBe(false);
    const stayed = wonTrace([2, 2, 2]);
    expect(constraintMet(stayed, [], { label: "x", maxLength: 2 })).toBe(true);
  });

  it("noStrike: violated if the run used a strike", () => {
    const t = wonTrace([2, 2]);
    expect(constraintMet(t, [mv("move")], { label: "x", noStrike: true })).toBe(true);
    expect(constraintMet(t, [mv("strike")], { label: "x", noStrike: true })).toBe(false);
  });

  it("a constraint is NOT met on an unsolved run", () => {
    const notWon: GameState[] = [{ ...wonTrace([2])[0], status: "play" }];
    expect(constraintMet(notWon, [], { label: "x", maxMoves: 5 })).toBe(false);
  });

  it("no constraint -> constraintMet is false (no egg to earn)", () => {
    expect(constraintMet(wonTrace([2]), [], undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real-room constraint eggs: each room that DECLARES a constraint is achievable
// (its recorded solve satisfies the constraint). This keeps the authored
// constraints honest against the engine.
// ---------------------------------------------------------------------------
describe("authored constraint eggs are achievable by the recorded solve", () => {
  const constrained = ALL_ROOMS.filter((r) => r.constraint !== undefined);
  it("there is at least one constrained room", () => {
    expect(constrained.length).toBeGreaterThan(0);
  });
  for (const room of constrained) {
    it(`${room.id} satisfies "${room.constraint!.label}" on its recorded solve`, () => {
      const t = trace(buildRoom(room), SOLUTIONS[room.id]);
      expect(solved(t)).toBe(true);
      expect(constraintMet(t, SOLUTIONS[room.id], room.constraint)).toBe(true);
    });
  }
});

// Touch WORLDS to keep the import meaningful (room count sanity).
describe("scoring wiring", () => {
  it("covers every world's rooms", () => {
    expect(ALL_ROOMS.length).toBe(WORLDS.reduce((n, w) => n + w.rooms.length, 0));
  });
});
