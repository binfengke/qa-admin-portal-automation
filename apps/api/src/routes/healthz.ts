import type { FastifyInstance } from "fastify";

export async function registerHealthzRoutes(server: FastifyInstance) {
  server.get("/healthz", async () => {
    return { status: "ok" };
  });
}

