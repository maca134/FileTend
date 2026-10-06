import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Stats } from "node:fs";
import { chmod, chown, stat } from "node:fs/promises";
import { basename } from "node:path";
import z from "zod";

import { env } from "../lib/env";
import { resolveSafePath, statOr404 } from "../lib/paths";
import { resolveGroupName, resolveUserName } from "../lib/user-lookup";
import { pathQuery, zErrorHook } from "../lib/validation";

function formatPermissions(mode: number) {
	const bits = mode & 0o777;
	const rwx = (n: number) =>
		`${n & 4 ? "r" : "-"}${n & 2 ? "w" : "-"}${n & 1 ? "x" : "-"}`;

	return {
		mode: bits,
		octal: bits.toString(8).padStart(3, "0"),
		symbolic: `${rwx((bits >> 6) & 7)}${rwx((bits >> 3) & 7)}${rwx(bits & 7)}`,
	};
}

function buildPropertiesResponse(fullPath: string, stats: Stats) {
	return {
		path: fullPath,
		name: basename(fullPath),
		type: stats.isDirectory() ? ("directory" as const) : ("file" as const),
		size: stats.size,
		modifiedAt: stats.mtime.toISOString(),
		createdAt: stats.birthtime.toISOString(),
		accessedAt: stats.atime.toISOString(),
		permissions: formatPermissions(stats.mode),
		owner: { uid: stats.uid, name: resolveUserName(stats.uid) },
		group: { gid: stats.gid, name: resolveGroupName(stats.gid) },
	};
}

const { createHandlers } = createFactory();

const properties = {
	get: createHandlers(pathQuery, async (c) => {
		const { path } = c.req.valid("query");
		const fullPath = await resolveSafePath(env.ROOT_DIR, path);
		const stats = await statOr404(fullPath);
		return c.json(buildPropertiesResponse(fullPath, stats));
	}),
	patch: createHandlers(
		pathQuery,
		zValidator(
			"json",
			z
				.object({
					mode: z.number().int().min(0).max(0o777).optional(),
					uid: z.number().int().min(0).optional(),
					gid: z.number().int().min(0).optional(),
				})
				.refine(
					(v) =>
						v.mode !== undefined ||
						v.uid !== undefined ||
						v.gid !== undefined,
					{
						message:
							"At least one of mode, uid, gid must be provided",
					}
				),
			zErrorHook
		),
		async (c) => {
			if (env.READ_ONLY) {
				throw new HTTPException(403, {
					message: "Editing is disabled (read-only mode)",
				});
			}

			const { path } = c.req.valid("query");
			const { mode, uid, gid } = c.req.valid("json");
			const fullPath = await resolveSafePath(env.ROOT_DIR, path);
			const stats = await statOr404(fullPath);

			try {
				if (mode !== undefined) {
					if (!env.ALLOW_CHMOD) {
						throw new HTTPException(403, {
							message: "Changing permissions is disabled",
						});
					}
					await chmod(fullPath, mode);
				}

				if (uid !== undefined || gid !== undefined) {
					if (!env.ALLOW_CHOWN) {
						throw new HTTPException(403, {
							message: "Changing ownership is disabled",
						});
					}
					try {
						await chown(
							fullPath,
							uid ?? stats.uid,
							gid ?? stats.gid
						);
					} catch (chownErr) {
						// A combined mode+uid/gid request isn't atomic at the
						// syscall level. If chmod already applied and chown
						// then fails, restore the original mode rather than
						// leaving a partial mutation silently in place.
						if (mode !== undefined) {
							await chmod(fullPath, stats.mode & 0o777).catch(
								() => {}
							);
						}
						throw chownErr;
					}
				}
			} catch (err) {
				if (err instanceof HTTPException) throw err;
				if ((err as NodeJS.ErrnoException).code === "EPERM") {
					throw new HTTPException(403, {
						message:
							"Operation not permitted by the OS (the server process may lack the required privileges)",
					});
				}
				throw err;
			}

			const updatedStats = await stat(fullPath);
			return c.json(buildPropertiesResponse(fullPath, updatedStats));
		}
	),
};

export default properties;
