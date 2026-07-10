import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { type OpenTab, useEditorStore } from "@/store/editor-store";

import { ConfirmDialog } from "./confirm-dialog";
import { ContextMenu, type ContextMenuItem } from "./context-menu";
import { FileIcon } from "./file-icon";
import { Button } from "./ui/button";

type CloseScope = "single" | "others" | "right" | "all";

const SCOPE_LABEL: Record<CloseScope, string> = {
	single: "Close",
	others: "Close Others",
	right: "Close to the Right",
	all: "Close All",
};

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
	const openTabs = useEditorStore((s) => s.openTabs);
	const closeOthers = useEditorStore((s) => s.closeOthers);
	const closeToTheRight = useEditorStore((s) => s.closeToTheRight);
	const closeAllTabs = useEditorStore((s) => s.closeAllTabs);

	const isActive = tab.path === activeTabPath;
	const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
	const [pendingScope, setPendingScope] = useState<CloseScope>("single");

	const tabIndex = openTabs.findIndex((t) => t.path === tab.path);

	const getTabsInScope = (scope: CloseScope): OpenTab[] => {
		switch (scope) {
			case "single":
				return [tab];
			case "others":
				return openTabs.filter((t) => t.path !== tab.path);
			case "right":
				return openTabs.slice(tabIndex + 1);
			case "all":
				return openTabs;
		}
	};

	const runScope = (scope: CloseScope) => {
		switch (scope) {
			case "single":
				closeTab(tab.path);
				break;
			case "others":
				closeOthers(tab.path);
				break;
			case "right":
				closeToTheRight(tab.path);
				break;
			case "all":
				closeAllTabs();
				break;
		}
	};

	const requestClose = (scope: CloseScope) => {
		const scopedTabs = getTabsInScope(scope);
		if (scopedTabs.length === 0) return;

		if (scopedTabs.some((t) => t.dirty)) {
			setPendingScope(scope);
			setConfirmCloseOpen(true);
		} else {
			runScope(scope);
		}
	};

	const handleClose = () => requestClose("single");

	const dirtyPendingTabs = getTabsInScope(pendingScope).filter(
		(t) => t.dirty
	);
	const confirmTitle =
		pendingScope === "single"
			? `Close ${tab.name}?`
			: `${SCOPE_LABEL[pendingScope]}?`;
	const confirmDescription =
		dirtyPendingTabs.length === 1
			? `"${dirtyPendingTabs[0]!.name}" has unsaved changes that will be lost. This action cannot be undone.`
			: `${dirtyPendingTabs.length} files have unsaved changes that will be lost. This action cannot be undone.`;

	const items: ContextMenuItem[] = [
		{
			label: "Close",
			onSelect: () => requestClose("single"),
		},
		{
			label: "Close Others",
			onSelect: () => requestClose("others"),
			disabled: openTabs.length <= 1,
		},
		{
			label: "Close to the Right",
			onSelect: () => requestClose("right"),
			disabled: tabIndex === openTabs.length - 1,
		},
		{
			label: "Close All",
			onSelect: () => requestClose("all"),
		},
		{
			separator: true,
		},
		{
			label: "Copy Path",
			onSelect: () => {
				navigator.clipboard.writeText(tab.path).then(
					() => toast.success("Path copied"),
					() => toast.error("Failed to copy path")
				);
			},
		},
	];

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
			<ContextMenu items={items}>
				<div className="group flex flex-1 items-center gap-2">
					<Button
						variant={"invisible"}
						type="button"
						onClick={() => setActiveTab(tab.path)}
						className="flex flex-row cursor-pointer items-center gap-2 max-w-40 truncate"
					>
						<FileIcon type="file" path={tab.path} />
						<div className="truncate">{tab.name}</div>
					</Button>
					{!tab.dirty ? (
						<Button
							type="button"
							variant={"invisible"}
							size={"icon-xs"}
							onClick={handleClose}
							className={cn(
								"cursor-pointer mr-2 hover:bg-accent",
								!isActive && "opacity-0 group-hover:opacity-100"
							)}
							aria-label={`Close ${tab.name}`}
							title={`Close ${tab.name}`}
						>
							<X className="size-5" />
						</Button>
					) : (
						<Button
							type="button"
							variant={"invisible"}
							size={"icon-xs"}
							onClick={handleClose}
							className={cn(
								"group/close relative grid cursor-pointer place-items-center mr-2 hover:bg-accent"
							)}
							aria-label={`Close ${tab.name}`}
							title={`Close ${tab.name}`}
						>
							<X className="col-start-1 row-start-1 size-5 opacity-0 transition-opacity group-hover/close:opacity-100" />
							<div className="col-start-1 row-start-1 h-2 w-2 rounded-full bg-accent-foreground transition-opacity group-hover/close:opacity-0" />
						</Button>
					)}
				</div>
			</ContextMenu>
			<ConfirmDialog
				open={confirmCloseOpen}
				onOpenChange={setConfirmCloseOpen}
				title={confirmTitle}
				description={confirmDescription}
				confirmLabel="Close Without Saving"
				destructive
				onConfirm={() => {
					setConfirmCloseOpen(false);
					runScope(pendingScope);
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
