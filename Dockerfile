# syntax=docker/dockerfile:1
FROM oven/bun:1-debian AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY . .

ENV NODE_ENV=production
USER bun

EXPOSE 3000
VOLUME /srv

CMD ["bun", "start"]
