import index from "./frontend/index.html";

import { serve } from "bun";
import { Hono } from "hono";

import api from "./api";
import { env } from "./lib/env";
import log from "./lib/log";

const app = new Hono();

app.route("/api", api);

const isDev = process.env.NODE_ENV !== "production";

const server = serve({
	routes: {
		"/api/*": (req) => app.fetch(req),
		"/*": index,
	},
	development: isDev
		? {
				hmr: true,
				console: true,
			}
		: undefined,
	port: env.PORT,
});

log.info(`Server started on port http://localhost:${env.PORT}`);

process.on("SIGINT", () => {
	log.info("Received SIGINT, shutting down server...");
	server.stop();
	process.exit(0);
});

process.on("SIGTERM", () => {
	log.info("Received SIGTERM, shutting down server...");
	server.stop();
	process.exit(0);
});
