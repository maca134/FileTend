import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLanguageForPath } from "@/lib/language";
import { useFileContent, useSaveFile } from "@/lib/queries";
import { useEditorStore } from "@/store/editor-store";

export function EditorPane() {
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const openTabs = useEditorStore((s) => s.openTabs);
	const setTabContent = useEditorStore((s) => s.setTabContent);
	const setTabDirty = useEditorStore((s) => s.setTabDirty);
	const markTabSaved = useEditorStore((s) => s.markTabSaved);
	const activeTab = openTabs.find((t) => t.path === activeTabPath);

	const { data: fileData, isLoading, isError } = useFileContent(
		activeTab && activeTab.content === undefined ? activeTab.path : null
	);
	const saveFile = useSaveFile();
	const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

	useEffect(() => {
		if (activeTab && fileData && activeTab.content === undefined) {
			setTabContent(activeTab.path, fileData.content);
		}
	}, [activeTab, fileData, setTabContent]);

	// Reads fresh state via getState() rather than closing over `activeTab`,
	// since Monaco's onMount command binding only runs once per mount and
	// would otherwise always save whichever tab was active at mount time.
	// Content comes from the live editor buffer, not the store: the store's
	// `content` is only synced on load/save, never on every keystroke.
	const handleSave = () => {
		const state = useEditorStore.getState();
		const tab = state.openTabs.find((t) => t.path === state.activeTabPath);
		const liveContent = editorRef.current?.getValue();
		if (!tab || liveContent === undefined) return;

		saveFile.mutate(
			{ path: tab.path, content: liveContent },
			{
				onSuccess: () => {
					markTabSaved(tab.path, liveContent);
					toast.success(`Saved ${tab.name}`);
				},
				onError: (err) => {
					toast.error(
						err instanceof Error
							? err.message
							: `Failed to save ${tab.name}`
					);
				},
			}
		);
	};

	if (!activeTab) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground bg-editor-background">
				Select a file to open it
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col bg-editor-background">
			<div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
				<span className="truncate text-xs text-muted-foreground">
					{activeTab.path}
				</span>
				<Button
					size="sm"
					variant="outline"
					className="cursor-pointer"
					disabled={
						!activeTab.dirty ||
						activeTab.content === undefined ||
						saveFile.isPending
					}
					onClick={handleSave}
				>
					{saveFile.isPending ? "Saving…" : "Save"}
				</Button>
			</div>
			<div className="flex-1 min-h-0">
				{isError && (
					<div className="flex h-full items-center justify-center text-sm text-destructive">
						Failed to load file.
					</div>
				)}
				{!isError && (isLoading || activeTab.content === undefined) && (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						Loading…
					</div>
				)}
				{!isError && activeTab.content !== undefined && (
					<Editor
						path={activeTab.path}
						language={getLanguageForPath(activeTab.path)}
						value={activeTab.content}
						theme="vs-dark"
						onMount={(editor, monaco) => {
							editorRef.current = editor;
							editor.addCommand(
								monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
								() => handleSave()
							);
						}}
						onChange={(value) => {
							setTabDirty(
								activeTab.path,
								value !== activeTab.content
							);
						}}
						options={{
							minimap: { enabled: false },
							fontSize: 13,
							automaticLayout: true,
						}}
					/>
				)}
			</div>
		</div>
	);
}
