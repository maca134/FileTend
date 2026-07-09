import { HTTPException } from "hono/http-exception";
import { extname } from "node:path";

import { env } from "./env";

export function assertExtensionAllowed(filename: string): void {
	const ext = extname(filename).replace(/^\./, "").toLowerCase();

	if (
		env.ALLOWED_EXTENSIONS &&
		env.ALLOWED_EXTENSIONS.length > 0 &&
		!env.ALLOWED_EXTENSIONS.includes(ext)
	) {
		throw new HTTPException(415, {
			message: `File extension ".${ext}" is not allowed`,
		});
	}

	if (env.DENY_EXTENSIONS && env.DENY_EXTENSIONS.includes(ext)) {
		throw new HTTPException(415, {
			message: `File extension ".${ext}" is not allowed`,
		});
	}
}

export function assertSizeAllowed(size: number): void {
	if (size > env.MAX_FILE_SIZE) {
		throw new HTTPException(413, {
			message: `File exceeds maximum size of ${env.MAX_FILE_SIZE} bytes`,
		});
	}
}
