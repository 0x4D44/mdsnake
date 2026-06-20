import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { allBodies } from "../core/game";
import type { EntityKind, GameState, LevelDef, Vec } from "../core/types";
import { drawItems } from "./draw";

/** The tan of a swallowable `object` and of the carried-block nib — they are the
 *  same material (a swallowed block is a carried object), so the colour lives in
 *  ONE constant referenced by both `COLORS.carry` and `KIND_STYLE.object`. */
const TAN = 0xc8a064;

const COLORS = {
  bg: 0x10141c,
  head: 0xffdd44,
  body: 0x88cc55,
  /** An anchored segment (gripping a wall) gets a hot accent so the player can
   *  see which part of the body is holding on (Inc 2). */
  anchored: 0xff8800,
  /** A carried (swallowed) block, drawn as a small nib on the carrying segment so
   *  the player can see the gut is full (Inc 4 / World 6, §2.2.8). */
  carry: TAN,
  /** The hidden-egg marker (scoring-only, §2.7) — a pale gold orb on its cell. */
  egg: 0xffe08a,
  /** A co-op (non-active) body's head and body: a dimmed/desaturated palette so
   *  the inactive snakes read as present-but-backgrounded against the bright
   *  active body (§2.2.10). The active head stays the camera/dark-radius anchor. */
  otherHead: 0xbfa94a,
  otherBody: 0x4f6b3c,
};

/** Per-kind visual choice. The renderer reads the entity's `kind` (rules read
 *  FLAGS — see core/types); this is the single place new entities pick a look.
 *  Unknown kinds fall back to the wall style. */
const KIND_STYLE: Record<EntityKind, { color: number; shape: "box" | "sphere"; scale: number }> = {
  wall: { color: 0x3a4252, shape: "box", scale: 1 },
  fruit: { color: 0xff5566, shape: "sphere", scale: 0.7 },
  exit: { color: 0x33dd88, shape: "box", scale: 0.9 },
  // A grip wall: a distinct ridged blue so grippable surfaces read apart from
  // plain walls (Inc 2 / World 3).
  anchor: { color: 0x4477cc, shape: "box", scale: 1 },
  // A pressure plate: a flat amber pad you stand ON (Inc 3 / World 4). Low and
  // wide so it reads as a floor button, not a block.
  plate: { color: 0xddaa33, shape: "box", scale: 0.95 },
  // A gate: a violet block. When OPEN its solidity is derived false; the renderer
  // dims it to a thin ghost so the player can see the gap is passable (see render).
  gate: { color: 0x9955dd, shape: "box", scale: 1 },
  // A heat lamp (Inc 3 / World 5 "Dark"): a warm glowing sphere. In the dark it is
  // one of the few things that stays lit (it is a HEAT source), so the player uses
  // lamps as landmarks for the geometry they memorised while lit.
  heatlamp: { color: 0xffaa33, shape: "sphere", scale: 0.55 },
  // A swallowable / shed block (Inc 4 / World 6 "The Gullet"): a chunky tan crate
  // that reads as a discrete object you can swallow and re-deposit as a step or a
  // plate/gate holder (the decoy, §2.2.8/§2.2.9). Slightly under-scale so a
  // deposited block sits visibly within its cell.
  object: { color: TAN, shape: "box", scale: 0.85 },
};
const FALLBACK_STYLE = KIND_STYLE.wall;

/** In a DARK room (§2.2.7), how many cells around the head stay lit. Everything
 *  else that is neither a heat source nor the snake is dimmed to a faint hint. */
const DARK_HEAD_RADIUS = 1.5;
/** Opacity a non-lit cell is dimmed to in the dark (a faint ghost, not invisible —
 *  the geometry is "remembered", barely sensed, never crisply seen). */
const DARK_DIM_OPACITY = 0.08;

/**
 * Minimal presentation layer. Reads a GameState and draws boxes/spheres; holds
 * no game rules. Rebuilds its mesh group on each render() (rooms are tiny).
 *
 * Camera auto-fit is computed ONCE per room in `onRoomLoad` from the room's
 * AUTHORED bounds (cells + snake start) — never the live snake position — so the
 * framing is stable for the whole room and a falling snake may leave frame
 * (HLD §2.8, F-camera).
 */
