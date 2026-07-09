import { useQueryClient } from "@tanstack/react-query";
import {
	CopyMinus,
	FilePlus,
	FolderPlus,
	LogOut,
	RefreshCw,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getAncestorPaths } from "@/lib/path";
import {
	useAuthStatus,
	useLogout,
	useTreeQuery,
	useUploadFile,
} from "@/lib/queries";
import { useEditorStore } from "@/store/editor-store";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { CreateInputRow } from "./create-input-row";
import { TreeEntry } from "./tree-entry";
import { getTreeEntryRef } from "./tree-entry-refs";

function useRevealActiveTab() {
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const expandMany = useEditorStore((s) => s.expandMany);

	useEffect(() => {
		if (!activeTabPath) return;

		expandMany(getAncestorPaths(activeTabPath));

		let attempts = 0;
		let frame: number;
		const tryScroll = () => {
			const el = getTreeEntryRef(activeTabPath);
			if (el) {
				el.scrollIntoView({ block: "center", behavior: "smooth" });
				return;
			}
			attempts += 1;
			if (attempts < 30) {
				frame = requestAnimationFrame(tryScroll);
			}
		};
		frame = requestAnimationFrame(tryScroll);

		return () => cancelAnimationFrame(frame);
	}, [activeTabPath, expandMany]);
}

export function FileTree() {
	const { data, isLoading, isError } = useTreeQuery();
	const nodes = data?.nodes.length ? data.nodes : [];
	const creatingNode = useEditorStore((s) => s.creatingNode);
	const startCreating = useEditorStore((s) => s.startCreating);
	const collapseAll = useEditorStore((s) => s.collapseAll);
	const queryClient = useQueryClient();
	const { data: authStatus } = useAuthStatus();
	const logout = useLogout();
	const uploadFile = useUploadFile();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	useRevealActiveTab();

	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: ["tree"] });
	};

	const uploadFiles = (parentPath: string | undefined, files: File[]) => {
		if (files.length === 0) return;
		uploadFile.mutate(
			{ parentPath, files },
			{
				onSuccess: () => {
					toast.success(
						files.length === 1
							? `Uploaded ${files[0]!.name}`
							: `Uploaded ${files.length} files`
					);
				},
				onError: (err) => {
					toast.error(
						err instanceof Error ? err.message : "Failed to upload"
					);
				},
			}
		);
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-12 shrink-0 items-center justify-between border-b px-2">
				<span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Files
				</span>
				<div className="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon-sm"
						className="cursor-pointer"
						title="New File"
						onClick={() => startCreating(undefined, "file")}
					>
						<FilePlus />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="cursor-pointer"
						title="New Folder"
						onClick={() => startCreating(undefined, "directory")}
					>
						<FolderPlus />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className={cn("cursor-pointer")}
						title="Refresh"
						onClick={() => handleRefresh()}
					>
						<RefreshCw />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="cursor-pointer"
						title="Collapse All"
						onClick={() => collapseAll()}
					>
						<CopyMinus />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="cursor-pointer"
						title="Upload"
						onClick={() => fileInputRef.current?.click()}
					>
						<Upload />
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={(e) => {
							uploadFiles(
								undefined,
								Array.from(e.target.files ?? [])
							);
							e.target.value = "";
						}}
					/>
					{authStatus?.authEnabled && (
						<Button
							variant="ghost"
							size="icon-sm"
							className="cursor-pointer"
							title="Log out"
							onClick={() => logout.mutate()}
						>
							<LogOut />
						</Button>
					)}
				</div>
			</div>
			<ScrollArea
				className={cn(
					"flex-1 overflow-hidden",
					isDragOver && "bg-accent/40"
				)}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragOver(true);
				}}
				onDragLeave={() => setIsDragOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setIsDragOver(false);
					uploadFiles(undefined, Array.from(e.dataTransfer.files));
				}}
			>
				{isLoading && (
					<div className="p-3 text-sm text-muted-foreground">
						Loading…
					</div>
				)}
				{isError && (
					<div className="p-3 text-sm text-destructive">
						Failed to load file tree.
					</div>
				)}
				{!isLoading && !isError && (
					<div className="py-1 text-sm">
						{creatingNode?.parentPath === undefined &&
							creatingNode && (
								<CreateInputRow
									creatingNode={creatingNode}
									depth={0}
								/>
							)}
						{nodes.map((node) => (
							<TreeEntry key={node.path} node={node} depth={0} />
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
