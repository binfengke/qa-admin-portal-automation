import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { getEnv } from "./lib/env";
import { errorHandler } from "./lib/errors";
import { prisma } from "./lib/prisma";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthzRoutes } from "./routes/healthz";
import { registerMeRoutes } from "./routes/me";
import { registerProjectsRoutes } from "./routes/projects";
import { registerUsersRoutes } from "./routes/users";

export async function buildServer() {
  const env = getEnv();

  const server = Fastify({
    logger: true,
  });

  server.decorate("prisma", prisma);
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
