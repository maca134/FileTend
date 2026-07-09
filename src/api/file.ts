import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { resolveSafePath } from "../lib/paths";

const file = {
	get: createHandler(async (c) => {
		return c.json({ status: "ok" });
	}),
	put: createHandler(async (c) => {
		return c.json({ status: "ok" });
	}),
	post: createHandler(
		zValidator(
			"json",
			z.object({
				parentPath: z.string().optional(),
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
				type: z.enum(["file", "directory"]),
			})
		),
		async (c) => {
			if (env.READ_ONLY || !env.ALLOW_CREATE) {
				throw new HTTPException(403, {
					message: "Creating files and folders is disabled",
				});
			}

			const { parentPath, name, type } = c.req.valid("json");

			const parentDir = resolveSafePath(env.ROOT_DIR, parentPath);
			const fullPath = resolveSafePath(parentDir, name);

			try {
				if (type === "directory") {
					await mkdir(fullPath);
				} else {
					await writeFile(fullPath, "", { flag: "wx" });
				}
			} catch (err) {
				if (err instanceof Error && "code" in err) {
					if (err.code === "EEXIST") {
						throw new HTTPException(409, {
							message: `A file or folder named "${name}" already exists`,
						});
					}
					if (err.code === "ENOENT") {
						throw new HTTPException(400, {
							message: "Parent folder does not exist",
						});
					}
				}
				throw err;
			}

			return c.json({
				name,
				path: fullPath,
				type,
			});
		}
	),
	delete: createHandler(
		zValidator("query", z.object({ path: z.string() })),
		async (c) => {
			if (env.READ_ONLY || !env.ALLOW_DELETE) {
				throw new HTTPException(403, {
					message: "Deleting files and folders is disabled",
				});
			}

			const { path } = c.req.valid("query");
			const fullPath = resolveSafePath(env.ROOT_DIR, path);

			if (fullPath === resolve(env.ROOT_DIR)) {
				throw new HTTPException(400, {
					message: "Cannot delete the root directory",
				});
			}

			try {
				await rm(fullPath, { recursive: true });
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

			return c.json({ status: "ok" });
		}
	),
} as const;

export default file;
