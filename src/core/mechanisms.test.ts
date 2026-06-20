// T-MECH-1/2/3 (HLD §4.3, §2.2.6) — the plate->gate mechanism pass.
//
// `applyMechanisms(s)` is a PURE, DETERMINISTIC, NO-LATCH derivation run in the
// shared resolve tail after settle:
//
//   triggers = { ids of plates currently under ANY segment of ANY body }
//   gate.solid = !(gate.door in triggers) && !(gate cell occupied by any segment)
//
// A gate is held open by EITHER its plate OR a body in its mouth; its solidity is
// recomputed from scratch every turn, so stepping off a plate (with an empty gate
// mouth) re-closes the gate, and a body in the mouth keeps it open with no crush.
//
// Occupancy is an existential set-membership test (ANY segment), so it is
// order-independent across bodies.

import { describe, expect, it } from "vitest";
import { applyMechanisms, buildState, DIRS, key, move, resolve } from "./game";
import type { CellType, GameState, LevelDef } from "./types";

// --- authoring helpers ------------------------------------------------------
const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const plate = (x: number, y: number, id: string) => ({ x, y, type: "plate" as CellType, trigger: id });
const gate = (x: number, y: number, id: string) => ({ x, y, type: "gate" as CellType, door: id });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};
function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "m", strikeRange: 3, floorY: 0, cells: [], ...p };
}
const cellAt = (s: GameState, x: number, y: number) => s.cells.get(key({ x, y }));

describe("applyMechanisms — plate presses gate (T-MECH-1)", () => {
  // Layout (y up). Floor at y=0 across 0..6. A plate 'g1' at (1,1); a gate 'g1'
  // at (4,1). Snake head at (1,1) ON the plate, tail at (0,1).
  //   y=1:  1=tail@0  head@1(plate g1)  .  .  gate@4(g1)  .  .
  //   y=0:  # # # # # # #
  function pressed(): GameState {
    // A single-segment snake on the plate, so a single move right fully clears it
    // (a length-2 snake would trail its tail onto the just-vacated plate cell).
    return buildState(
      lvl({
        snake: [{ x: 1, y: 1 }],
        cells: [...floorRow(0, 0, 6), plate(1, 1, "g1"), gate(4, 1, "g1")],
      }),
    );
  }

  it("a segment on a plate opens its gate after the resolve tail (built state)", () => {
    const s = pressed();
    // buildState routes through the full resolve tail (F10), so the gate is
    // already open because the snake starts on the plate.
    expect(cellAt(s, 4, 1)?.solid).toBe(false);
    expect(s.triggers?.has("g1")).toBe(true);
  });

  it("stepping OFF the plate with an empty gate mouth re-closes the gate (no latch)", () => {
    const s = pressed();
    // Move the head right off the plate; the tail trails off too. With the gate
    // mouth (4,1) still empty, the gate re-closes.
    const n = move(s, DIRS.right);
    // Head now at (2,1); plate (1,1) no longer under any segment.
    expect(n.snake[0]).toEqual({ x: 2, y: 1 });
    expect(n.snake.length).toBe(1);
    expect(n.triggers?.has("g1")).toBe(false);
    expect(cellAt(n, 4, 1)?.solid).toBe(true);
  });

  it("the gate is closed (solid) when no segment is on the plate", () => {
    // Same layout but the snake starts AWAY from the plate.
    const s = buildState(
      lvl({
        snake: [{ x: 6, y: 1 }, { x: 5, y: 1 }],
        cells: [...floorRow(0, 0, 6), plate(1, 1, "g1"), gate(3, 1, "g1")],
      }),
    );
    expect(cellAt(s, 3, 1)?.solid).toBe(true);
    expect(s.triggers?.has("g1") ?? false).toBe(false);
  });
});

describe("applyMechanisms — occupied gate stays open, no crush (T-MECH-2)", () => {
  it("a segment IN the gate mouth holds it open even with the plate released", () => {
    // Gate 'g1' at (3,1); NO plate pressed. The snake occupies the gate cell.
    // Occupancy alone holds it open (no crush, no latch).
    const s = buildState(
      lvl({
        snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }],
        cells: [...floorRow(0, 0, 6), gate(3, 1, "g1")],
      }),
    );
    // The gate cell is occupied by the head -> derived solid:false. The snake is
    // NOT killed/crushed: status stays play, head still at (3,1).
    expect(s.status).toBe("play");
    expect(s.snake[0]).toEqual({ x: 3, y: 1 });
    expect(cellAt(s, 3, 1)?.solid).toBe(false);
  });

  it("the snake can keep moving through an occupied gate (no crush as it passes)", () => {
    const s = buildState(
      lvl({
        snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }],
        cells: [...floorRow(0, 0, 6), gate(3, 1, "g1")],
      }),
    );
    const n = move(s, DIRS.right); // head leaves the gate to (4,1); tail enters (3,1)
    expect(n.status).toBe("play");
    expect(n.snake[0]).toEqual({ x: 4, y: 1 });
    // Tail now occupies the gate cell -> still open.
    expect(cellAt(n, 3, 1)?.solid).toBe(false);
  });
});

describe("applyMechanisms — determinism, no-op, purity (T-MECH-3)", () => {
  const base = () =>
    buildState(
      lvl({
        snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
        cells: [...floorRow(0, 0, 6), plate(1, 1, "g1"), gate(4, 1, "g1")],
      }),
    );

  it("is deterministic: replaying the same input log yields identical solidity", () => {
    const a = move(base(), DIRS.right);
    const b = move(base(), DIRS.right);
    expect(cellAt(a, 4, 1)?.solid).toBe(cellAt(b, 4, 1)?.solid);
    expect([...(a.triggers ?? [])].sort()).toEqual([...(b.triggers ?? [])].sort());
  });

  it("is a no-op (same reference) on a state with no plates and no gates", () => {
    const s = buildState(lvl({ snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }], cells: floorRow(0, 0, 6) }));
    expect(applyMechanisms(s)).toBe(s);
  });

  it("is a no-op (same reference) when the derived solidity matches the current state", () => {
    // Idempotence: applyMechanisms over its own output changes nothing.
    const s = base();
    const once = resolve(s); // already mechanism-resolved by buildState; resolve again
    expect(applyMechanisms(once)).toBe(once);
  });

  it("does not mutate its input (purity)", () => {
    const s = base();
    const beforeSolid = cellAt(s, 4, 1)?.solid;
    const beforeTriggers = [...(s.triggers ?? [])].sort();
    applyMechanisms(s);
    expect(cellAt(s, 4, 1)?.solid).toBe(beforeSolid);
    expect([...(s.triggers ?? [])].sort()).toEqual(beforeTriggers);
  });

  it("two plates -> two gates: each gate keyed to its OWN plate id (distinct ids)", () => {
    // Plate g1 at (1,1) pressed by the head; plate g2 at far end UNpressed.
    // Gate g1 should be open, gate g2 should be closed.
    const s = buildState(
      lvl({
        snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
        cells: [
          ...floorRow(0, 0, 8),
          plate(1, 1, "g1"),
          plate(7, 1, "g2"),
          gate(3, 1, "g1"),
          gate(5, 1, "g2"),
        ],
      }),
    );
    expect(cellAt(s, 3, 1)?.solid).toBe(false); // g1 pressed -> open
    expect(cellAt(s, 5, 1)?.solid).toBe(true); //  g2 unpressed, mouth empty -> closed
    expect(s.triggers?.has("g1")).toBe(true);
    expect(s.triggers?.has("g2") ?? false).toBe(false);
  });
});
