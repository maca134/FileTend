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

describe("GET /tree", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-tree-");
		writeFileSync(join(root, "b.txt"), "b");
		writeFileSync(join(root, "a.txt"), "a");
		mkdirSync(join(root, "z-dir"));
		mkdirSync(join(root, "a-dir"));
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("lists the root directory with directories first, then alphabetical", async () => {
		const res = await api.request("/tree");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			nodes: { name: string; type: string }[];
		};
		expect(body.nodes.map((n) => n.name)).toEqual([
			"a-dir",
			"z-dir",
			"a.txt",
			"b.txt",
		]);
	});

	test("lists a nested directory via the path query param", async () => {
		const res = await api.request("/tree?path=z-dir");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { nodes: unknown[] };
		expect(body.nodes).toEqual([]);
	});

	test("400s when the path points at a file, not a directory", async () => {
		const res = await api.request("/tree?path=a.txt");
		expect(res.status).toBe(400);
	});

	test("400s on a path traversal attempt", async () => {
		const res = await api.request("/tree?path=../../etc");
		expect(res.status).toBe(400);
	});
});
