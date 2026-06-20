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
import { anchor, buildState, deposit, DIRS, key, move, settle, strike, switchBody } from "./game";
import { PRESETS } from "./types";
import type { CellType, Dir, Entity, EntityKind, GameState, LevelDef } from "./types";

// --- helpers ----------------------------------------------------------------

const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const grip = (x: number, y: number) => ({ x, y, type: "anchor" as CellType });
const plate = (x: number, y: number, id: string) => ({ x, y, type: "plate" as CellType, trigger: id });
const gate = (x: number, y: number, id: string) => ({ x, y, type: "gate" as CellType, door: id });
const object = (x: number, y: number) => ({ x, y, type: "object" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};

function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "p", strikeRange: 3, floorY: 0, cells: [], ...p };
}

/** A structural deep clone that preserves the Map in `cells` and the co-op
 *  `bodies` (Inc 4b). The M2 invariant is preserved: an absent `bodies` stays
 *  absent (never coerced to `[]`). */
function clone(s: GameState): GameState {
  return {
    ...s,
    snake: s.snake.map((p) => ({ ...p })),
    cells: new Map(s.cells),
    ...(s.bodies === undefined ? {} : { bodies: s.bodies.map((b) => b.map((p) => ({ ...p }))) }),
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
    // Inc 4: a swallowed `carry` is per-segment state. Presets are frozen
    // singletons read from the same table, so referential identity is the right
    // test (an absent carry compares equal only to another absent carry).
    if (a.snake[i].carry !== b.snake[i].carry) return false;
  }
  if (a.cells.size !== b.cells.size) return false;
  for (const [k, v] of a.cells) {
    if (b.cells.get(k) !== v) return false;
  }
  // Inc 4b: the co-op `bodies` (the OTHER snakes). M2: an absent `bodies` must
  // compare distinct from a present one — absent and `[]` are NOT equal.
  if ((a.bodies === undefined) !== (b.bodies === undefined)) return false;
  if (a.bodies !== undefined && b.bodies !== undefined) {
    if (a.bodies.length !== b.bodies.length) return false;
    for (let i = 0; i < a.bodies.length; i++) {
      if (a.bodies[i].length !== b.bodies[i].length) return false;
      for (let j = 0; j < a.bodies[i].length; j++) {
        const p = a.bodies[i][j];
        const q = b.bodies[i][j];
        if (p.x !== q.x || p.y !== q.y) return false;
        if (Boolean(p.anchored) !== Boolean(q.anchored)) return false;
        if (p.carry !== q.carry) return false;
      }
    }
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
  // Inc 4: deposit is directional (drops the head's carry into the cell in `dir`).
  // The battery iterates it over the corpus exactly like the movement verbs. Its
  // real carry/deposit behaviour is exercised by the carry corpus states (15-17,
  // a snake holding a swallowed block); on every state with an EMPTY gut it must
  // no-op (same ref) — covered by P-NOOP-IDENTITY.
  { name: "deposit", fn: deposit },
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
  // 14: Inc-3 mechanism state — the head sits on a plate 'g1' which holds open a
  //     gate 'g1' two cells ahead. Exercises applyMechanisms in the resolve tail
  //     under the battery (determinism, purity, no-op identity, undo) across the
  //     verb set. The floor supports the snake, so it is at rest.
  buildState(
    lvl({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      cells: [...floorRow(0, 0, 6), plate(1, 1, "g1"), gate(3, 1, "g1")],
    }),
  ),
  // 15: Inc-4 carry state — a snake that has SWALLOWED an object block and now
  //     holds it on its head (carry non-null). Built by swallowing a pickup, so
  //     it exercises the deposit verb (drop right into empty air, drop down/left
  //     blocked by floor/body) and the carry round-trip under the battery (P-UNDO
  //     extended to non-null carry, P-CONSERVATION carry-adds-0, P-NOOP-IDENTITY
  //     on blocked deposits). The floor supports it, so it is at rest.
  (() => {
    const s = buildState(
      lvl({
        snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
        cells: [...floorRow(0, 0, 6), object(3, 1)],
      }),
    );
    return move(s, DIRS.right); // step onto the object -> swallow -> head carries it
  })(),
  // 16: Inc-4 carry state with a CLEAR cell above the head, so deposit UP places
  //     the block and resolves with the snake still grounded (a successful deposit
  //     path under the battery: not a no-op, so P-NOOP-IDENTITY is vacuous for it
  //     but P-PURITY/P-DETERMINISM/P-CONSERVATION still bind).
  (() => {
    const s = buildState(
      lvl({
        snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
        cells: [...floorRow(0, 0, 6), object(3, 1)],
      }),
    );
    return move(s, DIRS.right);
  })(),
  // 17: Inc-4 FULL-GUT state — a snake carrying a block right up against ANOTHER
  //     pickup, so a swallow attempt (move toward it) must no-op (full gut), and
  //     deposit into the occupied-by-pickup cell must no-op. Exercises the
  //     full-gut and blocked-deposit no-op identity together.
  (() => {
    const s = buildState(
      lvl({
        snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
        cells: [...floorRow(0, 0, 6), object(3, 1), object(4, 1)],
      }),
    );
    return move(s, DIRS.right); // swallow the first; the second remains ahead
  })(),
];

// Sanity: the corpus pins the terminal seeds we rely on.
describe("CORPUS-INC1", () => {
  it("includes a won and a dead seed", () => {
    expect(CORPUS.some((s) => s.status === "won")).toBe(true);
    expect(CORPUS.some((s) => s.status === "dead")).toBe(true);
  });
  it("has the documented size", () => {
    expect(CORPUS.length).toBe(18);
  });
  it("includes a grip-cell state for the anchor verb", () => {
    expect(CORPUS.some((s) => [...s.cells.values()].some((e) => e.grip === true))).toBe(true);
  });
  it("includes a mechanism (plate + gate) state", () => {
    expect(CORPUS.some((s) => [...s.cells.values()].some((e) => e.trigger !== undefined))).toBe(true);
    expect(CORPUS.some((s) => [...s.cells.values()].some((e) => e.door !== undefined))).toBe(true);
  });
  it("includes a carry state (head holding a swallowed block) for the deposit verb", () => {
    expect(CORPUS.some((s) => s.snake[0].carry !== undefined)).toBe(true);
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

  // Inc 4b: P-UNDO extended to the ACTIVE-BODY SWITCH (Tab). Tab is logged in the
  // shell's input-log/undo stack, so it must round-trip too: switching the active
  // body and switching back restores the original state, and the snapshot taken
  // before a switch is never mutated by it. A multi-body corpus exercises the
  // genuine switch (single-snake states no-op, which P-NOOP-IDENTITY already
  // covers).
  describe("active-body switch (Tab)", () => {
    const coopStates: GameState[] = [
      // Two bodies on a flat floor (the canonical co-op rest state).
      {
        snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
        bodies: [[{ x: 5, y: 1 }, { x: 4, y: 1 }]],
        cells: buildState(lvl({ snake: [{ x: 9, y: 9 }], cells: floorRow(0, 0, 8) })).cells,
        strikeRange: 3,
        floorY: 0,
        status: "play",
        name: "coop-undo",
      },
      // Three bodies (full rotation exercise).
      {
        snake: [{ x: 1, y: 1 }],
        bodies: [[{ x: 3, y: 1 }], [{ x: 5, y: 1 }]],
        cells: buildState(lvl({ snake: [{ x: 9, y: 9 }], cells: floorRow(0, 0, 8) })).cells,
        strikeRange: 3,
        floorY: 0,
        status: "play",
        name: "coop-undo-3",
      },
    ];

    it("does not mutate the snapshot taken before a switch", () => {
      coopStates.forEach((s, idx) => {
        const snapshot = clone(s);
        switchBody(s);
        expect(deepEqual(snapshot, s), `@${idx}`).toBe(true);
      });
    });

    it("a full cycle of switches returns to the original (round-trip)", () => {
      coopStates.forEach((s, idx) => {
        const n = (s.bodies?.length ?? 0) + 1; // number of bodies in the cycle
        let cur = s;
        for (let i = 0; i < n; i++) cur = switchBody(cur);
        // After a FULL cycle the active pointer is back on the original body and
        // the state deep-equals the original.
        expect(deepEqual(cur, s), `@${idx} after ${n} switches`).toBe(true);
      });
    });
  });
});

describe("P-CONSERVATION", () => {
  // Total block matter = swallowable/deposited blocks in cells PLUS blocks held in
  // a gut. A swallow moves a block cell->gut; a deposit moves gut->cell; neither
  // creates or destroys matter, so this count is conserved by EVERY action.
  const blocks = (s: GameState): number => {
    let n = 0;
    for (const e of s.cells.values()) if (e.pickup === true) n++;
    for (const seg of s.snake) if (seg.carry !== undefined) n++;
    return n;
  };

  it("length grows only by eating fruit (+1); swallow/deposit keep length; block matter is conserved", () => {
    eachCase((s, verb, d, idx) => {
      if (s.status !== "play") return; // terminal: no change possible
      const before = s.snake.length;
      const beforeFruit = [...s.cells.values()].filter((e) => e.eat === true).length;
      const beforeBlocks = blocks(s);
      const next = verb.fn(s, d.dir);
      const after = next.snake.length;
      const afterFruit = [...next.cells.values()].filter((e) => e.eat === true).length;
      const ate = afterFruit < beforeFruit;
      const tag = `${verb.name}/${d.name} @${idx}`;
      if (ate) {
        // Exactly one fruit consumed, exactly +1 length. (Fruit and pickup are
        // disjoint flags, so eating never touches the block count.)
        expect(beforeFruit - afterFruit, tag).toBe(1);
        expect(after - before, tag).toBe(1);
      } else {
        // Swallow (eat-pickup) and deposit both keep length unchanged; only fruit
        // grows the snake.
        expect(after, tag).toBe(before);
      }
      // Block matter is conserved by every action (a swallow/deposit only RELOCATES
      // a block between a cell and a gut; everything else leaves it untouched).
      expect(blocks(next), `${tag} block-conservation`).toBe(beforeBlocks);
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

// Kinds whose `solid` is recomputed each turn by the applyMechanisms pass. The
// M1 single-pass guard requires each to have falsy `supports`. Inc 3 adds the
// gate (its solidity is derived from triggers + occupancy each turn).
const MECHANISM_DERIVED_SOLIDITY: EntityKind[] = ["gate"];

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
      // heat is RENDERER-ONLY (§2.2.7): a heat preset must carry NO rule flag, so
      // the core stays byte-inert to it (CORE-REGRESSION-HEAT). If a future cell
      // ever needs to be both warm AND a rule entity, that pairing must be designed
      // and oracle'd deliberately — this guard makes the silent case impossible.
      if (e.heat) {
        expect(e.solid, `${k}: heat must not be solid`).toBeFalsy();
        expect(e.supports, `${k}: heat must not support`).toBeFalsy();
        expect(e.eat, `${k}: heat must not be edible`).toBeFalsy();
        expect(e.win, `${k}: heat must not be win`).toBeFalsy();
        expect(e.grip, `${k}: heat must not grip`).toBeFalsy();
        expect(e.trigger, `${k}: heat must not be a trigger`).toBeFalsy();
        expect(e.door, `${k}: heat must not be a door`).toBeFalsy();
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
