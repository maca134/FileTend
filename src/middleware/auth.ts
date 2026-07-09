import { getSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { env } from "../lib/env";
import { SESSION_COOKIE_NAME, setSessionCookie } from "../lib/session";

export const auth = createMiddleware(async (c, next) => {
	if (!env.AUTH_ENABLED) {
		await next();
		return;
	}

	const session = await getSignedCookie(
		c,
		env.SECRET_KEY,
		SESSION_COOKIE_NAME
	);

	if (session !== "authenticated") {
		throw new HTTPException(401, { message: "Authentication required" });
	}

	// Sliding expiration: reissue the cookie on every authenticated request
	// so an active session doesn't expire out from under a user who's still
	// using the app, without needing a global 401-redirect on the frontend.
	await setSessionCookie(c);

	await next();
});
