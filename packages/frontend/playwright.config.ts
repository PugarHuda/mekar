import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Mekar's E2E smoke suite.
 *
 * Scope: prove the app boots, key routes render, the navbar wires up,
 * and the explorer can paint its garden against the production-deployed
 * chain. We do NOT click "Mint" or "Pay" in CI — those require a funded
 * Galileo wallet which we don't have in the runner. Manual smoke covers
 * the write path; this suite catches regressions on the read path
 * (routing, hydration, RPC fetches succeeding).
 *
 * The dev server is auto-started by `webServer` so contributors can run
 * `pnpm playwright test` without remembering to spin up `next dev`
 * first. CI can override via PLAYWRIGHT_BASE_URL to test the deployed
 * preview directly.
 */
export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    expect: { timeout: 8_000 },
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: process.env.PLAYWRIGHT_BASE_URL
        ? undefined
        : {
              command: "npx next dev --port 3000",
              url: "http://localhost:3000",
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
          },
});
