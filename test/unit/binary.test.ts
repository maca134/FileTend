import { describe, expect, test } from "bun:test";

import { isBinaryBuffer } from "../../src/lib/binary";

describe("isBinaryBuffer", () => {
	test("treats an empty buffer as text", () => {
		expect(isBinaryBuffer(Buffer.alloc(0))).toBe(false);
	});

	test("treats plain text as text", () => {
		expect(isBinaryBuffer(Buffer.from("hello world\n", "utf-8"))).toBe(
			false
		);
	});

	test("treats a buffer with a NUL byte in the sample window as binary", () => {
		const buffer = Buffer.from([104, 101, 0, 108, 108, 111]);
		expect(isBinaryBuffer(buffer)).toBe(true);
	});

	test("ignores a NUL byte beyond the sample window", () => {
		const buffer = Buffer.concat([
			Buffer.alloc(8000, "a"),
			Buffer.from([0]),
		]);
		expect(isBinaryBuffer(buffer)).toBe(false);
	});
});
