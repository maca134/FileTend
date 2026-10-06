import { deleteCookie } from "hono/cookie";
import { createFactory } from "hono/factory";

import { SESSION_COOKIE_NAME } from "../lib/session";

const handler = createFactory().createHandlers(async (c) => {
	deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
	return c.json({ status: "ok" });
});

export default handler;
