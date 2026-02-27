FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma

RUN corepack enable \
  && pnpm install --frozen-lockfile --filter @qa-sample/api...

COPY apps/api apps/api

RUN pnpm -F @qa-sample/api prisma:generate

RUN pnpm -F @qa-sample/api build

EXPOSE 3000

CMD ["sh", "-lc", "pnpm -F @qa-sample/api prisma:migrate && pnpm -F @qa-sample/api start"]
