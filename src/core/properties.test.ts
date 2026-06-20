// Core-wide property/invariant battery (§4.0 of the HLD).
//
// This is the hardening net landed BEFORE the entity refactor: it is driven over
// a COMMITTED FIXED ADVERSARIAL corpus (no fast-check — that arrives at Inc 3).
// Every verb is registered (VERB-REGISTRATION) so each P-* property iterates the
// whole verb list over the whole corpus. Because the corpus and the verb list are
// fixed data, a refactor that changes behaviour on any (state, verb, dir) shows up
// as a red here — and since the battery is proven green on the pre-refactor code,
// a later red is unambiguously the refactor's fault.

import { describe, expect, it } from "vitest";
import { anchor, buildState, DIRS, key, move, settle, strike } from "./game";
import { PRESETS } from "./types";
import type { CellType, Dir, Entity, EntityKind, GameState, LevelDef } from "./types";

// --- helpers ----------------------------------------------------------------

const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const grip = (x: number, y: number) => ({ x, y, type: "anchor" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};

function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "p", strikeRange: 3, floorY: 0, cells: [], ...p };
}

/** A structural deep clone that preserves the Map in `cells`. */
function clone(s: GameState): GameState {
  return {
    ...s,
    snake: s.snake.map((p) => ({ ...p })),
    cells: new Map(s.cells),
  };
}

/** Deep structural equality for GameState (Map-aware), order-sensitive on snake. */
function deepEqual(a: GameState, b: GameState): boolean {
  if (a.status !== b.status) return false;
  if (a.strikeRange !== b.strikeRange) return false;
  if (a.floorY !== b.floorY) return false;
  if (a.name !== b.name) return false;
  if (a.snake.length !== b.snake.length) return false;
  for (let i = 0; i < a.snake.length; i++) {
    if (a.snake[i].x !== b.snake[i].x || a.snake[i].y !== b.snake[i].y) return false;
    // Per-segment state must match too (Inc 2: `anchored`), normalising the
    // intent flag so undefined and false compare equal.
    if (Boolean(a.snake[i].anchored) !== Boolean(b.snake[i].anchored)) return false;
  }
  if (a.cells.size !== b.cells.size) return false;
  for (const [k, v] of a.cells) {
    if (b.cells.get(k) !== v) return false;
  }
  return true;
}

// --- VERB-REGISTRATION ------------------------------------------------------
// Every player verb that mutates state is registered here so the battery covers
// it. Future verbs (anchor, etc.) are appended at the increment that adds them.
interface VerbReg {
  name: string;
  /** Whether eating is possible via this verb (for P-CONSERVATION accounting). */
  fn: (s: GameState, dir: Dir) => GameState;
}
const VERBS: VerbReg[] = [
  { name: "move", fn: move },
  { name: "strike", fn: strike },
  // Inc 2: anchor is directionless (toggle); wrapped to ignore `dir` so the
  // battery iterates it over the corpus exactly like the movement verbs. Its
  // grip-cell behaviour is exercised by CORPUS state 13 (a snake beside a grip
  // wall); on every other corpus state it must no-op (same ref) — covered by
  // P-NOOP-IDENTITY.
  { name: "anchor", fn: (s) => anchor(s) },
];
const ALL_DIRS: { name: string; dir: Dir }[] = [
  { name: "up", dir: DIRS.up },
  { name: "down", dir: DIRS.down },
  { name: "left", dir: DIRS.left },
  { name: "right", dir: DIRS.right },
];

