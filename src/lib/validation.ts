import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";

/**
 * Shared zValidator failure hook: returns a clean `{ message }` instead of
 * the default raw Zod issue dump, which otherwise ends up verbatim in a
 * frontend toast.
 */
export function zErrorHook(
	result: { success: boolean; error?: { issues?: { message: string }[] } },
	c: Context
) {
	if (result.success) return;
	const message = result.error?.issues?.[0]?.message ?? "Invalid input";
	return c.json({ message }, 400);
}

export const pathQuery = zValidator(
	"query",
	z.object({ path: z.string() }),
	zErrorHook
);

export const optionalPathQuery = zValidator(
	"query",
	z.object({ path: z.string().optional() }),
	zErrorHook
);

export function isValidName(value: string): boolean {
	return (
		value !== "." &&
		value !== ".." &&
		!value.includes("/") &&
		!value.includes("\\")
	);
}

export const zName = z
	.string()
	.trim()
	.min(1)
	.max(255)
	.refine(isValidName, { message: "Invalid name" });
