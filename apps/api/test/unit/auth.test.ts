import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/lib/errors";
import { requireAuth, requireRole } from "../../src/lib/auth";

describe("auth guards (unit)", () => {
  it("requireAuth: no-op when currentUser already set", async () => {
    const request = {
      currentUser: { id: "u1", email: "a@example.com", role: "admin" },
      jwtVerify: vi.fn(() => {
        throw new Error("should not be called");
      }),
      server: { prisma: {} },
    } as any;

    await requireAuth(request, {} as any);
    expect(request.currentUser.email).toBe("a@example.com");
    expect(request.jwtVerify).not.toHaveBeenCalled();
  });

  it("requireAuth: sets currentUser when cookie token is valid and user is active", async () => {
    const request = {
      currentUser: null,
      jwtVerify: vi.fn().mockResolvedValue({ sub: "u1" }),
      server: {
        prisma: {
          user: {
            findUnique: vi.fn().mockResolvedValue({
              id: "u1",
              email: "admin@example.com",
              role: "admin",
              status: "active",
            }),
          },
        },
      },
    } as any;

    await requireAuth(request, {} as any);

    expect(request.currentUser).toEqual({
      id: "u1",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("requireAuth: throws 401 when user is disabled", async () => {
    const request = {
      currentUser: null,
      jwtVerify: vi.fn().mockResolvedValue({ sub: "u1" }),
      server: {
        prisma: {
          user: {
            findUnique: vi.fn().mockResolvedValue({
              id: "u1",
              email: "viewer@example.com",
              role: "viewer",
              status: "disabled",
            }),
          },
        },
      },
    } as any;

    await expect(requireAuth(request, {} as any)).rejects.toBeInstanceOf(ApiError);
    await expect(requireAuth(request, {} as any)).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("requireRole: throws 403 when role mismatched", async () => {
    const request = {
      currentUser: { id: "u1", email: "viewer@example.com", role: "viewer" },
    } as any;

    const preHandler = requireRole("admin");
    await expect(preHandler(request, {} as any)).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("requireRole: allows when role matches", async () => {
    const request = {
      currentUser: { id: "u1", email: "admin@example.com", role: "admin" },
    } as any;

    const preHandler = requireRole("admin");
    await expect(preHandler(request, {} as any)).resolves.toBeUndefined();
  });
});

