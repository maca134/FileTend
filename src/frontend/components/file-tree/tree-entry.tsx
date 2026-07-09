import { ChevronRight, Dot } from "lucide-react";
import { useState } from "react";

import { downloadPath } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

import type { FileTreeNode } from "../../../api/tree";
import { useDeleteNode, useTreeQuery } from "../../lib/queries";
import { ConfirmDialog } from "../confirm-dialog";
import { FileIcon } from "../file-icon";
import { CreateInputRow } from "./create-input-row";
import { RenameInputRow } from "./rename-input-row";
import { TreeContextMenu, type TreeContextMenuItem } from "./tree-context-menu";
import { registerTreeEntryRef } from "./tree-entry-refs";

function FileTreeEntry({ node, depth }: { node: FileTreeNode; depth: number }) {
	const openFile = useEditorStore((s) => s.openFile);
	const closeTab = useEditorStore((s) => s.closeTab);
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const openTab = useEditorStore((s) =>
		s.openTabs.find((t) => t.path === node.path)
	);
	const renamingPath = useEditorStore((s) => s.renamingPath);
	const startRenaming = useEditorStore((s) => s.startRenaming);
	const isActive = activeTabPath === node.path;
	const deleteNode = useDeleteNode();
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	const items: TreeContextMenuItem[] = [
		{
			label: "Open",
			onSelect: () =>
				openFile({
					path: node.path,
					name: node.name,
					dirty: false,
				}),
		},
		{
			separator: true,
		},
		{
			label: "Download",
			onSelect: () => downloadPath(node.path),
		},
		{
			separator: true,
		},
		{
			label: "Rename...",
			onSelect: () => startRenaming(node.path),
		},
		{
			label: "Delete",
			onSelect: () => setConfirmDeleteOpen(true),
		},
	];

	return (
		<>
			{renamingPath === node.path ? (
				<RenameInputRow
					path={node.path}
					name={node.name}
					type={node.type}
					depth={depth}
				/>
			) : (
				<TreeContextMenu items={items}>
					<button
						ref={(el) => registerTreeEntryRef(node.path, el)}
						type="button"
						data-path={node.path}
						onClick={() =>
							openFile({
								path: node.path,
								name: node.name,
								dirty: false,
							})
						}
						className={cn(
							"flex w-full items-center gap-1 px-2 py-1 text-left cursor-pointer",
							isActive && "bg-accent",
							!isActive && "hover:bg-accent/40",
							"data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-ring"
						)}
						style={{ paddingLeft: 8 + depth * 8 }}
					>
						<FileIcon type={node.type} path={node.path} />
						<span className="truncate -mt-1">{node.name}</span>
					</button>
				</TreeContextMenu>
			)}
			<ConfirmDialog
				open={confirmDeleteOpen}
				onOpenChange={setConfirmDeleteOpen}
				title={`Delete ${node.name}?`}
				description={
					openTab?.dirty
						? `"${node.name}" has unsaved changes that will be lost. This action cannot be undone.`
						: `This will permanently delete "${node.name}". This action cannot be undone.`
				}
				confirmLabel="Delete"
				destructive
				onConfirm={() => {
					deleteNode.mutate(
						{ path: node.path },
						{
							onSuccess: () => {
								if (openTab) closeTab(node.path);
							},
						}
					);
					setConfirmDeleteOpen(false);
				}}
			/>
		</>
	);
}

function DirectoryTreeEntry({
	node,
	depth,
}: {
	node: FileTreeNode;
	depth: number;
}) {
	const expandedPaths = useEditorStore((s) => s.expandedPaths);
	const toggleExpanded = useEditorStore((s) => s.toggleExpanded);
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const creatingNode = useEditorStore((s) => s.creatingNode);
	const startCreating = useEditorStore((s) => s.startCreating);
	const renamingPath = useEditorStore((s) => s.renamingPath);
	const startRenaming = useEditorStore((s) => s.startRenaming);

	const isExpanded = expandedPaths.includes(node.path);
	const isActive = activeTabPath === node.path;

	const {
		data: childData,
		isLoading: isLoadingChildren,
		isFetching,
	} = useTreeQuery(node.path, isExpanded);
	const children = childData?.nodes ?? [];

	const items: TreeContextMenuItem[] = [
		{
			label: "New File...",
			onSelect: () => startCreating(node.path, "file"),
		},
		{
			label: "New Folder...",
			onSelect: () => startCreating(node.path, "directory"),
		},
		{
			separator: true,
		},
		{
			label: "Download",
			onSelect: () => downloadPath(node.path),
		},
		{
			separator: true,
		},
		{
			label: "Rename...",
			onSelect: () => startRenaming(node.path),
		},
		{
			label: "Delete",
			onSelect: () => {},
		},
	];

	return (
		<>
			{renamingPath === node.path ? (
				<RenameInputRow
					path={node.path}
					name={node.name}
					type={node.type}
					depth={depth}
				/>
			) : (
				<TreeContextMenu items={items}>
					<button
						type="button"
						onClick={() => toggleExpanded(node.path)}
						className={cn(
							"flex w-full items-center gap-1 px-2 py-1 text-left cursor-pointer",
							isActive && "bg-accent",
							!isActive && "hover:bg-accent/40",
							"data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-ring"
						)}
						style={{ paddingLeft: 8 + depth * 8 }}
					>
						<ChevronRight
							className={cn(
								"size-3.5 shrink-0 text-muted-foreground transition-transform",
								isExpanded && "rotate-90"
							)}
						/>
						<FileIcon type={node.type} path={node.path} />
						<span className="truncate -mt-1">{node.name}</span>
						<Dot
							className={cn(
								"size-3 shrink-0 text-primary opacity-0 transition-opacity",
								isFetching && "opacity-100"
							)}
						/>
					</button>
				</TreeContextMenu>
			)}
			{isExpanded && (
				<div>
					{creatingNode?.parentPath === node.path && (
						<CreateInputRow
							creatingNode={creatingNode}
							depth={depth + 1}
						/>
					)}
					{isLoadingChildren ? (
						<div
							className="py-1 text-xs text-muted-foreground"
							style={{ paddingLeft: 8 + (depth + 1) * 14 }}
						>
							Loading…
						</div>
					) : (
						children.map((child) => (
							<TreeEntry
								key={child.path}
								node={child}
								depth={depth + 1}
							/>
						))
					)}
				</div>
			)}
		</>
	);
}

export function TreeEntry({
	node,
	depth,
}: {
	node: FileTreeNode;
	depth: number;
}) {
	const isDirectory = node.type === "directory";
	return isDirectory ? (
		<DirectoryTreeEntry node={node} depth={depth} />
	) : (
		<FileTreeEntry node={node} depth={depth} />
	);
}
