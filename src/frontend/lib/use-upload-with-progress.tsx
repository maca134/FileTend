import { useQueryClient } from "@tanstack/react-query";
import { type DragEvent, useState } from "react";
import { toast } from "sonner";

import {
	UploadToast,
	type UploadToastState,
} from "@/components/upload-progress-toast";

import { useAuthStatus } from "./queries";
import { UploadCancelledError, uploadFilesXhr } from "./upload";

export function useUploadWithProgress() {
	const queryClient = useQueryClient();

	return function uploadWithProgress(
		parentPath: string | undefined,
		files: File[]
	) {
		if (files.length === 0) return;

		// toast.success()/error()/info() never clear a prior toast.custom()'s
		// jsx, so every state change -- including the terminal ones -- has to
		// go through toast.custom() on the same id, or it'll silently keep
		// showing the last progress frame forever. Duration must also be set
		// explicitly every time -- sonner merges toast data, so the `Infinity`
		// set while uploading would otherwise stick around and this toast
		// would never auto-dismiss.
		let id: string | number | undefined;
		const show = (state: UploadToastState, duration = 4000) => {
			id = toast.custom(() => <UploadToast {...state} />, {
				id,
				duration,
			});
		};
		const showProgress = (percent: number) =>
			show(
				{
					status: "uploading",
					fileCount: files.length,
					percent,
					onCancel: () => handle.abort(),
				},
				Infinity
			);

		showProgress(0);
		const handle = uploadFilesXhr(parentPath, files, (loaded, total) =>
			showProgress(total > 0 ? Math.round((loaded / total) * 100) : 0)
		);

		handle.promise
			.then(() => {
				show({
					status: "success",
					fileCount: files.length,
					fileName: files[0]!.name,
				});
				queryClient.invalidateQueries({
					queryKey: ["tree", parentPath],
				});
			})
			.catch((err) => {
				show(
					err instanceof UploadCancelledError
						? { status: "cancelled" }
						: {
								status: "error",
								message:
									err instanceof Error
										? err.message
										: "Failed to upload",
							}
				);
			});
	};
}

export function useUploadDrop(parentPath: string | undefined) {
	const uploadFiles = useUploadWithProgress();
	const { data: authStatus } = useAuthStatus();
	const canUpload = authStatus?.permissions?.canUpload !== false;
	const [isDragOver, setIsDragOver] = useState(false);

	return {
		isDragOver,
		dropHandlers: {
			onDragOver: (e: DragEvent) => {
				e.preventDefault();
				if (canUpload) setIsDragOver(true);
			},
			onDragLeave: () => setIsDragOver(false),
			onDrop: (e: DragEvent) => {
				e.preventDefault();
				e.stopPropagation();
				setIsDragOver(false);
				if (canUpload) {
					uploadFiles(parentPath, Array.from(e.dataTransfer.files));
				}
			},
		},
	};
}
