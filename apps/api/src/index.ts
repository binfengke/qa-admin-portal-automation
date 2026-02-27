import "dotenv/config";
import { ensureSeedData } from "./lib/seed";
import { getEnv } from "./lib/env";
import { prisma } from "./lib/prisma";
import { buildServer } from "./server";

async function main() {
  const env = getEnv();
  const server = await buildServer();

  await prisma.$connect();
  await ensureSeedData(prisma);

  const close = async () => {
    await server.close();
    await prisma.$disconnect();
  };

  process.on("SIGINT", close);
  process.on("SIGTERM", close);

  await server.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

