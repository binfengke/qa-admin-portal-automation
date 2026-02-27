FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json

RUN corepack enable \
  && pnpm install --frozen-lockfile --filter @qa-sample/web...

COPY apps/web apps/web

RUN pnpm -F @qa-sample/web build

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

