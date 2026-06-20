// World 7 "Two Bodies" — multi-body room construction (HLD §2.2.10 co-op core).
//
// The co-op CORE shipped at Inc 4b (the kernel iterates `[snake, ...bodies]`), but
// `LevelDef`/`buildState` model a SINGLE snake only (that is core surface, frozen
// outside this increment's partition). World 7 rooms therefore carry their own
// tiny multi-body spec and a pure builder here — exactly the construction pattern
// the co-op oracles use (coop.test.ts): build the cells via a throwaway single-
// snake level, then graft the multi-body shape on (the active `snake` plus the
// other `bodies`). No core change.
//
// Authoring stays ASCII-flavoured but EXPLICIT about which body is which: the
// `bodies` array lists each snake head-first; `bodies[0]` is the ACTIVE body the
// player starts controlling (Tab cycles through the rest). The state is built
// already-settled (the full resolve tail runs), matching every other room.

import { buildState, key, resolve } from "../../core/game";
import type { Entity, EntityKind, GameState, LevelDef, Segment, Vec } from "../../core/types";

/** A multi-body room. `cells` reference presets BY NAME (F6), exactly like a
 *  `LevelDef`; `bodies` lists each snake head-first, the ACTIVE body first. */
export interface CoopRoom {
  name: string;
  strikeRange: number;
  floorY: number;
  /** Head-first snakes; `bodies[0]` is the active body (player starts on it). */
  bodies: Vec[][];
  cells: { x: number; y: number; type: EntityKind; trigger?: string; door?: string }[];
}

/** Build a live, already-settled multi-body GameState from a CoopRoom. Cells are
 *  constructed by routing through `buildState` (a throwaway single-snake level
 *  parked far above everything), then the real multi-body shape is grafted on and
 *  the full resolve tail re-run so the room starts at rest — identical to how every
 *  single-snake room builds. */
export function buildCoop(room: CoopRoom): GameState {
  if (room.bodies.length < 2) {
    throw new Error(`buildCoop: ${room.name} needs >=2 bodies (got ${room.bodies.length})`);
  }
  // Reuse buildState purely for its preset-by-name cell construction (F6). The
  // throwaway snake is parked far above and discarded; only the cell map is kept.
  const base = buildState({
    name: room.name,
    strikeRange: room.strikeRange,
    floorY: room.floorY,
    snake: [{ x: 0, y: 100000 }],
    cells: room.cells,
  });
  const cells = new Map<string, Entity>();
  for (const [k, v] of base.cells) cells.set(k, v);

  const bodies = room.bodies.map((b) => b.map((p): Segment => ({ x: p.x, y: p.y })));
  return resolve({
    snake: bodies[0],
    bodies: bodies.slice(1),
    cells,
    strikeRange: room.strikeRange,
    floorY: room.floorY,
    status: "play",
    name: room.name,
  });
}

/**
 * A single-snake `LevelDef` PROJECTION of a co-op room (the ACTIVE body as the
 * snake, plus all the cells). This is NOT the playable state — co-op needs the
 * multi-body `buildCoop` — it exists only so the shell/renderer (which take a
 * `LevelDef` for camera framing and a non-crashing fallback) have a valid value
 * for a `RoomMeta.level` field. The real state comes from `RoomMeta.build`
 * (= `() => buildCoop(room)`). The other bodies are not in this projection, so the
 * renderer frames the active body's region; see the task report's renderer note.
 */
export function coopLevel(room: CoopRoom): LevelDef {
  return {
    name: room.name,
    strikeRange: room.strikeRange,
    floorY: room.floorY,
    snake: room.bodies[0].map((p) => ({ x: p.x, y: p.y })),
    cells: room.cells.map((c) => ({ ...c })),
  };
}

/** Re-export for room files that want to assert a cell directly. */
export { key };
