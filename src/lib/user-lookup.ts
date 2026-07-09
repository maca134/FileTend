import { readFileSync } from "node:fs";

/**
 * Best-effort uid/gid -> name resolution by parsing /etc/passwd and
 * /etc/group. Only meaningful on Linux (the deployment target per the
 * Dockerfile); returns undefined anywhere those files don't exist (e.g.
 * Windows dev, a distroless image) or the id isn't found.
 */
function resolveNameFromColonFile(
	filePath: string,
	id: number
): string | undefined {
	try {
		const contents = readFileSync(filePath, "utf-8");
		for (const line of contents.split("\n")) {
			if (!line || line.startsWith("#")) continue;
			const fields = line.split(":");
			if (Number(fields[2]) === id) return fields[0];
		}
	} catch {
		return undefined;
	}
	return undefined;
}

export function resolveUserName(uid: number): string | undefined {
	return resolveNameFromColonFile("/etc/passwd", uid);
}

export function resolveGroupName(gid: number): string | undefined {
	return resolveNameFromColonFile("/etc/group", gid);
}
