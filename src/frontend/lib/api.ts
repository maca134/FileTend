import { hc } from "hono/client";

import type { AppType } from "../../api";

export const api = hc<AppType>("/api");

export function downloadPath(path: string) {
	const url = `/api/download?path=${encodeURIComponent(path)}`;
	const a = document.createElement("a");
	a.href = url;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
}

/*
Example API usage:

api.auth.login.$post({
	json: {
		password: "password"
	}
}).then((response) => {
	if (!response.ok) {
		throw new Error("Failed to log in");
	}
	return response.json();
}).then((data) => {
	console.log("Logged in", data);
}).catch((err) => {
	console.error("Failed to log in", err);
});

*/
