import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveSafePath } from "../../src/lib/paths";
import { canCreateSymlinks, createTempRoot, removeTempRoot } from "../helpers";

describe("resolveSafePath", () => {
	let root: string;
	let outside: string;

	beforeAll(() => {
		root = createTempRoot("filetend-paths-root-");
		outside = createTempRoot("filetend-paths-outside-");
		mkdirSync(join(root, "nested"));
		writeFileSync(join(root, "nested", "file.txt"), "hello");
		writeFileSync(join(outside, "secret.txt"), "shh");
	});

	afterAll(() => {
		removeTempRoot(root);
		removeTempRoot(outside);
	});

	test("resolves a plain nested path within the root", async () => {
		const result = await resolveSafePath(root, "nested/file.txt");
		expect(result).toBe(join(root, "nested", "file.txt"));
	});

	test("resolves the root itself for an empty path", async () => {
		const result = await resolveSafePath(root);
		expect(result).toBe(root);
	});

	test("rejects a lexical .. traversal", async () => {
		await expect(resolveSafePath(root, "../outside.txt")).rejects.toThrow(
			"outside of the root directory"
		);
	});

	test("rejects a nested .. traversal that escapes the root", async () => {
		await expect(
			resolveSafePath(root, "nested/../../escape.txt")
		).rejects.toThrow("outside of the root directory");
	});

	test("rejects an absolute path outside the root", async () => {
		await expect(
			resolveSafePath(root, join(outside, "secret.txt"))
		).rejects.toThrow("outside of the root directory");
	});

	test("allows a path that does not exist yet (for create/upload)", async () => {
		const result = await resolveSafePath(root, "not-yet-created.txt");
		expect(result).toBe(join(root, "not-yet-created.txt"));
	});

	const symlinkProbeDir = createTempRoot("filetend-symlink-probe-");
	const symlinksSupported = canCreateSymlinks(symlinkProbeDir);
	removeTempRoot(symlinkProbeDir);

	test.skipIf(!symlinksSupported)(
		"rejects a symlink that resolves outside the root",
		async () => {
			const linkPath = join(root, "escape-link");
			symlinkSync(outside, linkPath, "dir");

			await expect(
				resolveSafePath(root, "escape-link/secret.txt")
			).rejects.toThrow("outside of the root directory");
		}
	);

	test.skipIf(!symlinksSupported)(
		"allows a symlink that resolves inside the root",
		async () => {
			const innerTarget = join(root, "nested");
			const linkPath = join(root, "inner-link");
			symlinkSync(innerTarget, linkPath, "dir");

			const result = await resolveSafePath(root, "inner-link/file.txt");
			expect(result).toBe(join(root, "inner-link", "file.txt"));
		}
	);
});
