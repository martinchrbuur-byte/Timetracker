import { expect, test } from "@playwright/test";

function mockSupabase(page, { withSession }) {
  return page.route("**/*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.endsWith("/public/app-config.js")) {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `window.TRACKER_CONFIG = { persistence: { provider: \"supabase\", supabaseUrl: \"https://example.supabase.co\", supabaseAnonKey: \"anon-key\" } };`,
      });
      return;
    }

    if (url.includes("/auth/v1/user") && method === "GET") {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active session" }),
      });
      return;
    }

    if (url.includes("/auth/v1/signup") && method === "POST") {
      const payload = withSession
        ? {
            access_token: "access-token",
            refresh_token: "refresh-token",
            token_type: "bearer",
            user: {
              id: "user-1",
              email: "new@example.com",
            },
          }
        : {
            user: {
              id: "user-1",
              email: "new@example.com",
            },
          };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
      return;
    }

    if (url.includes("/rest/v1/tracker_users") && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes("/rest/v1/tracker_users") && method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes("/rest/v1/time_entries") && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    await route.continue();
  });
}

test("landing to signup to confirmation to sign-in", async ({ page }) => {
  await mockSupabase(page, { withSession: false });

  await page.goto("/public/index.html#landing");

  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await page.locator("#auth-email").fill("new@example.com");
  await page.locator("#auth-password").fill("Strongpass1");
  await page.locator("#auth-confirm-password").fill("Strongpass1");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
  await expect(page.getByText("Open the verification email")).toBeVisible();

  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("landing to signup redirects to app home when session returned", async ({ page }) => {
  await mockSupabase(page, { withSession: true });

  await page.goto("/public/index.html#landing");

  await page.getByRole("button", { name: "Create account" }).click();
  await page.locator("#auth-email").fill("new@example.com");
  await page.locator("#auth-password").fill("Strongpass1");
  await page.locator("#auth-confirm-password").fill("Strongpass1");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page.getByRole("heading", { name: "Current Status" })).toBeVisible();
  await expect(page).toHaveURL(/#app$/);
});
