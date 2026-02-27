import type { UserRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "./errors";

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  if (request.currentUser) return;

  try {
    const payload = await request.jwtVerify<{ sub: string }>({ onlyCookie: true });
    const user = await request.server.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== "active") {
      throw new ApiError({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    request.currentUser = { id: user.id, email: user.email, role: user.role };
  } catch {
    throw new ApiError({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }
}

export function requireRole(role: UserRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (!request.currentUser) return;
    if (request.currentUser.role !== role) {
      throw new ApiError({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Forbidden",
      });
    }
  };
}
