// PURE presentation projection — the testable half of the renderer.
//
// `drawItems(state)` flattens a GameState into the flat list of things to draw,
// in draw order, with NO Three.js and NO renderer state (camera, dark mode, the
// scoring-only egg marker — those are layered on by the renderer itself). It is
// pure (state in -> array out), so the renderer's coverage can be asserted as an
// oracle: every cell and EVERY segment of EVERY body (active and co-op) appears.
//
// The active body is `state.snake`; the co-op bodies are `state.bodies` (§2.2.10).
// The old renderer iterated ONLY `state.snake`, so inactive co-op bodies were
// invisible (F1/F6/F8/F9/F10); drawing the items from `allBodies` fixes that.

import { allBodies } from "../core/game";
import type { Entity, GameState, Segment } from "../core/types";

/** A static cell to draw (wall/fruit/exit/…); carries its entity so the renderer
 *  can pick the per-kind style and read derived flags (e.g. an OPEN gate). */
export interface CellItem {
  type: "cell";
  x: number;
  y: number;
  entity: Entity;
}

/** A snake segment to draw, tagged by its body's role so the renderer can colour
 *  it: `active` = the player-controlled body, `other` = a co-op body (dimmed /
 *  desaturated). `head` marks the first segment of EITHER (the active head is the
 *  camera / dark-radius anchor; co-op heads are marked so each snake reads apart).
 *  `seg` carries the segment so anchored/carry decoration survives the projection. */
export interface SegmentItem {
  type: "segment";
  x: number;
  y: number;
  role: "active" | "other";
  head: boolean;
  seg: Segment;
}

export type DrawItem = CellItem | SegmentItem;

/**
 * Flatten a GameState into the draw list, in draw order: all static cells first
 * (drawn under the snake), then every segment of every body — the ACTIVE body
 * (`state.snake`) and then each co-op body (`state.bodies`), via the core's
 * canonical `allBodies` helper so the iteration matches the kernel exactly.
 */
export function drawItems(state: GameState): DrawItem[] {
  const items: DrawItem[] = [];

  for (const [k, entity] of state.cells) {
    const [x, y] = k.split(",").map(Number);
    items.push({ type: "cell", x, y, entity });
  }

  // index 0 of allBodies is the active body (state.snake); the rest are co-op.
  const bodies = allBodies(state);
  bodies.forEach((body, bi) => {
    const role: SegmentItem["role"] = bi === 0 ? "active" : "other";
    body.forEach((seg, si) => {
      items.push({ type: "segment", x: seg.x, y: seg.y, role, head: si === 0, seg });
    });
  });

  return items;
}
