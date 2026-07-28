import { defineConfig } from "vitest/config";

// The Playwright suite under tests/e2e drives a real browser and is run by
// `pnpm test:e2e`; keep vitest out of it.
export default defineConfig({
  test: {
    exclude: ["node_modules/**", "dist/**", "tests/e2e/**"],
  },
});
