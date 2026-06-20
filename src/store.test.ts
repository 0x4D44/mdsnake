// T-PERSIST + T-GATING (HLD §4.5) — the progress store + world-unlock policy.
//
// The store is INJECTED (a `StorageLike`), so its serialize/parse round-trip is
// tested off an in-memory backing — no DOM needed. (main.ts wires the real
// `window.localStorage`; the LOGIC under test is the (de)serialization + gating,
// which is window-independent by design — see scoring/store rationale.)

import { describe, expect, it } from "vitest";
import {
  canSkip,
  isWorldUnlocked,
  parseProgress,
  ProgressStore,
  PROGRESS_KEY,
  serializeProgress,
  SKIP_AFTER_K_ATTEMPTS,
  SOLVE_EGGS_TO_UNLOCK,
  solveEggCount,
  type Progress,
  type StorageLike,
} from "./store";

/** A minimal in-memory Storage-like backing for the injected store. */
function memStorage(): StorageLike & { dump(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  };
}

// ---------------------------------------------------------------------------
// T-PERSIST: serialize/parse round-trip through the injected store.
// ---------------------------------------------------------------------------
describe("T-PERSIST — progress (de)serialization round-trip", () => {
  it("serialize -> parse is the identity on a populated Progress", () => {
    const p: Progress = {
      highestWorld: 3,
      rooms: {
        w1r1: { solve: true, hidden: false, constraint: true },
        w6r2: { solve: true, hidden: true, constraint: false },
      },
    };
    expect(parseProgress(serializeProgress(p))).toEqual(p);
  });

  it("an absent key parses to empty progress", () => {
    expect(parseProgress(null)).toEqual({ highestWorld: 0, rooms: {} });
  });

  it("a corrupt blob parses to empty progress (sandbox: no migration)", () => {
    expect(parseProgress("not json {")).toEqual({ highestWorld: 0, rooms: {} });
    expect(parseProgress("42")).toEqual({ highestWorld: 0, rooms: {} });
  });

  it("the store writes to the single coil.progress.v1 key and reads it back", () => {
    const storage = memStorage();
    const store = new ProgressStore(storage);
    store.recordEggs("w6r1", { solve: true, hidden: true, constraint: false });
    expect(Object.keys(storage.dump())).toEqual([PROGRESS_KEY]);
    const loaded = store.load();
    expect(loaded.rooms.w6r1).toEqual({ solve: true, hidden: true, constraint: false });
  });

  it("recordEggs OR-merges: a previously banked egg is never lost", () => {
    const store = new ProgressStore(memStorage());
    store.recordEggs("w6r1", { solve: true, hidden: true, constraint: false });
    // A later, worse run (no hidden egg) must NOT un-bank the hidden egg.
    const p = store.recordEggs("w6r1", { solve: true, hidden: false, constraint: true });
    expect(p.rooms.w6r1).toEqual({ solve: true, hidden: true, constraint: true });
  });

  it("a second store over the same backing sees the first store's writes", () => {
    const storage = memStorage();
    new ProgressStore(storage).unlockWorld(2);
    expect(new ProgressStore(storage).load().highestWorld).toBe(2);
  });

  it("unlockWorld is monotonic (never lowers the highest world)", () => {
    const store = new ProgressStore(memStorage());
    store.unlockWorld(3);
    expect(store.unlockWorld(1).highestWorld).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Store robustness: a throwing/denied storage backend must not break the
// win/commit flow, and malformed persisted JSON must fall back to the default.
// ---------------------------------------------------------------------------
describe("ProgressStore robustness", () => {
  it("save swallows a throwing StorageLike (quota/denied cannot break commit)", () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = new ProgressStore(throwing);
    // recordEggs / unlockWorld both write; neither must throw, and both must
    // still return the in-memory Progress the caller relies on.
    expect(() => store.recordEggs("w6r1", { solve: true, hidden: true, constraint: false }))
      .not.toThrow();
    const p = store.unlockWorld(2);
    expect(p.highestWorld).toBe(2);
  });

  it("load tolerates malformed persisted JSON (returns the default)", () => {
    const tampered: StorageLike = {
      getItem: () => "}{ not valid json",
      setItem: () => {},
    };
    expect(new ProgressStore(tampered).load()).toEqual({ highestWorld: 0, rooms: {} });
  });
});

// ---------------------------------------------------------------------------
// T-GATING: world-unlock reachable by SOLVE eggs alone (no main-path wall) +
//           a skip-after-K path.
// ---------------------------------------------------------------------------
describe("T-GATING — world unlock policy", () => {
  const withSolveEggs = (n: number): Progress => {
    const rooms: Progress["rooms"] = {};
    for (let i = 0; i < n; i++) rooms[`r${i}`] = { solve: true, hidden: false, constraint: false };
    return { highestWorld: 0, rooms };
  };

  it("world 0 is always unlocked", () => {
    expect(isWorldUnlocked({ highestWorld: 0, rooms: {} }, 0)).toBe(true);
  });

  it("a locked world stays locked with too few solve eggs", () => {
    expect(isWorldUnlocked(withSolveEggs(SOLVE_EGGS_TO_UNLOCK - 1), 1)).toBe(false);
  });

  it("SOLVE eggs ALONE unlock the next world — no hidden/constraint egg needed", () => {
    const p = withSolveEggs(SOLVE_EGGS_TO_UNLOCK);
    expect(solveEggCount(p)).toBe(SOLVE_EGGS_TO_UNLOCK);
    expect(isWorldUnlocked(p, 1)).toBe(true);
  });

  it("the threshold scales per world and is reachable by solve eggs alone", () => {
    expect(isWorldUnlocked(withSolveEggs(2 * SOLVE_EGGS_TO_UNLOCK), 2)).toBe(true);
    expect(isWorldUnlocked(withSolveEggs(2 * SOLVE_EGGS_TO_UNLOCK - 1), 2)).toBe(false);
  });

  it("the SKIP-after-K path unlocks a world the player has not earned by eggs", () => {
    // No eggs at all, but the skip path raised highestWorld -> the world is open.
    const skipped: Progress = { highestWorld: 2, rooms: {} };
    expect(solveEggCount(skipped)).toBe(0);
    expect(isWorldUnlocked(skipped, 2)).toBe(true);
  });

  it("canSkip becomes true only after K failed attempts", () => {
    expect(canSkip(SKIP_AFTER_K_ATTEMPTS - 1)).toBe(false);
    expect(canSkip(SKIP_AFTER_K_ATTEMPTS)).toBe(true);
  });
});
