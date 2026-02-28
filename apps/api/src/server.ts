import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { getEnv } from "./lib/env";
import { errorHandler } from "./lib/errors";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthzRoutes } from "./routes/healthz";
import { registerMeRoutes } from "./routes/me";
import { registerProjectsRoutes } from "./routes/projects";
import { registerUsersRoutes } from "./routes/users";

export async function buildServer(args?: {
  logger?: boolean;
  prisma?: PrismaClient;
}) {
  const env = getEnv();
  const prismaClient = args?.prisma ?? (await import("./lib/prisma")).prisma;

  const server = Fastify({
    logger: args?.logger ?? true,
  });

  server.decorate("prisma", prismaClient);
  server.decorateRequest("currentUser", null);

  server.setErrorHandler(errorHandler);

  server.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await server.register(cookie);
  await server.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: "access_token", signed: false },
  });

  await server.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await registerHealthzRoutes(server);
  await registerAuthRoutes(server);
  await registerMeRoutes(server);
  await registerUsersRoutes(server);
  await registerProjectsRoutes(server);

  return server;
}
