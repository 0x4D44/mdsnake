// T-ASCII (HLD §4.1): the pure ASCII-room parser produces the exact expected
// LevelDef for a well-formed room, errors on a bad glyph / malformed snake, and
// the per-room legend block overrides the default glyph table.
//
// Plate/gate id-bearing legend cases (distinct trigger/door ids g1/g2) are an
// Inc-3 concern — those presets do not exist yet. Here we exercise the SAME
// legend indirection with Inc-1 presets, so the mechanism is proven now and only
// gains override fields when the id-bearing presets land.

import { describe, expect, it } from "vitest";
import { parseRoom } from "./ascii";
import { buildState, DIRS, move } from "./game";

describe("parseRoom — well-formed room", () => {
  it("parses glyphs and an ordered head-first snake to the exact LevelDef", () => {
    // Drawn top-to-bottom; bottom row is floorY (=0). '0' head, '1' tail.
    //   y=1:  . 1 0 o . X
    //   y=0:  # # # # # #
    const def = parseRoom({
      name: "t",
      strikeRange: 3,
      floorY: 0,
      rows: [
        ".10o.X",
        "######",
      ],
    });

    expect(def.name).toBe("t");
    expect(def.strikeRange).toBe(3);
    expect(def.floorY).toBe(0);
    // Snake is head-first: '0' then '1'.
    expect(def.snake).toEqual([
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ]);
    // Cells: the full floor, the fruit, the exit. Order: row-by-row top→bottom,
    // left→right.
    expect(def.cells).toEqual([
      { x: 3, y: 1, type: "fruit" },
      { x: 5, y: 1, type: "exit" },
      { x: 0, y: 0, type: "wall" },
      { x: 1, y: 0, type: "wall" },
      { x: 2, y: 0, type: "wall" },
      { x: 3, y: 0, type: "wall" },
      { x: 4, y: 0, type: "wall" },
      { x: 5, y: 0, type: "wall" },
    ]);
  });

  it("treats both '.' and ' ' as air", () => {
    const def = parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: [" 0 ", "###"] });
    expect(def.snake).toEqual([{ x: 1, y: 1 }]);
    expect(def.cells).toHaveLength(3);
  });

  it("maps the bottom row to floorY and rows above incrementing y (honours floorY)", () => {
    const def = parseRoom({ name: "t", strikeRange: 3, floorY: 5, rows: ["0", "#"] });
    expect(def.snake).toEqual([{ x: 0, y: 6 }]);
    expect(def.cells).toEqual([{ x: 0, y: 5, type: "wall" }]);
  });

  it("round-trips through buildState into a playable settled state", () => {
    const s = buildState(
      parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: ["0 X", "###"] }),
    );
    expect(s.status).toBe("play");
    expect(s.snake[0]).toEqual({ x: 0, y: 1 });
  });
});

