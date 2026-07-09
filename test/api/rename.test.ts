import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import api from "../../src/api/index";
import { env } from "../../src/lib/env";
import { createTempRoot, removeTempRoot, resetEnvDefaults } from "../helpers";

describe("POST /rename", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-rename-");
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("renames an existing file", async () => {
		writeFileSync(join(root, "old.txt"), "content");
		const res = await api.request("/rename", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: "old.txt", name: "new.txt" }),
		});
		expect(res.status).toBe(200);

		const readRes = await api.request("/file?path=new.txt");
		expect(readRes.status).toBe(200);
	});

	test("409s when the destination name already exists", async () => {
		writeFileSync(join(root, "a.txt"), "a");
		writeFileSync(join(root, "b.txt"), "b");
		const res = await api.request("/rename", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: "a.txt", name: "b.txt" }),
		});
		expect(res.status).toBe(409);
	});

	test("404s when the source does not exist", async () => {
		const res = await api.request("/rename", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: "missing.txt", name: "whatever.txt" }),
		});
		expect(res.status).toBe(404);
	});

	test("400s trying to rename the root directory", async () => {
		const res = await api.request("/rename", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: "", name: "new-root" }),
		});
		expect(res.status).toBe(400);
	});

	test("rejects an invalid name containing a path separator", async () => {
		writeFileSync(join(root, "c.txt"), "c");
		const res = await api.request("/rename", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: "c.txt", name: "sub/dir.txt" }),
		});
		expect(res.status).toBe(400);
	});

	test("403s when renaming is disabled", async () => {
		env.ALLOW_RENAME = false;
		mkdirSync(join(root, "dir1"));
		const res = await api.request("/rename", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: "dir1", name: "dir2" }),
		});
		expect(res.status).toBe(403);
	});
});
