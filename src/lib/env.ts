import { randomBytes } from "crypto";
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
		SECRET_KEY: z.string().default(randomBytes(32).toString("hex")),
		READ_ONLY: zStringBoolean.default(false),
		ALLOW_CREATE: zStringBoolean.default(true),
		ALLOW_DELETE: zStringBoolean.default(true),
		ALLOW_RENAME: zStringBoolean.default(true),
		ALLOW_UPLOAD: zStringBoolean.default(true),
		ALLOW_DOWNLOAD: zStringBoolean.default(true),
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
	.safeParse({ ...process.env });

if (!raw.success) {
	console.log(
		"❌ Invalid environment variables:",
		z.prettifyError(raw.error)
	);
	throw new Error("Invalid environment variables");
}

export const env = {
	...raw.data,
	AUTH_ENABLED: raw.data.AUTH_ENABLED ?? Boolean(raw.data.AUTH_PASSWORD),
};
