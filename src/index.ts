import index from "./frontend/index.html";

import { serve } from "bun";
import { Hono } from "hono";
import { isAbsolute, relative, resolve } from "node:path";

import api from "./api";
import { env } from "./lib/env";
import log from "./lib/log";

const app = new Hono();

app.route("/api", api);

const isDev = process.env.NODE_ENV !== "production";

const monacoVsRoot = resolve(
	import.meta.dir,
	"../node_modules/monaco-editor/min/vs"
);

async function serveMonacoAsset(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const subPath = decodeURIComponent(
		url.pathname.replace(/^\/monaco-vs\//, "")
	);
	const fullPath = resolve(monacoVsRoot, subPath);

	const rel = relative(monacoVsRoot, fullPath);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		return new Response("Not found", { status: 404 });
	}

	const file = Bun.file(fullPath);
	if (!(await file.exists())) {
		return new Response("Not found", { status: 404 });
	}

	return new Response(file);
}

const server = serve({
	routes: {
		"/api/*": (req) => app.fetch(req),
		"/monaco-vs/*": serveMonacoAsset,
		"/*": index,
	},
	// MAX_FILE_SIZE is enforced per-file (assertSizeAllowed, in upload.ts and
	// file.ts). Uploads batch multiple files into a single multipart request,
	// so capping the request body at exactly MAX_FILE_SIZE would reject a
	// batch of several individually-valid files. This is just a resource-
	// exhaustion safety net against an absurdly large request body, not the
	// real size limit -- generous multiple of the per-file limit rather than
	// an unrelated fixed constant, so it scales with the configured limit.
	maxRequestBodySize: env.MAX_FILE_SIZE * 20,
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
