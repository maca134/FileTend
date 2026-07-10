import "./index.css";

import { ExternalLink } from "lucide-react";
import { useEffect } from "react";

import { EditorPane } from "@/components/editor-pane";
import { FileTree } from "@/components/file-tree";
import { TabsBar } from "@/components/tabs-bar";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEditorStore } from "@/store/editor-store";

import pkg from "../../package.json";

function useWarnOnUnsavedClose() {
	useEffect(() => {
		const handler = (e: BeforeUnloadEvent) => {
			const hasDirtyTabs = useEditorStore
				.getState()
				.openTabs.some((t) => t.dirty);
			if (!hasDirtyTabs) return;

			e.preventDefault();
			// Chrome ignores the custom message and shows its own generic
			// prompt, but returnValue must still be set for the dialog to
			// appear at all in most browsers.
			e.returnValue = "";
		};

		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, []);
}

export function App() {
	useWarnOnUnsavedClose();

	return (
		<div className="flex flex-col gap-2 h-full w-full p-2">
			<ResizablePanelGroup orientation="horizontal" className="border">
				<ResizablePanel
					defaultSize="300px"
					minSize={"300px"}
					groupResizeBehavior="preserve-pixel-size"
				>
					<FileTree />
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel>
					<div className="flex flex-col h-full min-h-0">
						<div className="h-12 flex items-center shrink-0">
							<TabsBar />
						</div>
						<div className="flex-1 min-h-0">
							<EditorPane />
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
			<footer className="flex items-center justify-between px-1 text-xs text-muted-foreground">
				<span>
					FileTend{" "}
					<span className="tabular-nums">v{pkg.version}</span>
				</span>
				<a
					href="https://github.com/maca134/FileTend"
					target="_blank"
					rel="noreferrer"
					className="flex items-center gap-1 hover:text-foreground transition-colors"
				>
					GitHub
					<ExternalLink className="size-3" />
				</a>
			</footer>
		</div>
	);
}

export default App;
