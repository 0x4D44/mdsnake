// CORE-REGRESSION-HEAT (HLD §4.3, §2.2.7) — heat is RENDERER-ONLY and BYTE-INERT
// to the sim core.
//
// World 5 "Dark" adds the `heat` flag and the `heatlamp` preset, read SOLELY by
// the renderer to decide what stays lit in the dark. The core must not change at
// all. This oracle proves it MECHANICALLY: take a known room, sprinkle heat cells
// into every empty cell touched (and beside) the solution path, and assert the
// WHOLE solve trace — every intermediate GameState, snake-by-snake and cell-by-cell
// — is byte-identical to the no-heat run. If any rule (collision / gravity / win)
// ever read `heat`, a sprinkled cell would perturb the trace and this goes red.
//
// This is the directed core counterpart to the per-room form in
// `levels/world5/rooms.test.ts` (which strips heat and re-solves).

import { describe, expect, it } from "vitest";
import { buildState, DIRS, key, move, strike } from "./game";
import type { CellType, GameState, LevelDef } from "./types";

const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const heat = (x: number, y: number) => ({ x, y, type: "heatlamp" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};

// A known room exercising move + eat + strike-over-gap + gravity + exit/void — the
// full v1 vocabulary, so every rule call-site is hit by the trace.
function baseLevel(): LevelDef {
  return {
    name: "heat-regression",
    strikeRange: 3,
    floorY: 0,
    snake: [
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ],
    cells: [
      ...floorRow(0, 0, 4),
      ...floorRow(0, 7, 11),
      { x: 4, y: 1, type: "fruit" },
      { x: 11, y: 1, type: "exit" },
    ],
  };
}

// The recorded solution: walk to the fruit, strike the gap, walk to the exit.
const VERBS: ((s: GameState) => GameState)[] = [
  (s) => move(s, DIRS.right),
  (s) => move(s, DIRS.right),
  (s) => strike(s, DIRS.right),
  (s) => move(s, DIRS.right),
  (s) => move(s, DIRS.right),
  (s) => move(s, DIRS.right),
  (s) => move(s, DIRS.right),
];

/** Sprinkle a heat lamp into a set of cells that are EMPTY in `level` (so we never
 *  collide with an existing entity), covering the whole region the snake traverses,
 *  including cells it stands on, the gap it strikes over, and the row above. */
function sprinkleHeat(level: LevelDef): LevelDef {
  const occupied = new Set(level.cells.map((c) => key({ x: c.x, y: c.y })));
  const extra: LevelDef["cells"] = [];
  for (let x = 0; x <= 11; x++) {
    for (let y = 0; y <= 3; y++) {
      const k = key({ x, y });
      if (!occupied.has(k)) {
        extra.push(heat(x, y));
        occupied.add(k);
      }
    }
  }
  return { ...level, cells: [...level.cells, ...extra] };
}

/** Run the full solution, capturing the snapshot AFTER each verb. */
function trace(level: LevelDef): GameState[] {
  const states: GameState[] = [];
  let s = buildState(level);
  states.push(s);
  for (const v of VERBS) {
    s = v(s);
    states.push(s);
  }
  return states;
}

/** Normalise a state for comparison: drop heat cells (they exist only in the
 *  sprinkled run) and drop the `triggers` set (mechanism-free here). What remains
 *  is everything the RULES produce — snake, status, the non-heat cell map. */
function ruleView(s: GameState) {
  const cells: Record<string, unknown> = {};
  for (const [k, e] of s.cells) {
    if (e.kind === "heatlamp") continue; // renderer-only; not a rule output
    cells[k] = { ...e };
  }
  return {
    snake: s.snake.map((seg) => ({ ...seg })),
    status: s.status,
    strikeRange: s.strikeRange,
    floorY: s.floorY,
    cells,
  };
}

describe("CORE-REGRESSION-HEAT — heat cells are byte-inert to the rules", () => {
  it("the base room solves (sanity: the trace ends 'won')", () => {
    const t = trace(baseLevel());
    expect(t[t.length - 1].status).toBe("won");
  });

  it("the whole solve trace is identical with heat sprinkled everywhere vs none", () => {
    const lit = trace(baseLevel()).map(ruleView);
    const dark = trace(sprinkleHeat(baseLevel())).map(ruleView);
    expect(dark).toEqual(lit);
  });

  it("the snake never collides with, eats, wins on, or stands on a heat cell", () => {
    // A direct proof of inertness: even with a heat lamp in every empty cell, the
    // snake walks/strikes THROUGH them and falls THROUGH them exactly as in open
    // air — the final win is reached, not blocked, not short-circuited.
    const final = trace(sprinkleHeat(baseLevel()));
    expect(final[final.length - 1].status).toBe("won");
  });
});
