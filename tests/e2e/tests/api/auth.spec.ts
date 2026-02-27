import { expect, test } from "@playwright/test";
import { z } from "zod";

test("@smoke admin login sets auth cookie", async ({ request }) => {
  const login = await request.post("/auth/login", {
    data: { email: "admin@example.com", password: "admin123" },
  });
  expect(login.ok()).toBeTruthy();
  expect(login.headers()["set-cookie"]).toContain("access_token=");

  const me = await request.get("/me");
  expect(me.ok()).toBeTruthy();

  const body = z
    .object({
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["admin", "viewer"]),
      }),
    })
    .parse(await me.json());

  expect(body.user.email).toBe("admin@example.com");
  expect(body.user.role).toBe("admin");
});

test("invalid login returns AUTH_INVALID_CREDENTIALS", async ({ request }) => {
  const res = await request.post("/auth/login", {
    data: { email: "admin@example.com", password: "wrong" },
  });
  expect(res.status()).toBe(401);
  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe("AUTH_INVALID_CREDENTIALS");
});