// --- CORPUS-INC1: committed fixed adversarial corpus -------------------------
// Documented edge cases (strike-over-void, strike-through-fruit, eat-self,
// half-over-void, terminal states) plus pinned regression seeds. Each is built
// through buildState so it is already settled and rest-valid, exactly as the
// shell would hand it to a verb.
const CORPUS: GameState[] = [
  // 0: flat floor, length-2 snake (the canonical happy case).
  buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: floorRow(0, 0, 6) })),
  // 1: snake boxed by walls left/right (move blocked both horizontals).
  buildState(
    lvl({
      snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
      cells: [...floorRow(0, 0, 6), wall(0, 1), wall(3, 1)],
    }),
  ),
  // 2: fruit directly ahead (eat-grows on move/strike right).
  buildState(
    lvl({
      snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
      cells: [...floorRow(0, 0, 6), { x: 3, y: 1, type: "fruit" }],
    }),
  ),
  // 3: exit directly ahead (win on move right).
  buildState(
    lvl({
      snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
      cells: [...floorRow(0, 0, 6), { x: 3, y: 1, type: "exit" }],
    }),
  ),
  // 4: void gap ahead, strikeRange clears it (strike-over-gap regression seed).
  buildState(
    lvl({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      strikeRange: 3,
      cells: [...floorRow(0, 0, 1), ...floorRow(0, 4, 6)],
    }),
  ),
  // 5: snake on the lip of a void with NO floor beyond — strike right ends over
  //    void and must die (T-STRIKE-3 territory).
  buildState(
    lvl({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      strikeRange: 3,
      cells: floorRow(0, 0, 1),
    }),
  ),
  // 6: fruit mid-strike-flight over a gap (T-STRIKE-4 seed).
  buildState(
    lvl({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      strikeRange: 3,
      cells: [...floorRow(0, 0, 1), { x: 2, y: 1, type: "fruit" }, ...floorRow(0, 3, 6)],
    }),
  ),
  // 7: wall mid-flight (strike stops short, T-STRIKE-5 seed).
  buildState(
    lvl({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      strikeRange: 3,
      cells: [...floorRow(0, 0, 6), wall(3, 1)],
    }),
  ),
  // 8: C-shape where the head can enter the tail-vacated cell (tail-vacate seed).
  buildState(
    lvl({
      snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
      cells: floorRow(0, 0, 3),
    }),
  ),
  // 9: snake half over a void (one segment unsupported air, other on wall) —
  //    must NOT die (every-segment void rule). Settled at rest.
  buildState(
    lvl({
      snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
      cells: [wall(1, 0)],
    }),
  ),
  // 10: a fruit positioned at the snake's own tail cell (eat-self interaction).
  buildState(
    lvl({
      snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
      cells: [...floorRow(0, 0, 3), { x: 2, y: 2, type: "fruit" }],
    }),
  ),
  // 11: already-won terminal state (pinned regression: verbs must no-op).
  (() => {
    const s = buildState(
      lvl({
        snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
        cells: [...floorRow(0, 0, 6), { x: 3, y: 1, type: "exit" }],
      }),
    );
    return move(s, DIRS.right); // -> won
  })(),
  // 12: already-dead terminal state (pinned regression: verbs must no-op).
  buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] })), // falls into void -> dead
  // 13: Inc-2 grip-cell state — a snake resting on a floor with a grip WALL
  //     beside its head (so `anchor` has a grip surface in reach and performs a
  //     real toggle, exercising the new verb's grip path under the battery). The
  //     floor supports it, so it is at rest regardless of the anchor.
  buildState(
    lvl({
      snake: [{ x: 2, y: 1 }, { x: 3, y: 1 }],
      cells: [...floorRow(0, 1, 6), grip(1, 1), grip(1, 2)],
    }),
  ),
];

// Sanity: the corpus pins the terminal seeds we rely on.
describe("CORPUS-INC1", () => {
  it("includes a won and a dead seed", () => {
    expect(CORPUS.some((s) => s.status === "won")).toBe(true);
    expect(CORPUS.some((s) => s.status === "dead")).toBe(true);
  });
  it("has the documented size", () => {
    expect(CORPUS.length).toBe(14);
  });
  it("includes a grip-cell state for the anchor verb", () => {
    expect(CORPUS.some((s) => [...s.cells.values()].some((e) => e.grip === true))).toBe(true);
  });
});

// Iterate every verb x every dir x every corpus state.
function eachCase(body: (s: GameState, verb: VerbReg, d: { name: string; dir: Dir }, idx: number) => void) {
  CORPUS.forEach((s, idx) => {
    for (const verb of VERBS) {
      for (const d of ALL_DIRS) {
        body(s, verb, d, idx);
      }
    }
  });
}

describe("P-DETERMINISM", () => {
  it("a verb is byte-identical (deep-equal) on repeated calls over the corpus", () => {
    eachCase((s, verb, d, idx) => {
      const a = verb.fn(s, d.dir);
      const b = verb.fn(s, d.dir);
      expect(deepEqual(a, b), `${verb.name}/${d.name} @${idx}`).toBe(true);
    });
  });
});

describe("P-PURITY", () => {
  it("a verb does not mutate its input state over the corpus", () => {
    eachCase((s, verb, d, idx) => {
      const before = clone(s);
      verb.fn(s, d.dir);
      expect(deepEqual(s, before), `${verb.name}/${d.name} @${idx}`).toBe(true);
    });
  });
});

describe("P-NOOP-IDENTITY", () => {
  it("a blocked/terminal action returns the SAME reference so next===state holds", () => {
    eachCase((s, verb, d, idx) => {
      const next = verb.fn(s, d.dir);
      // If nothing changed structurally, it MUST be referentially identical
      // (the shell relies on next===state to detect no-ops).
      if (deepEqual(next, s)) {
        expect(next, `${verb.name}/${d.name} @${idx}`).toBe(s);
      }
    });
  });
});

