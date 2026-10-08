import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

// Explicit values for every setting so a developer's local .env (which Bun
// auto-loads) can't leak into the run. Empty string = unset (see env.ts).
function server(port: number, env: Record<string, string>) {
	return {
		command: "bun e2e/serve.ts",
		url: `http://localhost:${port}`,
		reuseExistingServer: false,
		env: {
			NODE_ENV: "production",
			LOG_LEVEL: "WARN",
			PORT: String(port),
			ROOT_DIR: resolve(import.meta.dirname, `test-files/e2e-${port}`),
			READ_ONLY: "false",
			ALLOW_CREATE: "true",
			ALLOW_DELETE: "true",
			ALLOW_RENAME: "true",
			ALLOW_UPLOAD: "true",
			ALLOW_DOWNLOAD: "true",
			ALLOW_CHMOD: "true",
			ALLOW_CHOWN: "false",
			MAX_FILE_SIZE: "10MB",
			ALLOWED_EXTENSIONS: "",
			DENY_EXTENSIONS: "",
			SECRET_KEY: "",
			AUTH_PASSWORD: "",
			AUTH_ENABLED: "",
			...env,
		},
	};
}

export default defineConfig({
	testDir: "e2e",
	testMatch: "*.e2e.ts",
	workers: 1,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: { ...devices["Desktop Chrome"] },
	webServer: [
		server(3101, { AUTH_PASSWORD: "e2e-password" }),
		server(3102, { READ_ONLY: "true" }),
	],
	projects: [
		{
			name: "app",
			testMatch: "app.e2e.ts",
			use: { baseURL: "http://localhost:3101" },
		},
		{
			name: "readonly",
			testMatch: "readonly.e2e.ts",
			use: { baseURL: "http://localhost:3102" },
		},
	],
});