export class Renderer {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private gl: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private group = new THREE.Group();
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;
  /** Whether the CURRENT room is dark (heat-sense mode, §2.2.7). Set per room in
   *  `onRoomLoad`; the core never knows about this — it is pure presentation. */
  private dark = false;
  /** The hidden-egg cell for the current room, if any (scoring-only marker, §2.7).
   *  Set per room in `onRoomLoad`; drawn as a pale orb. The core has no egg entity —
   *  this is purely a visual hint of where the bonus marker sits. */
  private eggAt: Vec | undefined;

  constructor(private container: HTMLElement) {
    this.scene.background = new THREE.Color(COLORS.bg);

    this.camera = new THREE.PerspectiveCamera(50, this.aspect(), 0.1, 1000);
    this.camera.position.set(6, 6, 16);

    this.gl = new THREE.WebGLRenderer({ antialias: true });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.gl.domElement);

    this.controls = new OrbitControls(this.camera, this.gl.domElement);
    this.controls.target.set(6, 2, 0);
    this.controls.enableDamping = true;

    this.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.85);
    this.sun.position.set(6, 12, 8);
    this.scene.add(this.ambient, this.sun, this.group);

    window.addEventListener("resize", () => this.onResize());
    const loop = () => {
      requestAnimationFrame(loop);
      this.controls.update();
      this.gl.render(this.scene, this.camera);
    };
    loop();
  }

  private aspect() {
    return this.container.clientWidth / this.container.clientHeight;
  }

  private onResize() {
    this.camera.aspect = this.aspect();
    this.camera.updateProjectionMatrix();
    this.gl.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  /**
   * Frame the room ONCE on load from its authored bounds (static cells + snake
   * START) — NOT the live `GameState.snake`, which moves and may fall out of
   * frame. Re-centres `controls.target` and pulls the camera back to fit the
   * room's extent (HLD §2.8 camera auto-fit).
   */
  onRoomLoad(_state: GameState, level: LevelDef, dark = false, eggAt?: Vec) {
    // Dark mode (§2.2.7) is RENDERER-ONLY: dim the scene's global lights so only
    // heat sources, the snake, and the head's small lit radius stand out (the
    // per-cell dimming happens in `render`). The core is unchanged.
    this.dark = dark;
    this.eggAt = eggAt;
    this.ambient.intensity = dark ? 0.12 : 0.6;
    this.sun.intensity = dark ? 0.15 : 0.85;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const include = (x: number, y: number) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    for (const c of level.cells) include(c.x, c.y);
    for (const s of level.snake) include(s.x, s.y);
    if (eggAt) include(eggAt.x, eggAt.y);
    if (!Number.isFinite(minX)) {
      minX = 0; maxX = 0; minY = 0; maxY = 0; // empty room guard
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = maxX - minX + 1;
    const spanY = maxY - minY + 1;

    this.controls.target.set(cx, cy, 0);

    // Distance to fit the larger span in the vertical FOV (with the aspect ratio
    // accounting for the horizontal extent) plus a small margin.
    const vFov = (this.camera.fov * Math.PI) / 180;
    const fitHeight = spanY;
    const fitWidth = spanX / Math.max(this.aspect(), 0.0001);
    const fit = Math.max(fitHeight, fitWidth);
    const dist = (fit / 2 / Math.tan(vFov / 2)) * 1.25 + 4;

    this.camera.position.set(cx, cy + spanY * 0.25, dist);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private clearGroup() {
    for (const child of this.group.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    }
    this.group.clear();
  }

  private add(
    x: number,
    y: number,
    color: number,
    shape: "box" | "sphere",
    scale: number,
    opts: { height?: number; opacity?: number } = {},
  ) {
    const height = opts.height ?? scale;
    const geom =
      shape === "sphere"
        ? new THREE.SphereGeometry(scale / 2, 18, 18)
        : new THREE.BoxGeometry(scale, height, scale);
    const transparent = opts.opacity !== undefined && opts.opacity < 1;
    const m = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({ color, transparent, opacity: opts.opacity ?? 1 }),
    );
    // A flat plate sits low in its cell; everything else is centred.
    m.position.set(x, shape === "box" && height < scale ? y - (scale - height) / 2 : y, 0);
    this.group.add(m);
  }

  render(state: GameState) {
    this.clearGroup();

    // The active head (allBodies[0][0] === state.snake[0]) stays the camera /
    // dark-radius anchor even when co-op bodies are present (§2.2.10).
    const head = allBodies(state)[0][0];
    // In the dark, a cell is LIT iff it is a heat source OR within the head's small
    // lit radius. Everything else is dimmed to a faint ghost (heat-sense, §2.2.7).
    // `heat` is read ONLY here — never by the core (CORE-REGRESSION-HEAT).
    const litInDark = (x: number, y: number, e: { heat?: boolean }): boolean => {
      if (e.heat === true) return true;
      const dx = x - head.x, dy = y - head.y;
      return Math.hypot(dx, dy) <= DARK_HEAD_RADIUS;
    };

    // The pure projection drives the mesh build: every cell + every segment of
    // EVERY body (active and co-op). It is emitted cells-first, segments-last, so
    // splitting it preserves the old draw order (cells, then egg, then snakes).
    const items = drawItems(state);

    for (const item of items) {
      if (item.type !== "cell") continue;
      const { x, y, entity: e } = item;
      const style = KIND_STYLE[e.kind] ?? FALLBACK_STYLE;
      // Dark dim: faint everywhere except heat + the head's radius.
      const dim = this.dark && !litInDark(x, y, e) ? DARK_DIM_OPACITY : undefined;
      if (e.kind === "plate") {
        // A flat pad: low box so the snake visibly stands on top of it.
        this.add(x, y, style.color, "box", style.scale, { height: 0.2, opacity: dim });
      } else if (e.kind === "gate") {
        // OPEN (derived solid:false) -> a thin ghost so the gap reads passable;
        // CLOSED -> the full violet block. In the dark an unlit gate is dimmed
        // further still (take the smaller opacity).
        if (e.solid === false) {
          this.add(x, y, style.color, "box", style.scale, { height: 0.15, opacity: Math.min(0.35, dim ?? 1) });
        } else {
          this.add(x, y, style.color, style.shape, style.scale, { opacity: dim });
        }
      } else {
        this.add(x, y, style.color, style.shape, style.scale, { opacity: dim });
      }
    }

    // The hidden-egg marker (scoring-only, §2.7): a pale orb floating on its cell.
    // Drawn UNDER the snakes so a segment occupying it (collecting it) reads on top.
    // In the dark it dims with everything else unless within the head's radius.
    if (this.eggAt) {
      const dim = this.dark && !litInDark(this.eggAt.x, this.eggAt.y, {}) ? DARK_DIM_OPACITY : undefined;
      this.add(this.eggAt.x, this.eggAt.y, COLORS.egg, "sphere", 0.45, { opacity: dim });
    }

    // Every segment of every body. The active body keeps the bright head/body
    // palette (anchored segments take the hot accent); co-op bodies get the
    // dimmed/desaturated palette with each head still marked (§2.2.10).
    for (const item of items) {
      if (item.type !== "segment") continue;
      const { x, y, role, head: isHead, seg } = item;
      const color = seg.anchored
        ? COLORS.anchored
        : role === "other"
          ? isHead
            ? COLORS.otherHead
            : COLORS.otherBody
          : isHead
            ? COLORS.head
            : COLORS.body;
      this.add(x, y, color, "box", 0.85);
      // A carried (swallowed) block rides on its segment — draw a small nib on top
      // so a full gut is visible (Inc 4 / World 6, §2.2.8).
      if (seg.carry !== undefined) {
        this.add(seg.x, seg.y + 0.55, COLORS.carry, "box", 0.35);
      }
    }
  }
}
