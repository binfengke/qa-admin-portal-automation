import supertest from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../../src/lib/password";
import { buildServer } from "../../src/server";

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

function createFakePrisma(seed: { adminPasswordHash: string; viewerPasswordHash: string }) {
  const now = Date.now();
  const users: UserRow[] = [
    {
      id: "u-admin",
      email: "admin@example.com",
      passwordHash: seed.adminPasswordHash,
      role: "admin",
      status: "active",
      createdAt: new Date(now - 1_000),
    },
    {
      id: "u-viewer",
      email: "viewer@example.com",
      passwordHash: seed.viewerPasswordHash,
      role: "viewer",
      status: "active",
      createdAt: new Date(now - 2_000),
    },
    ...Array.from({ length: 23 }).map((_, i) => ({
      id: `u-${i}`,
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
      async count() {
        return users.length;
      },
      async findMany(args: {
        skip?: number;
        take?: number;
        select?: Record<string, boolean>;
      }) {
        const start = args.skip ?? 0;
        const end = start + (args.take ?? users.length);
        return users.slice(start, end).map((u) => pick(u, args.select));
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

describe("api (integration): auth + RBAC + pagination", () => {
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

  it("login sets cookie; /me returns current user", async () => {
    const fakePrisma = createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash });
    const started = await startServer(fakePrisma);
    server = started.server;

    const loginRes = await started.request
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "admin123" })
      .expect(200);

    expect(loginRes.body).toEqual({ ok: true });
    const setCookie = loginRes.headers["set-cookie"]?.[0];
    expect(setCookie).toMatch(/access_token=/);

    const meRes = await started.request
      .get("/me")
      .set("Cookie", cookieValue(setCookie))
      .expect(200);

    expect(meRes.body.user).toMatchObject({
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("requires auth: GET /users without cookie returns 401", async () => {
    const fakePrisma = createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash });
    const started = await startServer(fakePrisma);
    server = started.server;

    const res = await started.request.get("/users").expect(401);
    expect(res.body.error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("enforces RBAC: viewer cannot create projects (403)", async () => {
    const fakePrisma = createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash });
    const started = await startServer(fakePrisma);
    server = started.server;

    const loginRes = await started.request
      .post("/auth/login")
      .send({ email: "viewer@example.com", password: "viewer123" })
      .expect(200);

    const viewerCookie = cookieValue(loginRes.headers["set-cookie"][0]);

    const res = await started.request
      .post("/projects")
      .set("Cookie", viewerCookie)
      .send({ name: "Gamma", key: "GAMMA" })
      .expect(403);

    expect(res.body.error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("paginates: GET /users returns page + pageSize + total", async () => {
    const fakePrisma = createFakePrisma({ adminPasswordHash: adminHash, viewerPasswordHash: viewerHash });
    const started = await startServer(fakePrisma);
    server = started.server;

    const loginRes = await started.request
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "admin123" })
      .expect(200);

    const adminCookie = cookieValue(loginRes.headers["set-cookie"][0]);

    const res = await started.request
      .get("/users?page=2&pageSize=10&sort=createdAt:desc")
      .set("Cookie", adminCookie)
      .expect(200);

    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBeGreaterThanOrEqual(25);
    expect(res.body.items).toHaveLength(10);
  });
});

