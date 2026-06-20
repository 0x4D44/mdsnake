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
import { buildState } from "./game";

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
    // glyphs land on the correct, distinct cells. When plate/gate presets exist
    // (Inc 3) these become trigger:g1/door:g1 vs trigger:g2/door:g2.
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
