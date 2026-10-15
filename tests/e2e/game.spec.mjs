import { expect, test } from "@playwright/test";

test("player can start, pause, resume, and return home", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Hjælp Liva til slottet!" })).toBeVisible();
  await page.getByRole("button", { name: /LAD OS LØBE/ }).click();
  await expect(page.getByRole("button", { name: "Hop" })).toBeVisible();

  await page.getByRole("button", { name: "Sæt spillet på pause" }).click();
  await expect(page.getByText("PAUSE")).toBeVisible();
  await page.getByRole("button", { name: /^FORTSÆT/ }).click();
  await expect(page.getByText("PAUSE")).toBeHidden();

  await page.getByRole("button", { name: "Sæt spillet på pause" }).click();
  await page.getByRole("button", { name: "Tilbage til forsiden" }).click();
  await expect(page.getByRole("heading", { name: "Hjælp Liva til slottet!" })).toBeVisible();
});

test("player can jump by touching the game and get the iPhone fullscreen instructions", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: undefined });
  });
  await page.getByRole("button", { name: "Vis fuld skærm" }).click();
  await expect(page.getByRole("status")).toContainText("Føj til hjemmeskærm");

  await page.getByRole("button", { name: /LAD OS LØBE/ }).click();
  await page.locator("#game-canvas").dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
  await expect(page.getByRole("button", { name: "Hop" })).toBeVisible();
});
