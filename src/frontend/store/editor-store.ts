import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface OpenTab {
	path: string;
	name: string;
	dirty: boolean;
	content?: string;
	// Last known content on disk (from load or save), used as the baseline
	// to compute `dirty`. Distinct from `content`, which tracks the live
	// editor buffer so unsaved edits survive a page refresh.
	savedContent?: string;
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
	closeOthers: (path: string) => void;
	closeToTheRight: (path: string) => void;
	closeAllTabs: () => void;
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
	closeTabsUnder: (prefix: string) => void;
	setTabContent: (path: string, content: string) => void;
	updateTabContent: (path: string, content: string) => void;
	markTabSaved: (path: string, content: string) => void;
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

			closeOthers: (path) => {
				const { openTabs } = get();
				const kept = openTabs.filter((t) => t.path === path);
				if (kept.length === openTabs.length) return;
				set({ openTabs: kept, activeTabPath: path });
			},

			closeToTheRight: (path) => {
				const { openTabs, activeTabPath } = get();
				const index = openTabs.findIndex((t) => t.path === path);
				if (index === -1) return;

				const nextTabs = openTabs.slice(0, index + 1);
				if (nextTabs.length === openTabs.length) return;

				const activeStillOpen = activeTabPath
					? nextTabs.some((t) => t.path === activeTabPath)
					: false;

				set({
					openTabs: nextTabs,
					activeTabPath: activeStillOpen ? activeTabPath : path,
				});
			},

			closeAllTabs: () => set({ openTabs: [], activeTabPath: null }),

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

			closeTabsUnder: (prefix) => {
				const isUnder = (p: string) =>
					p === prefix ||
					p.startsWith(prefix + "/") ||
					p.startsWith(prefix + "\\");

				const { openTabs, activeTabPath } = get();
				const nextTabs = openTabs.filter((t) => !isUnder(t.path));
				if (nextTabs.length === openTabs.length) return;

				const nextActive =
					activeTabPath && isUnder(activeTabPath)
						? (nextTabs[0]?.path ?? null)
						: activeTabPath;

				set({ openTabs: nextTabs, activeTabPath: nextActive });
			},

			setTabContent: (path, content) => {
				set({
					openTabs: get().openTabs.map((t) =>
						t.path === path
							? { ...t, content, savedContent: content, dirty: false }
							: t
					),
				});
			},

			updateTabContent: (path, content) => {
				set({
					openTabs: get().openTabs.map((t) => {
						if (t.path !== path) return t;
						const dirty = content !== t.savedContent;
						if (t.content === content && t.dirty === dirty) return t;
						return { ...t, content, dirty };
					}),
				});
			},

			markTabSaved: (path, content) => {
				set({
					openTabs: get().openTabs.map((t) =>
						t.path === path
							? { ...t, content, savedContent: content, dirty: false }
							: t
					),
				});
			},
		}),
		{
			name: "editor-store",
			storage: createJSONStorage(() => localStorage),
			// Clean tabs are persisted lightweight (content is refetched on
			// open); dirty tabs keep their live content + baseline so
			// unsaved edits survive a page refresh.
			partialize: (state) => ({
				...state,
				openTabs: state.openTabs.map((t) =>
					t.dirty
						? {
								path: t.path,
								name: t.name,
								dirty: true,
								content: t.content,
								savedContent: t.savedContent,
							}
						: { path: t.path, name: t.name, dirty: false }
				),
			}),
		}
	)
);
