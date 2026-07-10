import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import log from "../lib/log";
import { resolveSafePath } from "../lib/paths";
import { zErrorHook } from "../lib/validation";

export interface FileTreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	children: FileTreeNode[];
	size?: number;
}

const handler = createHandler(
	zValidator(
		"query",
		z.object({
			path: z.string().optional(),
		}),
		zErrorHook
	),
	async (c) => {
		const requestedPath = c.req.query("path");

		const fullPath = await resolveSafePath(env.ROOT_DIR, requestedPath);
		log.info(
			`Resolved full path: ${requestedPath || "(root)"} -> ${fullPath}`
		);

		const stats = await stat(fullPath).catch(() => null);
		if (!stats) {
			throw new HTTPException(404, { message: "Folder not found" });
		}

		if (!stats.isDirectory()) {
			log.error(`Path is not a directory: ${fullPath}`);
			throw new HTTPException(400, {
				message: `Path is not a directory: ${fullPath}`,
			});
		}

		const entries = await readdir(fullPath, { withFileTypes: true }).catch(
			() => null
		);
		if (!entries) {
			throw new HTTPException(404, { message: "Folder not found" });
		}

		const nodes = await Promise.all(
			entries.map(async (entry) => {
				const entryPath = resolve(fullPath, entry.name);
				const isDirectory = entry.isDirectory();
				const size = isDirectory
					? undefined
					: await stat(entryPath)
							.then((s) => s.size)
							.catch(() => undefined);

				return {
					name: entry.name,
					path: entryPath,
					type: isDirectory ? "directory" : "file",
					children: [] as FileTreeNode[],
					size,
				} as FileTreeNode;
			})
		);

		nodes.sort((a, b) => {
			if (a.type === b.type) {
				return a.name.localeCompare(b.name);
			}
			return a.type === "directory" ? -1 : 1;
		});

		return c.json({ nodes });
	}
);

export default handler;
