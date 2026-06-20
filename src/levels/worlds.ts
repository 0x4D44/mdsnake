// The world / room registry (HLD §2.6) — an ORDERED index of worlds, each
// carrying its rooms with par / constraint / egg metadata. This is the curriculum
// skeleton the renderer/shell walk; the rooms themselves are LevelDefs (authored
// via the ASCII format where it fits, §2.6).
//
// Inc 1 ships World 1 (Hatchling), R1-R7. Later increments append worlds here.

import type { GameState, LevelDef, Vec } from "../core/types";
import { buildState } from "../core/game";
import { buildCoop, coopLevel } from "./world7/coop-room";
import { r1 } from "./world1/r1";
import { r2 } from "./world1/r2";
import { r3 } from "./world1/r3";
import { r4 } from "./world1/r4";
import { r5 } from "./world1/r5";
import { r6 } from "./world1/r6";
import { r7 } from "./world1/r7";
import { r1 as w2r1 } from "./world2/r1";
import { r2 as w2r2 } from "./world2/r2";
import { r3 as w2r3 } from "./world2/r3";
import { r4 as w2r4 } from "./world2/r4";
import { r5 as w2r5 } from "./world2/r5";
import { r1 as w3r1 } from "./world3/r1";
import { r2 as w3r2 } from "./world3/r2";
import { r3 as w3r3 } from "./world3/r3";
import { r4 as w3r4 } from "./world3/r4";
import { r5 as w3r5 } from "./world3/r5";
import { r1 as w4r1 } from "./world4/r1";
import { r2 as w4r2 } from "./world4/r2";
import { r3 as w4r3 } from "./world4/r3";
import { r4 as w4r4 } from "./world4/r4";
import { r5 as w4r5 } from "./world4/r5";
import { r1 as w5r1 } from "./world5/r1";
import { r2 as w5r2 } from "./world5/r2";
import { r3 as w5r3 } from "./world5/r3";
import { r4 as w5r4 } from "./world5/r4";
import { r5 as w5r5 } from "./world5/r5";
import { r6 as w5r6 } from "./world5/r6";
import { r1 as w6r1 } from "./world6/r1";
import { r2 as w6r2 } from "./world6/r2";
import { r3 as w6r3 } from "./world6/r3";
import { r4 as w6r4 } from "./world6/r4";
import { r5 as w6r5 } from "./world6/r5";
import { r6 as w6r6 } from "./world6/r6";
import { r1 as w7r1 } from "./world7/r1";
import { r2 as w7r2 } from "./world7/r2";
import { r3 as w7r3 } from "./world7/r3";
import { r4 as w7r4 } from "./world7/r4";
import { r1 as w8r1 } from "./world8/r1";
import { r2 as w8r2 } from "./world8/r2";
import { r3 as w8r3 } from "./world8/r3";

/** An optional per-room scoring constraint (the "constraint egg", §2.7). It is a
 *  pure predicate over the recorded solve, evaluated OUTSIDE the core. Inc 1 only
 *  carries the simplest forms as data; the evaluator lands with scoring (Inc 4). */
export interface Constraint {
  /** Human-readable description of the bonus condition. */
  label: string;
  /** Solve in at most this many moves. */
  maxMoves?: number;
  /** The snake never grows longer than this during the run. */
  maxLength?: number;
  /** Solve without ever using a strike. */
  noStrike?: boolean;
}

