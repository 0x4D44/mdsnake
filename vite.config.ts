import { defineConfig } from "vitest/config";

// base: "./" so the built bundle works under the almanac subpath
// (https://0x4d44.github.io/<slug>/), matching the night-cab pattern.
export default defineConfig({
  base: "./",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
