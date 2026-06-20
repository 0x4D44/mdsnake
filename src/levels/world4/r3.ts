// World 4 — R3 "Hold and Climb" — the core PRESSURE twist: hold a plate down with
// part of your body while the head reaches ELSEWHERE (§2.2.6, World 4).
//
// The gate ('A', g1) caps a shaft to the exit. The plate ('P', g1) sits directly
// below the gate. The trick: press the plate to open the gate, THEN strike up
// through the gate before it can re-close — a gate opened this turn stays open
// through the next strike's flight (mechanisms recompute only in the resolve tail
// AFTER the flight, and the win fires mid-flight).
//
//   y=4: . . X      exit @ (2,4)
//   y=3: . . A      gate g1 @ (2,3)
//   y=2: . . P      plate g1 @ (2,2)
//   y=1: 0 1 .      head '0'@(0,1) ; body '1'@(1,1)
//   y=0: # # #      floor
//        0 1 2
//
// Recorded solve (3 moves): strike(right) sails the head to (2,1) at the shaft
// foot; move(up) steps the head onto the plate at (2,2), pressing g1 so the gate
// at (2,3) opens; strike(up) launches the head up through the now-open gate, where
// it crosses the exit at (2,4) and WINS mid-flight. The gate is load-bearing
// (pinned solid -> the room is unsolvable).
import { parseRoom } from "../../core/ascii";

export const r3 = parseRoom({
  name: "W4R3 — Hold and Climb",
  strikeRange: 2,
  floorY: 0,
  rows: [
    "..X",
    "..A",
    "..P",
    "01.",
    "###",
  ],
  legend: {
    P: { type: "plate", trigger: "g1" },
    A: { type: "gate", door: "g1" },
  },
});
