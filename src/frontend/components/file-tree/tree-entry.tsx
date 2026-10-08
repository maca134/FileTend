import { useIsFetching } from "@tanstack/react-query";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";

import { downloadPath } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { useUploadDrop } from "@/lib/use-upload-with-progress";
import { cn } from "@/lib/utils";
import { isTabDirty, useEditorStore } from "@/store/editor-store";

import type { FileTreeNode } from "../../../api/tree";
import { useAuthStatus, useDeleteNode, useTreeQuery } from "../../lib/queries";
import { ConfirmDialog } from "../confirm-dialog";
import { ContextMenu, type ContextMenuItem } from "../context-menu";
import { FileIcon } from "../file-icon";
import { PropertiesDialog } from "../properties-dialog";
import { CreateInputRow, RenameInputRow } from "./name-input-row";

function DirectoryChildren({
	node,
	depth,
}: {
	node: FileTreeNode;
	depth: number;
}) {
	const creatingNode = useEditorStore((s) => s.creatingNode);
	const { data, isLoading } = useTreeQuery(node.path);
	const children = data?.nodes ?? [];
	const isCreatingHere = creatingNode?.parentPath === node.path;

	return (
		<div>
			{isCreatingHere && (
				<CreateInputRow creatingNode={creatingNode} depth={depth + 1} />
			)}
			{isLoading ? (
				<div
					className="py-1 text-xs text-muted-foreground"
					style={{ paddingLeft: 8 + (depth + 1) * 14 }}
				>
					Loading…
				</div>
			) : children.length === 0 && !isCreatingHere ? (
				<div
					className="py-1 text-xs text-muted-foreground italic"
					style={{ paddingLeft: 8 + (depth + 1) * 14 }}
				>
					Empty folder
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
	const openFile = useEditorStore((s) => s.openFile);
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const isDirty = useEditorStore((s) => {
		const tab = s.openTabs.find((t) => t.path === node.path);
		return !!tab && isTabDirty(tab);
	});
	const isExpanded = useEditorStore(
		(s) => isDirectory && s.expandedPaths.includes(node.path)
	);
	const toggleExpanded = useEditorStore((s) => s.toggleExpanded);
	const startCreating = useEditorStore((s) => s.startCreating);
	const renamingPath = useEditorStore((s) => s.renamingPath);
	const startRenaming = useEditorStore((s) => s.startRenaming);
	const closeTabsUnder = useEditorStore((s) => s.closeTabsUnder);
	const deleteNode = useDeleteNode();
	const { isDragOver, dropHandlers } = useUploadDrop(node.path);
	const isFetching = useIsFetching({ queryKey: ["tree", node.path] }) > 0;
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [propertiesOpen, setPropertiesOpen] = useState(false);
	const { data: authStatus } = useAuthStatus();
	const permissions = authStatus?.permissions;
	const isActive = activeTabPath === node.path;

	const open = () => openFile({ path: node.path, name: node.name });

	const items: ContextMenuItem[] = [
		...(isDirectory
			? [
					{
						label: "New File...",
						onSelect: () => startCreating(node.path, "file"),
						disabled: permissions?.canCreate === false,
					},
					{
						label: "New Folder...",
						onSelect: () => startCreating(node.path, "directory"),
						disabled: permissions?.canCreate === false,
					},
				]
			: [{ label: "Open", onSelect: open }]),
		{ separator: true },
		{
			label: "Download",
			onSelect: () => downloadPath(node.path),
			disabled: permissions?.canDownload === false,
		},
		{ separator: true },
		{
			label: "Rename...",
			onSelect: () => startRenaming(node.path),
			disabled: permissions?.canRename === false,
		},
		{
			label: "Delete",
			onSelect: () => setConfirmDeleteOpen(true),
			disabled: permissions?.canDelete === false,
		},
		{ separator: true },
		{
			label: "Properties...",
			onSelect: () => setPropertiesOpen(true),
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
				<ContextMenu items={items}>
					<button
						type="button"
						data-path={node.path}
						onClick={() =>
							isDirectory ? toggleExpanded(node.path) : open()
						}
						{...(isDirectory ? dropHandlers : {})}
						className={cn(
							"flex w-full items-center gap-1 px-2 py-1 text-left cursor-pointer",
							isActive && "bg-accent",
							!isActive && "hover:bg-accent/40",
							isDragOver &&
								"bg-accent/60 ring-1 ring-inset ring-ring",
							"data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-ring"
						)}
						style={{ paddingLeft: 8 + depth * 8 }}
					>
						{isDirectory ? (
							<ChevronRight
								className={cn(
									"size-5 shrink-0 text-muted-foreground transition-transform",
									isExpanded && "rotate-90"
								)}
							/>
						) : (
							<FileIcon path={node.path} />
						)}
						<span className="truncate min-w-0 -mt-1">
							{node.name}
						</span>
						{isDirectory && (
							<RefreshCw
								className={cn(
									"size-3 shrink-0 text-primary opacity-0 transition-opacity animate-spin",
									isFetching && "opacity-100"
								)}
							/>
						)}
						{node.size !== undefined && (
							<span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">
								{formatBytes(node.size)}
							</span>
						)}
					</button>
				</ContextMenu>
			)}
			<ConfirmDialog
				open={confirmDeleteOpen}
				onOpenChange={setConfirmDeleteOpen}
				title={`Delete ${node.name}?`}
				description={
					isDirectory
						? `This will permanently delete "${node.name}" and everything inside it. This action cannot be undone.`
						: isDirty
							? `"${node.name}" has unsaved changes that will be lost. This action cannot be undone.`
							: `This will permanently delete "${node.name}". This action cannot be undone.`
				}
				confirmLabel="Delete"
				destructive
				onConfirm={() => {
					deleteNode.mutate(
						{ path: node.path },
						{ onSuccess: () => closeTabsUnder(node.path) }
					);
					setConfirmDeleteOpen(false);
				}}
			/>
			<PropertiesDialog
				path={node.path}
				name={node.name}
				type={node.type}
				open={propertiesOpen}
				onOpenChange={setPropertiesOpen}
			/>
			{isExpanded && <DirectoryChildren node={node} depth={depth} />}
		</>
	);
}
