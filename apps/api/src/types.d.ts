import "fastify";
import type { PrismaClient, UserRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    currentUser: { id: string; email: string; role: UserRole } | null;
  }
}

