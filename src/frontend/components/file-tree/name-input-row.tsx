import { File, Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCreateNode, useRenameNode } from "@/lib/queries";
import { type CreatingNode, useEditorStore } from "@/store/editor-store";

function NameInputRow({
	type,
	depth,
	initialName = "",
	onSubmit,
	onCancel,
	isPending,
	error,
}: {
	type: "file" | "directory";
	depth: number;
	initialName?: string;
	onSubmit: (name: string) => void;
	onCancel: () => void;
	isPending: boolean;
	error: Error | null;
}) {
	const [value, setValue] = useState(initialName);
	const inputRef = useRef<HTMLInputElement>(null);

	// Select the name without its extension, so renaming a file keeps it.
	useEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.focus();
		const dotIndex = initialName.lastIndexOf(".");
		el.setSelectionRange(
			0,
			type === "file" && dotIndex > 0 ? dotIndex : initialName.length
		);
	}, [initialName, type]);

	const submit = () => {
		const trimmed = value.trim();
		if (!trimmed || trimmed === initialName) onCancel();
		else onSubmit(trimmed);
	};

	return (
		<div>
			<div
				className="flex items-center gap-1 px-2 py-1"
				style={{ paddingLeft: 8 + depth * 8 }}
			>
				{type === "directory" ? (
					<>
						<span className="size-3.5 shrink-0" />
						<Folder className="size-3.5 shrink-0 text-muted-foreground" />
					</>
				) : (
					<File className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<input
					ref={inputRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
						if (e.key === "Escape") onCancel();
					}}
					onBlur={() => {
						if (!isPending) onCancel();
					}}
					disabled={isPending}
					className="min-w-0 flex-1 rounded-sm border border-ring bg-background px-1 text-sm outline-none disabled:opacity-50"
				/>
			</div>
			{error && (
				<div
					className="px-2 pb-1 text-xs text-destructive"
					style={{ paddingLeft: 8 + depth * 8 + 18 }}
				>
					{error.message}
				</div>
			)}
		</div>
	);
}

export function CreateInputRow({
	creatingNode,
	depth,
}: {
	creatingNode: CreatingNode;
	depth: number;
}) {
	const cancelCreating = useEditorStore((s) => s.cancelCreating);
	const openFile = useEditorStore((s) => s.openFile);
	const createNode = useCreateNode();

	return (
		<NameInputRow
			type={creatingNode.type}
			depth={depth}
			onCancel={cancelCreating}
			isPending={createNode.isPending}
			error={createNode.error}
			onSubmit={(name) =>
				createNode.mutate(
					{ ...creatingNode, name },
					{
						onSuccess: (node) => {
							cancelCreating();
							if (creatingNode.type === "file") {
								openFile({
									path: node.path,
									name: node.name,
									dirty: false,
								});
							}
						},
					}
				)
			}
		/>
	);
}

export function RenameInputRow({
	path,
	name,
	type,
	depth,
}: {
	path: string;
	name: string;
	type: "file" | "directory";
	depth: number;
}) {
	const cancelRenaming = useEditorStore((s) => s.cancelRenaming);
	const renamePath = useEditorStore((s) => s.renamePath);
	const renameNode = useRenameNode();

	return (
		<NameInputRow
			type={type}
			depth={depth}
			initialName={name}
			onCancel={cancelRenaming}
			isPending={renameNode.isPending}
			error={renameNode.error}
			onSubmit={(newName) =>
				renameNode.mutate(
					{ path, name: newName },
					{
						onSuccess: (result) => {
							renamePath(path, result.path);
							cancelRenaming();
						},
					}
				)
			}
		/>
	);
}
