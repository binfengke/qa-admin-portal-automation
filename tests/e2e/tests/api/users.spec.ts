import { expect, test } from "@playwright/test";
import { z } from "zod";
import crypto from "node:crypto";
import { deleteUserByEmail, findUserByEmail } from "../../helpers/db";

test("admin can create user and find via search", async ({ request }) => {
  await request.post("/auth/login", {
    data: { email: "admin@example.com", password: "admin123" },
  });

  const email = `user.${crypto.randomUUID()}@example.com`;
  try {
    const created = await request.post("/users", {
      data: { email, password: "password123", role: "viewer" },
    });
    expect(created.status()).toBe(201);

    const createdBody = z
      .object({
        user: z.object({
          id: z.string().uuid(),
          email: z.string().email(),
          role: z.enum(["admin", "viewer"]),
          status: z.enum(["active", "disabled"]),
          createdAt: z.string(),
        }),
      })
      .parse(await created.json());

    const persistedUser = await findUserByEmail(email);
    expect(persistedUser).not.toBeNull();
    expect(persistedUser).toMatchObject({
      id: createdBody.user.id,
      email,
      role: "viewer",
      status: "active",
    });
    expect(persistedUser?.passwordHash).toBeTruthy();
    expect(persistedUser?.passwordHash).not.toBe("password123");

    const list = await request.get(`/users?q=${encodeURIComponent(email)}&page=1&pageSize=20`);
    expect(list.ok()).toBeTruthy();

    const body = z
      .object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            email: z.string().email(),
            role: z.enum(["admin", "viewer"]),
            status: z.enum(["active", "disabled"]),
            createdAt: z.string(),
          }),
        ),
        total: z.number(),
      })
      .passthrough()
      .parse(await list.json());

    expect(body.items.some((u) => u.email === email)).toBeTruthy();
  } finally {
    await deleteUserByEmail(email);
  }
});

