import { buildState, DIRS, move, strike } from "./core/game";
import type { GameState } from "./core/types";
import { level1 } from "./levels/level1";
import { Renderer } from "./render/renderer";

const app = document.getElementById("app")!;
const hud = document.getElementById("hud")!;
const renderer = new Renderer(app);

let history: GameState[] = [];
let state = buildState(level1);

function statusLine(): string {
  if (state.status === "won") return "<b>Solved!</b> &nbsp;(R to replay)";
  if (state.status === "dead") return "<b>You fell.</b> &nbsp;(R to restart, U to undo)";
  return `Reach the green exit &nbsp;<span class="sub">len ${state.snake.length}</span>`;
}

function render() {
  renderer.render(state);
  hud.innerHTML =
    `<b>COIL</b> &nbsp;·&nbsp; ${state.name}<br>${statusLine()}<br><br>` +
    `<span class="sub">Arrows: move &nbsp;·&nbsp; Shift+Arrow: strike<br>` +
    `U: undo &nbsp;·&nbsp; R: restart &nbsp;·&nbsp; drag: orbit</span>`;
}

function act(next: GameState) {
  if (next === state) return; // blocked / no-op
  history.push(state);
  state = next;
  render();
}

const KEYS: Record<string, keyof typeof DIRS> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

window.addEventListener("keydown", (e) => {
  const dirName = KEYS[e.key];
  if (dirName) {
    e.preventDefault();
    const dir = DIRS[dirName];
    act(e.shiftKey ? strike(state, dir) : move(state, dir));
    return;
  }
  if (e.key === "u" || e.key === "U") {
    const prev = history.pop();
    if (prev) {
      state = prev;
      render();
    }
  } else if (e.key === "r" || e.key === "R") {
    history = [];
    state = buildState(level1);
    render();
  }
});

render();
