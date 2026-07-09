FROM oven/bun:debian
WORKDIR /app
COPY . .
RUN bun install --production
VOLUME /srv
EXPOSE 3000