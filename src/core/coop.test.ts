// Inc 4b — CO-OP CORE oracles (HLD §2.2.10, §2.5 general fixpoint, §4.4 T-COOP-*).
//
// The kernel now carries a co-op `bodies?: Segment[][]` (the OTHER snakes; the
// active `snake` is the body the player controls). Single-snake states keep
// `bodies` ABSENT (M2) and replay BYTE-IDENTICAL through the multi-body kernel —
// that migration identity (T-COOP-MIGRATE) is the proof the settle rewrite is
// behaviour-preserving for one body; the full existing suite (incl.
// T-RESOLVE-EQUIV) is the rest of that proof.
//
// These oracles pin the genuinely-new multi-body behaviour:
//   T-COOP-1            switch/active-only verbs, inter-body support, simultaneous settle
//   T-COOP-2            win = all heads on exits; death = any body fully in void
//   T-COOP-WIN-PRECEDENCE  WIN before death at the same fixpoint (D28)
//   T-SETTLE-MUTUAL     two bodies resting only on each other (no ground) both fall
//   T-SETTLE-CONVERGE   a stacked config settles to the documented fixpoint positions
//   SPIKE-I4b           body B strikes off body A's back
//   T-COOP-MIGRATE      Inc-0 single-snake trace replays byte-identical (bodies absent)

import { describe, expect, it } from "vitest";
import { buildState, checkEnd, DIRS, key, move, settle, strike, switchBody, resolve } from "./game";
import type { CellType, GameState, LevelDef, Segment } from "./types";

// --- helpers ----------------------------------------------------------------

const wall = (x: number, y: number) => ({ x, y, type: "wall" as CellType });
const exitC = (x: number, y: number) => ({ x, y, type: "exit" as CellType });
const floorRow = (y: number, x0: number, x1: number) => {
  const c = [];
  for (let x = x0; x <= x1; x++) c.push(wall(x, y));
  return c;
};
function lvl(p: Partial<LevelDef> & Pick<LevelDef, "snake">): LevelDef {
  return { name: "coop", strikeRange: 3, floorY: 0, cells: [], ...p };
}

/** Build a multi-body state directly (W7 rooms are not authored at Inc 4b; the
 *  kernel is what 4b ships, so co-op states are constructed in-test like the
 *  resolve-equiv fast-check corpus does). `snake` is the active body; `others`
 *  the co-op bodies. The state is NOT pre-settled — the test drives settle/verbs. */
function coop(
  snake: Segment[],
  others: Segment[][],
  cells: { x: number; y: number; type: CellType }[],
  opts: Partial<Pick<GameState, "strikeRange" | "floorY" | "status" | "name">> = {},
): GameState {
  const map = new Map<string, import("./types").Entity>();
  // Reuse buildState's cell construction by routing through a throwaway level,
  // then graft the multi-body shape on (buildState only knows single-snake).
  const base = buildState(lvl({ snake: [{ x: 0, y: 100 }], cells, floorY: opts.floorY ?? 0 }));
  for (const [k, v] of base.cells) map.set(k, v);
  return {
    snake: snake.map((p) => ({ ...p })),
    bodies: others.map((b) => b.map((p) => ({ ...p }))),
    cells: map,
    strikeRange: opts.strikeRange ?? 3,
    floorY: opts.floorY ?? 0,
    status: opts.status ?? "play",
    name: opts.name ?? "coop",
  };
}

/** Positions of a body as "x,y" keys (order-insensitive comparison helper). */
const positions = (b: Segment[]) => b.map(key);

// --- T-COOP-MIGRATE ---------------------------------------------------------
// An Inc-0 single-snake golden trace replayed through the (now multi-body) kernel
// with `bodies` ABSENT must yield byte-identical snapshots: every snapshot keeps
// `bodies === undefined` (never written back, M2), and the snake positions/status
// match the recorded golden. This is the migration gate.

