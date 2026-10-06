import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { env } from "../lib/env";
import { isAuthed, setSessionCookie } from "../lib/session";

export const auth = createMiddleware(async (c, next) => {
	if (!env.AUTH_ENABLED) {
		await next();
		return;
	}

	if (!(await isAuthed(c))) {
		throw new HTTPException(401, { message: "Authentication required" });
	}

	// Sliding expiration: reissue the cookie on every authenticated request
	// so an active session doesn't expire out from under a user who's still
	// using the app, without needing a global 401-redirect on the frontend.
	await setSessionCookie(c);

	await next();
});
