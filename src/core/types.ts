// Pure data model for the Coil sim core. No rendering, no DOM, no Three.js.
// Everything here is plain, serializable, and deterministic so the rules can
// be unit-tested as input -> output and undo is just a snapshot stack.

export interface Vec {
  x: number;
  y: number;
}

/** A movement direction is just a unit Vec. */
export type Dir = Vec;

/**
 * A snake body cell. A superset of `Vec` (so cell/dir math is unchanged); the
 * extra fields are per-segment body state added by the increment that needs them.
 *   `anchored` (Inc 2): the player has gripped this segment. INTENT only — it is a
 *   grounding source ONLY while the segment currently sits on a `grip` cell (D25,
 *   derived each turn, no latch). The flag travels with the segment when it moves.
 */
export interface Segment {
  x: number;
  y: number;
  anchored?: boolean;
}

export type Status = "play" | "won" | "dead";

// --- Entity model -----------------------------------------------------------
//
// A cell's behaviour is an entity of ORTHOGONAL property flags — exactly the
// questions the rules already ask. The hot rule call-sites (step / support /
// eat / win) read these FLAGS, never the `kind` string, so they never grow a
// per-ability branch. New abilities become new PRESETS rows + a renderer branch,
// not new code paths in the kernel.
//
// Entities are constructed ONLY via the frozen PRESETS table below (referenced
// BY NAME from level data — never a raw flag literal in a level), so flag-soup
// invalidity (e.g. win+solid+eat) has no syntactic path into the data. The one
// remaining gap — a malformed PRESETS row — is closed by the build-time
// T-PRESETS assert.

export interface Entity {
  /** For the renderer + readability; rules read flags, not kind. */
  kind: EntityKind;
  /** Blocks a step (today: wall). */
  solid?: boolean;
  /** Bears the snake's weight from below (today: wall). */
  supports?: boolean;
  /** Stepping onto it grows the snake & removes it (today: fruit). */
  eat?: boolean;
  /** Head on it -> won (today: exit). */
  win?: boolean;
  /** A surface a segment may anchor on (Inc 2 / World 3). */
  grip?: boolean;
  /** A pressure plate: while ANY snake segment sits on it, its mechanism id is
   *  pressed (Inc 3 / World 4). Non-solid, non-support — you stand ON it. The
   *  id is per-cell, so it is set as an OVERRIDE on the `plate` preset, never in
   *  the frozen preset row itself. */
  trigger?: string;
  /** A gate: a solid whose solidity is DERIVED each turn by `applyMechanisms`
   *  from whether its `door` id is pressed OR its cell is occupied (Inc 3 /
   *  World 4). M1: a gate NEVER sets `supports` (its solidity is derived, so it
   *  can never be a grounding source — §2.1/§2.2.6). The id is per-cell, set as
   *  an OVERRIDE on the `gate` preset. */
  door?: string;
  /** A heat source: visible in the dark (Inc 3 / World 5). RENDERER-ONLY — the
   *  core never reads this flag, so a `heat` cell is byte-inert to every rule
   *  (collision/gravity/win). Pinned by CORE-REGRESSION-HEAT (§4.3): a known room
   *  solves identically with heat cells sprinkled in vs without (§2.2.7). */
  heat?: boolean;
  // --- added only when its world arrives (the §2.3 "no on-ramps" ledger) ---
  // pickup / egg are deliberately ABSENT until the increment that uses them.
}

/** The preset keys. Grows with each increment that adds an entity. */
export type EntityKind = "wall" | "fruit" | "exit" | "anchor" | "plate" | "gate" | "heatlamp";

/**
 * Back-compat alias: level data authors a cell by its preset NAME, which is an
 * `EntityKind`. The old `CellType` name is kept as that alias so existing casts
 * and test helpers compile unchanged.
 */
export type CellType = EntityKind;

/**
 * The ONLY sanctioned way to construct an entity. Frozen so a preset cannot be
 * mutated at runtime, and the single source of truth for what each kind means.
 *
 * M1 construction guard (asserted by T-PRESETS): any preset whose solidity is
 * DERIVED during a mechanism pass (none yet — gates arrive at Inc 3) MUST have
 * falsy `supports`, so a mechanism state change can never alter the grounded set
 * and settle never needs to re-run after the mechanism pass.
 */
export const PRESETS: Readonly<Record<EntityKind, Entity>> = Object.freeze({
  wall: Object.freeze<Entity>({ kind: "wall", solid: true, supports: true }),
  fruit: Object.freeze<Entity>({ kind: "fruit", eat: true }),
  exit: Object.freeze<Entity>({ kind: "exit", win: true }),
  // Inc 2 / World 3: a grip wall. Solid (you cannot walk through it) and a world
  // support like any wall, but additionally `grip:true` so a segment ON it may be
  // anchored (an anchored-on-grip segment grounds the snake, §2.5/D25).
  anchor: Object.freeze<Entity>({ kind: "anchor", solid: true, supports: true, grip: true }),
  // Inc 3 / World 4 "Pressure": a pressure plate. Non-solid (you stand ON it),
  // non-support (it does not bear weight from below — you rest on the floor under
  // it). Its `trigger` id is set PER CELL as an override; the frozen row carries
  // an empty id placeholder so the shape is complete.
  plate: Object.freeze<Entity>({ kind: "plate", trigger: "" }),
  // Inc 3 / World 4: a gate. A solid whose solidity is DERIVED each turn by
  // applyMechanisms. M1 (single-pass guard): it MUST NEVER set `supports`, so a
  // gate state change can never alter the grounded set and settle never re-runs
  // after the mechanism pass. `door` id is set PER CELL as an override.
  gate: Object.freeze<Entity>({ kind: "gate", solid: true, door: "" }),
  // Inc 3 / World 5 "Dark": a heat lamp. RENDERER-ONLY — `heat:true` and NOTHING
  // else (no solid/support/eat/win), so the core is byte-inert to it: a heat cell
  // never blocks a step, bears weight, grows the snake, or wins. The renderer dims
  // everything except heat sources, the snake, and a small radius round the head;
  // the dark puzzle is purely about remembering geometry you saw lit (§2.2.7).
  heatlamp: Object.freeze<Entity>({ kind: "heatlamp", heat: true }),
});

export interface GameState {
  /** Ordered, head first. */
  snake: Segment[];
  /** Sparse map of "x,y" -> Entity. Absent key === empty air. */
  cells: Map<string, Entity>;
  /** How many cells a single strike launches the head. */
  strikeRange: number;
  /** Anything that falls entirely below this y is in the void (death). */
  floorY: number;
  status: Status;
  name: string;
  /** Mechanism ids currently pressed — recomputed from scratch every resolve by
   *  `applyMechanisms` (no cross-turn latch, §2.2.6). ABSENT until the first
   *  mechanism pass writes it; a level with no plates/gates never carries it. */
  triggers?: Set<string>;
}

export interface LevelDef {
  name: string;
  strikeRange: number;
  floorY: number;
  /** Ordered, head first. (A `Vec[]` suffices for authoring; segment state is
   *  set at runtime, not in the static level.) */
  snake: Vec[];
  /** Cells reference a preset BY NAME (`type`), never a raw entity literal. The
   *  optional `trigger`/`door` are per-cell mechanism ids (Inc 3): a `plate`
   *  carries a `trigger` id, a `gate` carries a `door` id, applied as an override
   *  on top of the named preset by `buildState`. */
  cells: { x: number; y: number; type: EntityKind; trigger?: string; door?: string }[];
}
