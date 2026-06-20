// Increment 2 — anchor / climb oracles (HLD §2.2.4, §2.5, §4.2, D25).
//
// The anchor mechanic is the first sub-rigid-body concept: a segment beside a
// `grip` wall can be ANCHORED, and an anchored segment that is still gripping the
// wall is a grounding source — exactly like a world `supports` cell. Grounding is
// DERIVED FROM GRIP EACH TURN (D25, no latch): the stored `anchored` flag is
// intent, the grip surface is the truth. A segment carried off the grip wall
// stops grounding the snake.
//
// MODEL NOTE: the frozen `anchor` PRESET is `solid:true`, so a segment can never
// OCCUPY a grip cell. "Grips a grip cell" is therefore implemented as gripping an
// ADJACENT grip surface (climb ALONG the wall, §2.2.4). See the report blocker.
//
// These oracles are pure `state -> assert`, deterministic, stdin-closed.

import { describe, expect, it } from "vitest";
import { anchor, buildState, DIRS, gripBeside, move, settle, strike } from "./game";
import { PRESETS } from "./types";
import type { CellType, Entity, GameState, LevelDef } from "./types";

function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "a", strikeRange: 3, floorY: 0, cells: [], ...p };
}
const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const grip = (x: number, y: number) => ({ x, y, type: "anchor" as CellType });
const exit = (x: number, y: number) => ({ x, y, type: "exit" as CellType });
const floor = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};
/** A vertical grip wall at column x spanning rows y0..y1 inclusive. */
const gripCol = (x: number, y0: number, y1: number) => {
  const c = [];
  for (let y = y0; y <= y1; y++) c.push(grip(x, y));
  return c;
};

/** Build the cell map from presets WITHOUT the initial settle, so the test
 *  controls when gravity runs (anchor fixtures hang in the air, which is by
 *  design NOT a rest state until anchored). */
function makeState(level: LevelDef): GameState {
  const cells = new Map<string, Entity>();
  for (const c of level.cells) cells.set(`${c.x},${c.y}`, PRESETS[c.type]);
  return {
    snake: level.snake.map((p) => ({ ...p })),
    cells,
    strikeRange: level.strikeRange,
    floorY: level.floorY,
    status: "play",
    name: level.name,
  };
}

describe("T-ANCHOR-1", () => {
  it("anchoring a segment beside a grip wall makes settle a no-op (snake hangs)", () => {
    // A grip wall at column x=0. The snake hangs to the right of it in open air:
    // head (1,3) is adjacent to grip (0,3); the rest dangles further right with
    // no floor below. Before anchoring it would fall; after anchoring it hangs.
    const s0 = makeState(lvl({ snake: [{ x: 1, y: 3 }, { x: 2, y: 3 }], cells: gripCol(0, 0, 5) }));
    // Sanity: unanchored, this floating snake falls (no support, no anchor).
    expect(settle(s0).snake[0].y).toBeLessThan(3);

    const anchored = anchor(s0);
    expect(anchored).not.toBe(s0); // a grip surface is in reach -> a real toggle
    expect(anchored.snake[0].anchored).toBe(true);

    const after = settle(anchored);
    // The snake hangs: head stays put beside the grip wall.
    expect(after.snake[0]).toEqual({ x: 1, y: 3, anchored: true });
    expect(after.snake[1]).toMatchObject({ x: 2, y: 3 });
    expect(after.status).toBe("play");
  });
});

describe("T-ANCHOR-2", () => {
  it("releasing the only anchor over empty space falls (and may die) next settle", () => {
    const s0 = makeState(lvl({ snake: [{ x: 1, y: 3 }, { x: 2, y: 3 }], cells: gripCol(0, 0, 5) }));
    const anchored = anchor(s0);
    expect(settle(anchored).snake[0]).toEqual({ x: 1, y: 3, anchored: true });

    // Release the same segment (toggle off). With no other grounding source the
    // next settle drops the snake into the void -> dead.
    const released = anchor(anchored);
    expect(released.snake[0].anchored).toBe(false);
    const after = settle(released);
    expect(after.status).toBe("dead");
  });
});

describe("T-ANCHOR-CARRY", () => {
  it("once the anchored link leaves the grip wall the snake is no longer supported and falls (no latch, D25)", () => {
    // Grip wall column at x=0 spanning ONLY rows 3..4. The snake hangs by its
    // head: head (1,4) beside grip(0,4), body dangling right over the void. Anchor
    // the head. As the head slithers RIGHT (away from the wall), the new heads are
    // unanchored; the original anchored link stays put at (1,4) beside the grip
    // wall and keeps the snake hanging — UNTIL it slithers off the tail (is shed)
    // / no surviving link is beside the grip wall. At that instant the snake is no
    // longer supported by the anchor (the stored `anchored` flag alone cannot
    // levitate it — grounding is derived from grip each turn) and it FALLS.
    // Head on the RIGHT, body trailing LEFT toward the wall; the tail (1,4) is
    // beside grip(0,4). anchor() grips that tail link. The snake hangs by it.
    const s0 = makeState(
      lvl({
        snake: [{ x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }],
        cells: [grip(0, 3), grip(0, 4)],
      }),
    );
    const anchored = anchor(s0);
    const gripperBefore = anchored.snake.find((sg) => sg.anchored === true);
    expect(gripperBefore, "the tail beside the grip wall is anchored").toMatchObject({ x: 1, y: 4 });
    // It hangs while the anchored link is beside the grip wall (settle no-op).
    expect(settle(anchored).status).toBe("play");
    expect(settle(anchored).snake[0]).toMatchObject({ x: 3, y: 4 });

    // Slither the head rightward, away from the wall, WITHOUT re-anchoring. The
    // anchored tail link is carried off the grip wall (shed), so the snake is no
    // longer supported by the anchor (the stored `anchored` flag alone cannot
    // levitate it — grounding is derived from grip each turn) and it FALLS.
    const moved = move(anchored, DIRS.right);
    expect(moved.status).toBe("dead");
    // No surviving segment is anchored-and-gripping (the latch did not save it).
    const stillGripping = moved.snake.some((sg) => sg.anchored === true && gripBeside(moved, sg));
    expect(stillGripping).toBe(false);
  });
});