describe("parseRoom — legend block", () => {
  it("overrides the default glyph table for a glyph (Inc-1 preset indirection)", () => {
    // 'W' is not a default glyph; the legend maps it to a wall preset. '*' is not
    // a default glyph; the legend maps it to fruit. This exercises the same
    // glyph->preset indirection the Inc-3 id-bearing cells will use.
    const def = parseRoom({
      name: "t",
      strikeRange: 3,
      floorY: 0,
      rows: ["0*", "WW"],
      legend: { W: { type: "wall" }, "*": { type: "fruit" } },
    });
    expect(def.cells).toEqual([
      { x: 1, y: 1, type: "fruit" },
      { x: 0, y: 0, type: "wall" },
      { x: 1, y: 0, type: "wall" },
    ]);
  });

  it("a legend entry can rebind a default glyph", () => {
    // Rebind '#' to exit via the legend; it should win over the default wall.
    const def = parseRoom({
      name: "t",
      strikeRange: 3,
      floorY: 0,
      rows: ["0", "#"],
      legend: { "#": { type: "exit" } },
    });
    expect(def.cells).toEqual([{ x: 0, y: 0, type: "exit" }]);
  });

  it("assigns DISTINCT legend glyphs to the right cells (two-pair shape, Inc-1 presets)", () => {
    // Inc-1 stand-in for the Inc-3 two-pair Pressure case: two distinct legend
    // glyphs land on the correct, distinct cells.
    const def = parseRoom({
      name: "t",
      strikeRange: 3,
      floorY: 0,
      rows: ["0.a.b", "#####"],
      legend: { a: { type: "fruit" }, b: { type: "exit" } },
    });
    expect(def.cells).toContainEqual({ x: 2, y: 1, type: "fruit" });
    expect(def.cells).toContainEqual({ x: 4, y: 1, type: "exit" });
  });

  it("T-ASCII two-pair Pressure room: plate/gate glyphs parse to DISTINCT ids (g1/g2)", () => {
    // The real Inc-3 case: two plate/gate PAIRS via id-bearing legend entries.
    //   P/Q are plates with trigger ids g1/g2; A/B are gates with door ids g1/g2.
    const def = parseRoom({
      name: "t",
      strikeRange: 3,
      floorY: 0,
      rows: [
        "0PAQB",
        "#####",
      ],
      legend: {
        P: { type: "plate", trigger: "g1" },
        Q: { type: "plate", trigger: "g2" },
        A: { type: "gate", door: "g1" },
        B: { type: "gate", door: "g2" },
      },
    });
    // Each glyph lands on its correct, distinct cell with its OWN id — g1 cells
    // carry trigger/door "g1", g2 cells "g2", and the ids never cross-contaminate.
    expect(def.cells).toContainEqual({ x: 1, y: 1, type: "plate", trigger: "g1" });
    expect(def.cells).toContainEqual({ x: 2, y: 1, type: "gate", door: "g1" });
    expect(def.cells).toContainEqual({ x: 3, y: 1, type: "plate", trigger: "g2" });
    expect(def.cells).toContainEqual({ x: 4, y: 1, type: "gate", door: "g2" });
    // A plate glyph carries NO door id and vice-versa (no cross field).
    const p1 = def.cells.find((c) => c.x === 1)!;
    expect(p1.door).toBeUndefined();
    const a1 = def.cells.find((c) => c.x === 2)!;
    expect(a1.trigger).toBeUndefined();
  });

  it("a parsed Pressure room: stepping the head onto a plate opens its gate", () => {
    // Head '0' starts beside plate P (g1); gate A (g1) is two cells past it. Both
    // gates start CLOSED (no plate pressed). One step right puts the head on P and
    // opens A; B (g2, untouched) stays shut. Proves the parser's ids drive the
    // live mechanism end-to-end.
    const s = buildState(
      parseRoom({
        name: "t",
        strikeRange: 3,
        floorY: 0,
        rows: [
          "0PA.QB",
          "######",
        ],
        legend: {
          P: { type: "plate", trigger: "g1" },
          Q: { type: "plate", trigger: "g2" },
          A: { type: "gate", door: "g1" },
          B: { type: "gate", door: "g2" },
        },
      }),
    );
    // At build: head at (0,1), not on any plate -> both gates closed.
    expect(s.cells.get("2,1")?.solid).toBe(true); // gate A (g1)
    expect(s.cells.get("5,1")?.solid).toBe(true); // gate B (g2)
    // Step right onto plate P (1,1) -> gate A opens; B unaffected.
    const n = move(s, DIRS.right);
    expect(n.snake[0]).toEqual({ x: 1, y: 1 });
    expect(n.triggers?.has("g1")).toBe(true);
    expect(n.cells.get("2,1")?.solid).toBe(false); // gate A now open
    expect(n.cells.get("5,1")?.solid).toBe(true); //  gate B still shut
  });
});

describe("parseRoom — errors on a malformed room", () => {
  it("errors on an unknown glyph", () => {
    expect(() => parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: ["0?", "##"] })).toThrow(
      /unknown glyph '\?'/,
    );
  });

  it("errors when there is no snake head", () => {
    expect(() => parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: ["..", "##"] })).toThrow(
      /no snake/,
    );
  });

  it("errors when the snake digits are not contiguous from 0", () => {
    // '0' and '2' but no '1' — a gap.
    expect(() => parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: ["0 2", "###"] })).toThrow(
      /not contiguous/,
    );
  });

  it("errors on a duplicate snake segment", () => {
    expect(() => parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: ["00", "##"] })).toThrow(
      /duplicate snake segment/,
    );
  });

  it("errors when given a snake with no head even if higher digits exist via gap", () => {
    expect(() => parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: ["1", "#"] })).toThrow(
      /no head/,
    );
  });

  it("errors on an empty room", () => {
    expect(() => parseRoom({ name: "t", strikeRange: 3, floorY: 0, rows: [] })).toThrow(/no rows/);
  });
});
