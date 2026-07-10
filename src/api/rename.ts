import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { rename as renameFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { resolveSafePath } from "../lib/paths";
import { zErrorHook } from "../lib/validation";

const handler = createHandler(
	zValidator(
		"json",
		z.object({
			path: z.string(),
			name: z
				.string()
				.trim()
				.min(1)
				.max(255)
				.refine(
					(value) =>
						value !== "." &&
						value !== ".." &&
						!value.includes("/") &&
						!value.includes("\\"),
					{ message: "Invalid name" }
				),
		}),
		zErrorHook
	),
	async (c) => {
		if (env.READ_ONLY || !env.ALLOW_RENAME) {
			throw new HTTPException(403, {
				message: "Renaming files and folders is disabled",
			});
		}

		const { path, name } = c.req.valid("json");
		const oldPath = await resolveSafePath(env.ROOT_DIR, path);

		if (oldPath === resolve(env.ROOT_DIR)) {
			throw new HTTPException(400, {
				message: "Cannot rename the root directory",
			});
		}

		const newPath = await resolveSafePath(dirname(oldPath), name);

		if (newPath !== oldPath) {
			const exists = await stat(newPath).then(
				() => true,
				() => false
			);
			if (exists) {
				throw new HTTPException(409, {
					message: `A file or folder named "${name}" already exists`,
				});
			}
		}

		try {
			await renameFile(oldPath, newPath);
		} catch (err) {
			if (
				err instanceof Error &&
				"code" in err &&
				err.code === "ENOENT"
			) {
				throw new HTTPException(404, {
					message: "File or folder not found",
				});
			}
			throw err;
		}

		return c.json({ name, path: newPath });
	}
);

export default handler;
