import { HTTPException } from "hono/http-exception";
import type { Stats } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "path";

function isContained(root: string, target: string): boolean {
	const rel = relative(root, target);
	return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Resolves `requestedPath` against `root` and rejects it if the result
 * would escape `root` (e.g. via `..` segments, an absolute path, or a
 * symlink that resolves outside of `root`).
 */
export async function resolveSafePath(
	root: string,
	requestedPath = ""
): Promise<string> {
	const resolvedRoot = resolve(root);
	const fullPath = resolve(resolvedRoot, requestedPath);

	if (!isContained(resolvedRoot, fullPath)) {
		throw new HTTPException(400, {
			message: "Path is outside of the root directory",
		});
	}

	// Walk up to the nearest existing ancestor (the target itself may not
	// exist yet, e.g. when creating/uploading a new file) and compare its
	// real path against the root's real path, to catch symlink escapes.
	let probe = fullPath;
	while (true) {
		try {
			const realProbe = await realpath(probe);
			const realRoot = await realpath(resolvedRoot);
			const realTarget = resolve(realProbe, relative(probe, fullPath));
			if (!isContained(realRoot, realTarget)) {
				throw new HTTPException(400, {
					message: "Path is outside of the root directory",
				});
			}
			break;
		} catch (err) {
			if (err instanceof HTTPException) throw err;
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				const parent = dirname(probe);
				if (parent === probe) break;
				probe = parent;
				continue;
			}
			throw err;
		}
	}

	return fullPath;
}

export async function statOr404(
	path: string,
	message = "File or folder not found"
): Promise<Stats> {
	const stats = await stat(path).catch(() => null);
	if (!stats) throw new HTTPException(404, { message });
	return stats;
}
