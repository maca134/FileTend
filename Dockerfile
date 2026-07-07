FROM oven/bun:debian
WORKDIR /app
COPY . .
RUN bun install --production
VOLUME /app/data
EXPOSE 3000