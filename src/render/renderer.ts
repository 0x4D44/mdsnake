import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GameState } from "../core/types";

const COLORS = {
  bg: 0x10141c,
  wall: 0x3a4252,
  fruit: 0xff5566,
  exit: 0x33dd88,
  head: 0xffdd44,
  body: 0x88cc55,
};

/**
 * Minimal presentation layer. Reads a GameState and draws boxes/spheres; holds
 * no game rules. Rebuilds its mesh group on each render() (rooms are tiny).
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

  private clearGroup() {
    for (const child of this.group.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    }
    this.group.clear();
  }

  render(state: GameState) {
    this.clearGroup();

    const box = (x: number, y: number, color: number, scale = 1) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(scale, scale, scale),
        new THREE.MeshStandardMaterial({ color }),
      );
      m.position.set(x, y, 0);
      this.group.add(m);
    };

    for (const [k, t] of state.cells) {
      const [x, y] = k.split(",").map(Number);
      if (t === "wall") box(x, y, COLORS.wall);
      else if (t === "exit") box(x, y, COLORS.exit, 0.9);
      else if (t === "fruit") {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 18, 18),
          new THREE.MeshStandardMaterial({ color: COLORS.fruit }),
        );
        m.position.set(x, y, 0);
        this.group.add(m);
      }
    }

    state.snake.forEach((seg, i) => box(seg.x, seg.y, i === 0 ? COLORS.head : COLORS.body, 0.85));
  }
}
