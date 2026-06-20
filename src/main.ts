import { anchor, deposit, DIRS, move, strike, switchBody } from "./core/game";
import type { GameState } from "./core/types";
import { ALL_ROOMS, buildRoom, WORLDS } from "./levels/worlds";
import type { DirName, LoggedAction } from "./levels/replay";
import { scoreRun } from "./scoring";
import type { Eggs } from "./scoring";
import { ProgressStore } from "./store";
import { Renderer } from "./render/renderer";

const app = document.getElementById("app")!;
const hud = document.getElementById("hud")!;
const renderer = new Renderer(app);

// Persisted progress (HLD §2.7, §4.5): one localStorage key, via the INJECTED
// store (the store's logic is tested off an in-memory backing — store.test.ts).
const store = new ProgressStore(window.localStorage);

// --- Per-room session state ------------------------------------------------
//
// Two parallel stacks (HLD §2.6/§2.7, D26):
//   `history`  — the undo SNAPSHOT stack (the states).
//   `inputs`   — the INPUT LOG: the `{verb, dir}` move sequence (the moves).
// Every EFFECTIVE act() pushes onto BOTH; undo pops BOTH in lockstep. They are
// UNBOUNDED within a room and RESET on restart / room navigation (closes
// open-Q#7). The input log is what record-par serializes — never the snapshots
// (F3): it replays through `core/game`'s verbs to feed T-PAR / T-ROOM-SOLVE.

let roomIndex = 0;
let history: GameState[] = [];
let inputs: LoggedAction[] = [];
let state: GameState;
// Deposit is a DISTINCT key from anchor (avoiding the F8 shared-key footgun): `D`
// ARMS deposit, then an arrow drops the carried block in that direction. See the
// keydown handler. Declared here so `render` can show the armed prompt.
let depositArmed = false;

function room() {
  return ALL_ROOMS[roomIndex];
}

/** Which world a room index belongs to (for the HUD label). */
function worldOf(index: number) {
  let seen = 0;
  for (let i = 0; i < WORLDS.length; i++) {
    const w = WORLDS[i];
    if (index < seen + w.rooms.length) return { world: w, worldIdx: i, roomNo: index - seen + 1 };
    seen += w.rooms.length;
  }
  return { world: WORLDS[WORLDS.length - 1], worldIdx: WORLDS.length - 1, roomNo: 1 };
}

/** The run TRACE = the snapshot stack plus the current state (HLD §4.5). Scoring
 *  reads this; it is exactly what `history` accumulates plus the live `state`. */
function trace(): GameState[] {
  return [...history, state];
}

/** Eggs banked for the CURRENT room across all prior runs (from the store), used
 *  for the HUD. Updated whenever we re-load the room or bank a fresh run. */
function bankedEggs(): { solve: boolean; hidden: boolean; constraint: boolean } {
  return store.load().rooms[room().id] ?? { solve: false, hidden: false, constraint: false };
}

/** Load a room fresh: reset both stacks (undo + input log) for the new room. */
function loadRoom(index: number) {
  roomIndex = index;
  history = [];
  inputs = [];
  // A co-op room (World 7) builds a multi-body state via `buildRoom`; an ordinary
  // room falls back to `buildState(level)`. The renderer is still framed off the
  // single-snake `level` projection (camera bounds only).
  state = buildRoom(room());
  // World 5 "Dark" rooms render in heat-sense mode (renderer-only; the core is
  // unchanged — §2.2.7). `dark` is a presentation flag on the room metadata.
  renderer.onRoomLoad(state, room().level, room().dark === true, room().eggAt);
  render();
}

function statusLine(): string {
  if (state.status === "won") {
    const last = roomIndex === ALL_ROOMS.length - 1;
    return last
      ? "<b>Solved — that's the last room!</b> &nbsp;(R to replay)"
      : "<b>Solved!</b> &nbsp;(N / Space: next room &nbsp;·&nbsp; R: replay)";
  }
  if (state.status === "dead") return "<b>You fell.</b> &nbsp;(U: undo &nbsp;·&nbsp; R: restart)";
  return "Reach the green exit.";
}

/** A one-line, optional teaching hint per world (HUD only; the rooms still teach
 *  unaided per D24). Empty for worlds whose mechanic is self-evident. */
function worldHint(worldId: string): string {
  switch (worldId) {
    case "w3":
      return "Stand beside a blue grip wall and press A to anchor, then climb.";
    case "w4":
      return "Stand on an amber plate to open its matching gate; a body in the gate holds it open.";
    case "w6":
      return "Step onto a crate to swallow it; press D then an arrow to deposit it as a bridge or step.";
    case "w7":
      return "Two bodies — press Tab to switch which one you control; get BOTH heads onto exits.";
    default:
      return "";
  }
}

/** The egg row: three slots (solve / hidden / constraint). A slot is filled (●)
 *  when banked or earned this run, hollow (○) when available-but-unearned, and
 *  omitted entirely when the room has no such egg. PAR is shown only AFTER the room
 *  has ever been solved (HLD §2.7 — par is a returning-player target, not a spoiler). */
