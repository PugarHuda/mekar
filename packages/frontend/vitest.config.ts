import { defineConfig } from "vitest/config";

/**
 * Vitest scope: unit tests under `src/` only.
 *
 * The `e2e/` directory holds Playwright specs (`*.spec.ts`) which use
 * the Playwright test API, not Vitest's — they must be excluded or
 * Vitest tries to run them and fails. Unit tests use the `.test.ts`
 * suffix; Playwright uses `.spec.ts`, so the include/exclude split is
 * unambiguous.
 */
export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
        exclude: ["node_modules/**", "e2e/**", ".next/**"],
        environment: "node",
    },
});
