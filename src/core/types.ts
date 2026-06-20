// Pure data model for the Coil sim core. No rendering, no DOM, no Three.js.
// Everything here is plain, serializable, and deterministic so the rules can
// be unit-tested as input -> output and undo is just a snapshot stack.

export interface Vec {
  x: number;
  y: number;
}

/** A movement direction is just a unit Vec. */
export type Dir = Vec;

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
  // --- added only when its world arrives (the §2.3 "no on-ramps" ledger) ---
  // grip / heat / trigger / door / pickup / egg are deliberately ABSENT until
  // the increment that uses them.
}

/** The preset keys. Grows with each increment that adds an entity. */
export type EntityKind = "wall" | "fruit" | "exit";

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
});

export interface GameState {
  /** Ordered, head first. */
  snake: Vec[];
  /** Sparse map of "x,y" -> Entity. Absent key === empty air. */
  cells: Map<string, Entity>;
  /** How many cells a single strike launches the head. */
  strikeRange: number;
  /** Anything that falls entirely below this y is in the void (death). */
  floorY: number;
  status: Status;
  name: string;
}

export interface LevelDef {
  name: string;
  strikeRange: number;
  floorY: number;
  /** Ordered, head first. */
  snake: Vec[];
  /** Cells reference a preset BY NAME (`type`), never a raw entity literal. */
  cells: { x: number; y: number; type: EntityKind }[];
}
