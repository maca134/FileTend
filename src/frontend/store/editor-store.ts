import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface OpenTab {
	path: string;
	name: string;
	dirty: boolean;
	content?: string;
}

export interface CreatingNode {
	parentPath: string | undefined;
	type: "file" | "directory";
}

interface EditorState {
	openTabs: OpenTab[];
	activeTabPath: string | null;
	expandedPaths: string[];
	creatingNode: CreatingNode | null;
	renamingPath: string | null;
	openFile: (tab: OpenTab) => void;
	closeTab: (path: string) => void;
	setActiveTab: (path: string) => void;
	toggleExpanded: (path: string) => void;
	expandPath: (path: string) => void;
	expandMany: (paths: string[]) => void;
	collapseAll: () => void;
	startCreating: (
		parentPath: string | undefined,
		type: "file" | "directory"
	) => void;
	cancelCreating: () => void;
	startRenaming: (path: string) => void;
	cancelRenaming: () => void;
	renamePath: (oldPath: string, newPath: string) => void;
}

export const useEditorStore = create<EditorState>()(
	persist(
		(set, get) => ({
			openTabs: [],
			activeTabPath: null,
			expandedPaths: [],
			creatingNode: null,
			renamingPath: null,

			openFile: (tab) => {
				const { openTabs } = get();
				set({
					openTabs: openTabs.some((t) => t.path === tab.path)
						? openTabs
						: [...openTabs, { ...tab, dirty: false }],
					activeTabPath: tab.path,
				});
			},

			closeTab: (path) => {
				const { openTabs, activeTabPath } = get();
				const index = openTabs.findIndex((t) => t.path === path);
				if (index === -1) return;

				const nextTabs = openTabs.filter((t) => t.path !== path);
				const nextActive =
					activeTabPath !== path
						? activeTabPath
						: ((nextTabs[index - 1] ?? nextTabs[index])?.path ??
							null);

				set({ openTabs: nextTabs, activeTabPath: nextActive });
			},

			setActiveTab: (path) => set({ activeTabPath: path }),

			toggleExpanded: (path) => {
				let expandedPaths = get().expandedPaths;
				if (expandedPaths.includes(path)) {
					expandedPaths = expandedPaths.filter((p) => p !== path);
				} else {
					expandedPaths = [...expandedPaths, path];
				}
				set({ expandedPaths });
			},

			expandPath: (path) => {
				if (get().expandedPaths.includes(path)) return;
				const expandedPaths = [...get().expandedPaths, path];
				set({ expandedPaths });
			},

			expandMany: (paths) => {
				const current = get().expandedPaths;
				const additions = paths.filter((p) => !current.includes(p));
				if (additions.length === 0) return;
				set({ expandedPaths: [...current, ...additions] });
			},

			collapseAll: () => set({ expandedPaths: [] }),

			startCreating: (parentPath, type) => {
				if (parentPath !== undefined) get().expandPath(parentPath);
				set({ creatingNode: { parentPath, type }, renamingPath: null });
			},

			cancelCreating: () => set({ creatingNode: null }),

			startRenaming: (path) =>
				set({ renamingPath: path, creatingNode: null }),

			cancelRenaming: () => set({ renamingPath: null }),

			renamePath: (oldPath, newPath) => {
				const remap = (p: string) => {
					if (p === oldPath) return newPath;
					if (
						p.startsWith(oldPath + "/") ||
						p.startsWith(oldPath + "\\")
					) {
						return newPath + p.slice(oldPath.length);
					}
					return p;
				};

				const { openTabs, activeTabPath, expandedPaths } = get();

				set({
					openTabs: openTabs.map((t) => {
						const remapped = remap(t.path);
						if (remapped === t.path) return t;
						const name = remapped.split(/[/\\]/).pop() ?? t.name;
						return { ...t, path: remapped, name };
					}),
					activeTabPath: activeTabPath
						? remap(activeTabPath)
						: activeTabPath,
					expandedPaths: expandedPaths.map(remap),
				});
			},
		}),
		{
			name: "editor-store",
			storage: createJSONStorage(() => localStorage),
		}
	)
);
