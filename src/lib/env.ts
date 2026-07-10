import { createHmac, randomBytes } from "crypto";
import { isAbsolute, resolve } from "path";
import z from "zod";

const zStringBoolean = z.string().transform((value) => {
	if (value.toLowerCase() === "true") return true;
	if (value.toLowerCase() === "false") return false;
	throw new Error(
		"Invalid boolean value. Use 'true' or 'false' (case-insensitive)."
	);
});

const raw = z
	.object({
		LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).default("INFO"),
		ROOT_DIR: z
			.string()
			.transform((value) =>
				isAbsolute(value) ? value : resolve(process.cwd(), value)
			)
			.default("/srv"),
		PORT: z.string().regex(/^\d+$/).transform(Number).default(3000),
		SECRET_KEY: z.string().optional(),
		READ_ONLY: zStringBoolean.default(false),
		ALLOW_CREATE: zStringBoolean.default(true),
		ALLOW_DELETE: zStringBoolean.default(true),
		ALLOW_RENAME: zStringBoolean.default(true),
		ALLOW_UPLOAD: zStringBoolean.default(true),
		ALLOW_DOWNLOAD: zStringBoolean.default(true),
		ALLOW_CHMOD: zStringBoolean.default(true),
		ALLOW_CHOWN: zStringBoolean.default(false),
		MAX_FILE_SIZE: z
			.union([
				z.number().int().positive(),
				z.string().regex(/^\d+[KMG]?B$/i, {
					message:
						"Invalid file size format. Use a number followed by an optional unit (K, M, G) and 'B' (e.g., 10MB, 1GB).",
				}),
			])
			.transform((value) => {
				if (typeof value === "number") {
					return value;
				}
				const unit = value.slice(-2).toUpperCase();
				const size = parseInt(value.slice(0, -2), 10);
				switch (unit) {
					case "KB":
						return size * 1024;
					case "MB":
						return size * 1024 * 1024;
					case "GB":
						return size * 1024 * 1024 * 1024;
					default:
						throw new Error(
							"Invalid file size format. Use a number followed by an optional unit (K, M, G) and 'B' (e.g., 10MB, 1GB)."
						);
				}
			})
			.default(10 * 1024 * 1024), // Default to 10MB
		ALLOWED_EXTENSIONS: z
			.string()
			.transform((value) =>
				value.split(",").map((ext) => ext.trim().toLowerCase())
			)
			.optional(),
		DENY_EXTENSIONS: z
			.string()
			.transform((value) =>
				value.split(",").map((ext) => ext.trim().toLowerCase())
			)
			.optional(),
		AUTH_PASSWORD: z.string().optional(),
		AUTH_ENABLED: zStringBoolean.optional(),
	})
	// An env var set to the empty string (e.g. `- AUTH_PASSWORD=${AUTH_PASSWORD:-}`
	// in a compose file, when AUTH_PASSWORD isn't set in .env) is functionally
	// "unset" for every field above, but a defined "" is not undefined, so
	// optional() alone wouldn't catch it. Strip empties before parsing so
	// unset-via-empty-string behaves the same as truly absent.
	.safeParse(
		Object.fromEntries(
			Object.entries(process.env).filter(([, value]) => value !== "")
		)
	);

if (!raw.success) {
	console.log(
		"❌ Invalid environment variables:",
		z.prettifyError(raw.error)
	);
	throw new Error("Invalid environment variables");
}

// Deriving the key from the password (rather than persisting a random one)
// means restarts/redeploys don't invalidate sessions, without needing to
// write secret material into ROOT_DIR (the only mounted volume, and the
// same directory the file browser exposes over the API). Rotating the
// password naturally rotates the derived key too.
function deriveSecretKeyFromPassword(password: string): string {
	return createHmac("sha256", password)
		.update("filetend/session-secret/v1")
		.digest("hex");
}

const secretKey =
	raw.data.SECRET_KEY ??
	(raw.data.AUTH_PASSWORD
		? deriveSecretKeyFromPassword(raw.data.AUTH_PASSWORD)
		: randomBytes(32).toString("hex"));

export const env = {
	...raw.data,
	SECRET_KEY: secretKey,
	AUTH_ENABLED: raw.data.AUTH_ENABLED ?? Boolean(raw.data.AUTH_PASSWORD),
};
