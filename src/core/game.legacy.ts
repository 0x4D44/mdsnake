// FROZEN pre-Inc3 kernel - do not edit
//
// Verbatim copy of `core/game.ts` as it stood IMMEDIATELY BEFORE the Inc-3
// resolve-tail extraction (`resolve = checkEnd(applyMechanisms(settle(s)))`). It
// exists solely as the OLD comparand for T-RESOLVE-EQUIV (resolve-equiv.test.ts,
// HLD §4.3 / D21): the differential oracle proves the NEW kernel's `move`/`strike`
// are deep-equal to these (mechanisms absent). Per the HLD it is deleted once Inc 3
// lands green. NEVER edit this file — a divergence here is the comparand, not the spec.
//
// ---------------------------------------------------------------------------
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

import type { Dir, Entity, GameState, LevelDef, Vec } from "./types";
import { PRESETS } from "./types";

export const key = (v: Vec): string => `${v.x},${v.y}`;

export const DIRS: Record<"up" | "down" | "left" | "right", Dir> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const eq = (a: Vec, b: Vec): boolean => a.x === b.x && a.y === b.y;

export function cellAt(s: GameState, v: Vec): Entity | undefined {
  return s.cells.get(key(v));
}

/**
 * Is a grip surface within reach of `seg` (an orthogonally-adjacent grip cell)?
 *
 * NOTE on "on a grip cell" (§2.5/§2.2.4): the HLD prose says a segment grounds
 * while it "sits on a grip cell", but the frozen `anchor` PRESET is `solid:true`
 * — a segment can never OCCUPY a solid grip cell. The coherent reading (and the
 * physical picture of "climb ALONG a grip wall", §2.2.4) is therefore that a
 * segment grips a grip surface ADJACENT to it. We check the four orthogonal
 * neighbours, which is what makes the canonical climb (move the head up the wall)
 * actually work. (Recorded as a blocker/HLD inconsistency in the task report.)
 */
export function gripBeside(s: GameState, seg: Vec): boolean {
  return (
    cellAt(s, { x: seg.x + 1, y: seg.y })?.grip === true ||
    cellAt(s, { x: seg.x - 1, y: seg.y })?.grip === true ||
    cellAt(s, { x: seg.x, y: seg.y + 1 })?.grip === true ||
    cellAt(s, { x: seg.x, y: seg.y - 1 })?.grip === true
  );
}

/**
 * Is some segment a grounding source this turn?
 *
 *   groundingSource(seg) := (world cell BELOW seg has `supports`)
 *                           OR (seg.anchored AND a grip surface is within reach)
 *
 * The first clause is the original world-support rule (a cell you stand on). The
 * second (Inc 2 / §2.5 / D25) is anchored-on-grip: an anchored segment grounds
 * the snake — but ONLY while it is currently gripping a grip surface. The stored
 * `anchored` flag is INTENT; the grip surface is the TRUTH, derived each turn
 * with no latch — a segment carried off the grip wall stops grounding the snake
 * (T-ANCHOR-CARRY).
 *
 * Segments never support each other (rigid fall); multi-body chains land Inc 4.
 */
function isSupported(s: GameState): boolean {
  return s.snake.some(
    (seg) =>
      cellAt(s, { x: seg.x, y: seg.y - 1 })?.supports === true ||
      (seg.anchored === true && gripBeside(s, seg)),
  );
}

function checkWin(s: GameState): GameState {
  if (s.status === "play" && cellAt(s, s.snake[0])?.win === true) {
    return { ...s, status: "won" };
  }
  return s;
}

/**
 * One grid step of the head in `dir`, with NO gravity. Returns the new state,
 * or null if the step is blocked (a `solid` cell, or the snake's own body —
 * excluding the tail cell, which vacates unless the step eats).
 */
function tryStep(s: GameState, dir: Dir): GameState | null {
  const head = s.snake[0];
  const target: Vec = { x: head.x + dir.x, y: head.y + dir.y };
  const t = cellAt(s, target);
  if (t?.solid === true) return null;

  const eating = t?.eat === true;
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
  // Hard iteration cap (P-SETTLE-TERMINATION): the snake drops 1 per step and
  // dies once every segment is below floorY, so it can never take more than
  // (highest segment above floorY) + 2 steps. The +2 absorbs the boundary and
  // the win/death check ordering. This bound is a defence-in-depth guard against
  // a future non-terminating settle; it must NEVER fire in correct operation.
  const maxY = cur.snake.reduce((m, p) => Math.max(m, p.y), cur.floorY);
  const cap = maxY - cur.floorY + 2;
  let iters = 0;
  while (cur.status === "play" && !isSupported(cur)) {
    if (iters++ > cap) {
      throw new Error(`settle exceeded iteration cap ${cap} (non-terminating gravity)`);
    }
    // Drop one cell. Preserve per-segment state (`anchored` travels with the
    // segment) — a falling segment keeps its intent even though it is no longer
    // grounding (it is, by definition, not on a grip cell while falling).
    const snake = cur.snake.map((p) => ({ ...p, y: p.y - 1 }));
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

/**
 * Toggle the anchor on the segment currently sitting on a `grip` cell (Inc 2,
 * §2.2.4). This is the ONE verb the game needs beyond move/strike: anchoring is
 * a choice the player makes about their own body that gravity must read, so it
 * cannot be board data alone.
 *
 * - Picks the FIRST segment (head-first) on a grip cell and flips its `anchored`.
 * - NO-OP (same reference) if the state is terminal or NO segment is on a grip
 *   cell (T-ANCHOR-NOOP) — so the shell's `next === state` no-op detection holds.
 * - Pure: returns a new state with a new snake array; the toggled segment is a
 *   fresh object, every other segment is shared (unchanged).
 *
 * Settle is NOT run here — `anchor` only changes intent; it does not move the
 * snake. The shell (and the climb sequence) settle via the next move/strike.
 */
export function anchor(s: GameState): GameState {
  if (s.status !== "play") return s;
  const idx = s.snake.findIndex((seg) => gripBeside(s, seg));
  if (idx === -1) return s; // no grip surface within reach of any segment: no-op
  const snake = s.snake.map((seg, i) =>
    i === idx ? { ...seg, anchored: !seg.anchored } : seg,
  );
  return { ...s, snake };
}

/** Build a live, already-settled GameState from a static level definition.
 *  Each cell references a preset BY NAME; we map it to the frozen PRESETS entity
 *  here — raw flag literals never appear in level data (F6). */
export function buildState(level: LevelDef): GameState {
  const cells = new Map<string, Entity>();
  for (const c of level.cells) cells.set(key(c), PRESETS[c.type]);
  return settle({
    snake: level.snake.map((p) => ({ ...p })),
    cells,
    strikeRange: level.strikeRange,
    floorY: level.floorY,
    status: "play",
    name: level.name,
  });
}
