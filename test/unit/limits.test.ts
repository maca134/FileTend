import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { env } from "../../src/lib/env";
import { assertExtensionAllowed, assertSizeAllowed } from "../../src/lib/limits";

describe("assertExtensionAllowed", () => {
	const original = {
		ALLOWED_EXTENSIONS: env.ALLOWED_EXTENSIONS,
		DENY_EXTENSIONS: env.DENY_EXTENSIONS,
	};

	afterEach(() => {
		env.ALLOWED_EXTENSIONS = original.ALLOWED_EXTENSIONS;
		env.DENY_EXTENSIONS = original.DENY_EXTENSIONS;
	});

	test("allows anything when no allow/deny list is configured", () => {
		env.ALLOWED_EXTENSIONS = undefined;
		env.DENY_EXTENSIONS = undefined;
		expect(() => assertExtensionAllowed("anything.exe")).not.toThrow();
	});

	test("allows an extension present in the allow-list", () => {
		env.ALLOWED_EXTENSIONS = ["txt", "md"];
		env.DENY_EXTENSIONS = undefined;
		expect(() => assertExtensionAllowed("notes.md")).not.toThrow();
	});

	test("rejects an extension absent from the allow-list", () => {
		env.ALLOWED_EXTENSIONS = ["txt", "md"];
		env.DENY_EXTENSIONS = undefined;
		expect(() => assertExtensionAllowed("script.exe")).toThrow(
			/not allowed/
		);
	});

	test("is case-insensitive when matching the allow-list", () => {
		env.ALLOWED_EXTENSIONS = ["txt"];
		env.DENY_EXTENSIONS = undefined;
		expect(() => assertExtensionAllowed("NOTES.TXT")).not.toThrow();
	});

	test("rejects an extension present in the deny-list", () => {
		env.ALLOWED_EXTENSIONS = undefined;
		env.DENY_EXTENSIONS = ["exe", "bat"];
		expect(() => assertExtensionAllowed("virus.exe")).toThrow(
			/not allowed/
		);
	});

	test("allows an extension absent from the deny-list", () => {
		env.ALLOWED_EXTENSIONS = undefined;
		env.DENY_EXTENSIONS = ["exe", "bat"];
		expect(() => assertExtensionAllowed("notes.txt")).not.toThrow();
	});
});

describe("assertSizeAllowed", () => {
	const originalMaxFileSize = env.MAX_FILE_SIZE;

	beforeEach(() => {
		env.MAX_FILE_SIZE = 1024;
	});

	afterEach(() => {
		env.MAX_FILE_SIZE = originalMaxFileSize;
	});

	test("allows a size under the limit", () => {
		expect(() => assertSizeAllowed(512)).not.toThrow();
	});

	test("allows a size exactly at the limit", () => {
		expect(() => assertSizeAllowed(1024)).not.toThrow();
	});

	test("rejects a size over the limit", () => {
		expect(() => assertSizeAllowed(1025)).toThrow(/exceeds maximum size/);
	});
});
