import supertest from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../../src/lib/password";
import { buildServer } from "../../src/server";
import { expectContractResponse } from "./helpers/contract";

type UserRole = "admin" | "viewer";
type UserStatus = "active" | "disabled";

type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
};

function pick<T extends Record<string, unknown>>(row: T, select?: Record<string, boolean>) {
  if (!select) return row;
  const out: Record<string, unknown> = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) out[key] = row[key];
  }
  return out;
}

function matchesWhere(row: UserRow, where?: { email?: { contains?: string } }) {
  const query = where?.email?.contains;
  if (!query) return true;
  return row.email.toLowerCase().includes(query.toLowerCase());
}

function createFakePrisma(seed: { adminPasswordHash: string; viewerPasswordHash: string }) {
  const now = Date.now();
  const users: UserRow[] = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      email: "admin@example.com",
      passwordHash: seed.adminPasswordHash,
      role: "admin",
      status: "active",
      createdAt: new Date(now - 1_000),
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      email: "viewer@example.com",
      passwordHash: seed.viewerPasswordHash,
      role: "viewer",
      status: "active",
      createdAt: new Date(now - 2_000),
    },
    ...Array.from({ length: 23 }).map((_, i) => ({
      id: `${String(i + 3).padStart(8, "0")}-3333-4333-8333-${String(i + 3).padStart(12, "0")}`,
      email: `user${i}@example.com`,
      passwordHash: seed.viewerPasswordHash,
      role: "viewer" as const,
      status: "active" as const,
      createdAt: new Date(now - 10_000 - i),
    })),
  ];

  const byId = new Map(users.map((u) => [u.id, u]));
  const byEmail = new Map(users.map((u) => [u.email, u]));

  return {
    user: {
      async findUnique(args: { where: { id?: string; email?: string }; select?: Record<string, boolean> }) {
        const row = args.where.id ? byId.get(args.where.id) : byEmail.get(args.where.email ?? "");
        if (!row) return null;
        return pick(row, args.select);
      },
      async count(args?: { where?: { email?: { contains?: string } } }) {
        return users.filter((row) => matchesWhere(row, args?.where)).length;
      },
      async findMany(args: {
        where?: { email?: { contains?: string } };
        skip?: number;
        take?: number;
        select?: Record<string, boolean>;
      }) {
        const filtered = users.filter((row) => matchesWhere(row, args.where));
        const start = args.skip ?? 0;
        const end = start + (args.take ?? filtered.length);
        return filtered.slice(start, end).map((row) => pick(row, args.select));
      },
    },
  };
}

async function startServer(fakePrisma: any) {
  const server = await buildServer({ logger: false, prisma: fakePrisma });
  await server.ready();

  const address = await server.listen({ host: "127.0.0.1", port: 0 });
  const request = supertest(address);

  return { server, request };
}

function cookieValue(setCookieHeader: string) {
  return setCookieHeader.split(";")[0];
}

describe("api contract: GET /users", () => {
  let adminHash = "";
  let viewerHash = "";
  let server: Awaited<ReturnType<typeof buildServer>> | null = null;

  beforeAll(async () => {
    adminHash = await hashPassword("admin123");
    viewerHash = await hashPassword("viewer123");
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it("matches the paginated list contract for an authenticated request", async () => {
    const started = await startServer(
      createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash }),
    );
    server = started.server;

    const loginRes = await started.request
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "admin123" })
      .expect(200);

    const res = await started.request
      .get("/users?page=2&pageSize=10")
      .set("Cookie", cookieValue(loginRes.headers["set-cookie"][0]))
      .expect(200);

    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(25);
    expect(res.body.items).toHaveLength(10);
    await expectContractResponse({
      path: "/users",
      method: "get",
      status: 200,
      body: res.body,
    });
  });

  it("matches the unauthenticated error contract", async () => {
    const started = await startServer(
      createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash }),
    );
    server = started.server;

    const res = await started.request.get("/users").expect(401);

    await expectContractResponse({
      path: "/users",
      method: "get",
      status: 401,
      body: res.body,
    });
  });

  it("matches the invalid-query error contract", async () => {
    const started = await startServer(
      createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash }),
    );
    server = started.server;

    const loginRes = await started.request
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "admin123" })
      .expect(200);

    const res = await started.request
      .get("/users?page=0&pageSize=10")
      .set("Cookie", cookieValue(loginRes.headers["set-cookie"][0]))
      .expect(400);

    await expectContractResponse({
      path: "/users",
      method: "get",
      status: 400,
      body: res.body,
    });
  });
});
