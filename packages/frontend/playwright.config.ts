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
    // E2E runs against the PRODUCTION server, not `next dev`. `next dev`
    // compiles each route on first request — the cold compile of a
    // single route can take 60–90s on this project, which blows past
    // Playwright's per-test timeout and makes every first-goto flaky.
    // `next start` serves pre-built pages instantly, so the suite
    // measures the artifact we actually ship. Requires `next build`
    // to have run first (the command below chains it).
    webServer: process.env.PLAYWRIGHT_BASE_URL
        ? undefined
        : {
              command: "npx next build && npx next start --port 3000",
              url: "http://localhost:3000",
              reuseExistingServer: !process.env.CI,
              // Generous: a cold `next build` can take a couple of minutes.
              timeout: 300_000,
          },
});
