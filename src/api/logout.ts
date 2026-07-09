import { createHandler } from "../lib/handler";

const handler = createHandler(async (c) => {
	return c.json({ status: "ok" });
});

export default handler;
