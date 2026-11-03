import { defineConfig } from "vitest/config";
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: process.env.GAME_SERVER_TARGET ?? "http://127.0.0.1:3001",
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    watch: {
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
