import { defineConfig } from "vite";

export default defineConfig({
  // Static assets live under public/assets/ and are referenced by
  // /assets/manifest.json at runtime.
  server: { port: 5173 },
  preview: { port: 4173 },
});
