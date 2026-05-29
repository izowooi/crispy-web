import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
    globals: false,
  },
});
