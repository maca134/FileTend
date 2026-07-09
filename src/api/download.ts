import { zValidator } from "@hono/zod-validator";
import { ZipArchive } from "archiver";
import { HTTPException } from "hono/http-exception";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { Readable } from "node:stream";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { resolveSafePath } from "../lib/paths";

function contentDisposition(filename: string) {
	const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const handler = createHandler(
	zValidator("query", z.object({ path: z.string() })),
	async (c) => {
		if (!env.ALLOW_DOWNLOAD) {
			throw new HTTPException(403, {
				message: "Downloading files and folders is disabled",
			});
		}

		const { path } = c.req.valid("query");
		const fullPath = await resolveSafePath(env.ROOT_DIR, path);

		const stats = await stat(fullPath).catch(() => null);
		if (!stats) {
			throw new HTTPException(404, {
				message: "File or folder not found",
			});
		}

		const name = basename(fullPath);

		if (stats.isDirectory()) {
			const archive = new ZipArchive({ zlib: { level: 9 } });
			archive.directory(fullPath, name);
			archive.finalize();

			return new Response(
				Readable.toWeb(archive) as unknown as ReadableStream,
				{
					headers: {
						"Content-Type": "application/zip",
						"Content-Disposition": contentDisposition(
							`${name}.zip`
						),
					},
				}
			);
		}

		const stream = createReadStream(fullPath);

		return new Response(
			Readable.toWeb(stream) as unknown as ReadableStream,
			{
				headers: {
					"Content-Type": "application/octet-stream",
					"Content-Disposition": contentDisposition(name),
					"Content-Length": String(stats.size),
				},
			}
		);
	}
);

export default handler;
