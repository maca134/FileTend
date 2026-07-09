import type { ReactNode } from "react";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "../ui/context-menu";

export type TreeContextMenuItem = {
	label: string;
	onSelect: () => void;
} | {
	separator: true;
};

type TreeContextMenuProps = {
	items: TreeContextMenuItem[];
	children: ReactNode;
};

export const TreeContextMenu = ({ items, children }: TreeContextMenuProps) => (
	<>
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-60">
				{items.map((item, index) =>
					"separator" in item ? (
						<ContextMenuSeparator key={index} />
					) : (
						<ContextMenuItem key={index} onSelect={item.onSelect}>
							<div className="ml-6">{item.label}</div>
						</ContextMenuItem>
					)
				)}
			</ContextMenuContent>
		</ContextMenu>
	</>
);
