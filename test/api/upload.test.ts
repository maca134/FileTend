import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import api from "../../src/api/index";
import { env } from "../../src/lib/env";
import { createTempRoot, removeTempRoot, resetEnvDefaults } from "../helpers";

function fileFormData(name: string, content: string): FormData {
	const form = new FormData();
	form.append("files", new File([content], name));
	return form;
}

describe("POST /upload", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-upload-");
		mkdirSync(join(root, "dest"));
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("uploads a file into the target directory", async () => {
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: fileFormData("new.txt", "content"),
		});
		expect(res.status).toBe(200);

		const getRes = await api.request("/file?path=dest/new.txt");
		expect(getRes.status).toBe(200);
		const body = (await getRes.json()) as { content: string };
		expect(body.content).toBe("content");
	});

	test("409s when a file with the same name already exists", async () => {
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: fileFormData("new.txt", "different content"),
		});
		expect(res.status).toBe(409);
	});

	test("400s with no files in the request", async () => {
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: new FormData(),
		});
		expect(res.status).toBe(400);
	});

	test("400s when the target directory does not exist", async () => {
		const res = await api.request("/upload?path=does-not-exist", {
			method: "POST",
			body: fileFormData("x.txt", "x"),
		});
		expect(res.status).toBe(400);
	});

	test("403s when uploads are disabled", async () => {
		env.ALLOW_UPLOAD = false;
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: fileFormData("blocked.txt", "x"),
		});
		expect(res.status).toBe(403);
	});

	test("403s when in read-only mode", async () => {
		env.READ_ONLY = true;
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: fileFormData("blocked2.txt", "x"),
		});
		expect(res.status).toBe(403);
	});

	test("415s on a disallowed extension", async () => {
		env.ALLOWED_EXTENSIONS = ["md"];
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: fileFormData("blocked.exe", "x"),
		});
		expect(res.status).toBe(415);
	});

	test("413s on a file over the configured max size", async () => {
		env.MAX_FILE_SIZE = 4;
		const res = await api.request("/upload?path=dest", {
			method: "POST",
			body: fileFormData("toobig.txt", "way too much content"),
		});
		expect(res.status).toBe(413);
	});
});
