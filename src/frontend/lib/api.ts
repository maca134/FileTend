import { hc } from "hono/client";

import type { AppType } from "../../api";

export const api = hc<AppType>("/api");

// Returns the parsed body of an OK response. API error responses are JSON
// `{ message: string }`; anything else falls back to a generic message
// rather than surfacing raw response text/JSON in a toast.
export async function unwrap<
	R extends { ok: boolean; json(): Promise<unknown> },
>(
	res: R,
	fallback: string
): Promise<Awaited<ReturnType<Exclude<R, { ok: false }>["json"]>>> {
	if (res.ok) return (await res.json()) as never;
	const body = (await res.json().catch(() => null)) as {
		message?: unknown;
	} | null;
	throw new Error(
		typeof body?.message === "string" ? body.message : fallback
	);
}

export function downloadPath(path: string) {
	const url = `/api/download?path=${encodeURIComponent(path)}`;
	const a = document.createElement("a");
	a.href = url;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
}
