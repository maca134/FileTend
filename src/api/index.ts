import { Hono } from "hono";

const api = new Hono();

api.get("/hello", (c) => {
	return c.json({ message: "Hello from the API!" });
});

export default api;
