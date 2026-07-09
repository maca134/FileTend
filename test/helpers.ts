import { mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { env } from "../src/lib/env";

/** Creates a fresh temp directory for a test suite; caller must clean it up. */
export function createTempRoot(prefix = "filetend-test-"): string {
	return mkdtempSync(join(tmpdir(), prefix));
}

export function removeTempRoot(dir: string): void {
	rmSync(dir, { recursive: true, force: true });
}

/**
 * Resets the shared `env` singleton's mutable, non-path fields to known
 * values. `bun test` runs every test file in-process against the same
 * `env` object, and it's also parsed once from whatever `.env` the
 * developer happens to have on disk (e.g. `READ_ONLY=true` while they're
 * poking at the dev server) — so tests can't trust the process' initial
 * values as a clean baseline. Call this in `beforeEach` before overriding
 * whichever single field a given test cares about.
 */
export function resetEnvDefaults(): void {
	env.READ_ONLY = false;
	env.ALLOW_CREATE = true;
	env.ALLOW_DELETE = true;
	env.ALLOW_RENAME = true;
	env.ALLOW_UPLOAD = true;
	env.ALLOW_DOWNLOAD = true;
	env.MAX_FILE_SIZE = 10 * 1024 * 1024;
	env.ALLOWED_EXTENSIONS = undefined;
	env.DENY_EXTENSIONS = undefined;
	env.AUTH_ENABLED = false;
	env.AUTH_PASSWORD = undefined;
}

/** True if the current process/filesystem can create symlinks without elevation. */
export function canCreateSymlinks(dir: string): boolean {
	const target = join(dir, "__symlink_probe_target");
	const link = join(dir, "__symlink_probe_link");
	try {
		writeFileSync(target, "");
		symlinkSync(target, link, "file");
		unlinkSync(link);
		unlinkSync(target);
		return true;
	} catch {
		return false;
	}
}
