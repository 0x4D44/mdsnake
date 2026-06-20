import { describe, expect, it } from "vitest";
import { buildState, DIRS, move, settle, strike } from "./game";
import type { CellType, LevelDef } from "./types";

function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "t", strikeRange: 3, floorY: 0, cells: [], ...p };
}
const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const fruit = (x: number, y: number) => ({ x, y, type: "fruit" as CellType });
const exit = (x: number, y: number) => ({ x, y, type: "exit" as CellType });
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

  // T-STRIKE-3 — a strike that ends over a void falls and dies (final settle runs).
  it("T-STRIKE-3: ending over a void falls and dies", () => {
    // Floor only at x=0,1; nothing beyond. Strike right launches the head to
    // x=2,3,4 over open void, then the final settle drops it past floorY.
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: floor(0, 0, 1) }));
    const n = strike(s, DIRS.right);
    expect(n.status).toBe("dead");
  });

  // T-STRIKE-4 — a strike through a fruit eats mid-flight (len+1, fruit gone, flight continues).
  it("T-STRIKE-4: eats a fruit mid-flight and keeps flying", () => {
    // Floor x=0,1 then fruit at x=2 then floor x=3..6. Strike right: x=2 eats
    // (grows), x=3, x=4 — lands on floor, status play, length 3, fruit removed.
    const s = buildState(
      lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floor(0, 0, 1), fruit(2, 1), ...floor(0, 3, 6)] }),
    );
    const n = strike(s, DIRS.right);
    expect(n.status).toBe("play");
    expect(n.snake.length).toBe(3);
    expect(n.snake[0]).toEqual({ x: 4, y: 1 });
    expect(n.cells.has("2,1")).toBe(false);
  });

  // T-STRIKE-5 — a strike hitting a wall stops at the last legal cell.
  it("T-STRIKE-5: stops short at a wall", () => {
    // Floor 0..6, wall at x=4,y=1. Strike right from x=1: x=2, x=3, then x=4 is
    // a wall -> stop. Head ends at x=3.
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floor(0, 0, 6), wall(4, 1)] }));
    const n = strike(s, DIRS.right);
    expect(n.status).toBe("play");
    expect(n.snake[0]).toEqual({ x: 3, y: 1 });
  });

  // T-STRIKE-NOOP — a strike with no legal first step returns the SAME reference.
  it("T-STRIKE-NOOP: no legal first step returns the same reference", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floor(0, 0, 6), wall(2, 1)] }));
    expect(strike(s, DIRS.right)).toBe(s);
  });
});

describe("void / self", () => {
  // T-VOID-PARTIAL — a snake half over a void does NOT die (every-segment rule).
  it("T-VOID-PARTIAL: half over a void stays alive", () => {
    // Only support is wall(1,0): segment at x=1 rests on it; segment at x=2 is
    // over the void. isSupported is "SOME segment supported", so it holds.
    const s = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [wall(1, 0)] }));
    expect(s.status).toBe("play");
    expect(s.snake[0]).toEqual({ x: 2, y: 1 });
  });

  // T-EAT-SELF — stepping into the tail cell while eating (full-snake branch) is blocked.
  it("T-EAT-SELF: eating into the tail cell is blocked", () => {
    // C-shape: head (1,2) adjacent to tail (2,2). A fruit sits on the tail cell.
    // Moving right targets (2,2): because it eats, the tail does NOT vacate, so
    // the tail still occupies the target -> blocked -> same reference.
    const s = buildState(
      lvl({ snake: [{ x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }], cells: [...floor(0, 0, 3), fruit(2, 2)] }),
    );
    expect(move(s, DIRS.right)).toBe(s);
  });
});