function eggLine(): string {
  const meta = room();
  const banked = bankedEggs();
  // Eggs earned on THIS live run (so the HUD updates the instant you collect them).
  const live: Eggs = scoreRun(meta, trace(), inputs);
  const slot = (label: string, present: boolean, got: boolean) =>
    present ? `${got ? "●" : "○"}&nbsp;${label}` : "";
  const slots = [
    slot("solved", true, banked.solve || live.solve),
    slot("hidden egg", meta.hiddenEgg, banked.hidden || live.hidden),
    slot(
      meta.constraint ? meta.constraint.label : "",
      meta.constraint !== undefined,
      banked.constraint || live.constraint,
    ),
  ].filter((s) => s.length > 0);
  const eggs = `eggs: ${slots.join(" &nbsp;·&nbsp; ")}`;
  // Par only after the room has ever been solved.
  const par = banked.solve ? ` &nbsp;·&nbsp; par ${meta.par}` : "";
  return `${eggs}${par}`;
}

function render() {
  renderer.render(state);
  const { world, roomNo } = worldOf(roomIndex);
  const hint = worldHint(world.id);
  hud.innerHTML =
    `<b>COIL</b> &nbsp;·&nbsp; ${world.name} &nbsp;—&nbsp; Room ${roomNo} &nbsp;` +
    `<span class="sub">(${room().id})</span><br>` +
    `${statusLine()}<br>` +
    (hint ? `<span class="sub">${hint}</span><br>` : "") +
    `<br>` +
    `<span class="sub">${eggLine()}</span><br>` +
    (depositArmed ? `<b>Deposit armed — press an arrow to drop.</b><br>` : "") +
    `<span class="sub">Arrows: move &nbsp;·&nbsp; Shift+Arrow: strike &nbsp;·&nbsp; A: anchor &nbsp;·&nbsp; D: deposit<br>` +
    `U: undo &nbsp;·&nbsp; R: restart &nbsp;·&nbsp; N: next &nbsp;·&nbsp; drag: orbit<br>` +
    `len ${state.snake.length} &nbsp;·&nbsp; moves ${inputs.length}</span>`;
}

/** Commit a verb result. No-op (blocked / terminal) returns the same ref and is
 *  NOT logged, so the shell's `next === state` no-op detection keeps the undo /
 *  input-log stacks in lockstep. */
function commit(next: GameState, action: LoggedAction) {
  if (next === state) return; // blocked / no-op — do not log
  const wasWon = state.status === "won";
  history.push(state);
  inputs.push(action);
  state = next;
  // Bank eggs + unlock the next world the FIRST time this run reaches `won`
  // (scoring is pure over the trace; persistence lives here, outside the core).
  if (!wasWon && state.status === "won") bankRun();
  render();
}

/** Bank this run's eggs (OR-merged into the store) and, on a solve, unlock the
 *  world this room belongs to (the world index it sits in becomes reachable). */
function bankRun() {
  const meta = room();
  const eggs = scoreRun(meta, trace(), inputs);
  store.recordEggs(meta.id, eggs);
  if (eggs.solve) store.unlockWorld(worldOf(roomIndex).worldIdx);
}

/** A directional verb (move / strike / deposit). */
function act(verb: "move" | "strike" | "deposit", dirName: DirName) {
  const fn = verb === "strike" ? strike : verb === "deposit" ? deposit : move;
  commit(fn(state, DIRS[dirName]), { verb, dir: dirName });
}

/** The anchor toggle (Inc 2): grip / release the segment beside a grip wall. */
function anchorAct() {
  commit(anchor(state), { verb: "anchor" });
}

/** Tab (Inc 4b): cycle which co-op body is active. Logged in the input-log/undo
 *  stacks (via commit) so record-par round-trips it; a no-op on single-snake
 *  rooms (no other body) so it is never logged there. */
function switchAct() {
  commit(switchBody(state), { verb: "switch" });
}

/** Deposit the carried block into the cell in `dirName` (Inc 4, §2.2.8). */
function depositAct(dirName: DirName) {
  act("deposit", dirName);
}

function undo() {
  const prev = history.pop();
  if (!prev) return;
  inputs.pop(); // lockstep with the snapshot stack
  state = prev;
  render();
}

function nextRoom() {
  if (state.status !== "won") return;
  if (roomIndex < ALL_ROOMS.length - 1) loadRoom(roomIndex + 1);
}

/** Serialize the current input log as the room's par solution (authoring tool). */
function recordPar() {
  const json = JSON.stringify(inputs);
  // Console is the authoring sink; clipboard is a best-effort convenience.
  console.log(`[record-par] ${room().id} (${inputs.length} moves):\n${json}`);
  navigator.clipboard?.writeText(json).catch(() => {});
}

const KEYS: Record<string, DirName> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

// (deposit ARM/disarm semantics, see the `depositArmed` declaration above)
window.addEventListener("keydown", (e) => {
  const dirName = KEYS[e.key];
  if (dirName) {
    e.preventDefault();
    if (depositArmed) {
      depositArmed = false;
      depositAct(dirName);
    } else {
      act(e.shiftKey ? "strike" : "move", dirName);
    }
    return;
  }
  const wasArmed = depositArmed;
  depositArmed = false; // any non-arrow key disarms a pending deposit...
  switch (e.key.toLowerCase()) {
    case "d":
      depositArmed = !wasArmed; // ...except `D` itself, which toggles arming.
      render();
      break;
    case "a":
      anchorAct();
      break;
    case "tab":
      e.preventDefault(); // do not let Tab move browser focus off the canvas
      switchAct(); // Inc 4b: cycle the active co-op body
      break;
    case "u":
      undo();
      break;
    case "r":
      loadRoom(roomIndex);
      break;
    case "n":
    case " ":
      nextRoom();
      break;
    case "p":
      recordPar();
      break;
  }
});

loadRoom(0);
