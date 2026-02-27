import { expect, test } from "@playwright/test";
import path from "node:path";

test.use({ storageState: path.join(__dirname, "../../.auth/viewer.json") });

test("@smoke viewer does not see create forms", async ({ page }) => {
  await page.goto("/users");
  await expect(page.getByTestId("users-table")).toBeVisible();
  await expect(page.getByTestId("create-user-button")).toHaveCount(0);

  await page.getByTestId("nav-projects").click();
  await expect(page.getByTestId("projects-table")).toBeVisible();
  await expect(page.getByTestId("create-project-button")).toHaveCount(0);
});

