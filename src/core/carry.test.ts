// T-CARRY-1, T-CARRY-2, T-DECOY (HLD §4.4, §2.2.8, §2.2.9) — swallow & carry,
// deposit, and the shed-skin decoy.
//
// Carry model (§2.2.8): a `pickup` entity is SWALLOWED by stepping onto it —
// stored on the head segment as `carry` instead of growing the snake, and the
// cell is cleared. A full gut blocks the swallow (no-op). The carried entity is
// dropped back into an adjacent empty cell by the `deposit` verb; once deposited a
// `solid` block is a normal cells entity again, so it blocks AND supports (the
// shed-skin decoy = static structure, §2.2.9). Matter is conserved throughout: a
// block only ever moves between a cell and a gut.

import { describe, expect, it } from "vitest";
import { buildState, cellAt, deposit, DIRS, key, move, settle } from "./game";
import { PRESETS } from "./types";
import type { CellType, GameState, LevelDef } from "./types";

// --- authoring helpers ------------------------------------------------------
const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const object = (x: number, y: number) => ({ x, y, type: "object" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};
function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "c", strikeRange: 3, floorY: 0, cells: [], ...p };
}

/** Total block matter: deposited/free blocks in cells PLUS blocks held in guts. */
function blocks(s: GameState): number {
  let n = 0;
  for (const e of s.cells.values()) if (e.pickup === true) n++;
  for (const seg of s.snake) if (seg.carry !== undefined) n++;
  return n;
}

// ---------------------------------------------------------------------------
// T-CARRY-1: swallow stores the pickup as carry (length unchanged, cell cleared);
//            a full gut makes a swallow attempt a no-op (same ref).
// ---------------------------------------------------------------------------
describe("T-CARRY-1 — swallow & carry", () => {
  // Floor at y=0 across 0..6. Snake head@(2,1), tail@(1,1). An object block at
  // (3,1) directly ahead.
  function withBlockAhead(): GameState {
    return buildState(
      lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), object(3, 1)] }),
    );
  }

  it("stepping onto a pickup stores it as carry, leaving length unchanged", () => {
    const s = withBlockAhead();
    expect(s.snake[0].carry).toBeUndefined();
    const n = move(s, DIRS.right);
    // Head advanced onto the block's cell; length is UNCHANGED (a swallow is a
    // shift, not a growth — unlike eating fruit).
    expect(n.snake[0]).toMatchObject({ x: 3, y: 1 });
    expect(n.snake.length).toBe(s.snake.length);
    // The swallowed entity is carried on the head (the frozen object preset).
    expect(n.snake[0].carry).toBe(PRESETS.object);
    // No other segment carries anything.
    expect(n.snake.slice(1).every((seg) => seg.carry === undefined)).toBe(true);
  });

  it("clears the swallowed cell (it cannot be swallowed twice)", () => {
    const n = move(withBlockAhead(), DIRS.right);
    expect(cellAt(n, { x: 3, y: 1 })).toBeUndefined();
  });

  it("conserves block matter across the swallow (cell -> gut)", () => {
    const s = withBlockAhead();
    const n = move(s, DIRS.right);
    expect(blocks(n)).toBe(blocks(s));
  });

  it("the carried block travels with the head as it moves on", () => {
    const s = withBlockAhead();
    const n = move(s, DIRS.right); // head@(3,1) carrying
    const n2 = move(n, DIRS.right); // head@(4,1), still carrying
    expect(n2.snake[0]).toMatchObject({ x: 4, y: 1 });
    expect(n2.snake[0].carry).toBe(PRESETS.object);
    expect(n2.snake.length).toBe(s.snake.length);
  });

  it("a swallow with a FULL gut is a no-op (same reference)", () => {
    // Two blocks in a row: swallow the first, then the head (full gut) is up
    // against the second. A further step toward it must no-op.
    const s = buildState(
      lvl({
        snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
        cells: [...floorRow(0, 0, 6), object(3, 1), object(4, 1)],
      }),
    );
    const full = move(s, DIRS.right); // gut now holds the first block; (4,1) ahead
    expect(full.snake[0].carry).toBe(PRESETS.object);
    const blocked = move(full, DIRS.right); // (4,1) is a solid pickup, gut full
    expect(blocked).toBe(full); // exact same reference: a genuine no-op
  });
});

