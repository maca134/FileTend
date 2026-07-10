import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import log from "../lib/log";
import { auth } from "../middleware/auth";
import download from "./download";
import file from "./file";
import login from "./login";
import logout from "./logout";
import properties from "./properties";
import rename from "./rename";
import status from "./status";
import tree from "./tree";
import upload from "./upload";

const app = new Hono();

const api = app
	.get("/auth/status", status)
	.post("/auth/login", login)
	.post("/auth/logout", logout)
	.use(auth)
	.get("/tree", tree)
	.get("/properties", properties.get)
	.patch("/properties", properties.patch)
	.get("/file", file.get)
	.put("/file", file.put)
	.post("/file", file.post)
	.delete("/file", file.delete)
	.post("/rename", rename)
	.post("/upload", upload)
	.get("/download", download);

api.onError((err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}

	log.error(
		`Unhandled error in ${c.req.method} ${c.req.path}: ${
			err instanceof Error ? (err.stack ?? err.message) : String(err)
		}`
	);
	return c.json({ message: "Internal server error" }, 500);
});

export default api;

export type AppType = typeof api;
