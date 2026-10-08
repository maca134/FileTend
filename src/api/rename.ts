import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { lstat, rename as renameFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import z from "zod";

import { env } from "../lib/env";
import { assertExtensionAllowed } from "../lib/limits";
import { resolveSafePath } from "../lib/paths";
import { zErrorHook, zName } from "../lib/validation";

const handler = createFactory().createHandlers(
	zValidator("json", z.object({ path: z.string(), name: zName }), zErrorHook),
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

		const oldStats = await lstat(oldPath).catch(() => null);
		if (!oldStats) {
			throw new HTTPException(404, {
				message: "File or folder not found",
			});
		}
		if (!oldStats.isDirectory()) assertExtensionAllowed(name);

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
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				throw new HTTPException(404, {
					message: "File or folder not found",
				});
			}
			throw err;
		}

		// Re-checked after the rename in case a folder was swapped for a file
		// after the check above.
		if (!(await lstat(newPath)).isDirectory()) {
			try {
				assertExtensionAllowed(name);
			} catch (err) {
				await renameFile(newPath, oldPath);
				throw err;
			}
		}

		return c.json({ name, path: newPath });
	}
);

export default handler;
