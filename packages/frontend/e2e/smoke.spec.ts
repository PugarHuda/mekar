import { test, expect } from "@playwright/test";

/**
 * Smoke suite — the lowest bar of "the app works".
 *
 * Runs against TWO Playwright projects (see playwright.config.ts):
 *   - chromium → Desktop Chrome
 *   - mobile   → Pixel 7 viewport
 *
 * Tests that apply to both use `firstVisible()` so they match the
 * VISIBLE nav (desktop top-bar vs mobile bottom-nav — both are in the
 * DOM, only one is shown per breakpoint). Tests that only make sense
 * on one form factor guard with `test.skip(isMobile, …)`.
 *
 * Anything that requires a wallet (mint, pay, edit) is excluded — CI
 * has no funded Galileo wallet. Those flows are covered manually.
 */

/** First VISIBLE match — desktop + mobile both render the nav links,
 *  but only one set is shown at a time. `.first()` alone would pick a
 *  hidden node; filtering by visibility picks the one actually on
 *  screen for the current viewport. */
function firstVisible(page: import("@playwright/test").Page, role: "link", name: string) {
    return page.getByRole(role, { name }).filter({ visible: true }).first();
}

test.describe("Mekar — public smoke", () => {
    test("landing renders hero + nav", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("text=Mekar").first()).toBeVisible();
        // Five primary nav items must be reachable on whatever nav the
        // viewport shows (top-bar on desktop, bottom-nav on mobile).
        for (const label of ["Explorer", "Mint", "Trending", "Dashboard", "Docs"]) {
            await expect(firstVisible(page, "link", label)).toBeVisible();
        }
        // ErrorBoundary fallback would render this string; if we see it
        // the page crashed during hydration.
        await expect(page.getByText("Something tripped this bloom.")).toHaveCount(0);
    });

    test("explorer loads + paints lineage data", async ({ page }) => {
        await page.goto("/explorer");
        await expect(
            page.getByRole("heading", { name: /lineage garden/i })
        ).toBeVisible();
        // After RPC fetches resolve we either see the garden / list or a
        // contextual empty state — never a render crash.
        await page.waitForLoadState("networkidle", { timeout: 30_000 });
        const crashed = await page
            .getByText("Something tripped this bloom.")
            .count();
        expect(crashed).toBe(0);
    });

    test("docs page renders the API-style sidebar", async ({ page }) => {
        await page.goto("/docs");
        await expect(page.getByText("On this page").first()).toBeVisible();
        await expect(
            page.getByRole("link", { name: /contract addresses/i }).first()
        ).toBeVisible();
        await expect(
            page.getByRole("link", { name: /safety & limits/i }).first()
        ).toBeVisible();
    });

    test("mint page gates the flow behind a wallet connect", async ({ page }) => {
        await page.goto("/mint");
        await expect(page.getByText(/plant a new bloom/i).first()).toBeVisible();
        // CI has no wallet → the flow must be gated. The stepper is NOT
        // rendered; the connect-wallet card is shown instead.
        await expect(
            page.getByText(/connect a wallet to mint/i).first()
        ).toBeVisible();
        await expect(page.getByText(/what kind of/i)).toHaveCount(0);
    });

    test("language switch toggles nav labels EN ↔ ID", async ({ page }, testInfo) => {
        // The EN·ID switcher lives in the desktop header (hidden on
        // mobile, where the bottom-nav owns navigation). Skip on the
        // mobile project — the switch isn't reachable there.
        test.skip(
            testInfo.project.name === "mobile",
            "locale switcher is desktop-header only"
        );
        await page.goto("/");
        await expect(firstVisible(page, "link", "Explorer")).toBeVisible();
        const switcher = page.getByRole("button", { name: /switch language/i });
        await switcher.click();
        await expect(firstVisible(page, "link", "Penjelajah")).toBeVisible();
        await expect(firstVisible(page, "link", "Cetak")).toBeVisible();
        await switcher.click();
        await expect(firstVisible(page, "link", "Explorer")).toBeVisible();
    });

    test("mobile explorer falls back to list view", async ({ page }, testInfo) => {
        // Mobile-only: below 700px the D3 force graph is swapped for a
        // vertical list (the graph is unreadable + heavy on phones).
        test.skip(
            testInfo.project.name !== "mobile",
            "list-view fallback only applies on the mobile viewport"
        );
        await page.goto("/explorer");
        await expect(
            page.getByRole("heading", { name: /lineage garden/i })
        ).toBeVisible();
        await page.waitForLoadState("networkidle", { timeout: 30_000 });
        // The bottom-nav must be present on mobile (primary navigation).
        await expect(
            page.getByRole("navigation", { name: /primary navigation/i })
        ).toBeVisible();
        await expect(page.getByText("Something tripped this bloom.")).toHaveCount(0);
    });
});
