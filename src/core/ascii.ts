// Pure ASCII-art room parser -> LevelDef (HLD §2.6, T-ASCII).
//
// A room is DRAWN as rows of glyphs (top row first, as you'd sketch it on
// paper), turned by this PURE function into a `LevelDef` whose cells reference a
// preset BY NAME (never a raw entity literal — F6). It is the authoring front
// door for World 1+; its oracle is `ascii.test.ts`.
//
// Coordinate system (matches the sim core: y is UP, gravity pulls toward -y).
// Rows are listed top-to-bottom; the BOTTOM row maps to `floorY` and each row
// above increments y by one. Columns map left-to-right to x starting at 0.
//
// Default glyph table:
//   '#' wall    'o' fruit    'X' exit    '*' heat lamp    '.' or ' ' air
//   '0'..'9'    snake segments, '0' = head, ascending toward the tail
// A per-room LEGEND block maps an arbitrary glyph -> a preset (with optional
// overrides), and OVERRIDES the default table for that glyph. The legend is how
// id-bearing cells (Inc 3 plates/gates with trigger/door ids) will be authored;
// in Inc 1 it carries preset names only, exercising the same indirection.

import type { EntityKind, LevelDef, Vec } from "./types";

/** A legend entry: a preset name plus any per-cell overrides. Inc 3 adds the
 *  id-bearing overrides: a `plate` glyph carries a `trigger` id, a `gate` glyph a
 *  `door` id. These are the ONLY sanctioned overrides (F6) — raw flag literals
 *  still never appear in level data. */
export interface LegendEntry {
  type: EntityKind;
  /** Plate mechanism id (for a `plate` preset). */
  trigger?: string;
  /** Gate mechanism id (for a `gate` preset). */
  door?: string;
}

export interface RoomSpec {
  name: string;
  strikeRange: number;
  /** The bottom row's y. Rows above it increment y. */
  floorY: number;
  /** The room drawing, top row first. Each string is one row of glyphs. */
  rows: string[];
  /** Optional glyph -> preset overrides; wins over the default glyph table. */
  legend?: Record<string, LegendEntry>;
}

const DEFAULT_GLYPHS: Record<string, EntityKind> = {
  "#": "wall",
  o: "fruit",
  X: "exit",
  // Inc 3 / World 5 "Dark": a heat lamp. Renderer-only marker (byte-inert to the
  // core); '*' reads as a glow on the sketch. The snake can pass through it.
  "*": "heatlamp",
};

const AIR = new Set([".", " "]);
const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9";

/** Parse a drawn room into a LevelDef. Throws on a malformed room. */
export function parseRoom(spec: RoomSpec): LevelDef {
  const { name, strikeRange, floorY, rows, legend = {} } = spec;
  if (rows.length === 0) throw new Error("parseRoom: room has no rows");

  const cells: LevelDef["cells"] = [];
  // digit value -> position, so we can order the snake head-first afterwards.
  const segByOrder = new Map<number, Vec>();

  const height = rows.length;
  for (let r = 0; r < height; r++) {
    const row = rows[r];
    // Top row (r=0) is the highest y; bottom row (r=height-1) is floorY.
    const y = floorY + (height - 1 - r);
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (AIR.has(ch)) continue;

      if (isDigit(ch)) {
        const order = ch.charCodeAt(0) - 48;
        if (segByOrder.has(order)) {
          throw new Error(`parseRoom: duplicate snake segment '${ch}' (at ${x},${y})`);
        }
        segByOrder.set(order, { x, y });
        continue;
      }

      // Legend wins over the default glyph table for the same character.
      const entry = legend[ch];
      const type = entry ? entry.type : DEFAULT_GLYPHS[ch];
      if (type === undefined) {
        throw new Error(`parseRoom: unknown glyph '${ch}' (at ${x},${y})`);
      }
      // Carry any per-cell mechanism id overrides (Inc 3): a plate's trigger id,
      // a gate's door id. Only emit the field when the legend supplies it.
      const cell: LevelDef["cells"][number] = { x, y, type };
      if (entry?.trigger !== undefined) cell.trigger = entry.trigger;
      if (entry?.door !== undefined) cell.door = entry.door;
      cells.push(cell);
    }
  }

  const snake = orderSnake(segByOrder);
  return { name, strikeRange, floorY, snake, cells };
}

/** Turn the digit-keyed segment map into an ordered head-first snake, erroring
 *  if the head is missing or the digit run is not contiguous (0..n-1). */
function orderSnake(segByOrder: Map<number, Vec>): Vec[] {
  if (segByOrder.size === 0) throw new Error("parseRoom: room has no snake (no '0' head)");
  if (!segByOrder.has(0)) throw new Error("parseRoom: snake has no head (glyph '0')");
  const snake: Vec[] = [];
  for (let i = 0; i < segByOrder.size; i++) {
    const seg = segByOrder.get(i);
    if (seg === undefined) {
      throw new Error(`parseRoom: snake segments are not contiguous (missing '${i}')`);
    }
    snake.push(seg);
  }
  return snake;
}
