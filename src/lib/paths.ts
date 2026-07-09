import { HTTPException } from "hono/http-exception";
import { realpath } from "node:fs/promises";
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
			const realTarget = resolve(
				realProbe,
				relative(probe, fullPath)
			);
			if (!isContained(realRoot, realTarget)) {
				throw new HTTPException(400, {
					message: "Path is outside of the root directory",
				});
			}
			break;
		} catch (err) {
			if (err instanceof HTTPException) throw err;
			if (
				err instanceof Error &&
				"code" in err &&
				err.code === "ENOENT"
			) {
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
