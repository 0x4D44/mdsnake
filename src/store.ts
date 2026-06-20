// Progress store + world gating — persistence and unlock policy, OUTSIDE the pure
// core (HLD §1.2, §2.7, §4.5). The store is INJECTED (a `Storage`-like object),
// never the global `window`, so its serialize/parse logic is unit-testable off any
// in-memory backing (T-PERSIST). main.ts wires the real `window.localStorage`.
//
// One key only (`coil.progress.v1`, HLD §1.2): the highest world index reached and
// a per-room egg record. No cloud sync, no migration (sandbox).

import type { Eggs } from "./scoring";
import { WORLDS } from "./levels/worlds";

/** The single localStorage key (HLD §1.2). */
export const PROGRESS_KEY = "coil.progress.v1";

/** Per-room banked eggs. A flag, once true, stays true (your best run banks it). */
export interface RoomProgress {
  solve: boolean;
  hidden: boolean;
  constraint: boolean;
}

/** The whole persisted blob. */
export interface Progress {
  /** Highest 0-based world INDEX the player has unlocked (>= 0). */
  highestWorld: number;
  /** Per-room banked eggs, keyed by room id (e.g. "w6r3"). */
  rooms: Record<string, RoomProgress>;
}

/** The minimal slice of the Web Storage API the store needs (so the global
 *  `window.localStorage` and an in-memory fake are interchangeable). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function emptyProgress(): Progress {
  return { highestWorld: 0, rooms: {} };
}

/** Parse a stored blob defensively: any malformed/absent value resets to empty
 *  (sandbox — no migration owed, a corrupt key just starts fresh). */
export function parseProgress(raw: string | null): Progress {
  if (raw === null) return emptyProgress();
  try {
    const v = JSON.parse(raw) as Partial<Progress>;
    if (typeof v !== "object" || v === null) return emptyProgress();
    const highestWorld = typeof v.highestWorld === "number" && v.highestWorld >= 0 ? v.highestWorld : 0;
    const rooms: Record<string, RoomProgress> = {};
    if (v.rooms && typeof v.rooms === "object") {
      for (const [id, r] of Object.entries(v.rooms)) {
        rooms[id] = {
          solve: Boolean((r as RoomProgress)?.solve),
          hidden: Boolean((r as RoomProgress)?.hidden),
          constraint: Boolean((r as RoomProgress)?.constraint),
        };
      }
    }
    return { highestWorld, rooms };
  } catch {
    return emptyProgress();
  }
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p);
}

/**
 * Persisted progress over an INJECTED storage backend. All mutation is
 * read-modify-write to the single key; reads parse defensively. The store holds NO
 * in-memory cache beyond what it persists, so two stores over the same backing see
 * each other's writes (the persistence is the source of truth).
 */
export class ProgressStore {
  constructor(private storage: StorageLike) {}

  load(): Progress {
    return parseProgress(this.storage.getItem(PROGRESS_KEY));
  }

  private save(p: Progress): void {
    this.storage.setItem(PROGRESS_KEY, serializeProgress(p));
  }

  /** Bank a run's eggs for a room (OR-merge: never un-bank a previously earned
   *  egg). Returns the updated Progress. */
  recordEggs(roomId: string, eggs: Eggs): Progress {
    const p = this.load();
    const prev = p.rooms[roomId] ?? { solve: false, hidden: false, constraint: false };
    p.rooms[roomId] = {
      solve: prev.solve || eggs.solve,
      hidden: prev.hidden || eggs.hidden,
      constraint: prev.constraint || eggs.constraint,
    };
    this.save(p);
    return p;
  }

  /** Raise the highest-unlocked-world index (monotonic; never lowers it). */
  unlockWorld(index: number): Progress {
    const p = this.load();
    if (index > p.highestWorld) {
      p.highestWorld = index;
      this.save(p);
    }
    return p;
  }
}

// --- Gating policy (HLD §2.7, T-GATING) ------------------------------------
//
// Two independent unlock routes (a player is never main-path-walled):
//   1) SOLVE EGGS: collecting enough SOLVE eggs across the game reaches the
//      threshold for the next world — reachable by completing rooms alone, with NO
//      hidden/constraint egg required (no skill-wall on the main path).
//   2) SKIP-AFTER-K: after K failed attempts on a room, the player may skip ahead,
//      so a single hard room can never permanently block progress.

/** Solve eggs needed to unlock the NEXT world. The threshold is reachable by SOLVE
 *  eggs alone — it never exceeds the number of rooms already available, so finishing
 *  the rooms you can reach always unlocks the next world (no main-path wall). */
export const SOLVE_EGGS_TO_UNLOCK = 3;

/** Failed attempts after which a room may be skipped (the escape hatch). */
export const SKIP_AFTER_K_ATTEMPTS = 5;

/** Total SOLVE eggs banked across all rooms in `progress`. */
export function solveEggCount(progress: Progress): number {
  let n = 0;
  for (const r of Object.values(progress.rooms)) if (r.solve) n++;
  return n;
}

/** Is world index `worldIndex` unlocked? World 0 is always open. A later world
 *  unlocks when EITHER the player has banked enough SOLVE eggs (route 1) OR the
 *  store's `highestWorld` already reached it (route 2, raised by the skip path). */
export function isWorldUnlocked(progress: Progress, worldIndex: number): boolean {
  if (worldIndex <= 0) return true;
  if (worldIndex <= progress.highestWorld) return true;
  // SOLVE-egg route: each cleared world-worth of solve eggs opens the next.
  return solveEggCount(progress) >= worldIndex * SOLVE_EGGS_TO_UNLOCK;
}

/** May the player skip past `roomId` having failed it `attempts` times? */
export function canSkip(attempts: number): boolean {
  return attempts >= SKIP_AFTER_K_ATTEMPTS;
}

/** The total room count (gating sanity: the solve-egg threshold for any reachable
 *  world must be attainable from rooms already in earlier worlds). */
export function totalRooms(): number {
  return WORLDS.reduce((n, w) => n + w.rooms.length, 0);
}
