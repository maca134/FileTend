import { ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";

import { downloadPath } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { useUploadWithProgress } from "@/lib/use-upload-with-progress";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

import type { FileTreeNode } from "../../../api/tree";
import { useAuthStatus, useDeleteNode, useTreeQuery } from "../../lib/queries";
import { ConfirmDialog } from "../confirm-dialog";
import { ContextMenu, type ContextMenuItem } from "../context-menu";
import { FileIcon } from "../file-icon";
import { PropertiesDialog } from "../properties-dialog";
import { CreateInputRow } from "./create-input-row";
import { RenameInputRow } from "./rename-input-row";
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
	const [propertiesOpen, setPropertiesOpen] = useState(false);
	const { data: authStatus } = useAuthStatus();
	const permissions = authStatus?.permissions;

	const items: ContextMenuItem[] = [
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
			disabled: permissions ? !permissions.canDownload : false,
		},
		{
			separator: true,
		},
		{
			label: "Rename...",
			onSelect: () => startRenaming(node.path),
			disabled: permissions ? !permissions.canRename : false,
		},
		{
			label: "Delete",
			onSelect: () => setConfirmDeleteOpen(true),
			disabled: permissions ? !permissions.canDelete : false,
		},
		{
			separator: true,
		},
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
						{node.type === "file" && (
							<FileIcon type={node.type} path={node.path} />
						)}
						<span className="truncate min-w-0 -mt-1">
							{node.name}
						</span>
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
			<PropertiesDialog
				path={node.path}
				name={node.name}
				type={node.type}
				open={propertiesOpen}
				onOpenChange={setPropertiesOpen}
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
	const closeTabsUnder = useEditorStore((s) => s.closeTabsUnder);
	const deleteNode = useDeleteNode();
	const uploadFiles = useUploadWithProgress();
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [propertiesOpen, setPropertiesOpen] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const { data: authStatus } = useAuthStatus();
	const permissions = authStatus?.permissions;

	const isExpanded = expandedPaths.includes(node.path);
	const isActive = activeTabPath === node.path;

	const {
		data: childData,
		isLoading: isLoadingChildren,
		isFetching,
	} = useTreeQuery(node.path, isExpanded);
	const children = childData?.nodes ?? [];

	const items: ContextMenuItem[] = [
		{
			label: "New File...",
			onSelect: () => startCreating(node.path, "file"),
			disabled: permissions ? !permissions.canCreate : false,
		},
		{
			label: "New Folder...",
			onSelect: () => startCreating(node.path, "directory"),
			disabled: permissions ? !permissions.canCreate : false,
		},
		{
			separator: true,
		},
		{
			label: "Download",
			onSelect: () => downloadPath(node.path),
			disabled: permissions ? !permissions.canDownload : false,
		},
		{
			separator: true,
		},
		{
			label: "Rename...",
			onSelect: () => startRenaming(node.path),
			disabled: permissions ? !permissions.canRename : false,
		},
		{
			label: "Delete",
			onSelect: () => setConfirmDeleteOpen(true),
			disabled: permissions ? !permissions.canDelete : false,
		},
		{
			separator: true,
		},
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
						onClick={() => toggleExpanded(node.path)}
						onDragOver={(e) => {
							e.preventDefault();
							if (permissions?.canUpload === false) return;
							setIsDragOver(true);
						}}
						onDragLeave={() => setIsDragOver(false)}
						onDrop={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setIsDragOver(false);
							if (permissions?.canUpload === false) return;
							const files = Array.from(e.dataTransfer.files);
							if (files.length === 0) return;
							uploadFiles(node.path, files);
						}}
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
						<ChevronRight
							className={cn(
								"size-5 shrink-0 text-muted-foreground transition-transform",
								isExpanded && "rotate-90"
							)}
						/>
						{node.type === "file" && (
							<FileIcon type={node.type} path={node.path} />
						)}
						<span className="truncate -mt-1">{node.name}</span>
						<RefreshCw
							className={cn(
								"size-3 shrink-0 text-primary opacity-0 transition-opacity animate-spin",
								isFetching && "opacity-100"
							)}
						/>
					</button>
				</ContextMenu>
			)}
			<ConfirmDialog
				open={confirmDeleteOpen}
				onOpenChange={setConfirmDeleteOpen}
				title={`Delete ${node.name}?`}
				description={`This will permanently delete "${node.name}" and everything inside it. This action cannot be undone.`}
				confirmLabel="Delete"
				destructive
				onConfirm={() => {
					deleteNode.mutate(
						{ path: node.path },
						{
							onSuccess: () => {
								closeTabsUnder(node.path);
							},
						}
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
					) : children.length === 0 &&
					  creatingNode?.parentPath !== node.path ? (
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
