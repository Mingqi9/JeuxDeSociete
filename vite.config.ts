import { defineConfig } from "vitest/config";
export default defineConfig({
  server: {
    watch: {
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
