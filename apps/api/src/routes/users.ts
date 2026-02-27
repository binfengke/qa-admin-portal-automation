import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth";
import { ApiError } from "../lib/errors";
import { hashPassword } from "../lib/password";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

const createBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

const updateBodySchema = z.object({
  role: z.enum(["admin", "viewer"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(6).optional(),
});

function parseSort(sort?: string): { field: "createdAt" | "email"; direction: "asc" | "desc" } {
  if (!sort) return { field: "createdAt", direction: "desc" };
  const [field, direction] = sort.split(":");
  if (field !== "createdAt" && field !== "email") {
    throw new ApiError({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid sort field",
    });
  }
  if (direction !== "asc" && direction !== "desc") {
    throw new ApiError({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid sort direction",
    });
  }
  return { field, direction };
}

export async function registerUsersRoutes(server: FastifyInstance) {
  server.get("/users", { preHandler: requireAuth }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { field, direction } = parseSort(query.sort);

    const where = query.q
      ? {
          email: {
            contains: query.q,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [total, items] = await Promise.all([
      server.prisma.user.count({ where }),
      server.prisma.user.findMany({
        where,
        orderBy: { [field]: direction },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  });

  server.post("/users", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);

    const created = await server.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: body.role,
        status: "active",
      },
      select: { id: true, email: true, role: true, status: true, createdAt: true },
    });

    reply.status(201);
    return { user: created };
  });

  server.patch(
    "/users/:id",
    { preHandler: requireRole("admin") },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = updateBodySchema.parse(request.body);

      const data: Record<string, unknown> = {};
      if (body.role) data.role = body.role;
      if (body.status) data.status = body.status;
      if (body.password) data.passwordHash = await hashPassword(body.password);

      const updated = await server.prisma.user.update({
        where: { id: params.id },
        data,
        select: { id: true, email: true, role: true, status: true, createdAt: true },
      });

      return { user: updated };
    },
  );

  server.delete(
    "/users/:id",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      await server.prisma.user.delete({ where: { id: params.id } });
      reply.status(204).send();
    },
  );
}

