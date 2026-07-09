import { deleteCookie } from "hono/cookie";

import { createHandler } from "../lib/handler";
import { SESSION_COOKIE_NAME } from "../lib/session";

const handler = createHandler(async (c) => {
	deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
	return c.json({ status: "ok" });
});

export default handler;
