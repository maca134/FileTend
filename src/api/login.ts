import { zValidator } from "@hono/zod-validator";
import z from "zod";

import { createHandler } from "../lib/handler";

const schema = z.object({
	password: z.string(),
});

const handler = createHandler(zValidator("json", schema), async (c) => {
	return c.json({ status: "ok" });
});

export default handler;
