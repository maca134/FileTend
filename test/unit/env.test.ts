import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";

import { createTempRoot, removeTempRoot } from "../helpers";

// env.ts derives its exported config once, at module-load time, from
// process.env. Testing different AUTH_ENABLED/AUTH_PASSWORD combinations
// therefore requires a fresh process per combination rather than mutating
// the singleton in-process. The child is spawned with cwd pointed at an
// empty directory so Bun's automatic .env loading doesn't pull in the
// developer's real project .env (which may itself set AUTH_ENABLED) and
// silently override what this test is trying to isolate.
const fixture = resolve(import.meta.dir, "../fixtures/print-env.ts");
let emptyCwd: string;

beforeAll(() => {
	emptyCwd = createTempRoot("filetend-env-fixture-cwd-");
});

afterAll(() => {
	removeTempRoot(emptyCwd);
});

interface FixtureResult {
	authEnabled: boolean;
	secretKey: string;
}

async function runEnvFixture(
	extraEnv: Record<string, string | undefined>
): Promise<FixtureResult> {
	const childEnv: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) childEnv[key] = value;
	}
	for (const [key, value] of Object.entries(extraEnv)) {
		if (value === undefined) delete childEnv[key];
		else childEnv[key] = value;
	}

	const proc = Bun.spawn({
		cmd: ["bun", "run", fixture],
		cwd: emptyCwd,
		env: childEnv,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode !== 0) {
		throw new Error(`print-env fixture failed: ${stderr}`);
	}
	return JSON.parse(stdout.trim()) as FixtureResult;
}

async function authEnabledFor(
	extraEnv: Record<string, string | undefined>
): Promise<boolean> {
	return (await runEnvFixture(extraEnv)).authEnabled;
}

describe("env AUTH_ENABLED derivation", () => {
	test("defaults to false when no password or override is set", async () => {
		const authEnabled = await authEnabledFor({
			AUTH_PASSWORD: undefined,
			AUTH_ENABLED: undefined,
		});
		expect(authEnabled).toBe(false);
	}, 10000);

	test("auto-enables when AUTH_PASSWORD is set", async () => {
		const authEnabled = await authEnabledFor({
			AUTH_PASSWORD: "hunter2",
			AUTH_ENABLED: undefined,
		});
		expect(authEnabled).toBe(true);
	}, 10000);

	test("an explicit AUTH_ENABLED=false overrides a set AUTH_PASSWORD", async () => {
		const authEnabled = await authEnabledFor({
			AUTH_PASSWORD: "hunter2",
			AUTH_ENABLED: "false",
		});
		expect(authEnabled).toBe(false);
	}, 10000);

	test("an empty-string AUTH_ENABLED is treated as unset, not a parse error", async () => {
		const authEnabled = await authEnabledFor({
			AUTH_PASSWORD: "hunter2",
			AUTH_ENABLED: "",
		});
		expect(authEnabled).toBe(true);
	}, 10000);

	// AUTH_ENABLED=true with no password would previously fall back to a
	// random per-restart SECRET_KEY (reintroducing the "sessions don't
	// survive restarts" bug) and a login nobody could ever complete. Both
	// unset and empty-string AUTH_PASSWORD must fail fast instead.
	test("fails to boot when AUTH_ENABLED=true is forced with no AUTH_PASSWORD", async () => {
		await expect(
			runEnvFixture({ AUTH_PASSWORD: undefined, AUTH_ENABLED: "true" })
		).rejects.toThrow();

		await expect(
			runEnvFixture({ AUTH_PASSWORD: "", AUTH_ENABLED: "true" })
		).rejects.toThrow();
	}, 10000);
});

describe("env SECRET_KEY derivation", () => {
	test("is stable across restarts when AUTH_PASSWORD is unchanged", async () => {
		const extraEnv = {
			AUTH_PASSWORD: "hunter2",
			SECRET_KEY: undefined,
		};
		const first = await runEnvFixture(extraEnv);
		const second = await runEnvFixture(extraEnv);
		expect(first.secretKey).toBe(second.secretKey);
	}, 10000);

	test("changes when AUTH_PASSWORD changes", async () => {
		const a = await runEnvFixture({
			AUTH_PASSWORD: "hunter2",
			SECRET_KEY: undefined,
		});
		const b = await runEnvFixture({
			AUTH_PASSWORD: "correct-horse-battery-staple",
			SECRET_KEY: undefined,
		});
		expect(a.secretKey).not.toBe(b.secretKey);
	}, 10000);

	test("an explicit SECRET_KEY overrides derivation from AUTH_PASSWORD", async () => {
		const result = await runEnvFixture({
			AUTH_PASSWORD: "hunter2",
			SECRET_KEY: "my-explicit-secret",
		});
		expect(result.secretKey).toBe("my-explicit-secret");
	}, 10000);

	test("falls back to a random key when neither SECRET_KEY nor AUTH_PASSWORD is set", async () => {
		const extraEnv = { AUTH_PASSWORD: undefined, SECRET_KEY: undefined };
		const first = await runEnvFixture(extraEnv);
		const second = await runEnvFixture(extraEnv);
		expect(first.secretKey).not.toBe(second.secretKey);
	}, 10000);

	test("an empty-string SECRET_KEY is treated as unset, falling back to derivation", async () => {
		const result = await runEnvFixture({
			AUTH_PASSWORD: "hunter2",
			SECRET_KEY: "",
		});
		expect(result.secretKey).not.toBe("");
	}, 10000);
});
