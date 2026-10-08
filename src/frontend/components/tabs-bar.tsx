import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { type OpenTab, isTabDirty, useEditorStore } from "@/store/editor-store";

import { ConfirmDialog } from "./confirm-dialog";
import { ContextMenu, type ContextMenuItem } from "./context-menu";
import { FileIcon } from "./file-icon";
import { Button } from "./ui/button";

type CloseScope = "Close" | "Close Others" | "Close to the Right" | "Close All";

const Tab = ({ tab }: { tab: OpenTab }) => {
	const openTabs = useEditorStore((s) => s.openTabs);
	const closeTabs = useEditorStore((s) => s.closeTabs);
	const activeTabPath = useEditorStore((s) => s.activeTabPath);
	const setActiveTab = useEditorStore((s) => s.setActiveTab);
	const dirty = isTabDirty(tab);

	const isActive = tab.path === activeTabPath;
	const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
	const [pendingScope, setPendingScope] = useState<CloseScope>("Close");

	const tabIndex = openTabs.findIndex((t) => t.path === tab.path);

	const getTabsInScope = (scope: CloseScope): OpenTab[] => {
		switch (scope) {
			case "Close":
				return [tab];
			case "Close Others":
				return openTabs.filter((t) => t.path !== tab.path);
			case "Close to the Right":
				return openTabs.slice(tabIndex + 1);
			case "Close All":
				return openTabs;
		}
	};

	const runScope = (scope: CloseScope) =>
		closeTabs(getTabsInScope(scope).map((t) => t.path));

	const requestClose = (scope: CloseScope) => {
		const scopedTabs = getTabsInScope(scope);
		if (scopedTabs.length === 0) return;

		if (scopedTabs.some(isTabDirty)) {
			setPendingScope(scope);
			setConfirmCloseOpen(true);
		} else {
			runScope(scope);
		}
	};

	const dirtyPendingTabs = getTabsInScope(pendingScope).filter(isTabDirty);
	const confirmTitle =
		pendingScope === "Close" ? `Close ${tab.name}?` : `${pendingScope}?`;
	const confirmDescription =
		dirtyPendingTabs.length === 1
			? `"${dirtyPendingTabs[0]!.name}" has unsaved changes that will be lost. This action cannot be undone.`
			: `${dirtyPendingTabs.length} files have unsaved changes that will be lost. This action cannot be undone.`;

	const scopeItem = (label: CloseScope, disabled = false) => ({
		label,
		onSelect: () => requestClose(label),
		disabled,
	});

	const items: ContextMenuItem[] = [
		scopeItem("Close"),
		scopeItem("Close Others", openTabs.length <= 1),
		scopeItem("Close to the Right", tabIndex === openTabs.length - 1),
		scopeItem("Close All"),
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
						className="flex flex-row items-center gap-2 max-w-40 truncate"
					>
						<FileIcon path={tab.path} />
						<div className="truncate">{tab.name}</div>
					</Button>
					<Button
						type="button"
						variant={"invisible"}
						size={"icon-xs"}
						onClick={() => requestClose("Close")}
						className={cn(
							"group/close relative grid place-items-center mr-2 hover:bg-accent",
							!dirty &&
								!isActive &&
								"opacity-0 group-hover:opacity-100"
						)}
						aria-label={`Close ${tab.name}`}
						title={`Close ${tab.name}`}
					>
						<X
							className={cn(
								"col-start-1 row-start-1 size-5",
								dirty &&
									"opacity-0 transition-opacity group-hover/close:opacity-100"
							)}
						/>
						{dirty && (
							<div className="col-start-1 row-start-1 h-2 w-2 rounded-full bg-accent-foreground transition-opacity group-hover/close:opacity-0" />
						)}
					</Button>
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

	if (openTabs.length === 0) {
		return <div className="h-full" />;
	}

	return (
		<>
			<div className="flex h-full items-stretch overflow-x-auto">
				{openTabs.map((tab) => (
					<Tab key={tab.path} tab={tab} />
				))}
			</div>
			<div className="flex-1 h-full border-b" />
		</>
	);
}
