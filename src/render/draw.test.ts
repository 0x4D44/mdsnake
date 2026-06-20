// drawItems oracle (F3 — the renderer's first behavioural coverage).
//
// The bug it pins (F1/F6/F8/F9/F10): the old renderer iterated ONLY `state.snake`,
// so inactive co-op bodies were invisible. The per-coordinate assertion below
// FAILS under that active-only logic — it demands an item at EVERY segment of
// EVERY body — and passes once drawItems flattens `allBodies`.

import { describe, expect, it } from "vitest";
import { buildState, key } from "../core/game";
import type { CellType, GameState, LevelDef, Segment } from "../core/types";
import { drawItems, type SegmentItem } from "./draw";

// --- co-op fixture (same construction as core/coop.test.ts) -----------------

const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};
function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "coop", strikeRange: 3, floorY: 0, cells: [], ...p };
}
function coop(
  snake: Segment[],
  others: Segment[][],
  cells: { x: number; y: number; type: CellType }[],
): GameState {
  const map = new Map<string, import("../core/types").Entity>();
  const base = buildState(lvl({ snake: [{ x: 0, y: 100 }], cells }));
  for (const [k, v] of base.cells) map.set(k, v);
  return {
    snake: snake.map((p) => ({ ...p })),
    bodies: others.map((b) => b.map((p) => ({ ...p }))),
    cells: map,
    strikeRange: 3,
    floorY: 0,
    status: "play",
    name: "coop",
  };
}

const segItems = (state: GameState) =>
  drawItems(state).filter((i): i is SegmentItem => i.type === "segment");
const cellItems = (state: GameState) => drawItems(state).filter((i) => i.type === "cell");

describe("drawItems — every segment of every body is drawn", () => {
  // A two-body co-op state: active A (2 segs) and co-op B (3 segs) on a floor.
  const a: Segment[] = [{ x: 2, y: 1 }, { x: 1, y: 1 }];
  const b: Segment[] = [{ x: 6, y: 1 }, { x: 5, y: 1 }, { x: 4, y: 1 }];
  const state = coop(a, [b], floorRow(0, 0, 8));

  it("emits a segment item at EVERY coordinate of EVERY body (fails on active-only logic)", () => {
    const drawn = new Set(segItems(state).map((i) => key(i)));
    // The behavioural per-coordinate assertion: each segment of A AND of the
    // inactive co-op body B must have a drawn item.
    for (const seg of [...a, ...b]) {
      expect(drawn.has(key(seg)), `segment ${key(seg)} must be drawn`).toBe(true);
    }
    // And exactly one item per segment (no dropped or duplicated body).
    expect(segItems(state)).toHaveLength(a.length + b.length);
  });

  it("tags the active body 'active' and the co-op body 'other'", () => {
    const byPos = new Map(segItems(state).map((i) => [key(i), i]));
    expect(byPos.get(key(a[0]))?.role).toBe("active");
    expect(byPos.get(key(b[0]))?.role).toBe("other");
  });

  it("marks the head segment of EACH body (active anchor + co-op heads)", () => {
    const byPos = new Map(segItems(state).map((i) => [key(i), i]));
    expect(byPos.get(key(a[0]))?.head).toBe(true); // active head (camera anchor)
    expect(byPos.get(key(a[1]))?.head).toBe(false);
    expect(byPos.get(key(b[0]))?.head).toBe(true); // co-op head marked
    expect(byPos.get(key(b[1]))?.head).toBe(false);
  });

  it("draws every static cell, under the snake (cells precede segments)", () => {
    const floor = floorRow(0, 0, 8);
    expect(cellItems(state)).toHaveLength(floor.length);
    const items = drawItems(state);
    const firstSeg = items.findIndex((i) => i.type === "segment");
    const lastCell = items.map((i) => i.type).lastIndexOf("cell");
    expect(lastCell).toBeLessThan(firstSeg); // all cells before any segment
  });

  it("single-snake state (bodies absent) draws just the one body", () => {
    const solo = buildState(lvl({ snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], cells: floorRow(0, 0, 3) }));
    expect(solo.bodies).toBeUndefined();
    const segs = segItems(solo);
    expect(segs).toHaveLength(2);
    expect(segs.every((s) => s.role === "active")).toBe(true);
  });
});
