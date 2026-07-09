import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import api from "../../src/api/index";
import { env } from "../../src/lib/env";
import { createTempRoot, removeTempRoot, resetEnvDefaults } from "../helpers";

const TEST_PASSWORD = "correct-horse-battery-staple";

function extractCookie(res: Response): string {
	const setCookie = res.headers.get("set-cookie");
	if (!setCookie) throw new Error("Expected a Set-Cookie header");
	return setCookie.split(";")[0]!;
}

describe("auth flow", () => {
	let root: string;
	const originalRootDir = env.ROOT_DIR;

	beforeAll(() => {
		root = createTempRoot("filetend-auth-");
	});

	beforeEach(() => {
		resetEnvDefaults();
		env.ROOT_DIR = root;
		env.AUTH_ENABLED = true;
		env.AUTH_PASSWORD = TEST_PASSWORD;
	});

	afterAll(() => {
		env.ROOT_DIR = originalRootDir;
		removeTempRoot(root);
	});

	test("status reports authEnabled and authed:false with no cookie", async () => {
		const res = await api.request("/auth/status");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			authEnabled: boolean;
			authed: boolean;
		};
		expect(body).toEqual({ authEnabled: true, authed: false });
	});

	test("status reports authed:true when auth is disabled", async () => {
		env.AUTH_ENABLED = false;
		const res = await api.request("/auth/status");
		const body = (await res.json()) as {
			authEnabled: boolean;
			authed: boolean;
		};
		expect(body).toEqual({ authEnabled: false, authed: true });
	});

	test("a protected route passes through when auth is disabled", async () => {
		env.AUTH_ENABLED = false;
		const res = await api.request("/tree");
		expect(res.status).toBe(200);
	});

	test("a protected route 401s without a session cookie when auth is enabled", async () => {
		const res = await api.request("/tree");
		expect(res.status).toBe(401);
	});

	test("login rejects the wrong password", async () => {
		const res = await api.request("/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: "wrong" }),
		});
		expect(res.status).toBe(401);
	});

	test("login rejects when auth is disabled", async () => {
		env.AUTH_ENABLED = false;
		const res = await api.request("/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: TEST_PASSWORD }),
		});
		expect(res.status).toBe(400);
	});

	test("login with the correct password sets a session cookie that unlocks protected routes", async () => {
		const loginRes = await api.request("/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: TEST_PASSWORD }),
		});
		expect(loginRes.status).toBe(200);
		const cookie = extractCookie(loginRes);

		const statusRes = await api.request("/auth/status", {
			headers: { Cookie: cookie },
		});
		const statusBody = (await statusRes.json()) as { authed: boolean };
		expect(statusBody.authed).toBe(true);

		const treeRes = await api.request("/tree", {
			headers: { Cookie: cookie },
		});
		expect(treeRes.status).toBe(200);
	});

	test("an authenticated request slides the session expiration by reissuing the cookie", async () => {
		const loginRes = await api.request("/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: TEST_PASSWORD }),
		});
		const cookie = extractCookie(loginRes);

		const treeRes = await api.request("/tree", {
			headers: { Cookie: cookie },
		});
		expect(treeRes.status).toBe(200);
		expect(treeRes.headers.get("set-cookie")).toContain("session=");
	});

	test("logout clears the session cookie", async () => {
		const res = await api.request("/auth/logout", { method: "POST" });
		expect(res.status).toBe(200);
		const setCookie = res.headers.get("set-cookie");
		expect(setCookie).toContain("Max-Age=0");
	});
});
