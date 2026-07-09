import { getSignedCookie } from "hono/cookie";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { SESSION_COOKIE_NAME } from "../lib/session";

const handler = createHandler(async (c) => {
	const authed = env.AUTH_ENABLED
		? (await getSignedCookie(c, env.SECRET_KEY, SESSION_COOKIE_NAME)) ===
			"authenticated"
		: true;

	return c.json({ authEnabled: env.AUTH_ENABLED, authed });
});

export default handler;
