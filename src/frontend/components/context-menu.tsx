import type { ReactNode } from "react";

import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenu as ContextMenuRoot,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "./ui/context-menu";

export type ContextMenuItem =
	| {
			label: string;
			onSelect: () => void;
			disabled?: boolean;
	  }
	| {
			separator: true;
	  };

type ContextMenuProps = {
	items: ContextMenuItem[];
	children: ReactNode;
};

export const ContextMenu = ({ items, children }: ContextMenuProps) => (
	<>
		<ContextMenuRoot>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-60">
				{items.map((item, index) =>
					"separator" in item ? (
						<ContextMenuSeparator key={index} />
					) : (
						<ContextMenuItem
							key={index}
							onSelect={item.onSelect}
							disabled={item.disabled}
						>
							<div className="ml-6">{item.label}</div>
						</ContextMenuItem>
					)
				)}
			</ContextMenuContent>
		</ContextMenuRoot>
	</>
);
