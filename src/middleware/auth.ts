import { getSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { env } from "../lib/env";

export const auth = createMiddleware(async (c, next) => {
	if (!env.AUTH_ENABLED) {
		await next();
		return;
	}

	const session = await getSignedCookie(c, env.SECRET_KEY, "session");

	if (session !== "authenticated") {
		throw new HTTPException(401, { message: "Authentication required" });
	}

	await next();
});
