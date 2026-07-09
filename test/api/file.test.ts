import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import api from "../../src/api/index";
import { env } from "../../src/lib/env";
import { createTempRoot, removeTempRoot, resetEnvDefaults } from "../helpers";

describe("GET/PUT /file", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-file-");
		writeFileSync(join(root, "hello.txt"), "hello world");
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("reads back an existing file's content", async () => {
		const res = await api.request("/file?path=hello.txt");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { content: string; size: number };
		expect(body.content).toBe("hello world");
		expect(body.size).toBe(11);
	});

	test("404s when the file does not exist", async () => {
		const res = await api.request("/file?path=missing.txt");
		expect(res.status).toBe(404);
	});

	test("404s when the path is a directory, not a file", async () => {
		const res = await api.request("/file?path=");
		expect(res.status).toBe(404);
	});

	test("writes new content and it round-trips", async () => {
		const putRes = await api.request("/file?path=hello.txt", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "updated content" }),
		});
		expect(putRes.status).toBe(200);

		const getRes = await api.request("/file?path=hello.txt");
		const body = (await getRes.json()) as { content: string };
		expect(body.content).toBe("updated content");
	});

	test("blocks writes when READ_ONLY is enabled", async () => {
		env.READ_ONLY = true;
		const res = await api.request("/file?path=hello.txt", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "should not land" }),
		});
		expect(res.status).toBe(403);
	});

	test("rejects a disallowed extension on write", async () => {
		env.ALLOWED_EXTENSIONS = ["md"];
		const res = await api.request("/file?path=hello.txt", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "nope" }),
		});
		expect(res.status).toBe(415);
	});

	test("rejects content over the configured max size on write", async () => {
		env.MAX_FILE_SIZE = 4;
		const res = await api.request("/file?path=hello.txt", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "way too long for the limit" }),
		});
		expect(res.status).toBe(413);
	});

	test("404s on write when the target file does not exist", async () => {
		const res = await api.request("/file?path=missing.txt", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "x" }),
		});
		expect(res.status).toBe(404);
	});

	test("400s on a path traversal attempt", async () => {
		const res = await api.request("/file?path=../../etc/passwd");
		expect(res.status).toBe(400);
	});
});
