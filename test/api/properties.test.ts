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

describe("GET /properties", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-properties-");
		writeFileSync(join(root, "hello.txt"), "hello world");
		mkdirSync(join(root, "subdir"));
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("returns properties for a file", async () => {
		const res = await api.request("/properties?path=hello.txt");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			name: string;
			type: string;
			size: number;
			permissions: { octal: string; symbolic: string };
			owner: { uid: number; name?: string };
			group: { gid: number; name?: string };
			modifiedAt: string;
			createdAt: string;
			accessedAt: string;
		};

		expect(body.name).toBe("hello.txt");
		expect(body.type).toBe("file");
		expect(body.size).toBe(11);
		expect(body.permissions.octal).toMatch(/^[0-7]{3}$/);
		expect(body.permissions.symbolic).toMatch(
			/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/
		);
		expect(typeof body.owner.uid).toBe("number");
		expect(typeof body.group.gid).toBe("number");
		expect(new Date(body.modifiedAt).toString()).not.toBe("Invalid Date");
		expect(new Date(body.createdAt).toString()).not.toBe("Invalid Date");
		expect(new Date(body.accessedAt).toString()).not.toBe("Invalid Date");
	});

	test("returns properties for a directory", async () => {
		const res = await api.request("/properties?path=subdir");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { type: string; name: string };
		expect(body.type).toBe("directory");
		expect(body.name).toBe("subdir");
	});

	test("404s when the path does not exist", async () => {
		const res = await api.request("/properties?path=missing.txt");
		expect(res.status).toBe(404);
	});

	test("400s on a path traversal attempt", async () => {
		const res = await api.request("/properties?path=../../etc/passwd");
		expect(res.status).toBe(400);
	});
});

describe("PATCH /properties", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;
	const targetFile = "chmod-target.txt";

	beforeAll(() => {
		root = createTempRoot("filetend-properties-patch-");
		writeFileSync(join(root, targetFile), "content");
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("blocked with 403 when READ_ONLY is enabled", async () => {
		env.READ_ONLY = true;
		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: 0o644 }),
		});
		expect(res.status).toBe(403);
	});

	test("blocked with 403 when ALLOW_CHMOD is disabled", async () => {
		env.ALLOW_CHMOD = false;
		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: 0o644 }),
		});
		expect(res.status).toBe(403);
	});

	test("blocked with 403 when changing ownership with the default ALLOW_CHOWN=false", async () => {
		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ uid: 0 }),
		});
		expect(res.status).toBe(403);
	});

	test("changes the mode when ALLOW_CHMOD is enabled", async () => {
		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: 0o640 }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { permissions: { octal: string } };
		expect(body.permissions.octal).toMatch(/^[0-7]{3}$/);
		if (process.platform === "linux") {
			expect(body.permissions.octal).toBe("640");
		}
	});

	test("allows a no-op ownership change to the file's own current uid/gid", async () => {
		env.ALLOW_CHOWN = true;
		const getRes = await api.request(`/properties?path=${targetFile}`);
		const current = (await getRes.json()) as {
			owner: { uid: number };
			group: { gid: number };
		};

		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				uid: current.owner.uid,
				gid: current.group.gid,
			}),
		});
		expect(res.status).toBe(200);
	});

	test("404s when the path does not exist", async () => {
		const res = await api.request("/properties?path=missing.txt", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: 0o644 }),
		});
		expect(res.status).toBe(404);
	});

	test("400s on a path traversal attempt", async () => {
		const res = await api.request("/properties?path=../../etc/passwd", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: 0o644 }),
		});
		expect(res.status).toBe(400);
	});

	test("400s on an out-of-range mode", async () => {
		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: 999 }),
		});
		expect(res.status).toBe(400);
	});

	test("400s on an empty body", async () => {
		const res = await api.request(`/properties?path=${targetFile}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
	});
});
