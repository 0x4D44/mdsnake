// Pure data model for the Coil sim core. No rendering, no DOM, no Three.js.
// Everything here is plain, serializable, and deterministic so the rules can
// be unit-tested as input -> output and undo is just a snapshot stack.

export interface Vec {
  x: number;
  y: number;
}

/** A movement direction is just a unit Vec. */
export type Dir = Vec;

/** Non-empty cells in the world. Anything not present is empty air. */
export type CellType = "wall" | "fruit" | "exit";

export type Status = "play" | "won" | "dead";

export interface GameState {
  /** Ordered, head first. */
  snake: Vec[];
  /** Sparse map of "x,y" -> CellType. Absent key === empty air. */
  cells: Map<string, CellType>;
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
  cells: { x: number; y: number; type: CellType }[];
}
