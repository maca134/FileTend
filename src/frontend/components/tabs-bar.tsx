import { X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { type OpenTab, useEditorStore } from "@/store/editor-store";

import { ConfirmDialog } from "./confirm-dialog";
import { FileIcon } from "./file-icon";
import { Button } from "./ui/button";

const Tab = ({
	tab,
	activeTabPath,
	setActiveTab,
	closeTab,
}: {
	tab: OpenTab;
	activeTabPath: string | null;
	setActiveTab: (path: string) => void;
	closeTab: (path: string) => void;
}) => {
	const isActive = tab.path === activeTabPath;
	const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

	const handleClose = () => {
		if (tab.dirty) {
			setConfirmCloseOpen(true);
		} else {
			closeTab(tab.path);
		}
	};

	return (
		<div
			key={tab.path}
			className={cn(
				"flex flex-col border-r text-sm",
				isActive
					? "bg-editor-background border-b border-b-editor-background"
					: "text-muted-foreground border-b hover:bg-editor-background/50"
			)}
		>
			<div
				className={cn(
					"w-full h-0.5",
					isActive && "bg-accent-foreground"
				)}
			/>
			<div className="group flex flex-1 items-center gap-2">
				<Button
					variant={"invisible"}
					type="button"
					onClick={() => setActiveTab(tab.path)}
					className="flex flex-row cursor-pointer items-center gap-2 max-w-40 truncate"
				>
					<FileIcon type="file" path={tab.path} />
					{tab.name}
				</Button>
				<Button
					type="button"
					variant={"ghost"}
					size={"icon-xs"}
					onClick={handleClose}
					className={cn(
						"cursor-pointer mr-2 hover:bg-editor-background/50",
						isActive
							? "bg-editor-background"
							: "opacity-0 group-hover:opacity-100"
					)}
					aria-label={`Close ${tab.name}`}
				>
					<X className="size-5" />
				</Button>
			</div>
			<ConfirmDialog
				open={confirmCloseOpen}
				onOpenChange={setConfirmCloseOpen}
				title={`Close ${tab.name}?`}
				description={`"${tab.name}" has unsaved changes. Closing will discard them.`}
				confirmLabel="Close Without Saving"
				destructive
				onConfirm={() => {
					setConfirmCloseOpen(false);
					closeTab(tab.path);
				}}
			/>
		</div>
	);
};

export function TabsBar() {
	const openTabs = useEditorStore((s) => s.openTabs);
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const setActiveTab = useEditorStore((s) => s.setActiveTab);
	const closeTab = useEditorStore((s) => s.closeTab);

	if (openTabs.length === 0) {
		return <div className="h-full" />;
	}

	return (
		<div className="flex h-full items-stretch overflow-x-auto">
			{openTabs.map((tab) => (
				<Tab
					key={tab.path}
					tab={tab}
					activeTabPath={activeTabPath}
					setActiveTab={setActiveTab}
					closeTab={closeTab}
				/>
			))}
		</div>
	);
}
