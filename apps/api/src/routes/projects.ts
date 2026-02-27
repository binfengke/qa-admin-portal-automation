import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth";
import { ApiError } from "../lib/errors";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

const createBodySchema = z.object({
  name: z.string().min(1),
  key: z.string().min(2).max(20),
});

const updateBodySchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

function parseSort(
  sort?: string,
): { field: "createdAt" | "key" | "name"; direction: "asc" | "desc" } {
  if (!sort) return { field: "createdAt", direction: "desc" };
  const [field, direction] = sort.split(":");
  if (field !== "createdAt" && field !== "key" && field !== "name") {
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

export async function registerProjectsRoutes(server: FastifyInstance) {
  server.get("/projects", { preHandler: requireAuth }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { field, direction } = parseSort(query.sort);

    const where = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { key: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      server.prisma.project.count({ where }),
      server.prisma.project.findMany({
        where,
        orderBy: { [field]: direction },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          key: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  });

  server.post("/projects", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);

    const created = await server.prisma.project.create({
      data: { name: body.name, key: body.key, status: "active" },
      select: { id: true, name: true, key: true, status: true, createdAt: true, updatedAt: true },
    });

    reply.status(201);
    return { project: created };
  });

  server.patch(
    "/projects/:id",
    { preHandler: requireRole("admin") },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = updateBodySchema.parse(request.body);

      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.status !== undefined) data.status = body.status;

      const updated = await server.prisma.project.update({
        where: { id: params.id },
        data,
        select: { id: true, name: true, key: true, status: true, createdAt: true, updatedAt: true },
      });

      return { project: updated };
    },
  );

  server.delete(
    "/projects/:id",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      await server.prisma.project.delete({ where: { id: params.id } });
      reply.status(204).send();
    },
  );
}
