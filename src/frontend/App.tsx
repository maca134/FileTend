import "./index.css";

import { EditorPane } from "@/components/editor-pane";
import { FileTree } from "@/components/file-tree";
import { TabsBar } from "@/components/tabs-bar";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

export function App() {
	return (
		<div className="h-full w-full p-2">
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
		</div>
	);
}

export default App;