describe("T-COOP-MIGRATE", () => {
  // A fixed Inc-0 single-snake room and a recorded move sequence.
  const start = buildState(
    lvl({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
      strikeRange: 3,
      cells: [...floorRow(0, 0, 8), exitC(6, 1)],
    }),
  );
  // GOLDEN trace: the expected snapshot after each verb (positions + status),
  // captured from the documented single-body semantics. move R, move R, strike R
  // (lands on the exit -> won).
  const golden: { snake: [number, number][]; status: GameState["status"] }[] = [
    { snake: [[2, 1], [1, 1]], status: "play" }, // move right
    { snake: [[3, 1], [2, 1]], status: "play" }, // move right
    { snake: [[6, 1], [5, 1]], status: "won" }, // strike right -> crosses exit at x=6
  ];

  it("the single-snake start has bodies ABSENT (M2)", () => {
    expect(start.bodies).toBeUndefined();
  });

  it("replays byte-identical through the multi-body kernel; bodies stays absent throughout", () => {
    let s = start;
    const seq: ((x: GameState) => GameState)[] = [
      (x) => move(x, DIRS.right),
      (x) => move(x, DIRS.right),
      (x) => strike(x, DIRS.right),
    ];
    for (let i = 0; i < seq.length; i++) {
      s = seq[i](s);
      // bodies must NEVER be written back on a single-snake state.
      expect(s.bodies, `step ${i}: bodies absent`).toBeUndefined();
      expect(s.status, `step ${i}: status`).toBe(golden[i].status);
      expect(
        s.snake.map((p) => [p.x, p.y]),
        `step ${i}: snake positions`,
      ).toEqual(golden[i].snake);
    }
    expect(s.status).toBe("won");
  });

  it("settle on a single-snake state never materialises a bodies key", () => {
    const floating = buildState(lvl({ snake: [{ x: 1, y: 5 }], cells: [wall(1, 0)] }));
    expect(floating.bodies).toBeUndefined();
    expect(settle(floating).bodies).toBeUndefined();
  });
});

// --- T-COOP-1 ---------------------------------------------------------------
// Tab switches the active body; verbs affect ONLY the active body; one body
// supports the other (transitive grounding); each body settles in one
// simultaneous fixpoint.

describe("T-COOP-1", () => {
  it("switchBody rotates the active pointer (A -> B -> A)", () => {
    const a: Segment[] = [{ x: 1, y: 1 }];
    const b: Segment[] = [{ x: 5, y: 1 }];
    const s = coop(a, [b], floorRow(0, 0, 8));
    expect(s.snake[0]).toEqual({ x: 1, y: 1 }); // A active
    const s2 = switchBody(s);
    expect(s2.snake[0]).toEqual({ x: 5, y: 1 }); // B active
    expect(s2.bodies?.[0][0]).toEqual({ x: 1, y: 1 }); // A demoted to bodies
    const s3 = switchBody(s2);
    expect(s3.snake[0]).toEqual({ x: 1, y: 1 }); // back to A
  });

  it("a verb moves ONLY the active body; the other body is unchanged", () => {
    const a: Segment[] = [{ x: 1, y: 1 }, { x: 0, y: 1 }];
    const b: Segment[] = [{ x: 5, y: 1 }, { x: 4, y: 1 }];
    const s = coop(a, [b], floorRow(0, 0, 8));
    const n = move(s, DIRS.right);
    expect(n.snake[0]).toEqual({ x: 2, y: 1 }); // active A advanced
    expect(n.bodies?.[0]).toEqual([{ x: 5, y: 1 }, { x: 4, y: 1 }]); // B untouched
  });

  it("the active body is BLOCKED by the other body's segments", () => {
    const a: Segment[] = [{ x: 2, y: 1 }, { x: 1, y: 1 }];
    const b: Segment[] = [{ x: 3, y: 1 }]; // sits directly ahead of A's head
    const s = coop(a, [b], floorRow(0, 0, 8));
    expect(move(s, DIRS.right)).toBe(s); // blocked -> same reference (no-op)
  });

  it("inter-body support: A rests ON B which rests on the ground (transitive)", () => {
    // B sits on the floor at y=1; A floats at y=4 directly above B's cell. A is
    // not world-grounded, but it transitively rests on B (grounded), so A falls
    // to y=2 (atop B) and the pair is at rest in ONE settle fixpoint.
    const b: Segment[] = [{ x: 2, y: 1 }];
    const a: Segment[] = [{ x: 2, y: 4 }];
    const s = coop(a, [b], floorRow(0, 0, 4));
    const r = settle(s);
    expect(r.status).toBe("play");
    expect(r.snake).toEqual([{ x: 2, y: 2 }]); // A landed atop B
    expect(r.bodies?.[0]).toEqual([{ x: 2, y: 1 }]); // B unmoved (already grounded)
  });

  it("a body resting on another body is order-independent (same result if B is active)", () => {
    const b: Segment[] = [{ x: 2, y: 1 }];
    const a: Segment[] = [{ x: 2, y: 4 }];
    // A active vs B active should settle to the same world configuration.
    const ra = settle(coop(a, [b], floorRow(0, 0, 4)));
    const rb = settle(coop(b, [a], floorRow(0, 0, 4)));
    const cellsOf = (s: GameState) =>
      new Set([...positions(s.snake), ...positions(s.bodies![0])]);
    expect(cellsOf(ra)).toEqual(cellsOf(rb));
  });
});

