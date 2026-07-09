import type { Context } from "hono";
import { setSignedCookie } from "hono/cookie";

import { env } from "./env";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function setSessionCookie(c: Context): Promise<void> {
	await setSignedCookie(
		c,
		SESSION_COOKIE_NAME,
		"authenticated",
		env.SECRET_KEY,
		{
			httpOnly: true,
			sameSite: "Lax",
			path: "/",
			maxAge: SESSION_MAX_AGE,
		}
	);
}
