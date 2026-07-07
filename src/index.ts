import index from "./frontend/index.html";

import { Hono } from "hono";

import api from "./api";
import { frontend } from "./middleware/frontend";

const app = new Hono();

app.route("/api", api);

app.use(
	"/*",
	await frontend({
		entrypoint: index,
		build: {
			sourcemap: "linked",
		},
	})
);

app.get("/api/hello", (c) => {
	return c.json({ message: "Hello from the API!" });
});

export default app;
