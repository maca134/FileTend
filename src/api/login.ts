import { zValidator } from "@hono/zod-validator";
import { setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import z from "zod";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";

const schema = z.object({
	password: z.string(),
});

const handler = createHandler(zValidator("json", schema), async (c) => {
	if (!env.AUTH_ENABLED) {
		throw new HTTPException(400, {
			message: "Authentication is disabled",
		});
	}

	const { password } = c.req.valid("json");

	if (password !== env.AUTH_PASSWORD) {
		throw new HTTPException(401, { message: "Invalid password" });
	}

	await setSignedCookie(c, "session", "authenticated", env.SECRET_KEY, {
		httpOnly: true,
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.json({ status: "ok" });
});

export default handler;
