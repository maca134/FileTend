import { createMiddleware } from "hono/factory";

export const auth = createMiddleware(async (c, next) => {
	await next();
});
