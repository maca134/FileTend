import { ZipArchive } from "archiver";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { basename } from "node:path";
import { Readable } from "node:stream";

import { env } from "../lib/env";
import log from "../lib/log";
import { resolveSafePath, statOr404 } from "../lib/paths";
import { pathQuery } from "../lib/validation";

function contentDisposition(filename: string) {
	const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const handler = createFactory().createHandlers(pathQuery, async (c) => {
	if (!env.ALLOW_DOWNLOAD) {
		throw new HTTPException(403, {
			message: "Downloading files and folders is disabled",
		});
	}

	const { path } = c.req.valid("query");
	const fullPath = await resolveSafePath(env.ROOT_DIR, path);
	const stats = await statOr404(fullPath);
	const name = basename(fullPath);

	if (stats.isDirectory()) {
		const archive = new ZipArchive({ zlib: { level: 9 } });
		// Must be attached before finalize() (or any other async work) --
		// an 'error' event with no listener crashes the process. Attaching
		// it here rather than relying on finalize() being synchronous
		// keeps this safe against future refactors.
		archive.on("error", (err) => {
			log.error(`Error zipping ${fullPath}: ${err.message}`);
		});
		archive.directory(fullPath, name);
		archive.finalize();

		return new Response(
			Readable.toWeb(archive) as unknown as ReadableStream,
			{
				headers: {
					"Content-Type": "application/zip",
					"Content-Disposition": contentDisposition(`${name}.zip`),
				},
			}
		);
	}

	return new Response(Bun.file(fullPath), {
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Disposition": contentDisposition(name),
		},
	});
});

export default handler;