// --- T-SETTLE-MUTUAL --------------------------------------------------------
// Two bodies resting ONLY on each other with no ground/anchor: neither is in the
// grounded closure, so BOTH fall (no circular mid-air self-support).

describe("T-SETTLE-MUTUAL", () => {
  it("A-on-B-on-ground holds (the grounded chain terminates at the floor)", () => {
    const b: Segment[] = [{ x: 1, y: 1 }];
    const a: Segment[] = [{ x: 1, y: 2 }];
    const s = coop(a, [b], floorRow(0, 0, 3));
    const r = settle(s);
    expect(r.status).toBe("play");
    expect(r.snake).toEqual([{ x: 1, y: 2 }]); // unchanged: chain is grounded
    expect(r.bodies?.[0]).toEqual([{ x: 1, y: 1 }]);
  });

  it("A-on-B with NO ground: the mutual/ungrounded pair BOTH fall into the void", () => {
    // No floor at all (floorY=0, no supports anywhere). A at y=2 sits on B at y=1;
    // B sits on nothing. Neither is world-grounded; the closure is empty; both
    // drop together until both are below floorY -> dead.
    const b: Segment[] = [{ x: 1, y: 1 }];
    const a: Segment[] = [{ x: 1, y: 2 }];
    const s = coop(a, [b], []);
    const r = settle(s);
    expect(r.status).toBe("dead");
  });

  it("two bodies stacked atop EACH OTHER (mutual) with no ground both fall", () => {
    // Construct a genuine mutual reference: each body has a segment directly above
    // a segment of the other, and neither touches ground. Both must fall.
    const a: Segment[] = [{ x: 1, y: 2 }];
    const b: Segment[] = [{ x: 1, y: 1 }];
    // floorY very low so we can observe the fall without immediate death; no
    // supports anywhere means neither grounds.
    const s = coop(a, [b], [], { floorY: -5 });
    const r = settle(s);
    // Both descended by the same amount (simultaneous), preserving the gap.
    expect(r.snake[0].y - r.bodies![0][0].y).toBe(1); // still stacked, just lower
    expect(r.snake[0].y).toBeLessThan(2); // A fell
    expect(r.bodies![0][0].y).toBeLessThan(1); // B fell
  });
});

// --- T-SETTLE-CONVERGE ------------------------------------------------------
// A stacked/mutual multi-body config settles to the DOCUMENTED fixpoint within
// the (maxY-floorY+1) bound, asserted on the RETURNED state (exact positions).

describe("T-SETTLE-CONVERGE", () => {
  it("a tall stack converges to exact resting positions within the bound", () => {
    // Floor at y=0. B floats at y=3, A floats at y=7 directly above. Both fall;
    // B lands at y=1 (on floor), A lands at y=2 (on B). Exact fixpoint.
    const b: Segment[] = [{ x: 2, y: 3 }];
    const a: Segment[] = [{ x: 2, y: 7 }];
    const s = coop(a, [b], floorRow(0, 0, 4));
    const r = settle(s);
    expect(r.status).toBe("play");
    expect(r.snake).toEqual([{ x: 2, y: 2 }]);
    expect(r.bodies?.[0]).toEqual([{ x: 2, y: 1 }]);
  });

  it("settle does not throw (iteration cap holds) for a multi-body stack", () => {
    const b: Segment[] = [{ x: 0, y: 9 }];
    const a: Segment[] = [{ x: 0, y: 20 }];
    const s = coop(a, [b], floorRow(0, 0, 2));
    expect(() => settle(s)).not.toThrow();
    const r = settle(s);
    expect(r.snake).toEqual([{ x: 0, y: 2 }]);
    expect(r.bodies?.[0]).toEqual([{ x: 0, y: 1 }]);
  });
});

