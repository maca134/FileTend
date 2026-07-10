import type { Context } from "hono";

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