describe("T-ANCHOR-NOOP", () => {
  it("anchor() with no grip surface in reach is a no-op (same reference)", () => {
    // A plain floored snake, no grip wall anywhere.
    const s = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: floor(0, 0, 6) }));
    expect(anchor(s)).toBe(s);
  });

  it("anchor() on a terminal state is a no-op (same reference)", () => {
    const dead = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] }));
    expect(dead.status).toBe("dead");
    expect(anchor(dead)).toBe(dead);
  });
});

describe("T-CLIMB", () => {
  // The canonical climb protocol (HLD §2.2.4): "anchor -> move head up along a
  // grip wall -> RE-ANCHOR -> release tail". A short snake's anchored body link
  // slithers to the tail and is shed after the snake's length in moves, so the
  // player RE-ANCHORS the new head each step (`anchor` toggles the head, which is
  // beside the wall after each up-move). This keeps a grounding source present
  // through every settle, so the snake climbs instead of falling back.
  it("canonical climb raises the head up a grip wall and reaches won", () => {
    // A vertical grip wall at x=0 (rows 0..6). A 2-cell snake starts at the foot
    // BESIDE the wall: head (1,1) adjacent to grip(0,1), tail (2,1) on a floor
    // stub. An exit sits beside the top of the wall at (1,6).
    const s0 = makeState(
      lvl({
        snake: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
        cells: [...gripCol(0, 0, 6), wall(1, 0), wall(2, 0), exit(1, 6)],
      }),
    );
    let s = anchor(s0);
    expect(s.snake[0].anchored).toBe(true);
    // Climb: (move up; re-anchor the head) until the head reaches the exit.
    for (let target = 2; target <= 6; target++) {
      s = move(s, DIRS.up);
      expect(s.snake[0], `head after move to y=${target}`).toMatchObject({ x: 1, y: target });
      if (s.status === "won") break;
      s = anchor(s); // re-anchor the new head beside the wall
    }
    expect(s.status).toBe("won");
    expect(s.snake[0]).toMatchObject({ x: 1, y: 6 });
  });

  it("the climb replays from a recorded (anchor/move) sequence to won", () => {
    const s0 = makeState(
      lvl({
        snake: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
        cells: [...gripCol(0, 0, 6), wall(1, 0), wall(2, 0), exit(1, 6)],
      }),
    );
    // Recorded protocol: anchor, then (up, anchor) repeated. The shared replay
    // helper covers move/strike; anchor is directionless so we drive it inline.
    let s = anchor(s0);
    for (let i = 0; i < 5; i++) {
      s = move(s, DIRS.up);
      if (s.status === "won") break;
      s = anchor(s);
    }
    expect(s.status).toBe("won");
  });
});

describe("SPIKE-I2a", () => {
  it("an anchored snake holds while the head strikes up a grip wall (spike-before-content gate)", () => {
    // A snake hanging beside a grip wall at x=0 (rows 0..6). Head (1,3) adjacent
    // to grip(0,3); the body dangles further out over the void. Anchor the head;
    // the snake hangs. Then strike the head UP alongside the grip wall — the
    // anchored link stays beside the wall through the whole flight, so the snake
    // stays grounded and does not fall. (The snake is long enough that the
    // anchored head-link is not shed off the tail during the range-3 flight.)
    const s0 = makeState(
      lvl({
        snake: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }],
        cells: gripCol(0, 0, 6),
      }),
    );
    const anchored = anchor(s0);
    expect(anchored.snake[0].anchored).toBe(true);
    // Hangs: settle is a no-op while the anchored head still grips the wall.
    const hung = settle(anchored);
    expect(hung.snake[0]).toMatchObject({ x: 1, y: 3 });
    expect(hung.status).toBe("play");

    // Strike up: head climbs alongside the grip wall, stays grounded, no fall.
    const struck = strike(anchored, DIRS.up);
    expect(struck.status).toBe("play");
    expect(struck.snake[0].y).toBeGreaterThan(3);
    // The head is still beside the grip wall (column runs 0..6), so it still hangs.
    expect(gripBeside(struck, struck.snake[0])).toBe(true);
  });
});