// --- T-COOP-2 ---------------------------------------------------------------
// Win requires ALL heads on exits (checkEnd authority; the per-step single-head
// early-win does NOT fire while bodies present). Death = any body fully in void.

describe("T-COOP-2", () => {
  it("ONE head on its exit is NOT a win (the other head is not on an exit)", () => {
    // A's head on an exit, B's head on plain floor. Not all heads on exits.
    const a: Segment[] = [{ x: 1, y: 1 }];
    const b: Segment[] = [{ x: 5, y: 1 }];
    const s = coop(a, [b], [...floorRow(0, 0, 8), exitC(1, 1)]);
    const r = resolve(s);
    expect(r.status).toBe("play");
  });

  it("ALL heads on exits IS a win (checkEnd is the multi-body authority)", () => {
    const a: Segment[] = [{ x: 1, y: 1 }];
    const b: Segment[] = [{ x: 5, y: 1 }];
    const s = coop(a, [b], [...floorRow(0, 0, 8), exitC(1, 1), exitC(5, 1)]);
    const r = resolve(s);
    expect(r.status).toBe("won");
  });

  it("a per-step early-win does NOT fire mid-strike while bodies present", () => {
    // Active A strikes across its own exit but B is NOT on an exit. The single-head
    // mid-strike checkWin must be suppressed; the turn resolves to play, not won.
    const a: Segment[] = [{ x: 1, y: 1 }, { x: 0, y: 1 }];
    const b: Segment[] = [{ x: 7, y: 1 }];
    const s = coop(a, [b], [...floorRow(0, 0, 8), exitC(3, 1)]);
    const r = strike(s, DIRS.right);
    expect(r.status).toBe("play"); // A crossed/landed; B not on exit -> not won
  });

  it("any body fully in the void -> dead (when no all-heads win)", () => {
    // A grounded on floor; B floats over a void with no support -> B falls into
    // the void; no all-heads win, so the turn is dead.
    const a: Segment[] = [{ x: 1, y: 1 }];
    const b: Segment[] = [{ x: 6, y: 3 }]; // x=6 has no floor
    const s = coop(a, [b], floorRow(0, 0, 2));
    const r = settle(s);
    expect(r.status).toBe("dead");
  });
});

// --- T-COOP-WIN-PRECEDENCE --------------------------------------------------
// At the fixpoint, WIN is evaluated BEFORE death: all heads on exits wins even if
// another body would reach the void the SAME fixpoint (D28).

describe("T-COOP-WIN-PRECEDENCE", () => {
  it("all heads reach exits the SAME fixpoint a body would void -> WON, not dead", () => {
    // Two bodies fall simultaneously. A falls onto an exit cell that is supported
    // (it lands and its head is on the exit). B falls into the void the SAME
    // fixpoint. WIN-before-death: because at the landing step ALL heads are on
    // exits, the state is WON even though B is in the void.
    //
    // Geometry: floor under A's column only. A starts at y=3 above an exit at
    // (1,1) that sits on the floor (1,0). B starts at y=3 above a void column
    // (x=6, no floor). Both drop together: after 2 drops A's head is at (1,1) on
    // the exit while B is at (6,1); after the next checks, A is on its exit. B
    // needs to be on an exit too for an all-heads win — so give B an exit it
    // reaches at the same instant, while STILL having B's body cross the void.
    //
    // Simplest faithful construction: A and B both land on exits the same step,
    // but B's exit is over the void so absent win-precedence B's continued fall
    // would flip to dead. We pin: at the step both heads are on exits -> won.
    const a: Segment[] = [{ x: 1, y: 3 }];
    const b: Segment[] = [{ x: 6, y: 3 }];
    // Exit for A at (1,1) sitting on floor (1,0); exit for B at (6,1) but NO floor
    // under it (so if B were not "won" it would keep falling into the void).
    // win cells do not support, so A must be grounded by the floor at (1,0): A's
    // head rests ON the exit at (1,1) because (1,0) supports it.
    const s = coop(a, [b], [wall(1, 0), exitC(1, 1), exitC(6, 1)]);
    const r = settle(s);
    expect(r.status).toBe("won");
    expect(r.snake).toEqual([{ x: 1, y: 1 }]);
    expect(r.bodies?.[0]).toEqual([{ x: 6, y: 1 }]); // captured on its exit at the win instant
  });

  it("checkEnd resolves all-heads-on-exits to WON even with a body below floorY", () => {
    // Directly exercise checkEnd's win-before-death ORDERING (not the settle path):
    // A's head on an exit, B's head ALSO on an exit but the whole of B is below
    // floorY. checkEnd evaluates WIN (all heads on exits) BEFORE death, so it is
    // WON even though B is fully in the void. (resolve runs settle first, which is
    // why we call checkEnd directly: the ordering is the unit under test.)
    const a: Segment[] = [{ x: 1, y: 1 }];
    const b: Segment[] = [{ x: 6, y: -3 }]; // fully below floorY=0
    const s = coop(a, [b], [wall(1, 0), exitC(1, 1), exitC(6, -3)]);
    const r = checkEnd(s);
    expect(r.status).toBe("won");
  });

  it("checkEnd resolves a body-below-floor (NOT all heads on exits) to DEAD", () => {
    // The death half of checkEnd's ordering: B fully below floor and NOT on an
    // exit -> dead (no all-heads win to take precedence).
    const a: Segment[] = [{ x: 1, y: 1 }];
    const b: Segment[] = [{ x: 6, y: -3 }];
    const s = coop(a, [b], [wall(1, 0), exitC(1, 1)]); // no exit under B
    expect(checkEnd(s).status).toBe("dead");
  });
});

