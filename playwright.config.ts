import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: process.env.PW_BROWSER_PATH
      ? { executablePath: process.env.PW_BROWSER_PATH }
      : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --port 4173 --strictPort",
      env: { GAME_SERVER_TARGET: "http://127.0.0.1:3002" },
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
    {
      command: "npm run server",
      env: {
        PORT: "3002",
        LOCAL_DATABASE_DIR: ".local-data/e2e",
        ALLOWED_ORIGINS: "http://127.0.0.1:4173",
      },
      url: "http://127.0.0.1:3002/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
