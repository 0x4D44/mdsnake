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

import type { Dir, Entity, GameState, LevelDef, Segment, Vec } from "./types";
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
 *
 * The gut is the HEAD's: a swallowed `carry` always rides on `snake[0]`. On every
 * step it moves to the NEW head (and off the old one), so it cannot be left behind
 * as the body shifts forward — otherwise it would slide down the body and vanish
 * off the tail. Three interactions with the target cell, in precedence order:
 *   - SWALLOW (Inc 4): a `pickup` cell is steppable EVEN IF solid — stepping onto
 *     it stores the entity on the new head as `carry` (length UNCHANGED, like a
 *     shift), clears the cell, and the gut must be empty (a full gut blocks it).
 *   - EAT: an `eat` cell grows the snake (+1, tail kept) and clears the cell; the
 *     gut (if any) rides forward onto the new head.
 *   - PLAIN: otherwise a normal step (tail vacates); the gut rides onto the new head.
 */
function tryStep(s: GameState, dir: Dir): GameState | null {
  const head = s.snake[0];
  const target: Vec = { x: head.x + dir.x, y: head.y + dir.y };
  const t = cellAt(s, target);

  // SWALLOW takes precedence over solid: a pickup block is steppable-to-swallow.
  // But only if the head's gut is empty — a full gut means the cell blocks like
  // any solid (no-op), exactly as if there were nothing to swallow it into.
  const swallowing = t?.pickup === true && head.carry === undefined;
  if (t?.solid === true && !swallowing) return null;

  const eating = !swallowing && t?.eat === true;
  // When neither eating nor swallowing, the tail vacates, so its cell is free.
  const body = eating ? s.snake : s.snake.slice(0, -1);
  if (body.some((seg) => eq(seg, target))) return null;

  // The gut after this step: a swallow fills it with the swallowed entity; any
  // other step carries the old head's gut forward onto the new head.
  const carry = swallowing ? t : head.carry;
  const newHead: Segment = carry === undefined ? { ...target } : { ...target, carry };

  // GROW keeps the tail; SHIFT/SWALLOW drop it (length unchanged). The retained
  // body follows the new head. Its FIRST element is the OLD head, whose gut has
  // moved to the new head — so strip its `carry` (else the block double-counts and
  // then slides off the tail). For a length-1 snake `kept` is empty, so the snake
  // stays length-1 on a shift, exactly as before.
  const kept = eating ? s.snake : s.snake.slice(0, -1);
  const trail =
    kept.length > 0 && kept[0].carry !== undefined
      ? [(({ carry: _omit, ...rest }) => rest)(kept[0]), ...kept.slice(1)]
      : kept;
  const snake = [newHead, ...trail];

  if (!swallowing && !eating) return { ...s, snake };

  // swallow or eat both clear the target cell.
  const cells = new Map(s.cells);
  cells.delete(key(target));
  return { ...s, snake, cells };
}

