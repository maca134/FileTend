import { Hono } from "hono";

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

export default api;

export type AppType = typeof api;
