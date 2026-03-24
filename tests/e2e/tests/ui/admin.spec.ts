import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import path from "node:path";
import { expectNoA11yViolations } from "../../helpers/a11y";

test.use({ storageState: path.join(__dirname, "../../.auth/admin.json") });

test("@smoke admin sees Users and can create a user", async ({ page }) => {
  const email = `ui.${crypto.randomUUID()}@example.com`;

  await page.goto("/users");
  await expect(page.getByTestId("users-table")).toBeVisible();
  await expect(page.getByTestId("create-user-button")).toBeVisible();

  await page.getByTestId("create-user-email").fill(email);
  await page.getByTestId("create-user-password").fill("password123");
  await page.getByTestId("create-user-button").click();

  await expect(page.getByTestId("users-table")).toContainText(email);
});

test("@smoke admin can navigate to Projects", async ({ page }) => {
  await page.goto("/users");
  await page.getByTestId("nav-projects").click();
  await expect(page.getByTestId("projects-table")).toBeVisible();
});

test("@smoke admin users page passes accessibility smoke", async ({ page }) => {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("@smoke admin projects page passes accessibility smoke", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expectNoA11yViolations(page);
});

