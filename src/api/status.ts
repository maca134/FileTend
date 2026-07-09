import { getSignedCookie } from "hono/cookie";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";

const handler = createHandler(async (c) => {
	const authed = env.AUTH_ENABLED
		? (await getSignedCookie(c, env.SECRET_KEY, "session")) ===
			"authenticated"
		: true;

	return c.json({ authEnabled: env.AUTH_ENABLED, authed });
});

export default handler;
