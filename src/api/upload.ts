import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { stat, writeFile } from "node:fs/promises";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { assertExtensionAllowed, assertSizeAllowed } from "../lib/limits";
import { resolveSafePath } from "../lib/paths";
import { zErrorHook } from "../lib/validation";

const handler = createHandler(
	zValidator(
		"query",
		z.object({ path: z.string().optional() }),
		zErrorHook
	),
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
		// With `all: true`, a field with multiple values (multi-file upload
		// under the same "files" field) comes back as an array rather than a
		// single File -- both shapes need flattening here.
		const files = Object.values(body).flatMap((value) =>
			(Array.isArray(value) ? value : [value]).filter(
				(v): v is File => v instanceof File
			)
		);

		if (files.length === 0) {
			throw new HTTPException(400, { message: "No files provided" });
		}

		for (const file of files) {
			if (
				file.name === "." ||
				file.name === ".." ||
				file.name.includes("/") ||
				file.name.includes("\\")
			) {
				throw new HTTPException(400, {
					message: `Invalid file name: "${file.name}"`,
				});
			}
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
				if (err instanceof Error && "code" in err) {
					if (err.code === "EEXIST") {
						throw new HTTPException(409, {
							message: `"${file.name}" already exists`,
						});
					}
					if (err.code === "ENOENT") {
						throw new HTTPException(400, {
							message: "Target folder does not exist",
						});
					}
				}
				throw err;
			}

			results.push({ name: file.name, path: destPath });
		}

		return c.json({ files: results });
	}
);

export default handler;