// ---------------------------------------------------------------------------
// T-CARRY-2: deposit places the carry into the target empty cell as a normal
//            entity; a deposited solid blocks/supports; deposit into a blocked or
//            occupied cell is a no-op (same ref).
// ---------------------------------------------------------------------------
describe("T-CARRY-2 — deposit", () => {
  /** A snake on the floor that has just swallowed a block ahead of it. */
  function carrying(): GameState {
    const s = buildState(
      lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), object(3, 1)] }),
    );
    const n = move(s, DIRS.right); // head@(3,1) carrying the block
    expect(n.snake[0].carry).toBe(PRESETS.object);
    return n;
  }

  it("deposits the carry into the adjacent empty cell as a normal entity", () => {
    const s = carrying(); // head@(3,1), empty air above at (3,2)
    const n = deposit(s, DIRS.up);
    // The block is now a normal cells entity in the target cell.
    expect(cellAt(n, { x: 3, y: 2 })).toBe(PRESETS.object);
    // The gut is empty again.
    expect(n.snake[0].carry).toBeUndefined();
    // Length unchanged; matter conserved (gut -> cell).
    expect(n.snake.length).toBe(s.snake.length);
    expect(blocks(n)).toBe(blocks(s));
  });

  it("a deposited solid block BLOCKS a full-gutted snake, and is re-swallowable by an empty one", () => {
    const s = carrying(); // head@(3,1)
    const dropped = deposit(s, DIRS.up); // block at (3,2)
    const blockCell = dropped.cells.get(key({ x: 3, y: 2 }))!;

    // (a) A snake whose gut is FULL cannot swallow the block, so its `solid` flag
    //     blocks the step (no-op, same ref). Build a full-gutted snake under it.
    const full = (() => {
      const base = buildState(
        lvl({ snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }], cells: [...floorRow(0, 0, 6), object(0, 1)] }),
      );
      // Give the head a gut by swallowing the (0,1) block out of band: simplest is
      // to construct the carry directly (the engine stores the preset verbatim).
      const cells = new Map(base.cells);
      cells.delete(key({ x: 0, y: 1 })); // it is now in the gut
      cells.set(key({ x: 3, y: 2 }), blockCell);
      const snake = [{ x: 3, y: 1, carry: PRESETS.object }, { x: 2, y: 1 }];
      return { ...base, snake, cells } as GameState;
    })();
    expect(move(full, DIRS.up)).toBe(full); // solid block above, gut full -> no-op

    // (b) An EMPTY-gutted snake steps onto the same block and SWALLOWS it (pickup
    //     precedence over solid, §2.2.8) — a deposited decoy can be picked back up.
    const empty = buildState(lvl({ snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }], cells: floorRow(0, 0, 6) }));
    const cells = new Map(empty.cells);
    cells.set(key({ x: 3, y: 2 }), blockCell);
    const withBlock: GameState = { ...empty, cells };
    const swallowed = move(withBlock, DIRS.up);
    expect(swallowed.snake[0]).toMatchObject({ x: 3, y: 2 });
    expect(swallowed.snake[0].carry).toBe(blockCell);
    expect(swallowed.cells.has(key({ x: 3, y: 2 }))).toBe(false);
  });

  it("a deposited solid block SUPPORTS the snake from below", () => {
    // A snake whose only floor is a single deposited block must NOT fall.
    const onBlock: GameState = {
      snake: [{ x: 5, y: 2 }, { x: 4, y: 2 }],
      cells: new Map([[key({ x: 5, y: 1 }), PRESETS.object]]),
      strikeRange: 3,
      floorY: 0,
      status: "play",
      name: "support",
    };
    const settled = settle(onBlock);
    // (4,2) has nothing under it, but (5,2) sits on the block at (5,1) which
    // `supports`, so the WHOLE rigid snake is grounded and does not fall.
    expect(settled.status).toBe("play");
    expect(settled.snake[0]).toMatchObject({ x: 5, y: 2 });
    expect(settled.snake[1]).toMatchObject({ x: 4, y: 2 });
  });

  it("deposit into a SOLID-occupied cell is a no-op (same reference)", () => {
    const s = carrying(); // head@(3,1)
    const cells = new Map(s.cells);
    cells.set(key({ x: 4, y: 1 }), PRESETS.wall); // a wall to the right of the head
    const blocked: GameState = { ...s, cells };
    expect(deposit(blocked, DIRS.right)).toBe(blocked);
  });

  it("deposit into a cell occupied by a snake segment is a no-op (same reference)", () => {
    const s = carrying(); // head@(3,1), the body segment at (2,1)
    // Deposit LEFT lands on (2,1), which the second segment occupies -> no-op.
    expect(deposit(s, DIRS.left)).toBe(s);
  });

  it("deposit with an EMPTY gut is a no-op (same reference)", () => {
    const s = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: floorRow(0, 0, 6) }));
    expect(s.snake[0].carry).toBeUndefined();
    expect(deposit(s, DIRS.up)).toBe(s);
  });

  it("deposit on a terminal (dead) state is a no-op (same reference)", () => {
    const dead = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] }));
    expect(dead.status).toBe("dead");
    expect(deposit(dead, DIRS.up)).toBe(dead);
  });
});

