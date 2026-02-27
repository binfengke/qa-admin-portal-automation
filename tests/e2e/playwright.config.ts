import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

dotenv.config();

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://localhost:8080";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  globalSetup: "./global-setup",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: API_BASE_URL },
    },
    {
      name: "ui",
      testDir: "./tests/ui",
      use: { baseURL: WEB_BASE_URL },
    },
  ],
});

