import { deleteCookie } from "hono/cookie";

import { createHandler } from "../lib/handler";

const handler = createHandler(async (c) => {
	deleteCookie(c, "session", { path: "/" });
	return c.json({ status: "ok" });
});

export default handler;
