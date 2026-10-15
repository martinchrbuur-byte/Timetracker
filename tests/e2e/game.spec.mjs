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

test("starting a run requests fullscreen when supported", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: () => {
        window.fullscreenRequested = true;
        return Promise.resolve();
      },
    });
  });

  await page.getByRole("button", { name: /LAD OS LØBE/ }).click();

  await expect(page.getByRole("button", { name: "Hop" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.fullscreenRequested)).toBe(true);
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

test("iPhone home-screen mode fills the viewport without transient gameplay popups", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
  });
  await page.goto("/");

  await expect(page.locator("body")).toHaveClass(/fullscreen-mode/);
  await expect(page.locator("#game-hint")).toHaveCount(0);
  await expect(page.locator("main")).toHaveCSS("height", "932px");
  await expect(page.locator("#game-canvas")).toHaveCSS("object-fit", "fill");
});
