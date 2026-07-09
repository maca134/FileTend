import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { stat, writeFile } from "node:fs/promises";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { assertExtensionAllowed, assertSizeAllowed } from "../lib/limits";
import { resolveSafePath } from "../lib/paths";

const handler = createHandler(
	zValidator("query", z.object({ path: z.string().optional() })),
	async (c) => {
		if (env.READ_ONLY || !env.ALLOW_UPLOAD) {
			throw new HTTPException(403, {
				message: "Uploading files is disabled",
			});
		}

		const { path } = c.req.valid("query");
		const targetDir = await resolveSafePath(env.ROOT_DIR, path);

		const dirStats = await stat(targetDir).catch(() => null);
		if (!dirStats || !dirStats.isDirectory()) {
			throw new HTTPException(400, {
				message: "Target folder does not exist",
			});
		}

		const body = await c.req.parseBody({ all: true });
		const files = Object.values(body).flatMap((value) =>
			value instanceof File ? [value] : []
		);

		if (files.length === 0) {
			throw new HTTPException(400, { message: "No files provided" });
		}

		for (const file of files) {
			assertExtensionAllowed(file.name);
			assertSizeAllowed(file.size);
		}

		const results = [];
		for (const file of files) {
			const destPath = await resolveSafePath(targetDir, file.name);
			const buffer = Buffer.from(await file.arrayBuffer());

			try {
				await writeFile(destPath, buffer, { flag: "wx" });
			} catch (err) {
				if (
					err instanceof Error &&
					"code" in err &&
					err.code === "EEXIST"
				) {
					throw new HTTPException(409, {
						message: `"${file.name}" already exists`,
					});
				}
				throw err;
			}

			results.push({ name: file.name, path: destPath });
		}

		return c.json({ files: results });
	}
);

export default handler;
