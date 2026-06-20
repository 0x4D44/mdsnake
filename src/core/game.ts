// Coil sim core — the single source of truth for the rules.
//
// Model: a discrete 2.5D grid. The puzzle lives in a vertical plane: x is
// horizontal, y is up, gravity pulls toward -y. (The third axis exists only
// for presentation.) Lineage is Snakebird: the snake's own body is the tool,
// gravity settles after every action, and the whole snake falls as one rigid
// body when nothing supports it.
//
// Two verbs:
//   move(dir)   — one step, then gravity settles. Falls into gaps.
//   strike(dir) — up to `strikeRange` steps with gravity suppressed mid-flight,
//                 then a single settle. This is the "jump": it sails over gaps
//                 and reaches ledges a plain move cannot. (Coil-to-charge that
//                 scales range with body length is a later iteration; for now
//                 strikeRange is a fixed level/snake parameter.)
//
// All functions are pure: they take a state and return a NEW state, never
// mutating the input. That makes undo a trivial snapshot stack and the rules
// straightforward to test.

import type { CellType, Dir, GameState, LevelDef, Vec } from "./types";

export const key = (v: Vec): string => `${v.x},${v.y}`;

export const DIRS: Record<"up" | "down" | "left" | "right", Dir> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const eq = (a: Vec, b: Vec): boolean => a.x === b.x && a.y === b.y;

export function cellAt(s: GameState, v: Vec): CellType | undefined {
  return s.cells.get(key(v));
}

/** Only walls bear weight. Segments never support each other (rigid fall). */
function isSupported(s: GameState): boolean {
  return s.snake.some((seg) => cellAt(s, { x: seg.x, y: seg.y - 1 }) === "wall");
}

function checkWin(s: GameState): GameState {
  if (s.status === "play" && cellAt(s, s.snake[0]) === "exit") {
    return { ...s, status: "won" };
  }
  return s;
}

/**
 * One grid step of the head in `dir`, with NO gravity. Returns the new state,
 * or null if the step is blocked (wall, or the snake's own body — excluding the
 * tail cell, which vacates unless the step eats fruit).
 */
function tryStep(s: GameState, dir: Dir): GameState | null {
  const head = s.snake[0];
  const target: Vec = { x: head.x + dir.x, y: head.y + dir.y };
  const t = cellAt(s, target);
  if (t === "wall") return null;

  const eating = t === "fruit";
  // When not eating, the tail vacates this turn, so its current cell is free.
  const body = eating ? s.snake : s.snake.slice(0, -1);
  if (body.some((seg) => eq(seg, target))) return null;

  const snake = eating
    ? [target, ...s.snake] // grow: keep the tail
    : [target, ...s.snake.slice(0, -1)]; // shift: drop the tail

  if (!eating) return { ...s, snake };

  const cells = new Map(s.cells);
  cells.delete(key(target));
  return { ...s, snake, cells };
}

/** Apply gravity until the snake is supported, wins, or falls into the void. */
export function settle(s: GameState): GameState {
  let cur = s;
  while (cur.status === "play" && !isSupported(cur)) {
    const snake = cur.snake.map((p) => ({ x: p.x, y: p.y - 1 }));
    cur = { ...cur, snake };
    if (cur.snake.every((p) => p.y < cur.floorY)) {
      cur = { ...cur, status: "dead" };
      break;
    }
    cur = checkWin(cur);
  }
  return cur;
}

export function move(s: GameState, dir: Dir): GameState {
  if (s.status !== "play") return s;
  const stepped = tryStep(s, dir);
  if (!stepped) return s;
  return settle(checkWin(stepped));
}

export function strike(s: GameState, dir: Dir): GameState {
  if (s.status !== "play") return s;
  let cur = s;
  let moved = false;
  for (let i = 0; i < s.strikeRange; i++) {
    const stepped = tryStep(cur, dir);
    if (!stepped) break; // hit a wall / body: strike stops short
    cur = checkWin(stepped);
    moved = true;
    if (cur.status !== "play") break;
  }
  if (!moved) return s;
  return settle(cur);
}

/** Build a live, already-settled GameState from a static level definition. */
export function buildState(level: LevelDef): GameState {
  const cells = new Map<string, CellType>();
  for (const c of level.cells) cells.set(key(c), c.type);
  return settle({
    snake: level.snake.map((p) => ({ ...p })),
    cells,
    strikeRange: level.strikeRange,
    floorY: level.floorY,
    status: "play",
    name: level.name,
  });
}
