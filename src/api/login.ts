import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { createHash, timingSafeEqual } from "node:crypto";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { setSessionCookie } from "../lib/session";

const schema = z.object({
	password: z.string(),
});

// Fixed-length digests avoid timingSafeEqual's length check (which itself
// leaks length) and let two different-length inputs be compared safely.
function safeCompare(a: string, b: string): boolean {
	const digestA = createHash("sha256").update(a).digest();
	const digestB = createHash("sha256").update(b).digest();
	return timingSafeEqual(digestA, digestB);
}

const handler = createHandler(zValidator("json", schema), async (c) => {
	if (!env.AUTH_ENABLED) {
		throw new HTTPException(400, {
			message: "Authentication is disabled",
		});
	}

	const { password } = c.req.valid("json");

	// env.ts guarantees AUTH_PASSWORD is set whenever AUTH_ENABLED is true.
	if (!safeCompare(password, env.AUTH_PASSWORD ?? "")) {
		throw new HTTPException(401, { message: "Invalid password" });
	}

	await setSessionCookie(c);

	return c.json({ status: "ok" });
});

export default handler;
