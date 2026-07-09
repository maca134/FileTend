import { File, Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCreateNode } from "@/lib/queries";
import { useEditorStore } from "@/store/editor-store";

export function CreateInputRow({
	creatingNode,
	depth,
}: {
	creatingNode: {
		parentPath: string | undefined;
		type: "file" | "directory";
	};
	depth: number;
}) {
	const cancelCreating = useEditorStore((s) => s.cancelCreating);
	const openFile = useEditorStore((s) => s.openFile);
	const [name, setName] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const createNode = useCreateNode();

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const submit = () => {
		const trimmed = name.trim();
		if (!trimmed) {
			cancelCreating();
			return;
		}
		createNode.mutate(
			{
				parentPath: creatingNode.parentPath,
				name: trimmed,
				type: creatingNode.type,
			},
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
		);
	};

	return (
		<div>
			<div
				className="flex items-center gap-1 px-2 py-1"
				style={{ paddingLeft: 8 + depth * 14 }}
			>
				<span className="w-3.5 shrink-0" />
				{creatingNode.type === "directory" ? (
					<Folder className="size-3.5 shrink-0 text-muted-foreground" />
				) : (
					<File className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<input
					ref={inputRef}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
						if (e.key === "Escape") cancelCreating();
					}}
					onBlur={() => {
						if (!createNode.isPending) cancelCreating();
					}}
					disabled={createNode.isPending}
					className="min-w-0 flex-1 rounded-sm border border-ring bg-background px-1 text-sm outline-none disabled:opacity-50"
				/>
			</div>
			{createNode.isError && (
				<div
					className="px-2 pb-1 text-xs text-destructive"
					style={{ paddingLeft: 8 + depth * 14 + 18 }}
				>
					{createNode.error.message}
				</div>
			)}
		</div>
	);
}
