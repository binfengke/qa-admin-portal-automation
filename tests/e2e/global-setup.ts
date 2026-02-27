import { request as playwrightRequest } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

const VIEWER_EMAIL = "viewer@example.com";
const VIEWER_PASSWORD = "viewer123";

async function loginAndSaveState(args: {
  apiBaseUrl: string;
  email: string;
  password: string;
  statePath: string;
}) {
  const ctx = await playwrightRequest.newContext({ baseURL: args.apiBaseUrl });
  const res = await ctx.post("/auth/login", {
    data: { email: args.email, password: args.password },
  });
  if (!res.ok()) {
    throw new Error(
      `Global setup login failed for ${args.email}: ${res.status()} ${res.statusText()}`,
    );
  }
  await ctx.storageState({ path: args.statePath });
  await ctx.dispose();
}

export default async function globalSetup() {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
  const authDir = path.join(__dirname, ".auth");
  await fs.mkdir(authDir, { recursive: true });

  await loginAndSaveState({
    apiBaseUrl,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    statePath: path.join(authDir, "admin.json"),
  });

  await loginAndSaveState({
    apiBaseUrl,
    email: VIEWER_EMAIL,
    password: VIEWER_PASSWORD,
    statePath: path.join(authDir, "viewer.json"),
  });
}

