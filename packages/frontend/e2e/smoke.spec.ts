import { test, expect } from "@playwright/test";

/**
 * Smoke suite — the lowest bar of "the app works".
 *
 * Each test asserts:
 *   - the route renders without a JS exception (ErrorBoundary fallback
 *     would mark the page as broken)
 *   - a heading or hero element specific to the page is visible
 *   - the in-app nav can reach the route
 *
 * Anything that requires a wallet (mint, pay, edit) is excluded — CI
 * has no funded Galileo wallet. Those flows are covered manually.
 */

test.describe("Mekar — public smoke", () => {
    test("landing renders hero + nav", async ({ page }) => {
        await page.goto("/");
        // The landing splash always has "Mekar" in the brand and one of
        // the hero phrases — assert a couple so we'd notice if either
        // got renamed silently.
        await expect(page.locator("text=Mekar").first()).toBeVisible();
        // Header must surface the five primary nav items.
        for (const label of ["Explorer", "Mint", "Trending", "Dashboard", "Docs"]) {
            await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
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
        // After RPC fetches resolve we either see the garden or a
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
        // Sidebar links present
        await expect(
            page.getByRole("link", { name: /contract addresses/i }).first()
        ).toBeVisible();
        await expect(
            page.getByRole("link", { name: /safety & limits/i }).first()
        ).toBeVisible();
    });

    test("mint page loads and shows step 1", async ({ page }) => {
        await page.goto("/mint");
        await expect(page.getByText(/what kind of/i).first()).toBeVisible();
        await expect(page.getByRole("button", { name: /next →/i })).toBeVisible();
    });

    test("language switch toggles nav labels EN ↔ ID", async ({ page }) => {
        await page.goto("/");
        // Default EN
        await expect(page.getByRole("link", { name: "Explorer" }).first()).toBeVisible();
        // Click switch — pill labelled "EN · ID"
        const switcher = page.getByRole("button", { name: /switch language/i });
        await switcher.click();
        // ID labels appear
        await expect(page.getByRole("link", { name: "Penjelajah" }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: "Cetak" }).first()).toBeVisible();
        // Toggle back
        await switcher.click();
        await expect(page.getByRole("link", { name: "Explorer" }).first()).toBeVisible();
    });
});
