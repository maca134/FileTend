import { useQueryClient } from "@tanstack/react-query";
import { CopyMinus, FilePlus, FolderPlus, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getAncestorPaths } from "@/lib/path";
import { useTreeQuery } from "@/lib/queries";
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

	useRevealActiveTab();

	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: ["tree"] });
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
				</div>
			</div>
			<ScrollArea className="flex-1 overflow-hidden">
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
