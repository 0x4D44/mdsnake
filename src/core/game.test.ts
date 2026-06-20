import { describe, expect, it } from "vitest";
import { buildState, DIRS, move, strike } from "./game";
import type { CellType, LevelDef } from "./types";

function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "t", strikeRange: 3, floorY: 0, cells: [], ...p };
}
const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const floor = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};

describe("move", () => {
  it("advances the head and trails the body", () => {
    const s = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: floor(0, 0, 5) }));
    const n = move(s, DIRS.right);
    expect(n.snake[0]).toEqual({ x: 3, y: 1 });
    expect(n.snake[1]).toEqual({ x: 2, y: 1 });
    expect(n.snake.length).toBe(2);
  });

  it("is blocked by a wall", () => {
    const s = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floor(0, 0, 5), wall(3, 1)] }));
    expect(move(s, DIRS.right)).toBe(s);
  });

  it("is blocked by its own body", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }], cells: floor(0, 0, 4) }));
    expect(move(s, DIRS.right)).toBe(s);
  });

  it("can enter the cell its tail vacates", () => {
    // C-shape: head top-left, tail bottom-left; moving the head down into the
    // tail's cell is legal because the tail moves out of it this turn.
    const s = buildState(
      lvl({ snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }], cells: floor(0, 0, 3) }),
    );
    const n = move(s, DIRS.down);
    expect(n).not.toBe(s);
    expect(n.snake[0]).toEqual({ x: 2, y: 1 });
  });
});

describe("fruit", () => {
  it("grows the snake and consumes the fruit", () => {
    const s = buildState(
      lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floor(0, 0, 5), { x: 3, y: 1, type: "fruit" }] }),
    );
    const n = move(s, DIRS.right);
    expect(n.snake.length).toBe(3);
    expect(n.snake[0]).toEqual({ x: 3, y: 1 });
    expect(n.cells.has("3,1")).toBe(false);
  });
});

describe("exit", () => {
  it("wins when the head reaches the exit", () => {
    const s = buildState(
      lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floor(0, 0, 5), { x: 3, y: 1, type: "exit" }] }),
    );
    expect(move(s, DIRS.right).status).toBe("won");
  });
});

describe("gravity", () => {
  it("settles a floating snake down onto support", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [wall(1, 0)] }));
    expect(s.snake[0]).toEqual({ x: 1, y: 1 });
    expect(s.status).toBe("play");
  });

  it("dies when it falls into the void", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] }));
    expect(s.status).toBe("dead");
  });
});

describe("strike", () => {
  it("sails over a gap that a plain step would fall into", () => {
    // floor at x=0,1 and x=4,5,6; void at x=2,3.
    const cells = [...floor(0, 0, 1), ...floor(0, 4, 6)];
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells }));
    const n = strike(s, DIRS.right);
    expect(n.status).toBe("play");
    expect(n.snake[0]).toEqual({ x: 4, y: 1 });
  });
});
