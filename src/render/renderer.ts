import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EntityKind, GameState, LevelDef } from "../core/types";

const COLORS = {
  bg: 0x10141c,
  head: 0xffdd44,
  body: 0x88cc55,
  /** An anchored segment (gripping a wall) gets a hot accent so the player can
   *  see which part of the body is holding on (Inc 2). */
  anchored: 0xff8800,
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
};
const FALLBACK_STYLE = KIND_STYLE.wall;

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

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(6, 12, 8);
    this.scene.add(sun, this.group);

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
  onRoomLoad(_state: GameState, level: LevelDef) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const include = (x: number, y: number) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    for (const c of level.cells) include(c.x, c.y);
    for (const s of level.snake) include(s.x, s.y);
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

  private add(x: number, y: number, color: number, shape: "box" | "sphere", scale: number) {
    const geom =
      shape === "sphere"
        ? new THREE.SphereGeometry(scale / 2, 18, 18)
        : new THREE.BoxGeometry(scale, scale, scale);
    const m = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color }));
    m.position.set(x, y, 0);
    this.group.add(m);
  }

  render(state: GameState) {
    this.clearGroup();

    for (const [k, e] of state.cells) {
      const [x, y] = k.split(",").map(Number);
      const style = KIND_STYLE[e.kind] ?? FALLBACK_STYLE;
      this.add(x, y, style.color, style.shape, style.scale);
    }

    state.snake.forEach((seg, i) => {
      // An anchored segment gets the hot accent (it is the one gripping the
      // wall); otherwise head vs body colouring as before.
      const color = seg.anchored ? COLORS.anchored : i === 0 ? COLORS.head : COLORS.body;
      this.add(seg.x, seg.y, color, "box", 0.85);
    });
  }
}
