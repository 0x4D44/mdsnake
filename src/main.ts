import { anchor, buildState, DIRS, move, strike } from "./core/game";
import type { GameState } from "./core/types";
import { ALL_ROOMS, WORLDS } from "./levels/worlds";
import type { DirName, Input } from "./levels/replay";
import { Renderer } from "./render/renderer";

// The shell's logged action. `move`/`strike` carry a direction (the replay
// `Input` shape); `anchor` (Inc 2) is directionless. The input log is a union so
// the climb protocol (anchor -> move -> re-anchor) round-trips through undo and
// record-par. (The pure `replay` helper covers the directional verbs; anchor is
// applied directly by the shell.)
type LoggedAction = Input | { verb: "anchor" };

const app = document.getElementById("app")!;
const hud = document.getElementById("hud")!;
const renderer = new Renderer(app);

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

function room() {
  return ALL_ROOMS[roomIndex];
}

/** Which world a room index belongs to (for the HUD label). */
function worldOf(index: number) {
  let seen = 0;
  for (const w of WORLDS) {
    if (index < seen + w.rooms.length) return { world: w, roomNo: index - seen + 1 };
    seen += w.rooms.length;
  }
  return { world: WORLDS[WORLDS.length - 1], roomNo: 1 };
}

/** Load a room fresh: reset both stacks (undo + input log) for the new room. */
function loadRoom(index: number) {
  roomIndex = index;
  history = [];
  inputs = [];
  state = buildState(room().level);
  // World 5 "Dark" rooms render in heat-sense mode (renderer-only; the core is
  // unchanged — §2.2.7). `dark` is a presentation flag on the room metadata.
  renderer.onRoomLoad(state, room().level, room().dark === true);
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
    default:
      return "";
  }
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
    `<span class="sub">Arrows: move &nbsp;·&nbsp; Shift+Arrow: strike &nbsp;·&nbsp; A: anchor<br>` +
    `U: undo &nbsp;·&nbsp; R: restart &nbsp;·&nbsp; N: next &nbsp;·&nbsp; drag: orbit<br>` +
    `len ${state.snake.length} &nbsp;·&nbsp; moves ${inputs.length}</span>`;
}

/** Commit a verb result. No-op (blocked / terminal) returns the same ref and is
 *  NOT logged, so the shell's `next === state` no-op detection keeps the undo /
 *  input-log stacks in lockstep. */
function commit(next: GameState, action: LoggedAction) {
  if (next === state) return; // blocked / no-op — do not log
  history.push(state);
  inputs.push(action);
  state = next;
  render();
}

/** A directional verb (move / strike). */
function act(verb: "move" | "strike", dirName: DirName) {
  const next = (verb === "strike" ? strike : move)(state, DIRS[dirName]);
  commit(next, { verb, dir: dirName });
}

/** The anchor toggle (Inc 2): grip / release the segment beside a grip wall. */
function anchorAct() {
  commit(anchor(state), { verb: "anchor" });
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

window.addEventListener("keydown", (e) => {
  const dirName = KEYS[e.key];
  if (dirName) {
    e.preventDefault();
    act(e.shiftKey ? "strike" : "move", dirName);
    return;
  }
  switch (e.key.toLowerCase()) {
    case "a":
      anchorAct();
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