// ---------------------------------------------------------------------------
// T-DECOY (§2.2.9): shedding is depositing a body-shaped solid from carry; the
// shed block acts as static structure (a step you can stand on / a wall) and
// matter is conserved (body length + deposited matter constant across the shed).
// ---------------------------------------------------------------------------
describe("T-DECOY — shed-skin decoy", () => {
  it("a shed block is static structure the snake can stand on, and matter is conserved", () => {
    // Swallow a block on a short floor, deposit it (shed it), and verify the shed
    // block is a load-bearing static structure that bears the snake's weight.
    const s = buildState(
      lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 1, 3), object(3, 1)] }),
    );
    const before = blocks(s);
    // Head@(2,1) -> swallow block at (3,1).
    const carrying = move(s, DIRS.right);
    expect(carrying.snake[0].carry).toBe(PRESETS.object);
    // Shed (deposit) the block above the head: it becomes a normal static entity.
    const shed = deposit(carrying, DIRS.up); // block at (3,2)
    const block = shed.cells.get(key({ x: 3, y: 2 }));
    expect(block).toBe(PRESETS.object);
    expect(block!.supports).toBe(true); // a step / load-bearing static structure
    expect(block!.solid).toBe(true); // also a wall
    // Matter conservation across the shed: a block went gut -> cell, total unchanged.
    expect(blocks(shed)).toBe(before);
    expect(shed.snake[0].carry).toBeUndefined(); // gut empty after shedding
    expect(shed.snake.length).toBe(s.snake.length); // body length unchanged by the shed
  });

  it("a snake can climb onto its own shed block (the decoy as a step)", () => {
    // Concretely demonstrate the decoy-as-step: shed a block beside the snake, then
    // stand a snake on top of it and confirm support (no fall).
    const s = buildState(
      lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floorRow(0, 0, 6), object(3, 1)] }),
    );
    const carrying = move(s, DIRS.right); // head@(3,1) carrying
    const shed = deposit(carrying, DIRS.up); // shed block at (3,2)
    // A snake resting on top of the shed block at (3,3) is supported by it.
    const onDecoy: GameState = {
      ...shed,
      snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }],
    };
    const settled = settle(onDecoy);
    expect(settled.status).toBe("play"); // the decoy holds it up
    expect(settled.snake[0]).toMatchObject({ x: 3, y: 3 });
  });
});
