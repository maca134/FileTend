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

describe("GET /download", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-download-");
		writeFileSync(join(root, "single.txt"), "download me");
		mkdirSync(join(root, "folder"));
		writeFileSync(join(root, "folder", "inner.txt"), "inner content");
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("downloads a single file with the raw content", async () => {
		const res = await api.request("/download?path=single.txt");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe(
			"application/octet-stream"
		);
		const text = await res.text();
		expect(text).toBe("download me");
	});

	test("downloads a directory as a zip archive", async () => {
		const res = await api.request("/download?path=folder");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/zip");
		expect(res.headers.get("content-disposition")).toContain("folder.zip");
	});

	test("404s when the path does not exist", async () => {
		const res = await api.request("/download?path=missing.txt");
		expect(res.status).toBe(404);
	});

	test("403s when downloads are disabled", async () => {
		env.ALLOW_DOWNLOAD = false;
		const res = await api.request("/download?path=single.txt");
		expect(res.status).toBe(403);
	});

	test("400s on a path traversal attempt", async () => {
		const res = await api.request("/download?path=../../etc/passwd");
		expect(res.status).toBe(400);
	});
});