/** Apply gravity until the snake is supported, wins, or falls into the void. */
export function settle(s: GameState): GameState {
  // STATUS-MONOTONICITY (D28): a won/dead state is terminal and does not fall.
  // Early-return the SAME reference so the no-op identity holds end-to-end.
  if (s.status !== "play") return s;
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

/**
 * Mechanism pass (Inc 3, §2.4/§2.2.6): plates + occupancy -> gate solidity.
 *
 * PURE, DETERMINISTIC, NO LATCH. Recomputed from scratch every resolve:
 *
 *   triggers = { ids of plates currently under ANY segment of ANY body }
 *   gate.solid = !(gate.door in triggers) && !(gate cell occupied by any segment)
 *
 * A gate is held open by EITHER its plate OR a body in its mouth; both are derived
 * from the CURRENT state, so there is no cross-turn latched state. Occupancy is an
 * existential set-membership test ("any segment of any body"), so it is
 * order-independent across bodies (Inc 4 widens the body iteration; the formula is
 * unchanged).
 *
 * M1 single-pass guard (§2.1/§2.2.6, T-PRESETS): a `gate` NEVER sets `supports`,
 * so changing a gate's solidity can never alter the grounded set — settle never
 * needs to re-run after this pass.
 *
 * NO-OP IDENTITY (P-NOOP-IDENTITY): if nothing changes (no plates/gates, or the
 * derived solidity already matches), the SAME reference is returned so the shell's
 * `next === state` no-op detection holds.
 *
 * STATUS-MONOTONICITY (D28): a no-op on a terminal state, never downgrading it.
 */
export function applyMechanisms(s: GameState): GameState {
  if (s.status !== "play") return s;

  // Fast path: a room with no plates AND no gates has no mechanism to resolve.
  let hasMech = false;
  for (const e of s.cells.values()) {
    if (e.trigger !== undefined || e.door !== undefined) {
      hasMech = true;
      break;
    }
  }
  if (!hasMech) return s;

  // Every segment of every body (Inc 4 adds `bodies`; today just `snake`).
  const occupied = new Set<string>();
  for (const seg of s.snake) occupied.add(key(seg));

  // triggers = plate ids currently under any segment.
  const triggers = new Set<string>();
  for (const [k, e] of s.cells) {
    if (e.trigger !== undefined && e.trigger !== "" && occupied.has(k)) {
      triggers.add(e.trigger);
    }
  }

  // Recompute each gate's solidity from triggers + occupancy. Build a new cell
  // map only if some gate actually changes (preserve referential no-op identity).
  let cells: Map<string, Entity> | null = null;
  for (const [k, e] of s.cells) {
    if (e.door === undefined) continue;
    const open = triggers.has(e.door) || occupied.has(k);
    const solid = !open;
    if (Boolean(e.solid) !== solid) {
      if (cells === null) cells = new Map(s.cells);
      cells.set(k, { ...e, solid });
    }
  }

  const triggersChanged = !sameSet(s.triggers, triggers);
  if (cells === null && !triggersChanged) return s; // genuine no-op: same reference

  return { ...s, cells: cells ?? s.cells, triggers };
}

/** Set equality (order-independent). An absent set compares equal to an empty one. */
function sameSet(a: Set<string> | undefined, b: Set<string>): boolean {
  const an = a ?? EMPTY_SET;
  if (an.size !== b.size) return false;
  for (const v of an) if (!b.has(v)) return false;
  return true;
}
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/**
 * The end-of-turn guard. For the SINGLE body it is a REDUNDANT final win check
 * (the instant win already fired during settle / strike flight); it becomes the
 * sole win authority in multi-body play (Inc 4, WIN-before-death). Today it is
 * exactly the existing single-head win check.
 *
 * STATUS-MONOTONICITY (D28): a no-op on a terminal state — a `won`/`dead` status
 * is never downgraded or overwritten.
 */
export function checkEnd(s: GameState): GameState {
  if (s.status !== "play") return s;
  return checkWin(s);
}

/**
 * The shared resolve tail (Inc 3 extraction, §2.4):
 *
 *   resolve(s) = checkEnd(applyMechanisms(settle(s)))
 *
 * Every verb (and `buildState`, F10/G7) routes its post-action candidate through
 * this single tail. Each pass is `s -> s` and no-ops (returns the same reference)
 * on a terminal state (status-monotonicity, D28), so purity and the shell's
 * `next === state` no-op detection are preserved. Pre-mechanism, `resolve` is
 * behaviour-equivalent to the old inline `settle(...)` tail — pinned by
 * T-RESOLVE-EQUIV against the frozen pre-extraction kernel (game.legacy.ts).
 */
export function resolve(s: GameState): GameState {
  return checkEnd(applyMechanisms(settle(s)));
}

export function move(s: GameState, dir: Dir): GameState {
  if (s.status !== "play") return s;
  const stepped = tryStep(s, dir);
  if (!stepped) return s;
  return resolve(checkWin(stepped));
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
  return resolve(cur);
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

/**
 * Deposit the head's carried entity into the adjacent cell in `dir` (Inc 4,
 * §2.2.8 / §2.2.9). The carried entity becomes a normal `cells` entity again — a
 * deposited `object` (solid + supports) is then static structure: it blocks a
 * full-gutted snake's step and bears the snake's weight from below (the shed-skin
 * decoy as a step / wall, T-DECOY). This is the "deposit modifier", not a fresh
 * verb: it reuses the carry machinery.
 *
 * NOTE on "holds a plate" (§2.2.9): a deposited block presses a plate / holds a
 * gate ONLY by occupying that mechanism's cell, but the single-entity-per-cell
 * `cells` map cannot hold both a plate/gate AND a block at one coordinate, and the
 * mechanism pass (§2.2.6) keys occupancy off SNAKE SEGMENTS, not cell entities. So
 * the literal "plate-holder" use is not expressible in this model without a layered
 * cell representation; the implemented decoy is the static-structure (support/wall)
 * half of T-DECOY. (Reported as a blocker.)
 *
 * - NO-OP (same reference) if the state is terminal, the head carries nothing, or
 *   the target cell is blocked/occupied (a `cells` entity is present, or any snake
 *   segment sits there) — so the shell's `next === state` no-op detection holds.
 * - Pure: returns a new state with a fresh head (carry cleared), a shared tail,
 *   and a new cells map with the deposited entity.
 * - Settle is run via `resolve`: a deposited solid can newly ground a snake that
 *   was about to fall, and the deposit can otherwise leave the snake unsupported.
 *   The deposit itself moves no segment, so on solid ground the resolve is a
 *   referential no-op of the snake; only the cells map changed.
 */
export function deposit(s: GameState, dir: Dir): GameState {
  if (s.status !== "play") return s;
  const head = s.snake[0];
  const carried = head.carry;
  if (carried === undefined) return s; // empty gut: nothing to deposit
  const target: Vec = { x: head.x + dir.x, y: head.y + dir.y };
  // The target must be empty: no existing cell entity AND no snake segment.
  if (cellAt(s, target) !== undefined) return s;
  if (s.snake.some((seg) => eq(seg, target))) return s;

  // Drop the carry from the head; place the entity into the target cell.
  const newHead = { ...head };
  delete newHead.carry;
  const snake = [newHead, ...s.snake.slice(1)];
  const cells = new Map(s.cells);
  cells.set(key(target), carried);
  return resolve({ ...s, snake, cells });
}

/** Build a live, already-settled GameState from a static level definition.
 *  Each cell references a preset BY NAME; we map it to the frozen PRESETS entity
 *  here — raw flag literals never appear in level data (F6). */
export function buildState(level: LevelDef): GameState {
  const cells = new Map<string, Entity>();
  for (const c of level.cells) {
    const preset = PRESETS[c.type];
    // A plate carries a per-cell `trigger` id; a gate a per-cell `door` id. These
    // are the ONLY sanctioned overrides (F6) — applied on top of the named preset,
    // producing a fresh per-cell entity (never the frozen singleton) so the gate's
    // derived solidity can change without touching the table.
    if (c.trigger !== undefined || c.door !== undefined) {
      const e: Entity = { ...preset };
      if (c.trigger !== undefined) e.trigger = c.trigger;
      if (c.door !== undefined) e.door = c.door;
      cells.set(key(c), e);
    } else {
      cells.set(key(c), preset);
    }
  }
  // F10/G7: build routes through the FULL resolve tail, not a bare settle. So an
  // authored head-resting-on-exit now builds `won` (checkEnd fires post-settle),
  // and — from the mechanism stage — a segment starting on a plate builds with
  // its gate already open, matching in-play behaviour.
  return resolve({
    snake: level.snake.map((p) => ({ ...p })),
    cells,
    strikeRange: level.strikeRange,
    floorY: level.floorY,
    status: "play",
    name: level.name,
  });
}
