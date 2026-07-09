import { zValidator } from "@hono/zod-validator";
import { readdir } from "node:fs/promises";
import { lstat } from "node:fs/promises";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import log from "../lib/log";
import { resolveSafePath } from "../lib/paths";

export interface FileTreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	children: FileTreeNode[];
}

const handler = createHandler(
	zValidator(
		"query",
		z.object({
			path: z.string().optional(),
		})
	),
	async (c) => {
		const requestedPath = c.req.query("path");

		const fullPath = resolveSafePath(env.ROOT_DIR, requestedPath);
		log.info(
			`Resolved full path: ${requestedPath || "(root)"} -> ${fullPath}`
		);

		const stat = await lstat(fullPath);

		if (!stat.isDirectory()) {
			log.error(`Path is not a directory: ${fullPath}`);
			throw new Error(`Path is not a directory: ${fullPath}`);
		}

		const entries = await readdir(fullPath, { withFileTypes: true });

		const nodes = entries
			.map(
				(entry) =>
					({
						name: entry.name,
						path: resolveSafePath(fullPath, entry.name),
						type: entry.isDirectory() ? "directory" : "file",
						children: [] as FileTreeNode[],
					}) as FileTreeNode
			)
			.sort((a, b) => {
				if (a.type === b.type) {
					return a.name.localeCompare(b.name);
				}
				return a.type === "directory" ? -1 : 1;
			});

		return c.json({ nodes });
	}
);

export default handler;
