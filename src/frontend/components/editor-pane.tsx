import Editor, { type OnMount } from "@monaco-editor/react";
import { Loader, RefreshCcw, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLanguageForPath } from "@/lib/language";
import { useFileContent, useSaveFile } from "@/lib/queries";
import { useEditorStore } from "@/store/editor-store";

import { ConfirmDialog } from "./confirm-dialog";

export function EditorPane() {
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const openTabs = useEditorStore((s) => s.openTabs);
	const setTabContent = useEditorStore((s) => s.setTabContent);
	const updateTabContent = useEditorStore((s) => s.updateTabContent);
	const markTabSaved = useEditorStore((s) => s.markTabSaved);
	const activeTab = openTabs.find((t) => t.path === activeTabPath);

	const {
		data: fileData,
		isLoading,
		isError,
	} = useFileContent(
		activeTab && activeTab.content === undefined ? activeTab.path : null
	);
	const saveFile = useSaveFile();
	const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
	const [confirmRevertOpen, setConfirmRevertOpen] = useState(false);

	useEffect(() => {
		if (activeTab && fileData && activeTab.content === undefined) {
			setTabContent(activeTab.path, fileData.content);
		}
	}, [activeTab, fileData, setTabContent]);

	// Monaco's built-in `automaticLayout` polls/observes its own container,
	// but can get stuck reporting a stale size across a downsize-then-upsize
	// cycle inside this app's flex/resizable-panel layout. Driving layout()
	// from our own ResizeObserver on the wrapping element is more reliable.
	// A callback ref (not a plain useEffect) is required here: the container
	// only exists in the DOM once a tab is open, so a `useEffect(..., [])`
	// that runs once on the initial mount (before any tab is open) would
	// find the ref null and never attach the observer.
	const editorContainerRef = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;

		const observer = new ResizeObserver(() => {
			editorRef.current?.layout();
		});
		observer.observe(node);

		return () => observer.disconnect();
	}, []);

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

	const handleRevert = () => {
		setConfirmRevertOpen(true);
	};

	// Monaco doesn't re-sync an existing model from a changed `value` prop,
	// so reverting has to call setValue() on the live editor instance
	// directly, in addition to resetting the store's buffer.
	const confirmRevert = () => {
		const state = useEditorStore.getState();
		const tab = state.openTabs.find((t) => t.path === state.activeTabPath);
		if (!tab) return;

		const original = tab.savedContent ?? "";
		editorRef.current?.setValue(original);
		updateTabContent(tab.path, original);
		setConfirmRevertOpen(false);
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
				<span className="truncate flex-1 text-xs text-muted-foreground">
					{activeTab.path}
				</span>
				<div className="flex gap-1">
					<Button
						size="icon-sm"
						variant="ghost"
						className="cursor-pointer"
						disabled={
							!activeTab.dirty ||
							activeTab.content === undefined ||
							saveFile.isPending
						}
						onClick={handleRevert}
					>
						<RefreshCcw className="h-3 w-3" />
					</Button>
					<Button
						size="icon-sm"
						variant="ghost"
						className="cursor-pointer"
						disabled={
							!activeTab.dirty ||
							activeTab.content === undefined ||
							saveFile.isPending
						}
						onClick={handleSave}
					>
						{saveFile.isPending ? (
							<Loader className="h-3 w-3 animate-spin" />
						) : (
							<Save className="h-3 w-3" />
						)}
					</Button>
				</div>
			</div>
			<div ref={editorContainerRef} className="flex-1 min-h-0">
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
							updateTabContent(activeTab.path, value ?? "");
						}}
						options={{
							// minimap: { enabled: false },
							fontSize: 13,
						}}
					/>
				)}
			</div>
			<ConfirmDialog
				open={confirmRevertOpen}
				onOpenChange={setConfirmRevertOpen}
				title={`Revert ${activeTab.name}?`}
				description={`"${activeTab.name}" has unsaved changes that will be lost. This action cannot be undone.`}
				confirmLabel="Revert"
				destructive
				onConfirm={confirmRevert}
			/>
		</div>
	);
}
