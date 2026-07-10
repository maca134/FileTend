import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { UploadToast } from "@/components/upload-progress-toast";

import { UploadCancelledError, uploadFilesXhr } from "./upload";

export function useUploadWithProgress() {
	const queryClient = useQueryClient();

	return function uploadWithProgress(
		parentPath: string | undefined,
		files: File[]
	) {
		if (files.length === 0) return;

		const id = toast.custom(
			() => (
				<UploadToast
					status="uploading"
					fileCount={files.length}
					percent={0}
					onCancel={() => handle.abort()}
				/>
			),
			{ duration: Infinity }
		);

		const handle = uploadFilesXhr(parentPath, files, (loaded, total) => {
			const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
			toast.custom(
				() => (
					<UploadToast
						status="uploading"
						fileCount={files.length}
						percent={percent}
						onCancel={() => handle.abort()}
					/>
				),
				{ id, duration: Infinity }
			);
		});

		handle.promise
			.then(() => {
				// toast.success()/error()/info() never clear a prior
				// toast.custom()'s jsx, so switching a toast.custom() toast
				// into a terminal state has to keep going through
				// toast.custom() too, or it'll silently keep showing the
				// last progress frame forever. Duration must also be reset
				// explicitly -- sonner merges toast data, so the `Infinity`
				// set while uploading would otherwise stick around and this
				// toast would never auto-dismiss.
				toast.custom(
					() => (
						<UploadToast
							status="success"
							fileCount={files.length}
							fileName={files[0]!.name}
						/>
					),
					{ id, duration: 4000 }
				);
				queryClient.invalidateQueries({ queryKey: ["tree", parentPath] });
			})
			.catch((err) => {
				if (err instanceof UploadCancelledError) {
					toast.custom(() => <UploadToast status="cancelled" />, {
						id,
						duration: 4000,
					});
					return;
				}
				toast.custom(
					() => (
						<UploadToast
							status="error"
							message={
								err instanceof Error ? err.message : "Failed to upload"
							}
						/>
					),
					{ id, duration: 4000 }
				);
			});
	};
}
