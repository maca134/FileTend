export class UploadCancelledError extends Error {
	constructor() {
		super("Upload cancelled");
		this.name = "UploadCancelledError";
	}
}

// fetch() has no upload-progress events and no built-in cancel, so uploads
// use XMLHttpRequest instead: xhr.upload.onprogress gives real progress and
// xhr.abort() gives a native cancel.
export function uploadFilesXhr(
	parentPath: string | undefined,
	files: File[],
	onProgress: (loaded: number, total: number) => void
) {
	const formData = new FormData();
	for (const file of files) formData.append("files", file);

	const query =
		parentPath !== undefined
			? `?path=${encodeURIComponent(parentPath)}`
			: "";
	const xhr = new XMLHttpRequest();
	xhr.responseType = "json";

	const promise = new Promise<{ files: { name: string; path: string }[] }>(
		(resolve, reject) => {
			xhr.upload.addEventListener("progress", (e) => {
				if (e.lengthComputable) onProgress(e.loaded, e.total);
			});
			xhr.addEventListener("load", () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(xhr.response);
					return;
				}
				// responseType "json" yields null for a non-JSON body.
				const message = xhr.response?.message;
				reject(
					new Error(
						typeof message === "string"
							? message
							: "Failed to upload"
					)
				);
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
