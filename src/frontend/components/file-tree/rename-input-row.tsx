import { File, Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useRenameNode } from "@/lib/queries";
import { useEditorStore } from "@/store/editor-store";

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
	const [value, setValue] = useState(name);
	const inputRef = useRef<HTMLInputElement>(null);
	const renameNode = useRenameNode();

	useEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.focus();
		const dotIndex = name.lastIndexOf(".");
		const selectEnd =
			type === "file" && dotIndex > 0 ? dotIndex : name.length;
		el.setSelectionRange(0, selectEnd);
	}, [name, type]);

	const submit = () => {
		const trimmed = value.trim();
		if (!trimmed || trimmed === name) {
			cancelRenaming();
			return;
		}
		renameNode.mutate(
			{ path, name: trimmed },
			{
				onSuccess: (result) => {
					renamePath(path, result.path);
					cancelRenaming();
				},
			}
		);
	};

	return (
		<div>
			<div
				className="flex items-center gap-1 px-2 py-1"
				style={{ paddingLeft: 8 + depth * 8 }}
			>
				{type === "directory" ? (
					<span className="size-3.5 shrink-0" />
				) : null}
				{type === "directory" ? (
					<Folder className="size-3.5 shrink-0 text-muted-foreground" />
				) : (
					<File className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<input
					ref={inputRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
						if (e.key === "Escape") cancelRenaming();
					}}
					onBlur={() => {
						if (!renameNode.isPending) cancelRenaming();
					}}
					disabled={renameNode.isPending}
					className="min-w-0 flex-1 rounded-sm border border-ring bg-background px-1 text-sm outline-none disabled:opacity-50"
				/>
			</div>
			{renameNode.isError && (
				<div
					className="px-2 pb-1 text-xs text-destructive"
					style={{ paddingLeft: 8 + depth * 8 + 18 }}
				>
					{renameNode.error.message}
				</div>
			)}
		</div>
	);
}
