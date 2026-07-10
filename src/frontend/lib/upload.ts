export class UploadCancelledError extends Error {
	constructor() {
		super("Upload cancelled");
		this.name = "UploadCancelledError";
	}
}

export interface UploadHandle {
	promise: Promise<{ files: { name: string; path: string }[] }>;
	abort: () => void;
}

// fetch() has no upload-progress events and no built-in cancel, so uploads
// use XMLHttpRequest instead: xhr.upload.onprogress gives real progress and
// xhr.abort() gives a native cancel.
export function uploadFilesXhr(
	parentPath: string | undefined,
	files: File[],
	onProgress: (loaded: number, total: number) => void
): UploadHandle {
	const formData = new FormData();
	for (const file of files) formData.append("files", file);

	const query =
		parentPath !== undefined
			? `?path=${encodeURIComponent(parentPath)}`
			: "";
	const xhr = new XMLHttpRequest();

	const promise = new Promise<{ files: { name: string; path: string }[] }>(
		(resolve, reject) => {
			xhr.upload.addEventListener("progress", (e) => {
				if (e.lengthComputable) onProgress(e.loaded, e.total);
			});
			xhr.addEventListener("load", () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(JSON.parse(xhr.responseText));
					return;
				}
				let message = "Failed to upload";
				try {
					const body: unknown = JSON.parse(xhr.responseText);
					if (
						body &&
						typeof body === "object" &&
						"message" in body &&
						typeof body.message === "string"
					) {
						message = body.message;
					}
				} catch {
					// Not JSON -- fall through to the generic message.
				}
				reject(new Error(message));
			});
			xhr.addEventListener("error", () =>
				reject(new Error("Failed to upload"))
			);
			xhr.addEventListener("abort", () =>
				reject(new UploadCancelledError())
			);

			xhr.open("POST", `/api/upload${query}`);
			xhr.send(formData);
		}
	);

	return { promise, abort: () => xhr.abort() };
}
