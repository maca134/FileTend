import { HTTPException } from "hono/http-exception";
import { isAbsolute, relative, resolve } from "path";

/**
 * Resolves `requestedPath` against `root` and rejects it if the result
 * would escape `root` (e.g. via `..` segments or an absolute path).
 */
export function resolveSafePath(root: string, requestedPath = ""): string {
	const resolvedRoot = resolve(root);
	const fullPath = resolve(resolvedRoot, requestedPath);

	const rel = relative(resolvedRoot, fullPath);
	const isInsideRoot =
		rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));

	if (!isInsideRoot) {
		throw new HTTPException(400, {
			message: "Path is outside of the root directory",
		});
	}

	return fullPath;
}