describe("buildState (T-BUILD)", () => {
  it("settles a level to rest", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [wall(1, 0)] }));
    expect(s.status).toBe("play");
    expect(s.snake[0]).toEqual({ x: 1, y: 1 });
  });

  it("settles an air-authored level down onto support", () => {
    const s = buildState(lvl({ snake: [{ x: 3, y: 9 }, { x: 2, y: 9 }], cells: floor(0, 0, 5) }));
    expect(s.status).toBe("play");
    expect(s.snake[0]).toEqual({ x: 3, y: 1 });
    expect(s.snake[1]).toEqual({ x: 2, y: 1 });
  });

  it("builds dead when there is no support", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] }));
    expect(s.status).toBe("dead");
  });

  it("builds won when the head falls onto the exit", () => {
    // Head floats above an exit at (1,1); build settles it down onto the exit and
    // checkWin (run on each fall step) wins. This is the current build-win path.
    const s = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [wall(1, 0), exit(1, 1)] }));
    expect(s.status).toBe("won");
    expect(s.snake[0]).toEqual({ x: 1, y: 1 });
  });

  it("INC-1 LIMITATION: a head RESTING on the exit at build does NOT win", () => {
    // Documented pre-refactor behaviour: buildState only wins if the snake FALLS
    // onto the exit (checkWin runs only inside settle's fall loop). A snake that
    // starts already supported ON the exit stays 'play' — there is no post-settle
    // checkEnd until Inc 3 (HLD §4.3 F10). Pinned so the refactor preserves it.
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }], cells: [wall(1, 0), exit(1, 1)] }));
    expect(s.status).toBe("play");
  });
});

describe("terminal (T-TERMINAL)", () => {
  it("move/strike on a won state return the same reference", () => {
    const won = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: [...floor(0, 0, 6), exit(3, 1)] }));
    const w = move(won, DIRS.right);
    expect(w.status).toBe("won");
    expect(move(w, DIRS.left)).toBe(w);
    expect(strike(w, DIRS.left)).toBe(w);
  });

  it("move/strike on a dead state return the same reference", () => {
    const dead = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [] }));
    expect(dead.status).toBe("dead");
    expect(move(dead, DIRS.left)).toBe(dead);
    expect(strike(dead, DIRS.left)).toBe(dead);
  });
});

describe("win timing (D28)", () => {
  // T-WIN-FALL — a head falling through an exit cell during settle wins at that
  // instant, and the win survives the rest of the fall (no revert to dead).
  it("T-WIN-FALL: falling through an exit wins, and the win is terminal", () => {
    // Snake floats at y=5, an exit sits at (1,2). No floor at all below it, so
    // absent the exit it would fall to the void and die. settle drops it: at
    // y=2 the head is on the exit -> won, and the remaining drop must not revert.
    const s = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [exit(1, 2)] }));
    expect(s.status).toBe("won");
    expect(s.snake[0]).toEqual({ x: 1, y: 2 });
  });

  // T-WIN-STRIKE-CROSS — a head crossing an exit cell mid-strike wins at that instant.
  it("T-WIN-STRIKE-CROSS: crossing an exit mid-strike wins", () => {
    // Floor 0..6, exit at (3,1). Strike right from x=1: x=2, then x=3 is the
    // exit -> won mid-flight, flight stops.
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floor(0, 0, 6), exit(3, 1)] }));
    const n = strike(s, DIRS.right);
    expect(n.status).toBe("won");
    expect(n.snake[0]).toEqual({ x: 3, y: 1 });
  });

  // T-WIN-STRIKE-VOID — a strike crossing an exit mid-flight that would otherwise
  // end over the void stays 'won' after the FULL resolve (status-monotonicity).
  it("T-WIN-STRIKE-VOID: win mid-strike survives a would-be void death", () => {
    // Floor 0,1 then exit at (2,1) then NOTHING. Strike right: x=2 is the exit ->
    // won. Were the win not terminal, the remaining flight + settle over void
    // would flip it to dead. It must stay won.
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], strikeRange: 3, cells: [...floor(0, 0, 1), exit(2, 1)] }));
    const n = strike(s, DIRS.right);
    expect(n.status).toBe("won");
  });
});

describe("settle iteration cap", () => {
  it("a high snake over a deep void dies (cap not exceeded)", () => {
    const s = buildState(lvl({ snake: [{ x: 0, y: 30 }], cells: [] }));
    expect(s.status).toBe("dead");
  });

  it("settle never throws on a rest state", () => {
    const s = buildState(lvl({ snake: [{ x: 1, y: 1 }], cells: [wall(1, 0)] }));
    expect(() => settle(s)).not.toThrow();
  });
});