export interface RoomMeta {
  /** Stable id, e.g. "w1r1". */
  id: string;
  /** A single-snake level definition. For ordinary rooms this is the playable
   *  level; for a CO-OP room (World 7, §2.2.10) it is a single-snake PROJECTION
   *  (active body + cells) used only by the shell/renderer for camera framing and
   *  a non-crashing fallback — the playable multi-body state comes from `build`. */
  level: LevelDef;
  /** How to build the live, already-settled playable state. ABSENT for ordinary
   *  rooms (the shell uses `buildState(level)`); PRESENT for co-op rooms, where it
   *  constructs the multi-body state (`bodies` populated) the single-snake `level`
   *  cannot express. The single uniform accessor `buildRoom(meta)` hides the choice. */
  build?: () => GameState;
  /** True for a World-7 co-op room (two bodies; Tab cycles the active one). The
   *  shell reads this to label the room / enable the Tab control hint. */
  coop?: boolean;
  /** Hand-authored optimal move count (§2.7); == the recorded solution length. */
  par: number;
  /** Optional constraint egg. */
  constraint?: Constraint;
  /** Whether the room hides a collectible egg (a marked cell en route). */
  hiddenEgg: boolean;
  /** WHERE the hidden egg sits (HLD §2.7, scoring-only — NOT a core entity). The
   *  egg is "collected" iff any snake segment occupies this cell during the run
   *  (scoring reads the trace; the core never knows — see scoring.ts). Present iff
   *  `hiddenEgg` is true. Authors place a visible lure (a fruit) here on the board;
   *  collection is purely positional, independent of eating it. */
  eggAt?: Vec;
  /** Whether the room is rendered DARK (Inc 3 / World 5 "Dark", §2.2.7). This is a
   *  PRESENTATION flag ONLY — the renderer dims everything except heat sources, the
   *  snake, and a small radius round the head. The sim core never reads it; rules
   *  are byte-identical lit or dark (CORE-REGRESSION-HEAT). Absent === lit. */
  dark?: boolean;
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
      { id: "w1r2", level: r2, par: 5, hiddenEgg: true, eggAt: { x: 5, y: 1 } },
      { id: "w1r3", level: r3, par: 1, hiddenEgg: false, constraint: { label: "min length", maxLength: 4 } },
      { id: "w1r4", level: r4, par: 2, hiddenEgg: true, eggAt: { x: 4, y: 1 } },
      { id: "w1r5", level: r5, par: 2, hiddenEgg: true, eggAt: { x: 3, y: 1 } },
      { id: "w1r6", level: r6, par: 4, hiddenEgg: false, constraint: { label: "one strike", maxMoves: 4 } },
      { id: "w1r7", level: r7, par: 5, hiddenEgg: false },
    ],
  },
  {
    // World 2 "Growth" — length as reach (R1/R2), body-as-structure (R3), the
    // length-as-trap TWIST with a don't-over-grow constraint egg (R4), and a
    // grow+strike capstone (R5). No new model surface (anchor arrives in W3).
    id: "w2",
    name: "Growth",
    rooms: [
      { id: "w2r1", level: w2r1, par: 5, hiddenEgg: false },
      { id: "w2r2", level: w2r2, par: 5, hiddenEgg: false },
      { id: "w2r3", level: w2r3, par: 2, hiddenEgg: false },
      // The twist: a fruit behind the snake tempts an over-grow. The constraint
      // egg rewards solving without eating (the snake stays length 2).
      { id: "w2r4", level: w2r4, par: 2, hiddenEgg: true, eggAt: { x: 0, y: 1 }, constraint: { label: "don't over-grow", maxLength: 2 } },
      { id: "w2r5", level: w2r5, par: 2, hiddenEgg: false },
    ],
  },
  {
    // World 3 "The Climb" — the anchor verb + climbing a grip wall. R1/R2 are the
    // basic climb (gated: unsolvable without the anchor verb); R3 dismounts onto a
    // ledge; R4 is the release-timing TWIST (anchored climb, strike the head off the
    // wall); R5 recombines climb + strike across a gap.
    id: "w3",
    name: "The Climb",
    rooms: [
      { id: "w3r1", level: w3r1, par: 6, hiddenEgg: false },
      { id: "w3r2", level: w3r2, par: 8, hiddenEgg: false, constraint: { label: "clean ascent", maxMoves: 8 } },
      { id: "w3r3", level: w3r3, par: 7, hiddenEgg: false },
      { id: "w3r4", level: w3r4, par: 7, hiddenEgg: false },
      { id: "w3r5", level: w3r5, par: 8, hiddenEgg: false },
    ],
  },
  {
    // World 4 "Pressure" — plate-opens-gate (§2.2.6). R1 teaches the mechanic
    // (walk through), R2 bridges plate->gate with the body, R3 is the hold-then-
    // strike-through timing twist, R4 introduces TWO distinct id-keyed pairs, and
    // R5 is the grow + hold + thread capstone. Each gate is load-bearing.
    id: "w4",
    name: "Pressure",
    rooms: [
      { id: "w4r1", level: w4r1, par: 3, hiddenEgg: false },
      { id: "w4r2", level: w4r2, par: 3, hiddenEgg: false },
      { id: "w4r3", level: w4r3, par: 3, hiddenEgg: false },
      { id: "w4r4", level: w4r4, par: 3, hiddenEgg: false },
      { id: "w4r5", level: w4r5, par: 7, hiddenEgg: false, constraint: { label: "no waste", maxMoves: 7 } },
    ],
  },
  {
    // World 5 "Dark" — heat-sense (§2.2.7). Every room is rendered DARK (dim
    // everything except heat lamps, the snake, and the head's small radius); the
    // RULES are completely normal — Dark only changes what you can SEE, never how
    // the snake behaves (renderer-only, ZERO core change; CORE-REGRESSION-HEAT).
    // Heat lamps are landmarks: R1 a lit exit, R2 a beacon across a gap, R3 a lit
    // fruit, R4 a lit drop, R5 lit stepping stones, R6 a chained capstone. The
    // teaching is "memorise the lit geometry, then move through the black".
    id: "w5",
    name: "Dark",
    rooms: [
      { id: "w5r1", level: w5r1, par: 4, hiddenEgg: false, dark: true },
      { id: "w5r2", level: w5r2, par: 2, hiddenEgg: false, dark: true },
      { id: "w5r3", level: w5r3, par: 3, hiddenEgg: false, dark: true },
      { id: "w5r4", level: w5r4, par: 2, hiddenEgg: false, dark: true },
      { id: "w5r5", level: w5r5, par: 3, hiddenEgg: false, dark: true },
      { id: "w5r6", level: w5r6, par: 3, hiddenEgg: false, dark: true },
    ],
  },
  {
    // World 6 "The Gullet" — swallow & carry + deposit (§2.2.8), with the shed-skin
    // decoy used as STRUCTURE as the twist (§2.2.9). R1 teaches swallow+deposit-to-
    // bridge; R2 sheds a stair; R3 is the decoy-bridge twist; R4 carries through a
    // strike; R5 is the two-pit long carry; R6 is the capstone with a hidden egg.
    // The block is load-bearing in every room (rooms.test asserts unsolvable without
    // it). Pars are the BFS-shortest solution lengths (== solutions.ts entries).
    id: "w6",
    name: "The Gullet",
    rooms: [
      { id: "w6r1", level: w6r1, par: 6, hiddenEgg: false },
      { id: "w6r2", level: w6r2, par: 7, hiddenEgg: false },
      { id: "w6r3", level: w6r3, par: 7, hiddenEgg: false },
      { id: "w6r4", level: w6r4, par: 6, hiddenEgg: false },
      { id: "w6r5", level: w6r5, par: 8, hiddenEgg: false },
      { id: "w6r6", level: w6r6, par: 8, hiddenEgg: true, eggAt: { x: 5, y: 2 } },
    ],
  },
  {
    // World 7 "Two Bodies" (STRETCH, §2.2.10 / D-OUT-5) — the co-op world. Two
    // snakes share a room; you control one at a time and Tab cycles which. Win =
    // ALL heads on exits (the multi-body checkEnd authority). The curriculum:
    // R1 teaches Tab + both-heads-win; R2 the RELAY (one body holds a plate so the
    // other can pass its gate); R3 the MUTUAL relay (each opens the other's gate,
    // forced alternation); R4 the three-stage capstone. Every room is UNSOLVABLE
    // without Tab (the inactive body cannot move) and its gates are load-bearing —
    // rooms.test pins both. These rooms are co-op (multi-body), so they carry a
    // `build` (buildCoop) and a single-snake `level` PROJECTION for the renderer.
    // Pars are BFS-shortest over move+strike+switch (honest par).
    id: "w7",
    name: "Two Bodies",
    rooms: [
      { id: "w7r1", level: coopLevel(w7r1), build: () => buildCoop(w7r1), coop: true, par: 3, hiddenEgg: false },
      { id: "w7r2", level: coopLevel(w7r2), build: () => buildCoop(w7r2), coop: true, par: 11, hiddenEgg: false },
      { id: "w7r3", level: coopLevel(w7r3), build: () => buildCoop(w7r3), coop: true, par: 14, hiddenEgg: false, constraint: { label: "in turn", maxMoves: 14 } },
      { id: "w7r4", level: coopLevel(w7r4), build: () => buildCoop(w7r4), coop: true, par: 19, hiddenEgg: false },
    ],
  },
  {
    // World 8 "Recombination" — the FINALE (§1.3 Inc-4 finale). Single-body capstone
    // rooms that recombine ONLY shipped abilities (carry/strike/deposit/anchor) —
    // NO new model. R1 carry+strike over a chasm; R2 carry+deposit+strike over a
    // wider one; R3 anchor-climb + strike off the spire. Each room's combined
    // mechanics are load-bearing (rooms.test pins "unsolvable without strike"
    // etc.). Pars are BFS-shortest over the full verb set (honest par).
    id: "w8",
    name: "Recombination",
    rooms: [
      { id: "w8r1", level: w8r1, par: 6, hiddenEgg: false },
      { id: "w8r2", level: w8r2, par: 8, hiddenEgg: false },
      { id: "w8r3", level: w8r3, par: 10, hiddenEgg: false, constraint: { label: "clean ascent", maxMoves: 10 } },
    ],
  },
];

/** The single uniform accessor for a room's live, already-settled playable state:
 *  a co-op room's `build` (multi-body) if present, else `buildState(level)`. The
 *  shell and the room oracles both route through this so the single-vs-multi-body
 *  choice lives in ONE place. */
export function buildRoom(meta: RoomMeta): GameState {
  return meta.build ? meta.build() : buildState(meta.level);
}

/** Flat ordered list of all rooms across all worlds (shell convenience). */
export const ALL_ROOMS: RoomMeta[] = WORLDS.flatMap((w) => w.rooms);
