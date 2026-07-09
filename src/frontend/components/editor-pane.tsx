import { useEditorStore } from "@/store/editor-store";

export function EditorPane() {
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const openTabs = useEditorStore((s) => s.openTabs);
	const activeTab = openTabs.find((t) => t.path === activeTabPath);

	if (!activeTab) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground bg-editor-background">
				Select a file to open it
			</div>
		);
	}

	return (
		<div className="h-full p-4 text-sm text-muted-foreground bg-editor-background">
			{activeTab.path}
		</div>
	);
}
