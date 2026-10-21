import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PORT = Number(process.env.API_PORT ?? 8790);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    proxy: { "/api": { target: `http://localhost:${API_PORT}`, changeOrigin: true, ws: true } },
  },
});
