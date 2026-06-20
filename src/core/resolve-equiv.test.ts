// T-RESOLVE-EQUIV (HLD §4.3 / D21) — the resolve-tail extraction is
// behaviour-preserving.
//
// At Inc 3 the post-action tail was extracted into a shared
//   resolve(s) = checkEnd(applyMechanisms(settle(s)))
// (mechanisms a no-op at this stage). This oracle proves that extraction did NOT
// change observable behaviour, by differential testing the WHOLE verb end-to-end
// against a comparand that genuinely PREDATES the change: `core/game.legacy.ts`,
// a frozen verbatim copy of the kernel as it stood immediately before the tail
// was extracted (its `move`/`strike` call the old inline `settle(...)` tail).
//
// Method (M4 — compare like-with-like): for each state in a corpus, assert
//   OLD.move(s, d)   deep-equals NEW.move(s, d)
//   OLD.strike(s, d) deep-equals NEW.strike(s, d)
// for every direction. The corpus is (a) a seeded, deterministic fast-check
// Arbitrary<GameState> over small grids and (b) the committed fixed adversarial
// CORPUS-INC1 + pinned regression seeds. Because the comparand predates the
// extraction, a green here is unambiguous evidence the refactor is a no-op.
//
// fast-check is a TEST-ONLY devDependency, introduced at Inc 3 (FASTCHECK-INC3).

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildState, move as newMove, strike as newStrike, DIRS, key } from "./game";
import { move as oldMove, strike as oldStrike } from "./game.legacy";
import { PRESETS } from "./types";
import type { CellType, Dir, Entity, GameState, EntityKind, LevelDef } from "./types";

const ALL_DIRS: { name: string; dir: Dir }[] = [
  { name: "up", dir: DIRS.up },
  { name: "down", dir: DIRS.down },
  { name: "left", dir: DIRS.left },
  { name: "right", dir: DIRS.right },
];

// --- Map-aware deep equality for GameState (self-contained; the oracle must not
//     borrow the kernel's own notion of equality) -----------------------------
function deepEqual(a: GameState, b: GameState): boolean {
  if (a.status !== b.status) return false;
  if (a.strikeRange !== b.strikeRange) return false;
  if (a.floorY !== b.floorY) return false;
  if (a.name !== b.name) return false;
  if (a.snake.length !== b.snake.length) return false;
  for (let i = 0; i < a.snake.length; i++) {
    if (a.snake[i].x !== b.snake[i].x || a.snake[i].y !== b.snake[i].y) return false;
    if (Boolean(a.snake[i].anchored) !== Boolean(b.snake[i].anchored)) return false;
  }
  if (a.cells.size !== b.cells.size) return false;
  for (const [k, v] of a.cells) {
    // Presets are frozen singletons, so referential identity is the right test
    // and both kernels read from the SAME PRESETS table.
    if (b.cells.get(k) !== v) return false;
  }
  return true;
}

// --- A seeded, deterministic Arbitrary<GameState> over small grids -----------
//
// We generate a RAW state (not via buildState) so the verbs receive an
// unsettled, possibly-mid-air configuration — the very situations where the
// extracted tail's settle/checkEnd ordering could diverge if the refactor were
// wrong. The grid is tiny (W in [3..5], H in [3..5]) so the corpus is dense and
// shrinking is cheap; entities are placed BY PRESET NAME only (F6).

const GRID_MIN = 3;
const GRID_MAX = 5;
const PRESET_KINDS: EntityKind[] = ["wall", "fruit", "exit", "anchor"];

interface RawCell {
  x: number;
  y: number;
  kind: EntityKind | "empty";
}

const stateArb: fc.Arbitrary<GameState> = fc
  .record({
    w: fc.integer({ min: GRID_MIN, max: GRID_MAX }),
    h: fc.integer({ min: GRID_MIN, max: GRID_MAX }),
    floorY: fc.constant(0),
    strikeRange: fc.integer({ min: 1, max: 4 }),
    // snake: 1..3 ordered segments inside the grid, as flat indices we later
    // de-duplicate (overlapping picks collapse to a shorter snake — still valid
    // input for both kernels, which is all the oracle needs).
    snakeLen: fc.integer({ min: 1, max: 3 }),
  })
  .chain(({ w, h, floorY, strikeRange, snakeLen }) => {
    const coordArb = fc.record({
      x: fc.integer({ min: 0, max: w - 1 }),
      y: fc.integer({ min: 0, max: h - 1 }),
    });
    const cellArb: fc.Arbitrary<RawCell> = fc.record({
      x: fc.integer({ min: 0, max: w - 1 }),
      y: fc.integer({ min: 0, max: h - 1 }),
      kind: fc.constantFrom<EntityKind | "empty">("empty", ...PRESET_KINDS),
    });
    return fc.record({
      snakeRaw: fc.array(coordArb, { minLength: snakeLen, maxLength: snakeLen }),
      cellsRaw: fc.array(cellArb, { minLength: 0, maxLength: w * h }),
      floorY: fc.constant(floorY),
      strikeRange: fc.constant(strikeRange),
    });
  })
  .map(({ snakeRaw, cellsRaw, floorY, strikeRange }): GameState => {
    // De-duplicate the snake (ordered, head first), dropping later repeats.
    const seen = new Set<string>();
    const snake: { x: number; y: number }[] = [];
    for (const p of snakeRaw) {
      const k = `${p.x},${p.y}`;
      if (!seen.has(k)) {
        seen.add(k);
        snake.push({ x: p.x, y: p.y });
      }
    }
    if (snake.length === 0) snake.push({ x: 0, y: 1 });

    // Build the cell map by PRESET NAME; later writes win (a cell can be set
    // once). Cells under a snake segment are allowed — both kernels handle it.
    const cells = new Map<string, Entity>();
    for (const c of cellsRaw) {
      if (c.kind === "empty") {
        cells.delete(`${c.x},${c.y}`);
        continue;
      }
      cells.set(`${c.x},${c.y}`, PRESETS[c.kind]);
    }

    return {
      snake,
      cells,
      strikeRange,
      floorY,
      status: "play",
      name: "fc",
    };
  });

