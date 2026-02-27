import { expect, test } from "@playwright/test";

test("@smoke viewer cannot create user (FORBIDDEN)", async ({ request }) => {
  await request.post("/auth/login", {
    data: { email: "viewer@example.com", password: "viewer123" },
  });

  const res = await request.post("/users", {
    data: { email: "x@example.com", password: "password123", role: "viewer" },
  });

  expect(res.status()).toBe(403);
  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe("FORBIDDEN");
});