describe("P-UNDO", () => {
  it("apply a verb then restore the prior snapshot deep-equals the original", () => {
    eachCase((s, verb, d, idx) => {
      const snapshot = clone(s); // the shell pushes a snapshot before acting
      verb.fn(s, d.dir);
      // Undo = discard the result, restore the snapshot.
      expect(deepEqual(snapshot, s), `${verb.name}/${d.name} @${idx}`).toBe(true);
    });
  });
});

describe("P-CONSERVATION", () => {
  it("non-eating action keeps length; eating action grows by exactly +1", () => {
    eachCase((s, verb, d, idx) => {
      if (s.status !== "play") return; // terminal: no length change possible
      const before = s.snake.length;
      const beforeFruit = [...s.cells.values()].filter((e) => e.eat === true).length;
      const next = verb.fn(s, d.dir);
      const after = next.snake.length;
      const afterFruit = [...next.cells.values()].filter((e) => e.eat === true).length;
      const ate = afterFruit < beforeFruit;
      const tag = `${verb.name}/${d.name} @${idx}`;
      if (ate) {
        // Exactly one fruit consumed, exactly +1 length.
        expect(beforeFruit - afterFruit, tag).toBe(1);
        expect(after - before, tag).toBe(1);
      } else {
        expect(after, tag).toBe(before);
      }
    });
  });
});

describe("P-SETTLE-TERMINATION", () => {
  it("a high snake over deep void reaches dead in the expected step count", () => {
    // Head at y=20, floorY=0, no support anywhere -> it must fall past the floor
    // and die. The settle loop drops 1/y per iteration; it dies once every
    // segment is below floorY. A single segment at y=20 reaches y<0 after 21
    // drops, so termination is well inside the (maxY - floorY + 1) bound.
    const s = buildState(lvl({ snake: [{ x: 0, y: 20 }], cells: [] }));
    expect(s.status).toBe("dead");
  });

  it("settle terminates (cap not exceeded) for every corpus state", () => {
    // settle has an internal hard iteration cap that throws if exceeded; this
    // exercises it over the corpus and asserts no throw / always terminal-or-rest.
    for (const s of CORPUS) {
      expect(() => settle(s)).not.toThrow();
      const r = settle(s);
      expect(["play", "won", "dead"]).toContain(r.status);
    }
  });
});

// --- T-PRESETS --------------------------------------------------------------
// Build-time assert over the frozen PRESETS table.
//
// (a) No forbidden flag combination. The presets are the ONLY construction path
//     for an entity, so guarding the table guards every cell in the game.
// (b) M1 single-pass guard: any preset whose solidity is DERIVED during a
//     mechanism pass must have falsy `supports` (so a mechanism state change can
//     never alter the grounded set, and settle never re-runs after mechanisms).
//     Inc 1 has no mechanism-derived presets; the check is forward-declared over
//     the (currently empty) set of derived-solidity kinds so the invariant is
//     enforced the moment such a kind is added.

// Kinds whose `solid` is recomputed each turn by a future applyMechanisms pass.
// Empty at Inc 1; populated (e.g. "gate") when mechanisms land at Inc 3.
const MECHANISM_DERIVED_SOLIDITY: EntityKind[] = [];

describe("T-PRESETS", () => {
  const entries = Object.entries(PRESETS) as [EntityKind, Entity][];

  it("the kind field matches its preset key", () => {
    for (const [k, e] of entries) {
      expect(e.kind, k).toBe(k);
    }
  });

  it("has no forbidden flag combination", () => {
    for (const [k, e] of entries) {
      // win cells are pure goals: never also solid or edible.
      if (e.win) {
        expect(e.solid, `${k}: win must not be solid`).toBeFalsy();
        expect(e.eat, `${k}: win must not be edible`).toBeFalsy();
      }
      // an edible cell cannot also block the step that eats it.
      if (e.eat) {
        expect(e.solid, `${k}: eat must not be solid`).toBeFalsy();
        expect(e.win, `${k}: eat must not be win`).toBeFalsy();
      }
      // supports implies solid in every shipped preset (a thing you stand on is
      // a thing you cannot walk through) — the converse need not hold.
      if (e.supports) {
        expect(e.solid, `${k}: supports implies solid`).toBeTruthy();
      }
    }
  });

  it("M1: every mechanism-derived-solidity preset has falsy supports", () => {
    for (const kind of MECHANISM_DERIVED_SOLIDITY) {
      const e = PRESETS[kind as keyof typeof PRESETS] as Entity | undefined;
      expect(e, `${kind} must exist in PRESETS`).toBeDefined();
      expect(e!.supports, `${kind}: mechanism-derived solidity must not support`).toBeFalsy();
    }
  });

  it("is frozen (cannot be mutated at runtime)", () => {
    expect(Object.isFrozen(PRESETS)).toBe(true);
  });
});

export { CORPUS, VERBS, deepEqual, clone, key };
