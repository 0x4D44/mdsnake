// The world / room registry (HLD §2.6) — an ORDERED index of worlds, each
// carrying its rooms with par / constraint / egg metadata. This is the curriculum
// skeleton the renderer/shell walk; the rooms themselves are LevelDefs (authored
// via the ASCII format where it fits, §2.6).
//
// Inc 1 ships World 1 (Hatchling), R1-R7. Later increments append worlds here.

import type { LevelDef } from "../core/types";
import { r1 } from "./world1/r1";
import { r2 } from "./world1/r2";
import { r3 } from "./world1/r3";
import { r4 } from "./world1/r4";
import { r5 } from "./world1/r5";
import { r6 } from "./world1/r6";
import { r7 } from "./world1/r7";

/** An optional per-room scoring constraint (the "constraint egg", §2.7). It is a
 *  pure predicate over the recorded solve, evaluated OUTSIDE the core. Inc 1 only
 *  carries the simplest forms as data; the evaluator lands with scoring (Inc 4). */
export interface Constraint {
  /** Human-readable description of the bonus condition. */
  label: string;
  /** Solve in at most this many moves. */
  maxMoves?: number;
  /** Finish with the snake no longer than this. */
  maxLength?: number;
}

export interface RoomMeta {
  /** Stable id, e.g. "w1r1". */
  id: string;
  level: LevelDef;
  /** Hand-authored optimal move count (§2.7); == the recorded solution length. */
  par: number;
  /** Optional constraint egg. */
  constraint?: Constraint;
  /** Whether the room hides a collectible egg (a marked fruit en route). */
  hiddenEgg: boolean;
}

export interface World {
  id: string;
  name: string;
  rooms: RoomMeta[];
}

export const WORLDS: World[] = [
  {
    id: "w1",
    name: "Hatchling",
    rooms: [
      { id: "w1r1", level: r1, par: 7, hiddenEgg: false },
      { id: "w1r2", level: r2, par: 5, hiddenEgg: true },
      { id: "w1r3", level: r3, par: 1, hiddenEgg: false, constraint: { label: "min length", maxLength: 4 } },
      { id: "w1r4", level: r4, par: 2, hiddenEgg: true },
      { id: "w1r5", level: r5, par: 2, hiddenEgg: true },
      { id: "w1r6", level: r6, par: 4, hiddenEgg: false, constraint: { label: "one strike", maxMoves: 4 } },
      { id: "w1r7", level: r7, par: 5, hiddenEgg: false },
    ],
  },
];

/** Flat ordered list of all rooms across all worlds (shell convenience). */
export const ALL_ROOMS: RoomMeta[] = WORLDS.flatMap((w) => w.rooms);
