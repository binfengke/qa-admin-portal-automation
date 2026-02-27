import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../lib/errors";
import { verifyPassword } from "../lib/password";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerAuthRoutes(server: FastifyInstance) {
  server.post("/auth/login", async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const user = await server.prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, email: true, passwordHash: true, role: true, status: true },
    });

    if (!user || user.status !== "active") {
      throw new ApiError({
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new ApiError({
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const token = await reply.jwtSign(
      { sub: user.id, role: user.role },
      { expiresIn: "2h" },
    );

    reply.setCookie("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });

    return { ok: true };
  });

  server.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie("access_token", { path: "/" });
    return { ok: true };
  });
}