// Seeded so the run is DETERMINISTIC (a re-run inspects the same corpus).
const FC_SEED = 0x0c011;
const FC_RUNS = 400;

describe("T-RESOLVE-EQUIV (fast-check, vs frozen pre-extraction kernel)", () => {
  it("move: OLD (legacy) and NEW (resolve tail) are deep-equal over the corpus", () => {
    fc.assert(
      fc.property(stateArb, fc.constantFrom(...ALL_DIRS), (s, d) => {
        const a = oldMove(s, d.dir);
        const b = newMove(s, d.dir);
        return deepEqual(a, b);
      }),
      { seed: FC_SEED, numRuns: FC_RUNS },
    );
  });

  it("strike: OLD (legacy) and NEW (resolve tail) are deep-equal over the corpus", () => {
    fc.assert(
      fc.property(stateArb, fc.constantFrom(...ALL_DIRS), (s, d) => {
        const a = oldStrike(s, d.dir);
        const b = newStrike(s, d.dir);
        return deepEqual(a, b);
      }),
      { seed: FC_SEED, numRuns: FC_RUNS },
    );
  });
});

// --- Pinned regression seeds (the documented adversarial edge cases) ---------
// strike-over-void, strike-through-fruit, strike-into-wall, eat-self,
// half-over-void, win-on-exit, and terminal states — re-asserted explicitly so
// the oracle never silently loses them to a generator change. Built through
// buildState (same builder for both kernels), so each is a settled, valid state.
const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const fruit = (x: number, y: number) => ({ x, y, type: "fruit" as CellType });
const exitC = (x: number, y: number) => ({ x, y, type: "exit" as CellType });
const grip = (x: number, y: number) => ({ x, y, type: "anchor" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};
function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "seed", strikeRange: 3, floorY: 0, cells: [], ...p };
}

const PINNED: GameState[] = [
  // flat floor happy case
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: floorRow(0, 0, 6) })),
  // boxed in by walls
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), wall(0, 1), wall(3, 1)] })),
  // fruit ahead
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), fruit(3, 1)] })),
  // exit ahead (win on move right)
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), exitC(3, 1)] })),
  // strike clears a gap
  buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floorRow(0, 0, 1), ...floorRow(0, 4, 6)] })),
  // strike ends over void (dies)
  buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: floorRow(0, 0, 1) })),
  // fruit mid-flight over a gap
  buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floorRow(0, 0, 1), fruit(2, 1), ...floorRow(0, 3, 6)] })),
  // wall mid-flight (strike stops short)
  buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floorRow(0, 0, 6), wall(3, 1)] })),
  // C-shape tail-vacate
  buildState(lvl({ snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }], cells: floorRow(0, 0, 3) })),
  // half over a void
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [wall(1, 0)] })),
  // fruit on own tail cell (eat-self)
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }], cells: [...floorRow(0, 0, 3), fruit(2, 2)] })),
  // exit crossed mid-strike that would end over void
  buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floorRow(0, 0, 1), exitC(2, 1)] })),
  // grip wall beside the head (anchor-relevant geometry)
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 3, y: 1 }], cells: [...floorRow(0, 1, 6), grip(1, 1), grip(1, 2)] })),
  // already-won terminal
  newMove(buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), exitC(3, 1)] })), DIRS.right),
  // already-dead terminal
  buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] })),
];

describe("T-RESOLVE-EQUIV (pinned regression seeds)", () => {
  it("the pinned corpus includes a won and a dead seed", () => {
    expect(PINNED.some((s) => s.status === "won")).toBe(true);
    expect(PINNED.some((s) => s.status === "dead")).toBe(true);
  });
  PINNED.forEach((s, idx) => {
    for (const d of ALL_DIRS) {
      it(`move @corpus${idx}/${d.name}: OLD deep-equals NEW`, () => {
        expect(deepEqual(oldMove(s, d.dir), newMove(s, d.dir))).toBe(true);
      });
      it(`strike @corpus${idx}/${d.name}: OLD deep-equals NEW`, () => {
        expect(deepEqual(oldStrike(s, d.dir), newStrike(s, d.dir))).toBe(true);
      });
    }
  });
});

// Sanity: the comparands are genuinely distinct modules (not the same import).
describe("T-RESOLVE-EQUIV setup", () => {
  it("OLD and NEW move are distinct function references", () => {
    expect(oldMove).not.toBe(newMove);
  });
  it("key helper is importable (shared coordinate convention)", () => {
    expect(key({ x: 2, y: 3 })).toBe("2,3");
  });
});
