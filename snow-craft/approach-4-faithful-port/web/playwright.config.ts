import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4273",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Port 4273 (not the vite default 4173) to dodge a Python http.server that
    // commonly squats on 4173 in this dev environment.
    command: "npm run build && npm run preview -- --port 4273 --strictPort",
    url: "http://localhost:4273",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