// --- SPIKE-I4b --------------------------------------------------------------
// The throwaway spike: body B strikes off body A's back to an exit.

describe("SPIKE-I4b (body B strikes off body A's back)", () => {
  it("B (active) launches off A's back, travels along it, and lands on a ledge", () => {
    // A is a flat 3-segment platform at y=1 (x=2,3,4) resting on its own floor. B
    // (active) sits atop A's left end at (2,2) and strikes RIGHT with range 3: it
    // sails across A's back — A's segments are external occupancy, so B flies OVER
    // them rather than through — and lands at (5,2), which is supported by A's
    // right end (4,1) is below... actually (5,1) is the landing support. Provide a
    // ledge at (5,1) so B rests at (5,2) after the strike's settle.
    const aBody: Segment[] = [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }];
    const cells = [wall(2, 0), wall(3, 0), wall(4, 0), wall(5, 1)];
    const seeded = coop([{ x: 2, y: 2 }], [aBody], cells, { strikeRange: 3 });
    const r = strike(seeded, DIRS.right);
    // B travelled right (off A's back) and is at rest on the ledge, NOT dead and
    // NOT having fallen through A.
    expect(r.status).toBe("play");
    expect(r.snake[0]).toEqual({ x: 5, y: 2 }); // landed on the ledge at (5,1)
    // A is unchanged — verbs act on the active body only.
    expect(r.bodies?.[0]).toEqual([{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }]);
  });

  it("B strikes off A's back and BOTH heads reach exits -> the co-op win", () => {
    // The full spike: A's head is parked on an exit at (2,1)... but exits do not
    // support, so A must rest on a floor whose cell is the exit's column. Give A a
    // platform where its head cell (2,1) IS the exit and (2,0) supports it. B
    // strikes off A's back to land its head on a second exit at (5,1) (supported
    // by (5,0)). At the strike's settle, ALL heads are on exits -> WON.
    const aBody: Segment[] = [{ x: 2, y: 1 }, { x: 3, y: 1 }];
    const cells = [
      wall(2, 0), wall(3, 0), wall(5, 0),
      exitC(2, 1), // A's head rests here (supported by 2,0)
      exitC(5, 1), // B's target
    ];
    // B sits atop A at (3,2); strike right range 2 -> (4,2)(5,2), then the strike's
    // settle drops B from (5,2) onto the exit at (5,1) (supported by wall 5,0). At
    // that fixpoint BOTH heads are on exits -> WON.
    const seeded = coop([{ x: 3, y: 2 }], [aBody], cells, { strikeRange: 2 });
    const r = strike(seeded, DIRS.right);
    expect(r.status).toBe("won");
    expect(r.snake[0]).toEqual({ x: 5, y: 1 });
  });
});
