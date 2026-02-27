import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth";

export async function registerMeRoutes(server: FastifyInstance) {
  server.get("/me", { preHandler: requireAuth }, async (request) => {
    return { user: request.currentUser };
  });
}

