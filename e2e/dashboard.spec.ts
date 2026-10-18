import { test, expect } from "@playwright/test";

test.describe("OpsMind core journey", () => {
  test.setTimeout(60_000);

  test("overview shows the simulated-data label and the strongest candidate", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".simulated-badge")).toHaveText("SIMULATED DATA");
    await expect(page.getByText("Electricity used", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Investigation queue" })).toBeVisible();

    // The queue is newest-first, but the "strongest candidate" panel must show
    // the largest deviation (17 Sep, +36.0%), not simply the latest day.
    const strongest = page
      .locator("section.card")
      .filter({ has: page.getByRole("heading", { name: "What needs attention?" }) });
    await expect(strongest).toContainText("17 Sep 2026");
    await expect(strongest).toContainText("+36.0%");
  });

  test("sidebar navigation reaches the data table", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("navigation", { name: "Main sections" })
      .getByRole("link", { name: "Data" })
      .click();

    // The first dev-mode compile of a route can take longer than 5s.
    await expect(page).toHaveURL(/\/data$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Data", exact: true })).toBeVisible();
    await expect(page.locator("table.data").first()).toContainText("2026-09-01");
  });

  test("investigate calls the backend and shows the evidence-backed result", async ({ page }) => {
    await page.goto("/investigations");

    const investigate = page.getByRole("button", { name: "Investigate" }).first();
    await expect(investigate).toBeVisible();
    await investigate.click();

    await expect(page).toHaveURL(/\/investigations\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /^Investigation —/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Anomaly summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI summary" })).toBeVisible();
    await expect(page.getByText(/^(Simulated model|Live model)$/)).toBeVisible();
  });
});
