import {
	CircleCheckIcon,
	InfoIcon,
	OctagonXIcon,
	UploadIcon,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { Button } from "./ui/button";

export type UploadToastState =
	| { status: "uploading"; fileCount: number; percent: number; onCancel: () => void }
	| { status: "success"; fileCount: number; fileName: string }
	| { status: "cancelled" }
	| { status: "error"; message: string };

function uploadedLabel(fileCount: number, fileName: string) {
	return fileCount === 1 ? `Uploaded ${fileName}` : `Uploaded ${fileCount} files`;
}

export function UploadToast(state: UploadToastState) {
	return (
		// Sonner only applies its own width/padding/border/background to
		// toasts it renders itself -- toast.custom() toasts get none of that
		// (data-styled=false), so this has to be fully self-contained,
		// including a fixed width matching sonner's own default toast width.
		<div className="flex w-89 max-w-[90vw] flex-col gap-2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
			{state.status === "uploading" && (
				<>
					<div className="flex items-center justify-between gap-2">
						<span className="flex items-center gap-2">
							<UploadIcon className="size-4 shrink-0" />
							Uploading {state.fileCount}{" "}
							{state.fileCount === 1 ? "file" : "files"}…
						</span>
						<span className="shrink-0 text-muted-foreground tabular-nums">
							{state.percent}%
						</span>
					</div>
					<Progress value={state.percent} />
					<Button
						size="sm"
						variant="ghost"
						className="cursor-pointer self-end"
						onClick={state.onCancel}
					>
						Cancel
					</Button>
				</>
			)}
			{state.status === "success" && (
				<span className="flex items-center gap-2 text-emerald-500">
					<CircleCheckIcon className="size-4 shrink-0" />
					<span className="text-popover-foreground">
						{uploadedLabel(state.fileCount, state.fileName)}
					</span>
				</span>
			)}
			{state.status === "cancelled" && (
				<span className="flex items-center gap-2">
					<InfoIcon className="size-4 shrink-0" />
					Upload cancelled
				</span>
			)}
			{state.status === "error" && (
				<span className="flex items-center gap-2 text-destructive">
					<OctagonXIcon className="size-4 shrink-0" />
					<span>{state.message}</span>
				</span>
			)}
		</div>
	);
}
